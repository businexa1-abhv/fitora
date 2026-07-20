import Link from 'next/link';

export default function NotFound() {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background">
        <main className="flex min-h-screen flex-col items-center justify-center px-4 py-20 text-center">
          <div className="max-w-md">
            <p className="text-8xl font-extrabold text-primary opacity-20 select-none">404</p>
            <h1 className="mt-2 text-2xl font-extrabold text-foreground">Page not found</h1>
            <p className="mt-3 text-sm text-muted">
              The page you&apos;re looking for doesn&apos;t exist or has been moved.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/"
                className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white hover:bg-primary/90 transition-colors"
              >
                Back to home
              </Link>
              <Link
                href="/courts"
                className="rounded-xl border border-border px-6 py-2.5 text-sm font-semibold hover:bg-background transition-colors"
              >
                Browse courts
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
