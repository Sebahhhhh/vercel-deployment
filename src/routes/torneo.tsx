import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Clock, X } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { PageShell } from "@/components/Layout";
import { BracketSchematic } from "@/components/tournament/BracketSchematic";
import { LiveMatchPanel, NextMatchPanel } from "@/components/tournament/LivePanels";
import type { Match, Team } from "@/components/tournament/types";
import { pickLiveAndNext, teamById } from "@/components/tournament/match-utils";

export const Route = createFileRoute("/torneo")({
  head: () => ({ meta: [{ title: "Torneo — Tabellone live" }] }),
  component: Torneo,
});

function Torneo() {
  const [showRules, setShowRules] = useState(false);

  const { data: teams = [] } = useQuery({
    queryKey: ["teams"],
    queryFn: async (): Promise<Team[]> =>
      (await supabase.from("teams").select("id,name,bracket_slot,eliminated").order("bracket_slot")).data ?? [],
    refetchInterval: 8000,
  });

  const { data: matches = [] } = useQuery({
    queryKey: ["matches"],
    queryFn: async (): Promise<Match[]> =>
      (await supabase.from("matches").select("*").order("round").order("position")).data ?? [],
    refetchInterval: (query) => {
      const list = query.state.data as Match[] | undefined;
      return list?.some((m) => m.status === "in_progress") ? 3000 : 8000;
    },
  });

  const { data: maxTeams = 8 } = useQuery({
    queryKey: ["max-teams"],
    queryFn: async () =>
      Number((await supabase.from("settings").select("value").eq("key", "max_teams").maybeSingle()).data?.value ?? 8),
  });

  const tournamentStarted = matches.length > 0;
  const { nowPlaying, nextMatch } = pickLiveAndNext(matches);

  const rulesAction = (
    <button
      onClick={() => setShowRules(true)}
      className="rounded-xl bg-primary-foreground/15 p-2.5 text-primary-foreground backdrop-blur-sm transition-all hover:bg-primary-foreground/25 active:scale-95"
      aria-label="Regolamento"
    >
      <BookOpen className="h-5 w-5" />
    </button>
  );

  return (
    <>
      <PageShell
        title="Torneo"
        subtitle={tournamentStarted ? "Tabellone live · aggiornamento automatico" : `${teams.length}/${maxTeams} squadre`}
        headerAction={rulesAction}
        wide={tournamentStarted}
      >
        <AnnouncementBanner />
        {!tournamentStarted ? (
          <div className="card-arena p-8 text-center">
            <Clock className="mx-auto h-12 w-12 text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">
              Il sorteggio parte al raggiungimento di <strong className="text-foreground">{maxTeams}</strong> iscrizioni.
            </p>
            {teams.length > 0 && (
              <ul className="mt-6 grid grid-cols-2 gap-2 text-left sm:grid-cols-4">
                {teams.map((t, i) => (
                  <li
                    key={t.id}
                    className="animate-fade-in rounded-xl border border-border bg-muted/30 px-3 py-2.5"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <span className="text-[10px] font-bold text-accent">#{t.bracket_slot}</span>
                    <p className="truncate text-sm font-medium">{t.name}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            <section className="grid gap-4 lg:grid-cols-2 animate-fade-in">
              <LiveMatchPanel
                match={nowPlaying}
                t1={nowPlaying ? teamById(teams, nowPlaying.team1_id) : null}
                t2={nowPlaying ? teamById(teams, nowPlaying.team2_id) : null}
              />
              <NextMatchPanel
                match={nextMatch}
                t1={nextMatch ? teamById(teams, nextMatch.team1_id) : null}
                t2={nextMatch ? teamById(teams, nextMatch.team2_id) : null}
              />
            </section>

            <section className="animate-fade-in stagger-2">
              <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Tabellone a eliminazione
              </h2>
              <BracketSchematic matches={matches} teams={teams} />
            </section>
          </div>
        )}
      </PageShell>

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    </>
  );
}

function RulesModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-card shadow-glow"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 px-5 py-4 backdrop-blur">
          <h2 className="font-display text-lg font-bold">Regolamento</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Chiudi">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-5 px-5 py-6 text-sm text-muted-foreground">
          <p>Eliminazione diretta: quarti → semifinali → finale. Partite al meglio dei 25 punti (min. 2 di scarto).</p>
          <p>Accesso iscrizione solo con account <strong className="text-foreground">@itispaleocapa.it</strong>.</p>
          <p>Fair play obbligatorio. Per assistenza: <strong className="text-foreground">rocchi.sebastiano.studente@itispaleocapa.it</strong></p>
        </div>
      </div>
    </div>
  );
}
