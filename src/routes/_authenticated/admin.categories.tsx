import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/categories")({ component: AdminCategories });

function AdminCategories() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("position")).data ?? [],
  });
  async function toggle(slug: string, active: boolean) {
    await supabase.from("categories").update({ active: !active }).eq("slug", slug);
    qc.invalidateQueries({ queryKey: ["admin-categories"] });
  }
  return (
    <div className="space-y-3">
      <h2 className="font-heading text-xl font-bold">Categories</h2>
      <div className="space-y-2">
        {data.map((c: any) => (
          <div key={c.slug} className="flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-border">
            <div className="flex-1">
              <div className="font-semibold">{c.name_en} <span className="text-xs text-muted-foreground">/ {c.name_ml}</span></div>
              <div className="text-xs text-muted-foreground">Icon: {c.icon} • Slug: {c.slug}</div>
            </div>
            <Button size="sm" variant={c.active ? "outline" : "default"} onClick={() => toggle(c.slug, c.active)}>
              {c.active ? "Hide" : "Show"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
