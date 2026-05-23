import { useRef } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { ClipboardList, Trophy, Volleyball } from "lucide-react";

export const TOURNAMENT_NAME = "Esperia Torneo Pallavolo Cogestione 2026";
export const SUPPORT_EMAIL = "rocchi.sebastiano.studente@itispaleocapa.it";

const nav = [
  { to: "/iscrizione", label: "Iscrizione", icon: ClipboardList },
  { to: "/torneo", label: "Live", icon: Trophy },
] as const;

export function AppNav() {
  const loc = useLocation();
  return (
    <nav className="sticky top-0 z-50 border-b-2 border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/iscrizione" className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-arena">
            <Volleyball className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <span className="hidden truncate font-display text-sm font-bold leading-tight sm:block">
            Esperia 2026
          </span>
        </Link>
        <ul className="flex gap-1 rounded-full border-2 border-border bg-muted/60 p-1">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = loc.pathname === to;
            return (
              <li key={to}>
                <Link
                  to={to}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all sm:text-sm ${
                    active
                      ? "bg-primary text-primary-foreground shadow-lift"
                      : "text-muted-foreground hover:text-foreground"
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
        <header className="relative overflow-hidden border-b-2 border-border">
          <div className="stripe-accent h-1.5 w-full" aria-hidden />
          <div className="relative mx-auto max-w-5xl px-4 py-8 sm:py-10">
            {headerAction && <div className="absolute top-6 right-4 z-10">{headerAction}</div>}
            <p className="label-caps">{TOURNAMENT_NAME}</p>
            <h1
              className="mt-2 font-display text-4xl font-extrabold uppercase leading-none tracking-tight text-primary sm:text-5xl select-none cursor-pointer"
              onClick={handleSecretTap}
            >
              {title}
            </h1>
            {subtitle && <p className="mt-3 max-w-lg text-sm text-muted-foreground sm:text-base">{subtitle}</p>}
          </div>
        </header>
      )}
      <main className={`mx-auto px-4 py-6 animate-rise ${wide ? "max-w-6xl" : "max-w-5xl"}`}>
        {children}
      </main>
    </div>
  );
}
