import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/Layout";

export const Route = createFileRoute("/regolamento")({
  head: () => ({ meta: [{ title: "Regolamento — Torneo di Pallavolo" }] }),
  component: Regolamento,
});

function Regolamento() {
  const { data: regolamento = "" } = useQuery({
    queryKey: ["regolamento"],
    queryFn: async () =>
      String((await supabase.from("settings").select("value").eq("key", "regolamento").maybeSingle()).data?.value ?? ""),
  });

  return (
    <PageShell title="Regolamento" subtitle="Linee guida del torneo" wide>
      <div className="card-arena p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="label-caps flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Documento ufficiale
          </span>
          <Link to="/iscrizione" className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Torna alle iscrizioni
          </Link>
        </div>
        <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted-foreground">
          {regolamento || "Regolamento non disponibile."}
        </pre>
      </div>
    </PageShell>
  );
}
