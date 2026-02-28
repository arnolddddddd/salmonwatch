export default function Loading() {
  return (
    <div className="min-h-screen bg-[#080c14] px-4 sm:px-6 py-6 sm:py-8 max-w-5xl mx-auto animate-pulse">
      {/* Back button skeleton */}
      <div className="h-10 w-40 glass-subtle rounded-xl mb-6" />

      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-4 w-24 bg-white/[0.04] rounded mb-3" />
        <div className="h-8 w-64 bg-white/[0.04] rounded mb-2" />
        <div className="h-4 w-32 bg-white/[0.04] rounded" />
      </div>

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-panel p-4 h-20" />
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="glass-panel p-5 mb-8 h-[360px]" />
    </div>
  );
}
