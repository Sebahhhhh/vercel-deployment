import { Clock, Zap } from "lucide-react";
import type { Match, Team } from "./types";
import { formatMatchTime, matchTitle } from "./match-utils";

function Scores({ t1, t2, s1, s2, live }: { t1: Team | null; t2: Team | null; s1: number | null; s2: number | null; live?: boolean }) {
  return (
    <div className="mt-4 space-y-2">
      {[
        { team: t1, score: s1 },
        { team: t2, score: s2 },
      ].map((row, i) => (
        <div key={i} className="flex items-center justify-between gap-3 rounded-xl border-2 border-border bg-muted/40 px-4 py-3">
          <span className="truncate font-bold">{row.team?.name ?? "TBD"}</span>
          <span className={`font-display text-3xl font-extrabold tabular-nums text-primary ${live ? "animate-score-pop" : ""}`}>
            {row.score ?? "·"}
          </span>
        </div>
      ))}
    </div>
  );
}

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
          <p className="mt-3 font-display text-xl font-bold uppercase leading-tight">{matchTitle(match, t1, t2)}</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> {formatMatchTime(match.scheduled_at)}
          </p>
          <Scores t1={t1} t2={t2} s1={match.score1} s2={match.score2} live />
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
          <p className="mt-3 font-display text-xl font-bold uppercase">{matchTitle(match, t1, t2)}</p>
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
