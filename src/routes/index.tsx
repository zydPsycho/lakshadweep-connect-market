 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/src/routes/index.tsx b/src/routes/index.tsx
index 8a4eab8939ec56c4d529505f57bd4daff0c4a8d3..84276ad2a41439955156af7b140ad114cbbf75b1 100644
--- a/src/routes/index.tsx
+++ b/src/routes/index.tsx
@@ -1,112 +1,161 @@
 import { createFileRoute, Link } from "@tanstack/react-router";
 import { useQuery } from "@tanstack/react-query";
-import { useEffect, useState, useRef } from "react";
+import { useCallback, useEffect, useRef, useState } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { TopBar } from "@/components/TopBar";
 import { BottomNav } from "@/components/BottomNav";
 import { CategoryChip } from "@/components/CategoryChip";
 import { ProductCard } from "@/components/ProductCard";
 import { useLang } from "@/lib/i18n";
 import { formatINR } from "@/lib/format";
-import { Search as SearchIcon } from "lucide-react";
+import { ChevronLeft, ChevronRight, Search as SearchIcon } from "lucide-react";
 
 export const Route = createFileRoute("/")({
   component: Home,
 });
 
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
 
 function Home() {
   const { t, lang } = useLang();
   const [query, setQuery] = useState("");
   const { data: cats = [] } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
   const { data: banners = [] } = useQuery({ queryKey: ["banners"], queryFn: fetchBanners });
   const { data: featured = [] } = useQuery({ queryKey: ["listings", "featured"], queryFn: () => fetchListings("featured") });
   const { data: latest = [] } = useQuery({ queryKey: ["listings", "latest"], queryFn: () => fetchListings("latest") });
   const { data: nearby = [] } = useQuery({ queryKey: ["listings", "nearby"], queryFn: () => fetchListings("nearby") });
 
+  const categoryScrollerRef = useRef<HTMLDivElement | null>(null);
+  const [canScrollLeft, setCanScrollLeft] = useState(false);
+  const [canScrollRight, setCanScrollRight] = useState(false);
+  const homeCategories = cats.slice(0, 8);
+
+  const updateCategoryScrollState = useCallback(() => {
+    const scroller = categoryScrollerRef.current;
+    if (!scroller) return;
+
+    setCanScrollLeft(scroller.scrollLeft > 0);
+    setCanScrollRight(scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 1);
+  }, []);
+
   const [bannerIdx, setBannerIdx] = useState(0);
   useEffect(() => {
     if (!banners.length) return;
     const id = setInterval(() => setBannerIdx((i) => (i + 1) % banners.length), 4000);
     return () => clearInterval(id);
   }, [banners.length]);
 
+  useEffect(() => {
+    updateCategoryScrollState();
+
+    window.addEventListener("resize", updateCategoryScrollState);
+    return () => window.removeEventListener("resize", updateCategoryScrollState);
+  }, [cats.length, updateCategoryScrollState]);
+
   return (
     <div className="min-h-screen bg-background pb-28">
       <TopBar />
       <main className="mx-auto max-w-[430px] space-y-6 px-4 pt-4">
         {/* Search */}
         <form
           action="/search"
           className="relative"
           onSubmit={(e) => {
             e.preventDefault();
             window.location.href = `/search?q=${encodeURIComponent(query)}`;
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
-            <h2 className="font-heading text-base font-semibold">{t("categories")}</h2>
+            <h2 className="font-heading text-base font-semibold">Categories</h2>
+            <Link to="/categories" className="text-xs font-semibold text-primary">
+              View All →
+            </Link>
           </div>
-          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4">
-            {cats.map((c) => (
-              <CategoryChip key={c.slug} cat={c as any} lang={lang} />
-            ))}
+          <div className="relative">
+            {canScrollLeft && (
+              <button
+                type="button"
+                aria-label="Scroll categories left"
+                className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full border bg-background/80 p-2 shadow-sm backdrop-blur"
+                onClick={() => categoryScrollerRef.current?.scrollBy({ left: -250, behavior: "smooth" })}
+              >
+                <ChevronLeft className="size-4" />
+              </button>
+            )}
+            <div
+              ref={categoryScrollerRef}
+              onScroll={updateCategoryScrollState}
+              className="no-scrollbar -mx-4 flex touch-pan-x gap-3 overflow-x-auto scroll-smooth px-4 [-webkit-overflow-scrolling:touch]"
+            >
+              {homeCategories.map((c) => (
+                <CategoryChip key={c.slug} cat={c as any} lang={lang} />
+              ))}
+            </div>
+            {canScrollRight && (
+              <button
+                type="button"
+                aria-label="Scroll categories right"
+                className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full border bg-background/80 p-2 shadow-sm backdrop-blur"
+                onClick={() => categoryScrollerRef.current?.scrollBy({ left: 250, behavior: "smooth" })}
+              >
+                <ChevronRight className="size-4" />
+              </button>
+            )}
           </div>
         </section>
 
         {/* Banner Slider */}
         {banners.length > 0 && (
           <section className="relative overflow-hidden rounded-2xl ring-1 ring-border">
             <div className="aspect-[2/1] w-full">
               {banners.map((b, i) => (
                 <a
                   key={b.id}
                   href={b.link_url || "#"}
                   className={"absolute inset-0 transition-opacity duration-700 " + (i === bannerIdx ? "opacity-100" : "opacity-0")}
                 >
                   <img src={b.image_url} alt={b.title} className="size-full object-cover" />
                   <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent p-4 text-white flex flex-col justify-end">
                     <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">{b.subtitle}</div>
                     <div className="font-heading text-lg font-semibold">{b.title}</div>
                   </div>
                 </a>
               ))}
             </div>
             <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
               {banners.map((_, i) => (
                 <span key={i} className={"size-1.5 rounded-full " + (i === bannerIdx ? "bg-white" : "bg-white/50")} />
               ))}
 
EOF
)
