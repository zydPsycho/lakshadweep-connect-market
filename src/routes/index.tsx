import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { CategoryChip, CategoryChipSkeleton } from "@/components/CategoryChip";
import { ProductCard } from "@/components/ProductCard";
import { useLang } from "@/lib/i18n";
import { formatINR } from "@/lib/format";
import { Search as SearchIcon } from "lucide-react";

async function fetchCategories() {
  const { data } = await supabase.from("categories").select("*").eq("active", true).order("position");
  return data ?? [];
}
async function fetchBanners() {
  const { data } = await supabase.from("banners").select("*").eq("active", true).order("position");
  return data ?? [];
}
async function fetchListings(filter: "featured" | "latest" | "nearby") {
  let q = supabase
    .from("listings")
    .select("id,title,price,island,condition,created_at,featured,listing_images(url,position)")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(filter === "latest" ? 8 : 6);
  if (filter === "featured") q = q.eq("featured", true);
  const { data } = await q;
  return (data ?? []).map((l: any) => ({
    ...l,
    image: l.listing_images?.sort((a: any, b: any) => a.position - b.position)[0]?.url ?? null,
  }));
}

export default function Home() {
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const { data: cats = [], isLoading: catsLoading } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const { data: banners = [] } = useQuery({ queryKey: ["banners"], queryFn: fetchBanners });
  const { data: featured = [] } = useQuery({ queryKey: ["listings", "featured"], queryFn: () => fetchListings("featured") });
  const { data: latest = [] } = useQuery({ queryKey: ["listings", "latest"], queryFn: () => fetchListings("latest") });
  const { data: nearby = [] } = useQuery({ queryKey: ["listings", "nearby"], queryFn: () => fetchListings("nearby") });

  const [bannerIdx, setBannerIdx] = useState(0);
  useEffect(() => {
    if (!banners.length) return;
    const id = setInterval(() => setBannerIdx((i) => (i + 1) % banners.length), 4000);
    return () => clearInterval(id);
  }, [banners.length]);

  return (
    <div className="min-h-screen bg-background pb-28">
      <TopBar />
      <main className="mx-auto max-w-[430px] space-y-6 px-4 pt-4">
        {/* Search */}
        <form
          className="relative"
          onSubmit={(e) => {
            e.preventDefault();
            navigate(`/search?q=${encodeURIComponent(query)}`);
          }}
        >
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search_placeholder")}
            className="w-full rounded-xl bg-surface py-3 pl-10 pr-4 text-sm outline-none ring-1 ring-border transition-shadow focus:ring-2 focus:ring-primary/30"
          />
        </form>

        {/* Categories */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-base font-semibold">{t("categories")}</h2>
          </div>
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory scroll-smooth">
            {catsLoading ? (
              Array.from({ length: 6 }).map((_, i) => <CategoryChipSkeleton key={i} />)
            ) : (
              cats.map((c: any, i: number) => (
                <CategoryChip key={c.slug} cat={c} lang={lang} index={i} />
              ))
            )}
          </div>
        </section>

        {/* Banner Slider */}
        {banners.length > 0 && (
          <section className="relative overflow-hidden rounded-2xl ring-1 ring-border">
            <div className="aspect-[2/1] w-full">
              {banners.map((b: any, i: number) => (
                <a
                  key={b.id}
                  href={b.link_url || "#"}
                  className={"absolute inset-0 transition-opacity duration-700 " + (i === bannerIdx ? "opacity-100" : "opacity-0")}
                >
                  <img src={b.image_url} alt={b.title} className="size-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-white flex flex-col justify-end">
                    <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">{b.subtitle}</div>
                    <div className="font-heading text-lg font-semibold">{b.title}</div>
                  </div>
                </a>
              ))}
            </div>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {banners.map((_: any, i: number) => (
                <span key={i} className={"size-1.5 rounded-full " + (i === bannerIdx ? "bg-white" : "bg-white/50")} />
              ))}
            </div>
          </section>
        )}
        {banners.length === 0 && (
          <section className="relative overflow-hidden rounded-2xl hero-gradient p-6 text-white">
            <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">OLKV</div>
            <h3 className="font-heading text-xl font-semibold leading-tight">Buy • Sell • Connect<br/>across Lakshadweep</h3>
            <Link to="/sell" className="mt-3 inline-block rounded-lg bg-white/95 px-4 py-2 text-xs font-bold text-primary">Start selling</Link>
          </section>
        )}

        {/* Featured Bento */}
        {featured.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-heading text-base font-semibold">{t("featured")}</h2>
            <div className="grid grid-cols-2 gap-3">
              {featured[0] && (
                <Link
                  to={`/product/${featured[0].id}`}
                  className="col-span-2 flex items-center gap-4 rounded-2xl bg-surface p-3 ring-1 ring-border"
                >
                  <div className="size-24 shrink-0 overflow-hidden rounded-xl bg-muted">
                    {featured[0].image && <img src={featured[0].image} alt="" className="size-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-accent">{t("featured")}</div>
                    <h3 className="line-clamp-2 font-heading text-base font-medium">{featured[0].title}</h3>
                    <p className="mt-1 font-semibold text-primary">{formatINR(featured[0].price)}</p>
                  </div>
                </Link>
              )}
              {featured.slice(1, 3).map((f: any) => (
                <Link key={f.id} to={`/product/${f.id}`} className="flex flex-col rounded-2xl bg-surface p-3 ring-1 ring-border">
                  <div className="aspect-square w-full overflow-hidden rounded-xl bg-muted">
                    {f.image && <img src={f.image} alt="" className="size-full object-cover" />}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">{f.island}</div>
                  <h3 className="line-clamp-1 text-sm font-medium">{f.title}</h3>
                  <p className="mt-1 text-sm font-semibold text-primary">{formatINR(f.price)}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Latest */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-semibold">{t("latest")}</h2>
            <Link to="/search" className="text-xs font-semibold text-primary">{t("view_all")}</Link>
          </div>
          {latest.length === 0 ? (
            <p className="rounded-2xl bg-surface p-6 text-center text-sm text-muted-foreground ring-1 ring-border">
              No listings yet. Be the first to <Link to="/sell" className="font-semibold text-primary">post one</Link>.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-6">
              {latest.map((l: any) => <ProductCard key={l.id} listing={l} />)}
            </div>
          )}
        </section>

        {/* Nearby */}
        {nearby.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-heading text-base font-semibold">{t("nearby")}</h2>
            <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4">
              {nearby.map((l: any) => (
                <Link key={l.id} to={`/product/${l.id}`} className="flex w-64 shrink-0 items-center gap-3 rounded-2xl bg-surface p-2 ring-1 ring-border">
                  <div className="size-16 overflow-hidden rounded-xl bg-muted">
                    {l.image && <img src={l.image} alt="" className="size-full object-cover" />}
                  </div>
                  <div className="min-w-0">
                    <h4 className="line-clamp-1 text-sm font-medium">{l.title}</h4>
                    <p className="text-xs text-muted-foreground">{l.island}</p>
                    <p className="text-sm font-semibold text-primary">{formatINR(l.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
