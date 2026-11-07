"use client";

import { useMemo, useState } from "react";
import { Check, Heart, Search, Shirt } from "lucide-react";

export type MockupId = "studio" | "flatlay" | "hoodie" | "oversized" | "cap" | "tote";

type Mockup = { id: MockupId; name: string; category: string; bg: string; accent: string };

const MOCKUPS: Mockup[] = [
  { id: "studio", name: "Studio T-shirt", category: "T-shirts", bg: "from-[#dce8cf] to-[#f5f4ed]", accent: "text-[#526052]" },
  { id: "flatlay", name: "Flat lay tee", category: "T-shirts", bg: "from-[#ece6dc] to-[#d8e2d4]", accent: "text-[#71634f]" },
  { id: "hoodie", name: "Classic hoodie", category: "Hoodies", bg: "from-[#dfe1e7] to-[#f2eee8]", accent: "text-[#626b7d]" },
  { id: "oversized", name: "Oversized tee", category: "T-shirts", bg: "from-[#e5ddeb] to-[#f5ede7]", accent: "text-[#745d7f]" },
  { id: "cap", name: "Cotton cap", category: "Accessories", bg: "from-[#e8dfcf] to-[#d7e4d8]", accent: "text-[#756347]" },
  { id: "tote", name: "Canvas tote", category: "Accessories", bg: "from-[#e1e6e8] to-[#eee5d7]", accent: "text-[#64737a]" },
];

export default function MockupLibrary({ selected, onSelect }: { selected: MockupId | null; onSelect: (id: MockupId) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const categories = ["All", "T-shirts", "Hoodies", "Accessories"];
  const filtered = useMemo(() => MOCKUPS.filter((item) => (category === "All" || item.category === category) && item.name.toLowerCase().includes(query.toLowerCase())), [category, query]);

  return (
    <div className="border-b border-border p-3">
      <div className="mb-2 flex items-center justify-between"><h2 className="text-xs font-bold">Mockup library</h2><span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[9px] font-bold text-accent">PRO</span></div>
      <div className="mb-2 flex items-center gap-1.5 rounded-md border border-border bg-bg px-2 py-1.5 text-text-muted"><Search size={12} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search mockups" className="w-full bg-transparent text-[10px] outline-none placeholder:text-text-faint" /></div>
      <div className="mb-2 flex gap-1 overflow-x-auto pb-1">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-semibold ${category === item ? "bg-accent text-accent-foreground" : "bg-bg text-text-muted hover:text-text-primary"}`}>{item}</button>)}</div>
      <div className="grid grid-cols-2 gap-2">{filtered.map((item) => <button key={item.id} onClick={() => onSelect(item.id)} className={`group relative overflow-hidden rounded-md border text-left transition ${selected === item.id ? "border-accent ring-1 ring-accent" : "border-border hover:border-accent"}`}><span className={`flex aspect-[1.15] items-center justify-center bg-gradient-to-br ${item.bg}`}><Shirt size={42} strokeWidth={1.2} className={item.accent} /></span><span className="block truncate px-1.5 py-1 text-[9px] font-semibold">{item.name}</span><span className="block px-1.5 pb-1 text-[8px] text-text-muted">{item.category}</span>{selected === item.id && <span className="absolute right-1 top-1 rounded-full bg-accent p-0.5 text-accent-foreground"><Check size={10} /></span>}<span className="absolute left-1 top-1 rounded-full bg-bg/80 p-1 opacity-0 transition group-hover:opacity-100"><Heart size={10} /></span></button>)}</div>
      {!filtered.length && <p className="py-5 text-center text-[10px] text-text-muted">No mockups found.</p>}
    </div>
  );
}
