import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const dynamic = "force-dynamic";

export default function NyeinPage() {
  return <div><Header /><main className="flex min-h-[55vh] items-center justify-center bg-bg px-4 py-12"><section className="w-full max-w-2xl rounded-2xl border border-border bg-bg-surface p-8 text-center sm:p-12"><p className="text-xs font-black uppercase tracking-[0.2em] text-accent">MH Fashion</p><h1 className="mt-3 text-3xl font-black sm:text-5xl">Nyein</h1><p className="mx-auto mt-4 max-w-md text-sm leading-6 text-text-secondary">This collection page is ready for the layout and content direction you will provide next.</p></section></main><Footer /></div>;
}
