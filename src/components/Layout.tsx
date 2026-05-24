import { useRef } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { BookOpen, ClipboardList, Trophy, Volleyball } from "lucide-react";

export const TOURNAMENT_NAME = "Esperia Torneo Pallavolo Cogestione 2026";
export const SUPPORT_EMAIL = "rocchi.sebastiano.studente@itispaleocapa.it";

const nav = [
  { to: "/iscrizione", label: "Iscrizione", icon: ClipboardList },
  { to: "/torneo", label: "Live", icon: Trophy },
] as const;

export function AppNav() {
  const loc = useLocation();
  return (
    <nav className="sticky top-0 z-50 border-b border-white/60 bg-white/35 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
        <Link to="/iscrizione" className="flex items-center gap-3 min-w-0 self-start sm:self-auto">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-arena">
            <Volleyball className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <span className="truncate font-display text-sm font-semibold leading-tight sm:text-base">
            Torneo Pallavolo Cogestione Esperia 2026
          </span>
        </Link>
        <div className="flex w-full flex-col items-center justify-center gap-2 sm:w-auto sm:flex-row sm:justify-end">
          <Link
            to="/regolamento"
            className="hidden rounded-full border border-white/70 bg-white/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground hover:bg-white/80 hover:text-foreground sm:inline-flex"
          >
            Regolamento
          </Link>
          <ul className="mx-auto grid grid-cols-2 gap-2 rounded-2xl border border-white/70 bg-white/70 p-2 shadow-glow backdrop-blur-2xl sm:mx-0 sm:flex sm:items-center sm:gap-1 sm:rounded-full sm:p-1">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = loc.pathname === to;
            return (
              <li key={to}>
                <Link
                  to={to}
                  className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-semibold transition-all sm:rounded-full sm:px-4 sm:py-2 sm:text-sm ${
                    active
                      ? "bg-primary text-primary-foreground shadow-lift"
                      : "bg-white/60 text-muted-foreground hover:bg-white/80 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              </li>
            );
          })}
          </ul>
        </div>
      </div>
    </nav>
  );
}

export function PageShell({
  children,
  title,
  subtitle,
  headerAction,
  wide,
  bare,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  wide?: boolean;
  bare?: boolean;
}) {
  const navigate = useNavigate();
  const tapsRef = useRef<{ count: number; last: number }>({ count: 0, last: 0 });
  const handleSecretTap = () => {
    const now = Date.now();
    const s = tapsRef.current;
    if (now - s.last > 1500) s.count = 0;
    s.count += 1;
    s.last = now;
    if (s.count >= 5) {
      s.count = 0;
      navigate({ to: "/gestione" });
    }
  };

  return (
    <div className="relative min-h-screen court-pattern">
      <AppNav />
      {!bare && (
        <header className="relative overflow-hidden border-b border-white/60 bg-white/30 backdrop-blur-2xl">
          <div className="relative mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 sm:gap-5 sm:py-10">
            {headerAction && <div className="self-end sm:absolute sm:right-4 sm:top-6 sm:z-10">{headerAction}</div>}
            <p className="label-caps">{TOURNAMENT_NAME}</p>
            <h1 className="select-none cursor-pointer font-display text-3xl font-semibold uppercase leading-none tracking-tight text-primary sm:text-5xl" onClick={handleSecretTap}>
              {title}
            </h1>
            {subtitle && <p className="max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">{subtitle}</p>}
          </div>
        </header>
      )}
      <main className={`mx-auto w-full px-4 py-5 animate-rise sm:py-6 ${wide ? "max-w-6xl" : "max-w-5xl"}`}>
        {children}
      </main>
      <footer className="mx-auto w-full max-w-5xl px-4 pb-6 text-center text-[10px] font-medium text-muted-foreground">
        Made by Sebastiano Rocchi 5ID and Diego D&apos;ortenzio 5ID
      </footer>
    </div>
  );
}
