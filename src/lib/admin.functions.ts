import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  assertAdminAccess,
  assertAdminToken,
  checkAdminPassword,
  createAdminToken,
} from "@/lib/admin-auth";

const SCHOOL_DOMAIN = "@itispaleocapa.it";

const adminTokenSchema = z.object({ adminToken: z.string().min(10) });

function validateSchoolEmail(email: string) {
  if (!email.toLowerCase().endsWith(SCHOOL_DOMAIN)) {
    throw new Error(`Email deve appartenere al dominio ${SCHOOL_DOMAIN}`);
  }
}

function requireToken(adminToken: string) {
  assertAdminToken(adminToken);
}

export const adminVerify = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string() }).parse(d))
  .handler(async ({ data }) => {
    assertAdminAccess(data.password);
      return { ok: true, adminToken: createAdminToken(), expiresIn: 7200 };
  });

// 2FA endpoints removed; single-step `adminVerify` returns the admin token.

const settingKey = z.enum([
  "regolamento",
  "max_teams",
  "announcement",
  "registrations_open",
]);

export const adminUpdateSetting = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        adminToken: z.string(),
        key: settingKey,
        value: z.unknown(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    requireToken(data.adminToken);
    const { error } = await supabaseAdmin
      .from("settings")
      .upsert({ key: data.key, value: data.value as never });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteTeam = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ adminToken: z.string(), teamId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    requireToken(data.adminToken);
    const { error } = await supabaseAdmin.from("teams").delete().eq("id", data.teamId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpdateTeam = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        adminToken: z.string(),
        teamId: z.string().uuid(),
        name: z.string().trim().min(1),
        captain_first_name: z.string().trim().min(1),
        captain_last_name: z.string().trim().min(1),
        captain_class: z.string().trim().min(1).max(3),
        captain_phone: z.string().trim().min(6),
        captain_email: z.string().email(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    requireToken(data.adminToken);
    validateSchoolEmail(data.captain_email);
    const { error } = await supabaseAdmin
      .from("teams")
      .update({
        name: data.name,
        captain_first_name: data.captain_first_name,
        captain_last_name: data.captain_last_name,
        captain_class: data.captain_class,
        captain_phone: data.captain_phone,
        captain_email: data.captain_email,
      })
      .eq("id", data.teamId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpdateMember = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        adminToken: z.string(),
        memberId: z.string().uuid(),
        first_name: z.string().trim().min(1),
        last_name: z.string().trim().min(1),
        class: z.string().trim().min(1).max(3),
        position: z.number().int().min(1).nullable().optional(),
        is_reserve: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    requireToken(data.adminToken);
    const { error } = await supabaseAdmin
      .from("team_members")
      .update({
        first_name: data.first_name,
        last_name: data.last_name,
        class: data.class,
        position: data.position,
        is_reserve: data.is_reserve,
      })
      .eq("id", data.memberId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminResetTournament = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ adminToken: z.string() }).parse(d))
  .handler(async ({ data }) => {
    requireToken(data.adminToken);
    await supabaseAdmin.from("matches").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabaseAdmin.from("teams").update({ eliminated: false }).neq("id", "00000000-0000-0000-0000-000000000000");
    return { ok: true };
  });

export const adminUpdateMatch = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        adminToken: z.string(),
        matchId: z.string().uuid(),
        score1: z.number().int().min(0).nullable(),
        score2: z.number().int().min(0).nullable(),
        status: z.enum(["pending", "in_progress", "completed"]),
        scheduledAt: z.string().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    requireToken(data.adminToken);

    const { data: match, error: e1 } = await supabaseAdmin
      .from("matches")
      .select("*")
      .eq("id", data.matchId)
      .single();
    if (e1 || !match) throw new Error("Partita non trovata");

    let winner_id: string | null = null;
    if (
      data.status === "completed" &&
      data.score1 != null &&
      data.score2 != null &&
      data.score1 !== data.score2
    ) {
      winner_id = data.score1 > data.score2 ? match.team1_id : match.team2_id;
    }

    const { error } = await supabaseAdmin
      .from("matches")
      .update({
        score1: data.score1,
        score2: data.score2,
        status: data.status,
        winner_id,
        scheduled_at: data.scheduledAt ?? null,
      })
      .eq("id", data.matchId);
    if (error) throw new Error(error.message);

    if (winner_id) {
      const nextRound = match.round + 1;
      const nextPos = Math.ceil(match.position / 2);
      const slot = match.position % 2 === 1 ? "team1_id" : "team2_id";

      const { data: nextMatch } = await supabaseAdmin
        .from("matches")
        .select("id")
        .eq("round", nextRound)
        .eq("position", nextPos)
        .maybeSingle();

      if (nextMatch) {
        const upd = slot === "team1_id" ? { team1_id: winner_id } : { team2_id: winner_id };
        await supabaseAdmin.from("matches").update(upd).eq("id", nextMatch.id);
      }

      const loser_id = winner_id === match.team1_id ? match.team2_id : match.team1_id;
      if (loser_id) {
        await supabaseAdmin.from("teams").update({ eliminated: true }).eq("id", loser_id);
      }
    }

    return { ok: true };
  });

export const adminSetBracketSlot = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        adminToken: z.string(),
        teamId: z.string().uuid(),
        bracketSlot: z.number().int().min(1).max(32).nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    requireToken(data.adminToken);
    const { error } = await supabaseAdmin
      .from("teams")
      .update({ bracket_slot: data.bracketSlot })
      .eq("id", data.teamId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminToggleEliminated = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ adminToken: z.string(), teamId: z.string().uuid(), eliminated: z.boolean() }).parse(d),
  )
  .handler(async ({ data }) => {
    requireToken(data.adminToken);
    const { error } = await supabaseAdmin
      .from("teams")
      .update({ eliminated: data.eliminated })
      .eq("id", data.teamId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminQuickMatch = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        adminToken: z.string(),
        matchId: z.string().uuid(),
        action: z.enum(["start", "reset", "complete"]),
        score1: z.number().int().min(0).optional(),
        score2: z.number().int().min(0).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    requireToken(data.adminToken);
    const { data: match, error: e1 } = await supabaseAdmin
      .from("matches")
      .select("*")
      .eq("id", data.matchId)
      .single();
    if (e1 || !match) throw new Error("Partita non trovata");

    if (data.action === "start") {
      await supabaseAdmin.from("matches").update({ status: "in_progress", score1: 0, score2: 0 }).eq("id", data.matchId);
      return { ok: true };
    }
    if (data.action === "reset") {
      await supabaseAdmin
        .from("matches")
        .update({ status: "pending", score1: null, score2: null, winner_id: null })
        .eq("id", data.matchId);
      return { ok: true };
    }

    const s1 = data.score1 ?? match.score1 ?? 0;
    const s2 = data.score2 ?? match.score2 ?? 0;
    if (s1 === s2) throw new Error("Pareggio non valido");

    const winner_id = s1 > s2 ? match.team1_id : match.team2_id;
    await supabaseAdmin
      .from("matches")
      .update({ status: "completed", score1: s1, score2: s2, winner_id })
      .eq("id", data.matchId);

    const nextRound = match.round + 1;
    const nextPos = Math.ceil(match.position / 2);
    const slot = match.position % 2 === 1 ? "team1_id" : "team2_id";
    const { data: nextMatch } = await supabaseAdmin
      .from("matches")
      .select("id")
      .eq("round", nextRound)
      .eq("position", nextPos)
      .maybeSingle();
    if (nextMatch && winner_id) {
      const upd = slot === "team1_id" ? { team1_id: winner_id } : { team2_id: winner_id };
      await supabaseAdmin.from("matches").update(upd).eq("id", nextMatch.id);
    }
    const loser_id = winner_id === match.team1_id ? match.team2_id : match.team1_id;
    if (loser_id) await supabaseAdmin.from("teams").update({ eliminated: true }).eq("id", loser_id);
    return { ok: true };
  });

export const adminGenerateBracket = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ adminToken: z.string() }).parse(d))
  .handler(async ({ data }) => {
    requireToken(data.adminToken);
    const { count } = await supabaseAdmin.from("matches").select("id", { count: "exact", head: true });
    if (count && count > 0) throw new Error("Tabellone già presente");

    const { data: maxRow } = await supabaseAdmin.from("settings").select("value").eq("key", "max_teams").maybeSingle();
    const max_t = Number(maxRow?.value ?? 8);
    const { count: teamCount } = await supabaseAdmin.from("teams").select("id", { count: "exact", head: true });
    if (!teamCount || teamCount < max_t) {
      throw new Error(`Servono ${max_t} squadre (iscritte: ${teamCount ?? 0})`);
    }

    for (let pos = 1; pos <= max_t / 2; pos++) {
      const { data: t1 } = await supabaseAdmin.from("teams").select("id").eq("bracket_slot", pos * 2 - 1).maybeSingle();
      const { data: t2 } = await supabaseAdmin.from("teams").select("id").eq("bracket_slot", pos * 2).maybeSingle();
      const { error } = await supabaseAdmin.from("matches").insert({
        round: 1,
        position: pos,
        team1_id: t1?.id ?? null,
        team2_id: t2?.id ?? null,
      });
      if (error) throw new Error(error.message);
    }
    if (max_t === 8) {
      await supabaseAdmin.from("matches").insert([
        { round: 2, position: 1 },
        { round: 2, position: 2 },
        { round: 3, position: 1 },
      ]);
    }
    return { ok: true };
  });

export const adminSwapBracketSlots = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ adminToken: z.string(), teamIdA: z.string().uuid(), teamIdB: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    requireToken(data.adminToken);
    const { data: a } = await supabaseAdmin.from("teams").select("bracket_slot").eq("id", data.teamIdA).single();
    const { data: b } = await supabaseAdmin.from("teams").select("bracket_slot").eq("id", data.teamIdB).single();
    if (!a || !b) throw new Error("Squadra non trovata");
    await supabaseAdmin.from("teams").update({ bracket_slot: null }).eq("id", data.teamIdA);
    await supabaseAdmin.from("teams").update({ bracket_slot: null }).eq("id", data.teamIdB);
    await supabaseAdmin.from("teams").update({ bracket_slot: b.bracket_slot }).eq("id", data.teamIdA);
    await supabaseAdmin.from("teams").update({ bracket_slot: a.bracket_slot }).eq("id", data.teamIdB);
    return { ok: true };
  });

export const adminDeleteAllTeams = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ adminToken: z.string(), confirm: z.literal("DELETE_ALL") }).parse(d))
  .handler(async ({ data }) => {
    requireToken(data.adminToken);
    await supabaseAdmin.from("matches").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabaseAdmin.from("teams").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    return { ok: true };
  });
