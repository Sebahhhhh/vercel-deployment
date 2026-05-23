import { createHmac, timingSafeEqual, createHash, randomBytes } from "node:crypto";
import { verifySync } from "otplib";

const TOKEN_TTL_MS = 2 * 60 * 60 * 1000; // 2 ore

function secureCompare(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

export function checkAdminPassword(input: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    throw new Error("Area gestione non configurata (ADMIN_PASSWORD)");
  }
  if (!secureCompare(input, expected)) {
    throw new Error("Password gestione non valida");
  }
}

export function checkAdminTotp(code: string) {
  const secret = process.env.ADMIN_TOTP_SECRET;
  if (!secret) {
    throw new Error("2FA non configurato (ADMIN_TOTP_SECRET)");
  }
  const normalized = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) {
    throw new Error("Codice 2FA non valido (6 cifre)");
  }
  const ok = verifySync({ secret, token: normalized });
  if (!ok) {
    throw new Error("Codice 2FA errato o scaduto");
  }
}

function sessionSecret(): string {
  const s = process.env.ADMIN_SESSION_SECRET ?? process.env.ADMIN_PASSWORD;
  if (!s) throw new Error("ADMIN_SESSION_SECRET o ADMIN_PASSWORD richiesto");
  return s;
}

export function createAdminToken(): string {
  const exp = Date.now() + TOKEN_TTL_MS;
  const nonce = randomBytes(12).toString("hex");
  const payload = `${exp}.${nonce}`;
  const sig = createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

export function validateAdminToken(token: string) {
  const parts = token.split(".");
  if (parts.length !== 2) throw new Error("Sessione admin non valida");
  let payload: string;
  try {
    payload = Buffer.from(parts[0], "base64url").toString("utf8");
  } catch {
    throw new Error("Sessione admin non valida");
  }
  const expectedSig = createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  const sigBuf = Buffer.from(parts[1]);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    throw new Error("Sessione admin non valida");
  }
  const [expStr] = payload.split(".");
  const exp = Number(expStr);
  if (!exp || Date.now() > exp) {
    throw new Error("Sessione admin scaduta — accedi di nuovo");
  }
}

export function assertAdminAccess(password: string, totpCode: string) {
  checkAdminPassword(password);
  checkAdminTotp(totpCode);
}

export function assertAdminToken(adminToken: string) {
  validateAdminToken(adminToken);
}
