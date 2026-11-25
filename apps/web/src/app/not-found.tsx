import Footer from "@/components/Footer";

export default function NotFound() {
  return (
    <div>
      <main className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-bold mb-2">404</h1>
        <p className="text-text-secondary text-sm mb-4">
          This page doesn&apos;t exist.
        </p>
        <a href="/" className="text-accent text-sm">
          ← Back to home
        </a>
      </main>
      <Footer />
    </div>
  );
}
