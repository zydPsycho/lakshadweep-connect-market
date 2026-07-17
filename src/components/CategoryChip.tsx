import { Link } from "@tanstack/react-router";
import * as Icons from "lucide-react";

export interface Category { slug: string; name_en: string; name_ml: string; icon: string; }

export function CategoryChip({ cat, lang }: { cat: Category; lang: "en" | "ml" }) {
  const Icon = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[cat.icon] ?? Icons.Package;
  return (
    <Link
      to="/category/$slug"
      params={{ slug: cat.slug }}
      className="flex shrink-0 flex-col items-center gap-1.5"
    >
      <div className="grid size-14 place-items-center rounded-2xl bg-surface ring-1 ring-border shadow-card">
        <Icon className="size-5 text-primary" />
      </div>
      <span className="max-w-[64px] text-center text-[10px] font-medium">
        {lang === "ml" ? cat.name_ml : cat.name_en}
      </span>
    </Link>
  );
}
