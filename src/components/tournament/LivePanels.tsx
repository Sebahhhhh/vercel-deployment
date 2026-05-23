import { Zap } from "lucide-react";
import type { Match, Team } from "./types";
import { formatMatchTime, matchTitle } from "./match-utils";

export function LiveMatchPanel({ match, t1, t2 }: { match: Match | null; t1: Team | null; t2: Team | null }) {
  const live = !!match;
  return (
    <article className={`card-arena p-5 ${live ? "border-secondary animate-live-ring" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="label-caps flex items-center gap-2">
          <Zap className={`h-4 w-4 ${live ? "text-secondary" : "text-muted-foreground"}`} />
          In campo
        </span>
        {live && (
          <span className="rounded-full bg-secondary px-3 py-0.5 text-[10px] font-black uppercase text-secondary-foreground">
            Live
          </span>
        )}
      </div>
      {live ? (
        <>
          <div className="mt-3 space-y-2">
            <p className="font-display text-xl font-bold uppercase">{t1?.name ?? "TBD"}</p>
            <div className="flex items-center gap-2">
              <span className="h-px flex-1 bg-secondary/25" />
              <span className="rounded-full bg-secondary/20 px-3 py-1 text-xs font-black uppercase tracking-[0.3em] text-secondary">
                VS
              </span>
              <span className="h-px flex-1 bg-secondary/25" />
            </div>
            <p className="font-display text-xl font-bold uppercase">{t2?.name ?? "TBD"}</p>
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Nessuna partita in corso.</p>
      )}
    </article>
  );
}

export function NextMatchPanel({ match, t1, t2 }: { match: Match | null; t1: Team | null; t2: Team | null }) {
  return (
    <article className="card-arena border-primary/40 p-5">
      <span className="label-caps text-primary">Prossima</span>
      {match ? (
        <>
          <div className="mt-3 space-y-2">
            <p className="font-display text-xl font-bold uppercase">{t1?.name ?? "TBD"}</p>
            <div className="flex items-center gap-2">
              <span className="h-px flex-1 bg-primary/20" />
              <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-black uppercase tracking-[0.3em] text-primary">
                VS
              </span>
              <span className="h-px flex-1 bg-primary/20" />
            </div>
            <p className="font-display text-xl font-bold uppercase">{t2?.name ?? "TBD"}</p>
          </div>
          <p className="mt-3 inline-block rounded-full bg-primary/15 px-4 py-2 text-sm font-bold text-primary">
            {formatMatchTime(match.scheduled_at)}
          </p>
        </>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">In attesa di programmazione.</p>
      )}
    </article>
  );
}
