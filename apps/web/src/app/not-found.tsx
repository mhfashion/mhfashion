export default function NotFound() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen text-center px-6">
      <h1 className="text-2xl font-bold mb-2">404</h1>
      <p className="text-text-secondary text-sm mb-4">
        This page doesn&apos;t exist.
      </p>
      <a href="/" className="text-accent text-sm">
        ← Back to home
      </a>
    </main>
  );
}
