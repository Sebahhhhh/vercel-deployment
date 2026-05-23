import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Lock, Loader2, Shield, KeyRound } from "lucide-react";
import { PageShell } from "@/components/Layout";
import { clearAdminToken, loadAdminToken, saveAdminToken } from "@/lib/admin-session";
import { adminVerify } from "@/lib/admin.functions";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const Route = createFileRoute("/gestione")({
  head: () => ({ meta: [{ title: "Gestione — Control room" }] }),
  component: Gestione,
});

function Gestione() {
  const [adminToken, setAdminToken] = useState<string | null>(() => loadAdminToken());
  const [password, setPassword] = useState("");
  const [checking, setChecking] = useState(false);

  const verifyFn = useServerFn(adminVerify);

  useEffect(() => {
    const stored = loadAdminToken();
    if (stored) setAdminToken(stored);
  }, []);

  const handleSubmit = async () => {
    setChecking(true);
    try {
      const res = await verifyFn({ data: { password } });
      saveAdminToken(res.adminToken);
      setAdminToken(res.adminToken);
      setPassword("");
      toast.success("Control room attiva");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Password errata");
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = () => {
    clearAdminToken();
    setAdminToken(null);
    setStep("password");
    setPassword("");
    setTotpCode("");
  };

  if (!adminToken) {
    return (
      <PageShell title="Control room" subtitle="Accesso amministrazione" bare>
        <div className="mx-auto max-w-sm animate-rise card-arena p-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Lock className="h-8 w-8" />
          </div>
          <>
            <h2 className="mt-5 text-center font-display text-xl font-bold uppercase">Password</h2>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="mt-4 w-full rounded-xl border-2 border-border bg-input px-4 py-3 text-center"
              autoComplete="current-password"
            />
            <button onClick={handleSubmit} disabled={checking || !password} className="btn-primary mt-4 w-full">
              {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Entra
            </button>
          </>
        </div>
      </PageShell>
    );
  }

  return <AdminDashboard adminToken={adminToken} onLogout={handleLogout} />;
}
