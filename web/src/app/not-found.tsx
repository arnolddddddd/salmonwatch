import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#080c14] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="text-[80px] font-bold font-mono text-slate-800 leading-none mb-4">
          404
        </div>
        <h1 className="text-xl font-semibold text-slate-200 mb-2">
          Page not found
        </h1>
        <p className="text-sm text-slate-500 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/explorer"
            className="glass-panel px-6 py-3 text-sm font-semibold text-emerald-400 hover:text-emerald-300 hover:border-emerald-500/20 transition-all"
          >
            Explore the map
          </Link>
          <Link
            href="/"
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
