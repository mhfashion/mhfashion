"use client";

import { useState } from "react";

const sizes = ["S", "M", "L", "XL", "XXL"];
const colors = [
  { name: "Black", className: "bg-black" },
  { name: "White", className: "bg-white" },
  { name: "Green", className: "bg-[#79bf20]" },
  { name: "Red", className: "bg-[#d63d3d]" },
];
const types = ["T-Shirt", "Hoodie", "Sweatshirt"];

export default function ProductOptions() {
  const [size, setSize] = useState("M");
  const [color, setColor] = useState("Black");
  const [type, setType] = useState("T-Shirt");

  return (
    <div className="mt-3 space-y-3 text-[11px]">
      <div>
        <div className="mb-1.5 flex items-center justify-between"><span className="font-bold">Size</span><button type="button" className="text-[10px] text-accent">Size Guide</button></div>
        <div className="flex flex-wrap gap-1.5">{sizes.map((value) => <button key={value} type="button" onClick={() => setSize(value)} className={`min-w-9 rounded border px-2.5 py-1.5 font-semibold ${size === value ? "border-accent bg-accent text-accent-foreground" : "border-border bg-bg hover:border-accent"}`}>{value}</button>)}</div>
      </div>
      <div>
        <span className="mb-1.5 block font-bold">Color: <span className="font-normal text-text-secondary">{color}</span></span>
        <div className="flex gap-2">{colors.map(({ name, className }) => <button key={name} type="button" aria-label={name} onClick={() => setColor(name)} className={`h-6 w-6 rounded-full border-2 ${className} ${color === name ? "border-accent ring-2 ring-accent/25 ring-offset-1" : "border-border"}`} />)}</div>
      </div>
      <div>
        <span className="mb-1.5 block font-bold">Product type</span>
        <div className="flex flex-wrap gap-1.5">{types.map((value) => <button key={value} type="button" onClick={() => setType(value)} className={`rounded border px-2.5 py-1.5 font-semibold ${type === value ? "border-accent bg-accent/10 text-accent" : "border-border bg-bg hover:border-accent"}`}>{value}</button>)}</div>
      </div>
    </div>
  );
}
