import { createFileRoute, useParams, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";
import { formatINR, timeAgo } from "@/lib/format";
import { Heart, Phone, MessageCircle, Share2, Flag, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/product/$id")({ component: Product });

function Product() {
  const { id } = useParams({ from: "/product/$id" });
  const { user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { t } = useLang();
  const [imgIdx, setImgIdx] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("listings")
        .select("*,listing_images(url,position),profiles!listings_user_id_fkey(id,full_name,avatar_url,phone,island)")
        .eq("id", id).maybeSingle();
      return data;
    },
  });

  const { data: fav } = useQuery({
    queryKey: ["fav", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.from("favourites").select("listing_id").eq("user_id", user.id).eq("listing_id", id).maybeSingle();
      return !!data;
    },
  });

  async function toggleFav() {
    if (!user) return nav({ to: "/auth", search: { redirect: window.location.pathname } });
    if (fav) {
      await supabase.from("favourites").delete().eq("user_id", user.id).eq("listing_id", id);
    } else {
      await supabase.from("favourites").insert({ user_id: user.id, listing_id: id });
    }
    qc.invalidateQueries({ queryKey: ["fav", id] });
    qc.invalidateQueries({ queryKey: ["favourites"] });
  }

  async function startChat() {
    if (!user) return nav({ to: "/auth", search: { redirect: window.location.pathname } });
    if (!data) return;
    if (user.id === data.user_id) return toast.info("This is your own listing.");
    // upsert chat
    const { data: existing } = await supabase
      .from("chats").select("id").eq("listing_id", id).eq("buyer_id", user.id).maybeSingle();
    let chatId = existing?.id;
    if (!chatId) {
      const { data: created, error } = await supabase.from("chats")
        .insert({ listing_id: id, buyer_id: user.id, seller_id: data.user_id })
        .select("id").maybeSingle();
      if (error) return toast.error(error.message);
      chatId = created?.id;
    }
    if (chatId) nav({ to: "/chats/$id", params: { id: chatId } });
  }

  function share() {
    const url = window.location.href;
    if (navigator.share) navigator.share({ title: data?.title, url }).catch(() => {});
    else { navigator.clipboard.writeText(url); toast.success("Link copied"); }
  }

  if (isLoading) return <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>;
  if (!data) return <div className="p-8 text-center">Listing not found.</div>;

  const imgs = (data.listing_images ?? []).sort((a: any, b: any) => a.position - b.position);
  const seller: any = data.profiles;
  const digits = (data.contact_number || "").replace(/[^0-9+]/g, "");

  return (
    <div className="min-h-screen bg-background pb-24">
      <TopBar subtitle="Listing" />
      <main className="mx-auto max-w-[430px] space-y-5 px-4 pt-4">
        {/* Gallery */}
        <div className="relative overflow-hidden rounded-2xl bg-muted ring-1 ring-border">
          <div className="aspect-square w-full">
            {imgs.length > 0 ? (
              <img src={imgs[imgIdx].url} alt={data.title} className="size-full object-cover" />
            ) : (
              <div className="grid size-full place-items-center text-sm text-muted-foreground">No photos</div>
            )}
          </div>
          {imgs.length > 1 && (
            <>
              <button onClick={() => setImgIdx((i) => (i - 1 + imgs.length) % imgs.length)} className="absolute left-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-background/80 ring-1 ring-border"><ChevronLeft className="size-4" /></button>
              <button onClick={() => setImgIdx((i) => (i + 1) % imgs.length)} className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-background/80 ring-1 ring-border"><ChevronRight className="size-4" /></button>
              <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
                {imgs.map((_: any, i: number) => <span key={i} className={"size-1.5 rounded-full " + (i === imgIdx ? "bg-white" : "bg-white/50")} />)}
              </div>
            </>
          )}
          <button onClick={toggleFav} className="absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-background/85 ring-1 ring-border">
            <Heart className={"size-4 " + (fav ? "fill-destructive text-destructive" : "")} />
          </button>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className={"rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white " + (data.condition === "new" ? "bg-accent" : "bg-ink/80")}>
              {data.condition === "new" ? t("new") : t("used")}
            </span>
            {data.status !== "approved" && (
              <span className="rounded bg-muted px-2 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">{data.status}</span>
            )}
          </div>
          <h1 className="mt-2 font-heading text-2xl font-bold">{data.title}</h1>
          <div className="mt-1 text-2xl font-bold text-primary">{formatINR(data.price)}</div>
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3" /> {data.island}{data.location ? ` • ${data.location}` : ""} • {timeAgo(data.created_at)}
          </div>
        </div>

        <section className="rounded-2xl bg-surface p-4 ring-1 ring-border">
          <h2 className="mb-2 font-heading font-semibold">Description</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{data.description}</p>
        </section>

        {/* Seller */}
        {seller && (
          <section className="rounded-2xl bg-surface p-4 ring-1 ring-border">
            <h2 className="mb-3 font-heading font-semibold">Seller</h2>
            <div className="flex items-center gap-3">
              <div className="size-12 overflow-hidden rounded-full bg-muted">
                {seller.avatar_url && <img src={seller.avatar_url} alt="" className="size-full object-cover" />}
              </div>
              <div>
                <div className="font-medium">{seller.full_name ?? "OLKV user"}</div>
                <div className="text-xs text-muted-foreground">{seller.island ?? data.island}</div>
              </div>
            </div>
          </section>
        )}

        {/* Actions */}
        <div className="grid grid-cols-3 gap-2">
          <a href={digits ? `tel:${digits}` : "#"} className="flex flex-col items-center gap-1 rounded-2xl bg-primary py-3 text-primary-foreground shadow-float">
            <Phone className="size-4" /><span className="text-xs font-semibold">{t("call")}</span>
          </a>
          <a href={digits ? `https://wa.me/${digits.replace(/^\+/, "")}?text=${encodeURIComponent("Hi, is this still available on OLKV? " + window.location.href)}` : "#"} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1 rounded-2xl bg-accent py-3 text-accent-foreground shadow-accent-glow">
            <MessageCircle className="size-4" /><span className="text-xs font-semibold">{t("whatsapp")}</span>
          </a>
          <button onClick={startChat} className="flex flex-col items-center gap-1 rounded-2xl bg-surface py-3 ring-1 ring-border">
            <MessageCircle className="size-4" /><span className="text-xs font-semibold">{t("chat")}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={share} className="flex items-center justify-center gap-2 rounded-xl bg-muted py-2 text-sm"><Share2 className="size-4" /> {t("share")}</button>
          <Dialog open={reportOpen} onOpenChange={setReportOpen}>
            <DialogTrigger asChild>
              <button className="flex items-center justify-center gap-2 rounded-xl bg-muted py-2 text-sm"><Flag className="size-4" /> {t("report")}</button>
            </DialogTrigger>
            <ReportDialog listingId={id} onClose={() => setReportOpen(false)} />
          </Dialog>
        </div>
      </main>
    </div>
  );
}

function ReportDialog({ listingId, onClose }: { listingId: string; onClose: () => void }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (!user) return nav({ to: "/auth", search: { redirect: window.location.pathname } });
    setBusy(true);
    const { error } = await supabase.from("reports").insert({ listing_id: listingId, reporter_id: user.id, reason, details });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Thanks — we'll review it.");
    onClose();
  }
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Report this listing</DialogTitle></DialogHeader>
      <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-lg border bg-background p-2 text-sm">
        <option value="spam">Spam / duplicate</option>
        <option value="scam">Fraud / scam</option>
        <option value="offensive">Offensive content</option>
        <option value="wrong_category">Wrong category</option>
        <option value="other">Other</option>
      </select>
      <Textarea placeholder="Details (optional)" value={details} onChange={(e) => setDetails(e.target.value)} />
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={busy}>Submit report</Button>
      </DialogFooter>
    </DialogContent>
  );
}
