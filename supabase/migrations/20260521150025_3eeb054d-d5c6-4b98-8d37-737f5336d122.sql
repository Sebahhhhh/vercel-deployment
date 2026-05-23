
create type public.app_role as enum ('admin','user');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique(user_id, role)
);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  captain_first_name text not null,
  captain_last_name text not null,
  captain_class text not null,
  captain_phone text not null,
  captain_email text not null,
  created_by uuid references auth.users(id) on delete set null,
  bracket_slot int unique,
  eliminated boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade not null,
  first_name text not null,
  last_name text not null,
  class text not null,
  is_reserve boolean not null default false,
  position int
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  round int not null,
  position int not null,
  team1_id uuid references public.teams(id) on delete set null,
  team2_id uuid references public.teams(id) on delete set null,
  winner_id uuid references public.teams(id) on delete set null,
  score1 int,
  score2 int,
  status text not null default 'pending',
  scheduled_at timestamptz,
  unique(round, position)
);

create table public.settings (
  key text primary key,
  value jsonb not null
);

insert into public.settings(key, value) values
  ('max_teams', '8'::jsonb),
  ('regolamento', '"Regolamento generale del Torneo di Pallavolo\n\n1. Ogni squadra deve essere composta da almeno 6 membri titolari + 2 riserve.\n2. Ogni squadra deve avere un capitano responsabile della comunicazione con l''organizzazione.\n3. Le iscrizioni sono limitate a 8 squadre.\n4. Il torneo è ad eliminazione diretta con sorteggio casuale del tabellone.\n5. È obbligatorio il fair play; comportamenti antisportivi comportano squalifica.\n6. Le partite si svolgono secondo il calendario stabilito dall''organizzazione.\n7. In caso di assenza ingiustificata la squadra viene squalificata.\n\n(Testo modificabile dalla sezione Gestione)"'::jsonb);

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.matches enable row level security;
alter table public.settings enable row level security;

create policy "profiles read self" on public.profiles for select using (auth.uid() = id);
create policy "profiles insert self" on public.profiles for insert with check (auth.uid() = id);

create policy "roles read self" on public.user_roles for select using (auth.uid() = user_id);

create policy "teams read all" on public.teams for select using (true);
create policy "teams insert auth" on public.teams for insert to authenticated with check (auth.uid() = created_by);

create policy "members read all" on public.team_members for select using (true);
create policy "members insert owner" on public.team_members for insert to authenticated with check (
  exists (select 1 from public.teams where teams.id = team_id and teams.created_by = auth.uid())
);

create policy "matches read all" on public.matches for select using (true);
create policy "settings read all" on public.settings for select using (true);

-- profile auto-create on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- random bracket slot assignment, blocks above max_teams
create or replace function public.assign_bracket_slot()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  max_t int;
  taken int[];
  available int[];
  chosen int;
begin
  select (value::text)::int into max_t from public.settings where key = 'max_teams';
  if max_t is null then max_t := 8; end if;
  select coalesce(array_agg(bracket_slot), array[]::int[]) into taken from public.teams where bracket_slot is not null;
  select array_agg(s) into available from generate_series(1, max_t) s where not (s = any(taken));
  if available is null or array_length(available, 1) is null then
    raise exception 'Iscrizioni chiuse: numero massimo di squadre raggiunto';
  end if;
  chosen := available[1 + floor(random() * array_length(available, 1))::int];
  new.bracket_slot := chosen;
  return new;
end;
$$;

drop trigger if exists before_insert_team on public.teams;
create trigger before_insert_team
  before insert on public.teams
  for each row execute function public.assign_bracket_slot();

-- when full, generate first round matches automatically
create or replace function public.maybe_create_matches()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  max_t int;
  cnt int;
begin
  select (value::text)::int into max_t from public.settings where key = 'max_teams';
  if max_t is null then max_t := 8; end if;
  select count(*) into cnt from public.teams;
  if cnt >= max_t and not exists (select 1 from public.matches) then
    insert into public.matches(round, position, team1_id, team2_id)
    select 1, gs.pos,
      (select id from public.teams where bracket_slot = gs.pos * 2 - 1),
      (select id from public.teams where bracket_slot = gs.pos * 2)
    from generate_series(1, max_t / 2) as gs(pos);
    -- empty placeholders for later rounds (semis + final, assuming 8 teams)
    if max_t = 8 then
      insert into public.matches(round, position) values (2,1),(2,2),(3,1);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists after_insert_team on public.teams;
create trigger after_insert_team
  after insert on public.teams
  for each row execute function public.maybe_create_matches();
