import { Trophy } from "lucide-react";
import type { Match, Team } from "./types";
import { formatMatchTime, roundLabel, teamById } from "./match-utils";

function Slot({ match, t1, t2 }: { match: Match; t1: Team | null; t2: Team | null }) {
  const live = match.status === "in_progress";
  const w1 = match.winner_id === match.team1_id;
  const w2 = match.winner_id === match.team2_id;
  return (
    <div
      className={`rounded-xl border-2 px-3 py-2.5 text-xs transition-all ${
        live ? "border-secondary bg-secondary/10" : "border-border bg-muted/30"
      }`}
    >
      <p className="mb-2 truncate text-[10px] font-bold text-muted-foreground">{formatMatchTime(match.scheduled_at)}</p>
      <div className={`flex justify-between gap-2 ${w1 ? "text-secondary font-bold" : ""}`}>
        <span className="truncate">{t1?.name ?? "—"}</span>
        <span className="font-mono font-bold">{match.score1 ?? "·"}</span>
      </div>
      <div className={`mt-1 flex justify-between gap-2 ${w2 ? "text-secondary font-bold" : ""}`}>
        <span className="truncate">{t2?.name ?? "—"}</span>
        <span className="font-mono font-bold">{match.score2 ?? "·"}</span>
      </div>
    </div>
  );
}

export function BracketSchematic({ matches, teams }: { matches: Match[]; teams: Team[] }) {
  if (!matches.some((m) => m.round === 1)) {
    return (
      <div className="card-arena border-dashed p-10 text-center">
        <Trophy className="mx-auto h-14 w-14 text-muted-foreground/30" />
        <p className="mt-3 text-sm text-muted-foreground">Tabellone non ancora generato.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="hidden min-w-[700px] grid-cols-3 gap-5 md:grid">
        {[1, 2, 3].map((r) => {
          const rm = matches.filter((m) => m.round === r).sort((a, b) => a.position - b.position);
          if (!rm.length) return null;
          return (
            <div key={r} className={`flex flex-col gap-3 ${r === 2 ? "pt-8" : r === 3 ? "pt-20" : ""}`}>
              <h3 className="text-center font-display text-xs font-bold uppercase tracking-widest text-primary">
                {roundLabel(r)}
              </h3>
              <div className="flex flex-1 flex-col justify-around gap-3">
                {rm.map((m) => (
                  <Slot key={m.id} match={m} t1={teamById(teams, m.team1_id)} t2={teamById(teams, m.team2_id)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="space-y-6 md:hidden">
        {[1, 2, 3].map((r) => {
          const rm = matches.filter((m) => m.round === r).sort((a, b) => a.position - b.position);
          if (!rm.length) return null;
          return (
            <div key={r}>
              <h3 className="mb-2 font-display text-sm font-bold uppercase text-primary">{roundLabel(r)}</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {rm.map((m) => (
                  <Slot key={m.id} match={m} t1={teamById(teams, m.team1_id)} t2={teamById(teams, m.team2_id)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
