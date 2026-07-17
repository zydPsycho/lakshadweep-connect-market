import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";
import { formatINR, timeAgo } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/my-ads")({ component: MyAds });

function MyAds() {
  const { user } = useAuth();
  const { t } = useLang();
  const { data = [] } = useQuery({
    queryKey: ["my-ads", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("listings")
        .select("id,title,price,island,status,created_at,listing_images(url,position)")
        .eq("user_id", user!.id).order("created_at", { ascending: false });
      return (data ?? []).map((l: any) => ({ ...l, image: l.listing_images?.sort((a: any, b: any) => a.position - b.position)[0]?.url ?? null }));
    },
  });

  const badge = (s: string) => {
    const cls: Record<string, string> = {
      approved: "bg-accent/15 text-accent",
      pending: "bg-primary/15 text-primary",
      rejected: "bg-destructive/15 text-destructive",
      sold: "bg-muted text-muted-foreground",
    };
    return <span className={"rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide " + (cls[s] ?? "bg-muted")}>{s}</span>;
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <TopBar subtitle={t("my_ads")} />
      <main className="mx-auto max-w-[430px] space-y-3 px-4 pt-4">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-2xl font-bold">{t("my_ads")}</h1>
          <Link to="/sell" className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">+ New</Link>
        </div>
        {data.length === 0 ? (
          <p className="rounded-2xl bg-surface p-8 text-center text-sm text-muted-foreground ring-1 ring-border">You haven't posted anything yet.</p>
        ) : (
          <div className="space-y-3">
            {data.map((l: any) => (
              <Link key={l.id} to="/product/$id" params={{ id: l.id }} className="flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-border">
                <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {l.image && <img src={l.image} alt="" className="size-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">{badge(l.status)}</div>
                  <h3 className="line-clamp-1 mt-1 text-sm font-medium">{l.title}</h3>
                  <div className="text-xs text-muted-foreground">{l.island} • {timeAgo(l.created_at)}</div>
                </div>
                <div className="text-sm font-semibold text-primary">{formatINR(l.price)}</div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
