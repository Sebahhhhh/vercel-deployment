import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, ShieldCheck, Lock, Users, UserPlus, Crown, Sparkles, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { PageShell, TOURNAMENT_NAME, SUPPORT_EMAIL } from "@/components/Layout";

const INSTITUTIONAL_EMAIL = /^[a-zà-öø-ÿ'’-]+\.[a-zà-öø-ÿ'’-]+\.studente(?:\d{1,2})?@itispaleocapa(?:\.it)?$/i;
const ACTIVE_EMAIL_KEY = "court_active_email";
const DEVICE_LOCK_KEY = "court_registration_email_lock";

function loadActiveEmail() {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage.getItem(ACTIVE_EMAIL_KEY);
}

function saveActiveEmail(email: string) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(ACTIVE_EMAIL_KEY, email);
}

function clearActiveEmail() {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(ACTIVE_EMAIL_KEY);
}

function loadDeviceLock() {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(DEVICE_LOCK_KEY);
}

function saveDeviceLock(email: string) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(DEVICE_LOCK_KEY, email);
}

export const Route = createFileRoute("/iscrizione")({
  head: () => ({ meta: [{ title: "Iscrizione — Torneo di Pallavolo" }] }),
  component: Iscrizione,
});

const memberSchema = z.object({
  first_name: z.string().trim().min(1, "Nome richiesto").max(60),
  last_name: z.string().trim().min(1, "Cognome richiesto").max(60),
  class: z.string().trim().min(1, "Classe richiesta").max(3, "Max 3 caratteri"),
});
const captainSchema = memberSchema.extend({
  phone: z.string().trim().min(6, "Telefono non valido").max(30),
});

type Member = z.infer<typeof memberSchema>;
const emptyMember = (): Member => ({ first_name: "", last_name: "", class: "" });

function Iscrizione() {
  const qc = useQueryClient();
  const [signingIn, setSigningIn] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [activeEmail, setActiveEmail] = useState<string | null>(() => loadActiveEmail());
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [emailConfirmed, setEmailConfirmed] = useState(() => !!loadActiveEmail());
  const [regOpen, setRegOpen] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [captain, setCaptain] = useState({ first_name: "", last_name: "", class: "", phone: "" });
  const [titolari, setTitolari] = useState<Member[]>([emptyMember(), emptyMember(), emptyMember(), emptyMember(), emptyMember()]);
  const [riserve, setRiserve] = useState<Member[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  const sessionEmail = activeEmail?.toLowerCase() ?? null;
  const emailValid = !!sessionEmail && INSTITUTIONAL_EMAIL.test(sessionEmail);
  const deviceLock = loadDeviceLock();

  useEffect(() => {
    if (!sessionEmail) return;
    saveActiveEmail(sessionEmail);
    setEmailConfirmed(true);
  }, [sessionEmail]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const openFromHash = () => {
      if (window.location.hash === "#regolamento") {
        setRegOpen(true);
        window.requestAnimationFrame(() => {
          document.getElementById("regolamento")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, []);

  const { data: teams = [] } = useQuery({
    queryKey: ["teams-count"],
    queryFn: async () => (await supabase.from("teams").select("id")).data ?? [],
  });
  const { data: maxTeams = 8 } = useQuery({
    queryKey: ["max-teams"],
    queryFn: async () => Number((await supabase.from("settings").select("value").eq("key", "max_teams").maybeSingle()).data?.value ?? 8),
  });
  const { data: regolamento = "" } = useQuery({
    queryKey: ["regolamento"],
    queryFn: async () => String((await supabase.from("settings").select("value").eq("key", "regolamento").maybeSingle()).data?.value ?? ""),
  });
  const { data: registrationsOpen = true } = useQuery({
    queryKey: ["registrations-open"],
    queryFn: async () => {
      const v = (await supabase.from("settings").select("value").eq("key", "registrations_open").maybeSingle()).data?.value;
      return v !== false && v !== "false";
    },
  });
  const { data: myTeam } = useQuery({
    queryKey: ["my-team", sessionEmail],
    enabled: !!sessionEmail,
    queryFn: async () => {
      const { data } = await supabase.from("teams").select("*").ilike("captain_email", sessionEmail!).maybeSingle();
      return data;
    },
  });
  const { data: myMembers = [] } = useQuery({
    queryKey: ["my-members", myTeam?.id],
    enabled: !!myTeam?.id,
    queryFn: async () =>
      (await supabase.from("team_members").select("first_name,last_name,class,is_reserve,position").eq("team_id", myTeam!.id).order("position")).data ?? [],
  });

  const remaining = Math.max(0, maxTeams - teams.length);
  const closed = !registrationsOpen || remaining === 0;

  const confirmInstitutionalEmail = async () => {
    if (!showEmailPrompt) {
      setShowEmailPrompt(true);
      return;
    }
    const normalized = emailInput.trim().toLowerCase();
    if (!INSTITUTIONAL_EMAIL.test(normalized)) {
      setSignInError("Email istituzionale non valida");
      return;
    }
    if (deviceLock && deviceLock !== normalized) {
      setSignInError("Questo dispositivo ha già registrato una squadra con un'altra email.");
      return;
    }
    setSigningIn(true);
    setSignInError(null);
    try {
      setActiveEmail(normalized);
      saveActiveEmail(normalized);
      setEmailConfirmed(true);
      qc.invalidateQueries();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Errore";
      setSignInError(msg);
      toast.error(msg);
    } finally {
      setSigningIn(false);
    }
  };

  const handleResetEmail = () => {
    if (deviceLock) {
      toast.error("Non puoi cambiare email dopo una registrazione su questo dispositivo.");
      return;
    }
    clearActiveEmail();
    setActiveEmail(null);
    setEmailConfirmed(false);
    setEmailInput("");
    setShowEmailPrompt(false);
    setSignInError(null);
  };

  const submit = async () => {
    try {
      const c = captainSchema.parse({ ...captain });
      const t = titolari.map((m) => memberSchema.parse(m));
      const r = riserve.map((m) => memberSchema.parse(m));
      if (!teamName.trim()) throw new Error("Nome squadra richiesto");
      if (!accepted) throw new Error("Devi accettare il regolamento");
      if (!emailValid || !sessionEmail) throw new Error("Email istituzionale non valida");
      if (deviceLock && deviceLock !== sessionEmail) {
        throw new Error("Questo dispositivo ha già registrato una squadra con un'altra email");
      }

      setSubmitting(true);
      const { data: existing } = await supabase.from("teams").select("id").ilike("captain_email", sessionEmail!).maybeSingle();
      if (existing) {
        throw new Error("Questa email ha già iscritto una squadra");
      }

      const { data: team, error } = await supabase.from("teams").insert({
        name: teamName.trim(),
        captain_first_name: c.first_name,
        captain_last_name: c.last_name,
        captain_class: c.class,
        captain_phone: c.phone,
        captain_email: sessionEmail,
      }).select().single();
      if (error) {
        if (error.code === "23505" || /duplicate|unique/i.test(error.message)) {
          throw new Error("Questa email ha già iscritto una squadra");
        }
        throw new Error(error.message);
      }

      const members = [
        { ...c, is_reserve: false, position: 1 },
        ...t.map((m, i) => ({ ...m, is_reserve: false, position: i + 2 })),
        ...r.map((m, i) => ({ ...m, is_reserve: true, position: i + 1 })),
      ].map(({ phone: _p, ...rest }: { phone?: string; [key: string]: unknown }) => ({ ...rest, team_id: team.id }));

      const { error: e2 } = await supabase.from("team_members").insert(members);
      if (e2) throw new Error(e2.message);

      toast.success("Squadra iscritta!");
      saveDeviceLock(sessionEmail!);
      qc.invalidateQueries();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Errore");
    } finally {
      setSubmitting(false);
    }
  };

  if (closed && !myTeam && emailConfirmed) {
    return (
      <PageShell title="Iscrizioni chiuse" subtitle={`${maxTeams}/${maxTeams} squadre raggiunte`}>
        <div className="rounded-2xl bg-card p-6 text-center shadow-soft">
          <Lock className="mx-auto h-10 w-10 text-destructive" />
          <p className="mt-3 text-sm text-muted-foreground">Non è più possibile iscrivere nuove squadre. Vai nella sezione live per seguire il torneo.</p>
        </div>
      </PageShell>
    );
  }

  if (!emailConfirmed) {
    return (
      <PageShell title="Iscrizione" subtitle="Accesso istituzionale">
        <AnnouncementBanner />
        <div className="mb-4 card-arena border-secondary/40 bg-secondary/5 p-4 text-sm">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-secondary" />
            <p>
              <strong>Account istituzionale obbligatorio per iscrizione delle squadre.</strong>
            </p>
          </div>
        </div>

        <div className="card-arena p-6 text-center">
          {showEmailPrompt && (
            <label className="mt-4 block text-left">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Email istituzionale</span>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </label>
          )}
          <button
            onClick={confirmInstitutionalEmail}
            disabled={signingIn}
            className="btn-primary mt-6 w-full"
          >
            {signingIn ? (
              <Loader2 className="h-5 w-5 animate-spin text-accent" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            Continua con Google
          </button>
          {signInError && <p className="mt-3 text-sm text-destructive">{signInError}</p>}
        </div>
      </PageShell>
    );
  }

  if (myTeam) {
    if (sessionEmail) saveDeviceLock(sessionEmail);
    return (
      <PageShell title="Ti sei gia iscritto" subtitle="Riepilogo squadra">
        <div className="rounded-2xl bg-card p-6 shadow-soft">
          <ShieldCheck className="h-10 w-10 text-success" />
          <h2 className="mt-3 text-lg font-semibold">La tua squadra e gia registrata</h2>
          <p className="mt-2 text-sm text-muted-foreground">Squadra: <strong>{myTeam.name}</strong></p>
          <p className="mt-1 text-sm text-muted-foreground">Slot tabellone: <strong>#{myTeam.bracket_slot}</strong></p>
          <div className="mt-4">
            <p className="text-xs font-semibold text-muted-foreground">Membri partecipanti</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {myMembers.map((m, idx) => (
                <div key={`${m.first_name}-${m.last_name}-${idx}`} className="rounded-xl border border-white/70 bg-white/80 px-3 py-2">
                  <p className="text-sm font-semibold">{m.first_name} {m.last_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Classe: {m.class}
                    {m.position ? ` · Pos: ${m.position}` : ""}
                    {m.is_reserve ? " · Riserva" : ""}
                  </p>
                </div>
              ))}
              {myMembers.length === 0 && (
                <p className="text-xs text-muted-foreground">Nessun membro registrato.</p>
              )}
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Iscrivi la squadra" subtitle={`${remaining} posti rimanenti su ${maxTeams}`}>

      <details
        id="regolamento"
        open={regOpen}
        onToggle={(e) => setRegOpen((e.target as HTMLDetailsElement).open)}
        className="mb-4 rounded-2xl bg-card p-4 shadow-soft"
      >
        <summary className="cursor-pointer text-sm font-semibold">Regolamento del torneo</summary>
        <pre className="mt-3 whitespace-pre-wrap font-sans text-sm text-muted-foreground">{regolamento}</pre>
      </details>

      <label className="mb-4 flex items-start gap-3 rounded-2xl bg-card p-4 shadow-soft">
        <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1 h-4 w-4 accent-accent" />
        <span className="text-sm">Ho letto e accetto il <strong>regolamento</strong> del torneo.</span>
      </label>

      <Section title="Squadra">
        <Field label="Nome squadra" value={teamName} onChange={setTeamName} />
      </Section>

      <Section title="Capitano" icon={<Crown className="h-4 w-4" />} tone="accent">
        <MemberForm value={captain} onChange={(v) => setCaptain({ ...captain, ...v })} />
        <Field label="Telefono" value={captain.phone} onChange={(v) => setCaptain({ ...captain, phone: v })} type="tel" />
      </Section>

      <Section title="Titolari" icon={<Users className="h-4 w-4" />} hint="5 obbligatori + capitano = 6">
        {titolari.map((m, i) => (
          <div key={i} className="mb-3 rounded-xl border border-primary/15 bg-primary/5 p-3">
            <p className="mb-2 text-xs font-semibold text-primary">Titolare {i + 2}</p>
            <MemberForm value={m} onChange={(v) => setTitolari(titolari.map((x, idx) => idx === i ? { ...x, ...v } : x))} />
          </div>
        ))}
      </Section>

      <Section title="Riserve" icon={<UserPlus className="h-4 w-4" />} tone="success" hint={`${riserve.length}/2 facoltative`}>
        {riserve.length === 0 && (
          <p className="mb-3 rounded-lg bg-success/5 px-3 py-2 text-xs text-muted-foreground">Nessuna riserva. Puoi aggiungerne fino a 2.</p>
        )}
        {riserve.map((m, i) => (
          <div key={i} className="mb-3 rounded-xl border border-success/20 bg-success/5 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-success">Riserva {i + 1}</p>
              <button
                type="button"
                onClick={() => setRiserve(riserve.filter((_, idx) => idx !== i))}
                className="inline-flex items-center gap-1 text-xs text-destructive hover:underline"
              >
                <Trash2 className="h-3.5 w-3.5" /> Rimuovi
              </button>
            </div>
            <MemberForm value={m} onChange={(v) => setRiserve(riserve.map((x, idx) => idx === i ? { ...x, ...v } : x))} />
          </div>
        ))}
        {riserve.length < 2 && (
          <button
            type="button"
            onClick={() => setRiserve([...riserve, emptyMember()])}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-success/40 bg-success/5 px-4 py-2.5 text-sm font-medium text-success hover:bg-success/10"
          >
            <Plus className="h-4 w-4" /> Aggiungi riserva
          </button>
        )}
      </Section>

      <button
        onClick={submit}
        disabled={submitting || !accepted}
        className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-4 py-3.5 text-sm font-semibold text-primary-foreground shadow-soft disabled:opacity-50"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        Iscrivi squadra
      </button>

      <section className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-soft">
        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Assistenza — " + TOURNAMENT_NAME)}`}
          className="flex items-center gap-3 transition-colors hover:text-accent"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <Mail className="h-4 w-4" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-semibold">Assistenza</span>
            <span className="block truncate text-xs text-muted-foreground">Scrivi all&apos;organizzatore</span>
          </span>
        </a>
      </section>
    </PageShell>
  );
}

function Section({ title, hint, icon, tone = "default", children }: { title: string; hint?: string; icon?: React.ReactNode; tone?: "default" | "accent" | "success"; children: React.ReactNode }) {
  const toneMap = {
    default: "bg-card",
    accent: "bg-gradient-to-br from-accent/10 to-card border border-accent/20",
    success: "bg-gradient-to-br from-success/10 to-card border border-success/20",
  } as const;
  const iconTone = {
    default: "bg-primary/10 text-primary",
    accent: "bg-accent/20 text-accent",
    success: "bg-success/20 text-success",
  } as const;
  return (
    <section className={`mb-5 rounded-2xl p-4 shadow-soft ${toneMap[tone]}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {icon && <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconTone[tone]}`}>{icon}</span>}
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, maxLength, compact }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; maxLength?: number; compact?: boolean }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={`${compact ? "w-20 text-center uppercase tracking-wider font-semibold" : "w-full"} rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30`}
      />
    </label>
  );
}

function MemberForm({ value, onChange }: { value: Member; onChange: (v: Partial<Member>) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Field label="Nome" value={value.first_name} onChange={(v) => onChange({ first_name: v })} />
      <Field label="Cognome" value={value.last_name} onChange={(v) => onChange({ last_name: v })} />
      <Field label="Classe" value={value.class} onChange={(v) => onChange({ class: v.toUpperCase() })} maxLength={3} compact />
    </div>
  );
}
