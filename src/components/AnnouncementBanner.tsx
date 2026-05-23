import { useQuery } from "@tanstack/react-query";
import { Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function AnnouncementBanner() {
  const { data: text = "" } = useQuery({
    queryKey: ["announcement"],
    queryFn: async () =>
      String((await supabase.from("settings").select("value").eq("key", "announcement").maybeSingle()).data?.value ?? ""),
    staleTime: 30_000,
  });
  if (!text.trim()) return null;
  return (
    <div className="mb-4 flex gap-3 rounded-2xl border border-white/70 bg-white/65 px-4 py-3 shadow-soft backdrop-blur-xl">
      <Megaphone className="h-5 w-5 shrink-0 text-secondary" />
      <p className="text-sm font-medium leading-snug">{text}</p>
    </div>
  );
}
