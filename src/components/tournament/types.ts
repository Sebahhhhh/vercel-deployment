export type Team = { id: string; name: string; bracket_slot: number | null; eliminated: boolean };

export type Match = {
  id: string;
  round: number;
  position: number;
  team1_id: string | null;
  team2_id: string | null;
  winner_id: string | null;
  score1: number | null;
  score2: number | null;
  status: string;
  scheduled_at: string | null;
};
