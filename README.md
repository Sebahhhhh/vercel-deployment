# Torneo di Pallavolo — Court Champion Builder

App per iscrizione squadre e gestione tabellone: **TanStack Start**, **React**, **Supabase**, deploy su **Vercel**.

## Struttura

```
src/
  routes/          # Pagine (/, iscrizione, torneo, gestione)
  components/      # UI condivisa
  integrations/    # Client Supabase
  lib/             # Server functions admin
supabase/
  migrations/      # Schema DB e policy RLS
```

## Sviluppo locale

1. Copia `.env.example` in `.env` e compila le variabili (Supabase → Settings → API).
2. `npm install` e `npm run dev`
3. Applica le migration in `supabase/migrations/` sul progetto Supabase.

## Deploy su Vercel

1. Importa il repo su [vercel.com/new](https://vercel.com/new).
2. **Build Command:** `npm run build` — **Output Directory:** lasciare vuoto (Nitro genera `.vercel/output`).
3. Variabili d'ambiente (Production e Preview):

| Nome | Note |
|------|------|
| `VITE_SUPABASE_URL` | URL progetto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chiave anon / publishable |
| `SUPABASE_URL` | Stesso URL |
| `SUPABASE_PUBLISHABLE_KEY` | Stessa chiave anon |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo server — Secret |
| `ADMIN_PASSWORD` | Area `/gestione` — Secret |
| `ADMIN_TOTP_SECRET` | 2FA admin — Secret |
| `ADMIN_SESSION_SECRET` | Sessioni admin — Secret |

4. Supabase → Authentication → URL Configuration: Site URL e Redirect URLs (`https://tuo-dominio.vercel.app/**`, `http://localhost:5173/**`).
5. Esegui le migration SQL, poi **Deploy**.

## Script

| Comando | Descrizione |
|---------|-------------|
| `npm run dev` | Sviluppo locale |
| `npm run build` | Build per Vercel |
| `npm run preview` | Anteprima build |

## Note

- Non committare `.env` (contiene segreti).
- `SUPABASE_SERVICE_ROLE_KEY` solo su Vercel, mai con prefisso `VITE_`.
- Percorsi Windows con apostrofo (es. `D'ortenzio`): in `vite.config.ts` è disabilitato `autoCodeSplitting` per evitare errori di build.
