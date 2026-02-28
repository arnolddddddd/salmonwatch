"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#080c14] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-12 h-12 rounded-full bg-[#c4584a]/10 text-[#c4584a] flex items-center justify-center mx-auto mb-5 text-xl font-bold">
          !
        </div>
        <h1 className="text-xl font-semibold text-slate-200 mb-2">
          Something went wrong
        </h1>
        <p className="text-sm text-slate-500 mb-8">
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          className="glass-panel px-6 py-3 text-sm font-semibold text-emerald-400 hover:text-emerald-300 hover:border-emerald-500/20 transition-all cursor-pointer"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
