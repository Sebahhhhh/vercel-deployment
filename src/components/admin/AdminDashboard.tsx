import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Save,
  Trash2,
  RotateCcw,
  Users,
  FileText,
  Swords,
  Settings,
  LayoutDashboard,
  Play,
  Square,
  CheckCircle2,
  Shuffle,
  Download,
  Megaphone,
  LockOpen,
  Lock,
  AlertTriangle,
  Eye,
  Mail,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/Layout";
import {
  adminUpdateMatch,
  adminUpdateSetting,
  adminDeleteTeam,
  adminResetTournament,
  adminUpdateTeam,
  adminUpdateMember,
  adminQuickMatch,
  adminGenerateBracket,
  adminSetBracketSlot,
  adminToggleEliminated,
  adminSwapBracketSlots,
  adminDeleteAllTeams,
  adminListAccessLogs,
  adminListEmailAttempts,
} from "@/lib/admin.functions";

type Tab = "overview" | "matches" | "teams" | "settings" | "accessi";

export function AdminDashboard({ adminToken, onLogout }: { adminToken: string; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("overview");
  const qc = useQueryClient();

  const { data: teams = [] } = useQuery({
    queryKey: ["adm-teams"],
    queryFn: async () => (await supabase.from("teams").select("*").order("bracket_slot")).data ?? [],
  });
  const { data: members = [] } = useQuery({
    queryKey: ["adm-members"],
    queryFn: async () => (await supabase.from("team_members").select("*").order("position")).data ?? [],
  });
  const { data: matches = [] } = useQuery({
    queryKey: ["adm-matches"],
    queryFn: async () => (await supabase.from("matches").select("*").order("round").order("position")).data ?? [],
  });
  const { data: settings } = useQuery({
    queryKey: ["adm-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("settings").select("key, value");
      const map: Record<string, unknown> = {};
      for (const row of data ?? []) map[row.key] = row.value;
      return {
        regolamento: String(map.regolamento ?? ""),
        max_teams: Number(map.max_teams ?? 8),
        announcement: String(map.announcement ?? ""),
        registrations_open: map.registrations_open !== false && map.registrations_open !== "false",
      };
    },
  });

  const run = async (p: Promise<unknown>, msg = "Ok") => {
    try {
      await p;
      toast.success(msg);
      qc.invalidateQueries();
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : "Errore";
      toast.error(m);
      if (/scaduta|non valida/i.test(m)) onLogout();
    }
  };

  const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "overview", label: "Panoramica", icon: LayoutDashboard },
    { id: "matches", label: "Partite", icon: Swords },
    { id: "teams", label: "Squadre", icon: Users },
    { id: "settings", label: "Config", icon: Settings },
    { id: "accessi", label: "Accessi", icon: Eye },
  ];

  const live = matches.filter((m) => m.status === "in_progress").length;
  const done = matches.filter((m) => m.status === "completed").length;

  const exportCsv = () => {
    const rows = [
      ["slot", "nome", "capitano", "email", "classe", "telefono", "eliminata"],
      ...teams.map((t) => [
        t.bracket_slot,
        t.name,
        `${t.captain_first_name} ${t.captain_last_name}`,
        t.captain_email,
        t.captain_class,
        t.captain_phone,
        t.eliminated ? "sì" : "no",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `squadre-torneo-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    toast.success("CSV scaricato");
  };

  return (
    <PageShell
      title="Control room"
      subtitle="Gestione completa torneo"
      wide
      headerAction={
        <button onClick={onLogout} className="btn-secondary text-xs py-2 px-3">
          Esci
        </button>
      }
    >
      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 rounded-full border-2 px-4 py-2 text-xs font-bold transition-all ${
              tab === id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/50"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <OverviewTab
          adminToken={adminToken}
          teams={teams.length}
          matches={matches.length}
          live={live}
          done={done}
          maxTeams={settings?.max_teams ?? 8}
          onExport={exportCsv}
          run={run}
        />
      )}
      {tab === "matches" && <MatchesTab adminToken={adminToken} matches={matches} teams={teams} run={run} />}
      {tab === "teams" && (
        <TeamsTab adminToken={adminToken} teams={teams} members={members} run={run} />
      )}
      {tab === "settings" && settings && (
        <SettingsTab adminToken={adminToken} settings={settings} run={run} />
      )}
      {tab === "accessi" && <AccessiTab adminToken={adminToken} />}
    </PageShell>
  );
}

function formatTimestamp(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("it-IT", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AccessiTab({ adminToken }: { adminToken: string }) {
  const listAccess = useServerFn(adminListAccessLogs);
  const listEmailAttempts = useServerFn(adminListEmailAttempts);

  const { data: accessLogs = [] } = useQuery({
    queryKey: ["adm-access-logs", adminToken],
    queryFn: async () => (await listAccess({ data: { adminToken, limit: 200 } })).logs ?? [],
  });

  const { data: emailAttempts = [] } = useQuery({
    queryKey: ["adm-email-attempts", adminToken],
    queryFn: async () => (await listEmailAttempts({ data: { adminToken, limit: 200 } })).attempts ?? [],
  });

  return (
    <div className="space-y-6">
      <div className="card-arena p-4">
        <p className="label-caps mb-3 flex items-center gap-2">
          <Eye className="h-4 w-4" /> Visualizzazioni sito
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="text-muted-foreground">
              <tr>
                <th className="pb-2">Quando</th>
                <th className="pb-2">Pagina</th>
                <th className="pb-2">IP</th>
                <th className="pb-2">Dispositivo</th>
                <th className="pb-2">Browser</th>
                <th className="pb-2">OS</th>
              </tr>
            </thead>
            <tbody>
              {accessLogs.map((row) => (
                <tr key={row.id} className="border-t border-border/60">
                  <td className="py-2 pr-3 font-medium">{formatTimestamp(row.created_at)}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{row.path ?? "—"}</td>
                  <td className="py-2 pr-3">{row.ip ?? "—"}</td>
                  <td className="py-2 pr-3">{row.device ?? "—"}</td>
                  <td className="py-2 pr-3">{row.browser ?? "—"}</td>
                  <td className="py-2 pr-3">{row.os ?? "—"}</td>
                </tr>
              ))}
              {accessLogs.length === 0 && (
                <tr>
                  <td className="py-3 text-muted-foreground" colSpan={6}>
                    Nessun accesso registrato.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card-arena p-4">
        <p className="label-caps mb-3 flex items-center gap-2">
          <Mail className="h-4 w-4" /> Tentativi email iscrizione
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="text-muted-foreground">
              <tr>
                <th className="pb-2">Quando</th>
                <th className="pb-2">Email</th>
                <th className="pb-2">IP</th>
                <th className="pb-2">Dispositivo</th>
                <th className="pb-2">Browser</th>
                <th className="pb-2">OS</th>
              </tr>
            </thead>
            <tbody>
              {emailAttempts.map((row) => (
                <tr key={row.id} className="border-t border-border/60">
                  <td className="py-2 pr-3 font-medium">{formatTimestamp(row.created_at)}</td>
                  <td className="py-2 pr-3">{row.email}</td>
                  <td className="py-2 pr-3">{row.ip ?? "—"}</td>
                  <td className="py-2 pr-3">{row.device ?? "—"}</td>
                  <td className="py-2 pr-3">{row.browser ?? "—"}</td>
                  <td className="py-2 pr-3">{row.os ?? "—"}</td>
                </tr>
              ))}
              {emailAttempts.length === 0 && (
                <tr>
                  <td className="py-3 text-muted-foreground" colSpan={6}>
                    Nessun tentativo registrato.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function OverviewTab({
  adminToken,
  teams,
  matches,
  live,
  done,
  maxTeams,
  onExport,
  run,
}: {
  adminToken: string;
  teams: number;
  matches: number;
  live: number;
  done: number;
  maxTeams: number;
  onExport: () => void;
  run: (p: Promise<unknown>, msg?: string) => Promise<void>;
}) {
  const gen = useServerFn(adminGenerateBracket);
  const reset = useServerFn(adminResetTournament);
  const delAll = useServerFn(adminDeleteAllTeams);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Squadre", value: `${teams}/${maxTeams}` },
          { label: "Partite", value: String(matches) },
          { label: "Live", value: String(live) },
          { label: "Finite", value: String(done) },
        ].map((s) => (
          <div key={s.label} className="card-arena p-4 text-center">
            <p className="label-caps">{s.label}</p>
            <p className="mt-2 font-display text-3xl font-extrabold text-primary">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="card-arena p-4">
        <p className="label-caps mb-3">Azioni rapide</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => run(gen({ data: { adminToken } }), "Tabellone generato")} className="btn-primary text-xs">
            Genera tabellone
          </button>
          <button onClick={onExport} className="btn-secondary text-xs">
            <Download className="h-4 w-4" /> Esporta CSV
          </button>
          <button
            onClick={() => {
              if (confirm("Azzerare partite e reset eliminazioni?")) run(reset({ data: { adminToken } }), "Torneo azzerato");
            }}
            className="btn-secondary text-xs"
          >
            <RotateCcw className="h-4 w-4" /> Reset torneo
          </button>
        </div>
      </div>
      <div className="rounded-2xl border-2 border-destructive/50 bg-destructive/10 p-4">
        <p className="flex items-center gap-2 text-sm font-bold text-destructive">
          <AlertTriangle className="h-4 w-4" /> Zona critica
        </p>
        <button
          onClick={() => {
            if (prompt('Scrivi DELETE_ALL per confermare') === "DELETE_ALL") {
              run(delAll({ data: { adminToken, confirm: "DELETE_ALL" } }), "Tutte le squadre eliminate");
            }
          }}
          className="mt-3 rounded-full bg-destructive px-4 py-2 text-xs font-bold text-destructive-foreground"
        >
          Elimina tutte le squadre
        </button>
      </div>
    </div>
  );
}

function MatchesTab({
  adminToken,
  matches,
  teams,
  run,
}: {
  adminToken: string;
  matches: Array<{
    id: string;
    round: number;
    position: number;
    team1_id: string | null;
    team2_id: string | null;
    score1: number | null;
    score2: number | null;
    status: string;
    scheduled_at: string | null;
  }>;
  teams: Array<{ id: string; name: string }>;
  run: (p: Promise<unknown>, msg?: string) => Promise<void>;
}) {
  const upd = useServerFn(adminUpdateMatch);
  const quick = useServerFn(adminQuickMatch);

  return (
    <div className="space-y-3">
      {matches.map((m) => {
        const t1 = teams.find((t) => t.id === m.team1_id);
        const t2 = teams.find((t) => t.id === m.team2_id);
        const rn = m.round === 3 ? "Finale" : m.round === 2 ? "SF" : "Q";
        return (
          <div key={m.id} className="card-arena p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-display text-sm font-bold uppercase text-primary">
                {rn} #{m.position}
              </span>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => run(quick({ data: { adminToken, matchId: m.id, action: "start" } }), "In corso")}
                  className="rounded-full bg-secondary/20 p-2 text-secondary hover:bg-secondary/30"
                  title="Avvia"
                >
                  <Play className="h-4 w-4" />
                </button>
                <button
                  onClick={() => run(quick({ data: { adminToken, matchId: m.id, action: "reset" } }), "Reset")}
                  className="rounded-full bg-muted p-2"
                  title="Reset"
                >
                  <Square className="h-4 w-4" />
                </button>
                <button
                  onClick={() =>
                    run(
                      quick({
                        data: {
                          adminToken,
                          matchId: m.id,
                          action: "complete",
                          score1: m.score1 ?? 25,
                          score2: m.score2 ?? 20,
                        },
                      }),
                      "Conclusa",
                    )
                  }
                  className="rounded-full bg-primary/20 p-2 text-primary"
                  title="Chiudi con punteggio attuale"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="mt-2 text-sm font-bold">
              {t1?.name ?? "—"} <span className="text-muted-foreground">vs</span> {t2?.name ?? "—"}
            </p>
            <MatchForm
              match={m}
              onSave={(payload) =>
                run(upd({ data: { adminToken, matchId: m.id, ...payload } }), "Salvata")
              }
            />
          </div>
        );
      })}
      {matches.length === 0 && <p className="text-sm text-muted-foreground">Nessuna partita.</p>}
    </div>
  );
}

function toLocalTime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

function toIsoFromTime(value: string, baseIso: string | null) {
  if (!value) return null;
  const [h, m] = value.split(":").map((n) => Number(n));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const base = baseIso ? new Date(baseIso) : new Date();
  if (Number.isNaN(base.getTime())) return null;
  base.setHours(h, m, 0, 0);
  return base.toISOString();
}

function MatchForm({
  match,
  onSave,
}: {
  match: { score1: number | null; score2: number | null; status: string; scheduled_at: string | null };
  onSave: (p: {
    score1: number | null;
    score2: number | null;
    status: "pending" | "in_progress" | "completed";
    scheduledAt?: string | null;
  }) => void;
}) {
  const [s1, setS1] = useState(match.score1?.toString() ?? "");
  const [s2, setS2] = useState(match.score2?.toString() ?? "");
  const [status, setStatus] = useState(match.status as "pending" | "in_progress" | "completed");
  const [sched, setSched] = useState(toLocalTime(match.scheduled_at));

  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-3">
      <div className="flex gap-2">
        <input value={s1} onChange={(e) => setS1(e.target.value.replace(/\D/g, ""))} className="w-14 rounded-lg border-2 border-border bg-input px-2 py-2 text-center font-bold" />
        <input value={s2} onChange={(e) => setS2(e.target.value.replace(/\D/g, ""))} className="w-14 rounded-lg border-2 border-border bg-input px-2 py-2 text-center font-bold" />
      </div>
      <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="rounded-lg border-2 border-border bg-input px-2 py-2 text-sm">
        <option value="pending">Programmata</option>
        <option value="in_progress">In corso</option>
        <option value="completed">Conclusa</option>
      </select>
      <input
        type="time"
        min="08:20"
        max="12:00"
        value={sched}
        onChange={(e) => setSched(e.target.value)}
        placeholder="08:20"
        title="Solo orari della mattina (08:20-12:00)"
        className="rounded-lg border-2 border-border bg-input px-2 py-2 text-sm"
      />
      <button
        onClick={() =>
          onSave({
            score1: s1 === "" ? null : Number(s1),
            score2: s2 === "" ? null : Number(s2),
            status,
            scheduledAt: sched ? toIsoFromTime(sched, match.scheduled_at) : null,
          })
        }
        className="btn-primary text-xs sm:col-span-3"
      >
        <Save className="h-4 w-4" /> Salva
      </button>
    </div>
  );
}

function TeamsTab({
  adminToken,
  teams,
  members,
  run,
}: {
  adminToken: string;
  teams: Array<{
    id: string;
    name: string;
    bracket_slot: number | null;
    eliminated: boolean;
    captain_first_name: string;
    captain_last_name: string;
    captain_class: string;
    captain_phone: string;
    captain_email: string;
  }>;
  members: Array<{
    id: string;
    team_id: string;
    first_name: string;
    last_name: string;
    class: string;
    position?: number | null;
    is_reserve?: boolean | null;
  }>;
  run: (p: Promise<unknown>, msg?: string) => Promise<void>;
}) {
  const del = useServerFn(adminDeleteTeam);
  const setSlot = useServerFn(adminSetBracketSlot);
  const toggle = useServerFn(adminToggleEliminated);
  const swap = useServerFn(adminSwapBracketSlots);
  const [swapA, setSwapA] = useState("");
  const [swapB, setSwapB] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="card-arena flex flex-wrap items-end gap-2 p-4">
        <label className="text-xs font-bold">
          Scambia slot
          <select value={swapA} onChange={(e) => setSwapA(e.target.value)} className="mt-1 block rounded-lg border-2 border-border bg-input px-2 py-2 text-sm">
            <option value="">Squadra A</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                #{t.bracket_slot} {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold">
          con
          <select value={swapB} onChange={(e) => setSwapB(e.target.value)} className="mt-1 block rounded-lg border-2 border-border bg-input px-2 py-2 text-sm">
            <option value="">Squadra B</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                #{t.bracket_slot} {t.name}
              </option>
            ))}
          </select>
        </label>
        <button
          disabled={!swapA || !swapB}
          onClick={() => run(swap({ data: { adminToken, teamIdA: swapA, teamIdB: swapB } }), "Slot scambiati")}
          className="btn-secondary text-xs"
        >
          <Shuffle className="h-4 w-4" /> Scambia
        </button>
      </div>
      {teams.map((t) => {
        const teamMembers = members
          .filter((m) => m.team_id === t.id)
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        const isOpen = expandedId === t.id;
        return (
        <div key={t.id} className="card-arena p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold">{t.name}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setExpandedId(isOpen ? null : t.id)}
                className="rounded-full bg-muted px-3 py-1 text-[10px] font-bold text-muted-foreground"
              >
                {isOpen ? "Chiudi" : "Dettagli"}
              </button>
              <input
                type="number"
                min={1}
                max={32}
                defaultValue={t.bracket_slot ?? ""}
                onBlur={(e) => {
                  const v = e.target.value ? Number(e.target.value) : null;
                  run(setSlot({ data: { adminToken, teamId: t.id, bracketSlot: v } }), "Slot aggiornato");
                }}
                className="w-14 rounded-lg border-2 border-border bg-input px-2 py-1 text-center text-sm font-bold"
              />
              <button
                onClick={() =>
                  run(toggle({ data: { adminToken, teamId: t.id, eliminated: !t.eliminated } }), t.eliminated ? "Ripristinata" : "Eliminata")
                }
                className={`rounded-full px-3 py-1 text-[10px] font-bold ${t.eliminated ? "bg-muted" : "bg-destructive/20 text-destructive"}`}
              >
                {t.eliminated ? "Ripristina" : "Elimina"}
              </button>
              <button onClick={() => { if (confirm(`Eliminare ${t.name}?`)) run(del({ data: { adminToken, teamId: t.id } })); }} className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {t.captain_email} · {teamMembers.length} membri
          </p>
          {isOpen && (
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-2xl border border-white/60 bg-white/70 p-3 shadow-soft backdrop-blur">
                <p className="label-caps">Capitano</p>
                <p className="mt-2 font-semibold">
                  {t.captain_first_name} {t.captain_last_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Classe: {t.captain_class} · Tel: {t.captain_phone}
                </p>
                <p className="text-xs text-muted-foreground">Email: {t.captain_email}</p>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/70 p-3 shadow-soft backdrop-blur">
                <p className="label-caps">Membri</p>
                {teamMembers.length === 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">Nessun membro registrato.</p>
                ) : (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {teamMembers.map((m) => (
                      <div key={m.id} className="rounded-xl border border-white/70 bg-white/80 px-3 py-2">
                        <p className="text-sm font-semibold">
                          {m.first_name} {m.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Classe: {m.class}
                          {m.position ? ` · Pos: ${m.position}` : ""}
                          {m.is_reserve ? " · Riserva" : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      );
      })}
    </div>
  );
}

function SettingsTab({
  adminToken,
  settings,
  run,
}: {
  adminToken: string;
  settings: { regolamento: string; max_teams: number; announcement: string; registrations_open: boolean };
  run: (p: Promise<unknown>, msg?: string) => Promise<void>;
}) {
  const upd = useServerFn(adminUpdateSetting);
  const [reg, setReg] = useState(settings.regolamento);
  const [max, setMax] = useState(String(settings.max_teams));
  const [ann, setAnn] = useState(settings.announcement);
  const [open, setOpen] = useState(settings.registrations_open);

  return (
    <div className="space-y-4">
      <div className="card-arena p-4">
        <p className="label-caps mb-2 flex items-center gap-2">
          <Megaphone className="h-4 w-4" /> Bacheca live
        </p>
        <input value={ann} onChange={(e) => setAnn(e.target.value)} placeholder="Es. Finale alle 15:00 in palestra" className="w-full rounded-xl border-2 border-border bg-input px-3 py-2 text-sm" />
        <button onClick={() => run(upd({ data: { adminToken, key: "announcement", value: ann } }), "Bacheca aggiornata")} className="btn-primary mt-3 text-xs">
          Salva bacheca
        </button>
      </div>
      <div className="card-arena flex flex-wrap items-center justify-between gap-3 p-4">
        <span className="font-bold">Iscrizioni aperte</span>
        <button
          onClick={() => {
            const next = !open;
            setOpen(next);
            run(upd({ data: { adminToken, key: "registrations_open", value: next } }), next ? "Aperte" : "Chiuse");
          }}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold ${open ? "bg-secondary text-secondary-foreground" : "bg-muted"}`}
        >
          {open ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          {open ? "Aperte" : "Chiuse"}
        </button>
      </div>
      <div className="card-arena p-4">
        <p className="label-caps mb-2">Max squadre</p>
        <input type="number" min={4} max={32} value={max} onChange={(e) => setMax(e.target.value)} className="w-24 rounded-lg border-2 border-border bg-input px-3 py-2 font-bold" />
        <button
          onClick={() => run(upd({ data: { adminToken, key: "max_teams", value: Number(max) } }), "Max aggiornato")}
          className="btn-secondary ml-3 text-xs"
        >
          Salva
        </button>
      </div>
      <div className="card-arena p-4">
        <p className="label-caps mb-2 flex items-center gap-2">
          <FileText className="h-4 w-4" /> Regolamento
        </p>
        <textarea value={reg} onChange={(e) => setReg(e.target.value)} rows={10} className="w-full rounded-xl border-2 border-border bg-input px-3 py-2 font-mono text-xs" />
        <button onClick={() => run(upd({ data: { adminToken, key: "regolamento", value: reg } }), "Regolamento salvato")} className="btn-primary mt-3 text-xs">
          <Save className="h-4 w-4" /> Salva regolamento
        </button>
      </div>
    </div>
  );
}
