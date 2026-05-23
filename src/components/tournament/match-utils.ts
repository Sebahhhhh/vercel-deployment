import type { Match, Team } from "./types";

export function teamById(teams: Team[], id: string | null) {
  return teams.find((t) => t.id === id) ?? null;
}

export function roundLabel(round: number) {
  if (round === 3) return "Finale";
  if (round === 2) return "Semifinali";
  return "Quarti";
}

export function formatMatchTime(value: string | null) {
  if (!value) return "Orario da definire";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Orario non valido";
  return date.toLocaleString("it-IT", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function matchTitle(m: Match, t1: Team | null, t2: Team | null) {
  return `${t1?.name ?? "TBD"} vs ${t2?.name ?? "TBD"}`;
}

export function pickLiveAndNext(matches: Match[]) {
  const nowPlaying = matches.find((m) => m.status === "in_progress") ?? null;
  const upcoming = matches
    .filter((m) => m.status === "pending")
    .sort((a, b) => {
      if (a.scheduled_at && b.scheduled_at) {
        return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
      }
      if (a.scheduled_at) return -1;
      if (b.scheduled_at) return 1;
      return a.round - b.round || a.position - b.position;
    });
  return { nowPlaying, nextMatch: upcoming[0] ?? null };
}
