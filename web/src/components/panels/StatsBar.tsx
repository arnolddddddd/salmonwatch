interface StatsBarProps {
  totalPopulations: number;
  yearRange: [number, number];
}

export default function StatsBar({
  totalPopulations,
}: StatsBarProps) {
  return (
    <div className="absolute top-3 sm:top-4 right-3 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 z-40 glass-panel flex items-center gap-3 sm:gap-5 px-3 sm:px-5 py-2 animate-fade-in-up">
      <Stat value={totalPopulations.toLocaleString()} label="populations" />
      <div className="hidden sm:block w-px h-4 bg-white/[0.08]" />
      <div className="hidden sm:block">
        <Stat value="100+" label="years of data" />
      </div>
      <div className="hidden sm:block w-px h-4 bg-white/[0.08]" />
      <div className="hidden sm:block">
        <Stat value="80%" label="unmonitored since 2018" />
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-slate-100 font-semibold text-[13px] font-mono">{value}</div>
      <div className="text-slate-500 text-[9px] uppercase tracking-wider font-medium">
        {label}
      </div>
    </div>
  );
}
