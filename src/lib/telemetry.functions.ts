import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function firstHeaderValue(value: string | null): string | null {
  if (!value) return null;
  const part = value.split(",")[0]?.trim();
  return part || null;
}

function parseUserAgent(ua: string | null) {
  const value = ua ?? "";
  const v = value.toLowerCase();

  let device = "Desktop";
  if (/tablet|ipad/.test(v)) device = "Tablet";
  else if (/mobile|iphone|android/.test(v)) device = "Mobile";

  let browser = "Altro";
  if (/edg\//.test(v)) browser = "Edge";
  else if (/chrome|crios/.test(v)) browser = "Chrome";
  else if (/safari/.test(v) && !/chrome|crios/.test(v)) browser = "Safari";
  else if (/firefox/.test(v)) browser = "Firefox";

  let os = "Altro";
  if (/windows nt/.test(v)) os = "Windows";
  else if (/mac os x/.test(v) && !/iphone|ipad/.test(v)) os = "macOS";
  else if (/android/.test(v)) os = "Android";
  else if (/iphone|ipad|ios/.test(v)) os = "iOS";
  else if (/linux/.test(v)) os = "Linux";

  return { device, browser, os };
}

function readRequestMeta() {
  const request = getRequest();
  const headers = request?.headers;
  const ip = firstHeaderValue(headers?.get("x-forwarded-for") ?? headers?.get("x-real-ip") ?? null);
  const userAgent = headers?.get("user-agent") ?? null;
  return { ip, userAgent };
}

export const logPageView = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ path: z.string().trim().min(1).optional() }).parse(d))
  .handler(async ({ data }) => {
    const { ip, userAgent } = readRequestMeta();
    const parsed = parseUserAgent(userAgent);
    const path = data.path ?? null;

    const { error } = await supabaseAdmin.from("access_logs").insert({
      path,
      ip,
      user_agent: userAgent,
      device: parsed.device,
      browser: parsed.browser,
      os: parsed.os,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const logRegistrationEmailAttempt = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ email: z.string().email(), path: z.string().trim().min(1).optional() }).parse(d))
  .handler(async ({ data }) => {
    const { ip, userAgent } = readRequestMeta();
    const parsed = parseUserAgent(userAgent);

    const { error } = await supabaseAdmin.from("registration_email_attempts").insert({
      email: data.email.toLowerCase(),
      path: data.path ?? null,
      ip,
      user_agent: userAgent,
      device: parsed.device,
      browser: parsed.browser,
      os: parsed.os,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
