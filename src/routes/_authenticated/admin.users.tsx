import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { timeAgo } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/users")({ component: AdminUsers });

function AdminUsers() {
  const { data = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*,user_roles(role)").order("created_at", { ascending: false }).limit(200);
      return data ?? [];
    },
  });
  return (
    <div className="space-y-3">
      <h2 className="font-heading text-xl font-bold">Users</h2>
      <div className="overflow-hidden rounded-2xl bg-surface ring-1 ring-border">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-muted-foreground"><tr><th className="p-3 text-left">Name</th><th className="p-3 text-left">Island</th><th className="p-3 text-left">Phone</th><th className="p-3 text-left">Role</th><th className="p-3 text-left">Joined</th></tr></thead>
          <tbody>
            {data.map((u: any) => (
              <tr key={u.id} className="border-t border-border/50">
                <td className="p-3 font-medium">{u.full_name ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{u.island ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{u.phone ?? "—"}</td>
                <td className="p-3">{u.user_roles?.map((r: any) => r.role).join(", ") || "user"}</td>
                <td className="p-3 text-muted-foreground">{timeAgo(u.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
