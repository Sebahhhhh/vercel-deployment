import { useEffect } from "react";
import { completeOAuthFromUrl } from "@/lib/google-auth";

/** Gestisce il ritorno OAuth (redirect con token in URL). */
export function AuthBootstrap() {
  useEffect(() => {
    completeOAuthFromUrl().catch((e) => {
      console.error("[auth] callback", e);
    });
  }, []);
  return null;
}
