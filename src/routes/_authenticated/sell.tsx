import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";
import { ISLANDS } from "@/lib/islands";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { X, Upload } from "lucide-react";

export const Route = createFileRoute("/_authenticated/sell")({ component: Sell });

const schema = z.object({
  title: z.string().trim().min(4).max(120),
  description: z.string().trim().min(10).max(4000),
  price: z.coerce.number().min(0).max(100000000),
  category_slug: z.string().min(1),
  condition: z.enum(["new", "used"]),
  island: z.string().min(1),
  location: z.string().max(120).optional(),
  contact_number: z.string().trim().min(6).max(20),
});

function Sell() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { t } = useLang();
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const { data: cats = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await supabase.from("categories").select("*").eq("active", true).order("position")).data ?? [],
  });

  const [form, setForm] = useState({
    title: "", description: "", price: "", category_slug: "", condition: "used" as "new" | "used",
    island: "", location: "", contact_number: "",
  });

  function addFiles(list: FileList | null) {
    if (!list) return;
    const arr = Array.from(list).filter((f) => f.type.startsWith("image/"));
    setFiles((prev) => [...prev, ...arr].slice(0, 10));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ ...form, price: form.price });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    if (!user) return;
    if (files.length === 0) return toast.error("Add at least one photo");
    setBusy(true);
    try {
      const { data: listing, error } = await supabase.from("listings")
        .insert({ ...parsed.data, user_id: user.id, status: "pending" })
        .select("id").maybeSingle();
      if (error || !listing) throw error;

      // Upload photos
      const uploads = await Promise.all(files.map(async (file, i) => {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user.id}/${listing.id}/${Date.now()}-${i}.${ext}`;
        const { error: upErr } = await supabase.storage.from("listing-images").upload(path, file, { cacheControl: "3600" });
        if (upErr) throw upErr;
        const url = supabase.storage.from("listing-images").getPublicUrl(path).data.publicUrl;
        return { listing_id: listing.id, url, position: i };
      }));
      await supabase.from("listing_images").insert(uploads);

      toast.success("Listing submitted for review.");
      nav({ to: "/my-ads" });
    } catch (err: any) {
      toast.error(err.message ?? "Could not publish");
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <TopBar subtitle={t("sell")} />
      <main className="mx-auto max-w-[430px] space-y-4 px-4 pt-4">
        <h1 className="font-heading text-2xl font-bold">Post a listing</h1>

        <form onSubmit={submit} className="space-y-4">
          {/* Photos */}
          <div>
            <Label>{t("photos")}</Label>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {files.map((f, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                  <img src={URL.createObjectURL(f)} alt="" className="size-full object-cover" />
                  <button type="button" onClick={() => setFiles((p) => p.filter((_, idx) => idx !== i))} className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-background/90"><X className="size-3" /></button>
                </div>
              ))}
              {files.length < 10 && (
                <label className="grid aspect-square cursor-pointer place-items-center rounded-lg border-2 border-dashed border-border bg-muted/30 text-muted-foreground">
                  <Upload className="size-5" />
                  <input type="file" accept="image/*" multiple hidden onChange={(e) => addFiles(e.target.files)} />
                </label>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="title">{t("title")}</Label>
            <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={120} required />
          </div>
          <div>
            <Label htmlFor="desc">{t("description")}</Label>
            <Textarea id="desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={4000} rows={5} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="price">{t("price")}</Label>
              <Input id="price" type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            </div>
            <div>
              <Label>{t("condition")}</Label>
              <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">{t("new")}</SelectItem>
                  <SelectItem value="used">{t("used")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>{t("category")}</Label>
            <Select value={form.category_slug} onValueChange={(v) => setForm({ ...form, category_slug: v })}>
              <SelectTrigger><SelectValue placeholder="Choose category" /></SelectTrigger>
              <SelectContent>
                {cats.map((c) => <SelectItem key={c.slug} value={c.slug}>{c.name_en}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("island")}</Label>
            <Select value={form.island} onValueChange={(v) => setForm({ ...form, island: v })}>
              <SelectTrigger><SelectValue placeholder="Select island" /></SelectTrigger>
              <SelectContent>
                {ISLANDS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="loc">{t("location")}</Label>
            <Input id="loc" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} maxLength={120} />
          </div>
          <div>
            <Label htmlFor="contact">{t("contact_number")}</Label>
            <Input id="contact" type="tel" value={form.contact_number} onChange={(e) => setForm({ ...form, contact_number: e.target.value })} placeholder="+91…" required />
          </div>

          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Publishing…" : t("publish")}
          </Button>
          <p className="text-center text-xs text-muted-foreground">Listings are reviewed by our team before appearing publicly.</p>
        </form>
      </main>
      <BottomNav />
    </div>
  );
}
