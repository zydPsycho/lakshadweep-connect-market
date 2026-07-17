import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/")({ component: Dashboard });

function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [users, listings, pending, reports] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("listings").select("id", { count: "exact", head: true }),
        supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("reports").select("id", { count: "exact", head: true }).eq("resolved", false),
      ]);
      return {
        users: users.count ?? 0, listings: listings.count ?? 0,
        pending: pending.count ?? 0, reports: reports.count ?? 0,
      };
    },
  });
  const cards = [
    { label: "Users", value: stats?.users ?? "—" },
    { label: "Listings", value: stats?.listings ?? "—" },
    { label: "Pending review", value: stats?.pending ?? "—", tone: "primary" },
    { label: "Open reports", value: stats?.reports ?? "—", tone: "destructive" },
  ];
  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl bg-surface p-4 ring-1 ring-border">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</div>
            <div className={"mt-1 font-heading text-3xl font-bold " + (c.tone === "primary" ? "text-primary" : c.tone === "destructive" ? "text-destructive" : "")}>{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
