import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { formatINR, timeAgo } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/listings")({ component: AdminListings });

function AdminListings() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const { data = [] } = useQuery({
    queryKey: ["admin-listings", filter],
    queryFn: async () => {
      let q = supabase.from("listings").select("*,profiles!listings_user_id_fkey(full_name),listing_images(url,position)").order("created_at", { ascending: false }).limit(200);
      if (filter !== "all") q = q.eq("status", filter);
      const { data } = await q;
      return data ?? [];
    },
  });

  async function setStatus(id: string, status: "approved" | "rejected") {
    const { error } = await supabase.from("listings").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "approved" ? "Approved" : "Rejected");
    qc.invalidateQueries({ queryKey: ["admin-listings"] });
  }
  async function del(id: string) {
    if (!confirm("Delete this listing?")) return;
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-listings"] });
  }
  async function feature(id: string, cur: boolean) {
    await supabase.from("listings").update({ featured: !cur }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-listings"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {(["pending", "approved", "rejected", "all"] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={"rounded-full px-3 py-1 text-xs font-semibold ring-1 " + (filter === s ? "bg-primary text-primary-foreground ring-primary" : "bg-surface ring-border")}>{s}</button>
        ))}
      </div>
      <div className="space-y-3">
        {data.map((l: any) => {
          const img = l.listing_images?.sort((a: any, b: any) => a.position - b.position)[0]?.url;
          return (
            <div key={l.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-border">
              <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-muted">{img && <img src={img} alt="" className="size-full object-cover" />}</div>
              <div className="min-w-0 flex-1">
                <div className="line-clamp-1 font-semibold">{l.title}</div>
                <div className="text-xs text-muted-foreground">{l.profiles?.full_name} • {l.island} • {timeAgo(l.created_at)}</div>
                <div className="mt-0.5 text-sm font-semibold text-primary">{formatINR(l.price)}</div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {l.status !== "approved" && <Button size="sm" onClick={() => setStatus(l.id, "approved")}>Approve</Button>}
                {l.status !== "rejected" && <Button size="sm" variant="outline" onClick={() => setStatus(l.id, "rejected")}>Reject</Button>}
                <Button size="sm" variant="outline" onClick={() => feature(l.id, l.featured)}>{l.featured ? "Unfeature" : "Feature"}</Button>
                <Button size="sm" variant="destructive" onClick={() => del(l.id)}>Delete</Button>
              </div>
            </div>
          );
        })}
        {data.length === 0 && <p className="rounded-2xl bg-surface p-8 text-center text-sm text-muted-foreground ring-1 ring-border">Nothing here.</p>}
      </div>
    </div>
  );
}
