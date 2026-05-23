import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Lock, Loader2, Shield, KeyRound } from "lucide-react";
import { PageShell } from "@/components/Layout";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { clearAdminToken, loadAdminToken, saveAdminToken } from "@/lib/admin-session";
import { adminVerifyPassword, adminVerifyTotp } from "@/lib/admin.functions";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const Route = createFileRoute("/gestione")({
  head: () => ({ meta: [{ title: "Gestione — Control room" }] }),
  component: Gestione,
});

type LoginStep = "password" | "totp";

function Gestione() {
  const [adminToken, setAdminToken] = useState<string | null>(() => loadAdminToken());
  const [step, setStep] = useState<LoginStep>("password");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [checking, setChecking] = useState(false);

  const verifyPasswordFn = useServerFn(adminVerifyPassword);
  const verifyTotpFn = useServerFn(adminVerifyTotp);

  useEffect(() => {
    const stored = loadAdminToken();
    if (stored) setAdminToken(stored);
  }, []);

  const handlePasswordStep = async () => {
    setChecking(true);
    try {
      await verifyPasswordFn({ data: { password } });
      setStep("totp");
      setTotpCode("");
      toast.success("Password ok — codice 2FA");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Password errata");
    } finally {
      setChecking(false);
    }
  };

  const handleTotpStep = async () => {
    if (totpCode.length !== 6) {
      toast.error("6 cifre richieste");
      return;
    }
    setChecking(true);
    try {
      const res = await verifyTotpFn({ data: { password, totpCode } });
      saveAdminToken(res.adminToken);
      setAdminToken(res.adminToken);
      setPassword("");
      setTotpCode("");
      toast.success("Control room attiva");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "2FA errato");
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
      <PageShell title="Control room" subtitle="Password + autenticatore" bare>
        <div className="mx-auto max-w-sm animate-rise card-arena p-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            {step === "password" ? <Lock className="h-8 w-8" /> : <Shield className="h-8 w-8" />}
          </div>
          {step === "password" ? (
            <>
              <h2 className="mt-5 text-center font-display text-xl font-bold uppercase">Password</h2>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePasswordStep()}
                className="mt-4 w-full rounded-xl border-2 border-border bg-input px-4 py-3 text-center"
                autoComplete="current-password"
              />
              <button onClick={handlePasswordStep} disabled={checking || !password} className="btn-primary mt-4 w-full">
                {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Continua
              </button>
            </>
          ) : (
            <>
              <h2 className="mt-5 text-center font-display text-xl font-bold uppercase">2FA</h2>
              <div className="mt-6 flex justify-center">
                <InputOTP maxLength={6} value={totpCode} onChange={setTotpCode}>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} className="h-12 w-11 border-2 text-lg font-bold" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <button onClick={handleTotpStep} disabled={checking || totpCode.length !== 6} className="btn-primary mt-6 w-full">
                {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                Entra
              </button>
              <button type="button" onClick={() => setStep("password")} className="mt-3 w-full text-center text-xs text-muted-foreground">
                ← Indietro
              </button>
            </>
          )}
        </div>
      </PageShell>
    );
  }

  return <AdminDashboard adminToken={adminToken} onLogout={handleLogout} />;
}
