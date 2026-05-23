import { supabase } from "@/integrations/supabase/client";

function redirectPath(): string {
  if (typeof window === "undefined") return "/iscrizione";
  return window.location.pathname || "/iscrizione";
}

function parseTokensFromUrl(): { access_token: string; refresh_token: string } | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
  const search = window.location.search.startsWith("?") ? window.location.search.slice(1) : "";
  const params = new URLSearchParams(hash || search);
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (access_token && refresh_token) return { access_token, refresh_token };
  return null;
}

function cleanOAuthParamsFromUrl() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const strip = [
    "access_token",
    "refresh_token",
    "expires_in",
    "token_type",
    "type",
    "provider_token",
    "code",
  ];
  let changed = false;
  for (const key of strip) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }
  if (url.hash) {
    const hp = new URLSearchParams(url.hash.slice(1));
    for (const key of strip) {
      if (hp.has(key)) {
        hp.delete(key);
        changed = true;
      }
    }
    url.hash = hp.toString() ? `#${hp}` : "";
  }
  if (changed) window.history.replaceState({}, "", url.pathname + url.search + url.hash);
}

/** Completa redirect OAuth Supabase se ci sono token in URL. */
export async function completeOAuthFromUrl(): Promise<{ handled: boolean; error?: string }> {
  const tokens = parseTokensFromUrl();
  if (!tokens) {
    const { data, error } = await supabase.auth.getSession();
    if (error) return { handled: false, error: error.message };
    if (data.session && (window.location.search.includes("code=") || window.location.hash.includes("code="))) {
      cleanOAuthParamsFromUrl();
      return { handled: true };
    }
    return { handled: false };
  }
  const { error } = await supabase.auth.setSession(tokens);
  cleanOAuthParamsFromUrl();
  if (error) return { handled: true, error: error.message };
  return { handled: true };
}

/** Login Google tramite Supabase Auth. */
export async function signInWithGoogle(): Promise<{ redirected: boolean; error?: string }> {
  if (typeof window === "undefined") {
    return { redirected: false, error: "Login disponibile solo nel browser" };
  }
  try {
    const redirectTo = `${window.location.origin}${redirectPath()}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: { prompt: "select_account", access_type: "offline" },
      },
    });
    if (error) return { redirected: false, error: error.message };
    return { redirected: true };
  } catch (e: unknown) {
    return { redirected: false, error: e instanceof Error ? e.message : "Errore accesso Google" };
  }
}
