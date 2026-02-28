"use client";

import Link from "next/link";
import dynamic from "next/dynamic";

const HeroMap = dynamic(() => import("@/components/map/HeroMap"), {
  ssr: false,
});

export default function Home() {
  return (
    <main className="min-h-screen bg-[#080c14] relative overflow-hidden">
      {/* Hero */}
      <section className="relative h-screen flex items-center justify-center">
        {/* Animated Deck.gl map background */}
        <HeroMap />

        <div className="relative z-10 text-center px-6 max-w-3xl">
          <div className="inline-flex items-center gap-2 glass-subtle px-4 py-1.5 mb-8 animate-fade-in-up">
            <span className="w-2 h-2 rounded-full bg-emerald-400/60" />
            <span className="text-xs text-slate-400 font-medium tracking-wide">Open-source salmon intelligence</span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-6 animate-fade-in-up delay-100 text-white">
            SalmonWatch <span className="text-slate-500">BC</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 mb-4 animate-fade-in-up delay-200 leading-relaxed">
            100 years of Pacific salmon data.
            <br />
            <span className="font-mono text-slate-300">9,800+</span> populations. One interactive explorer.
          </p>

          <p className="text-sm text-slate-500 mb-10 animate-fade-in-up delay-300">
            80% of BC spawning streams haven&apos;t been surveyed since 2018.
            <br />
            We built the tool to see what&apos;s happening.
          </p>

          <Link
            href="/explorer"
            className="inline-block glass-panel px-10 py-4 font-semibold text-base text-emerald-300 hover:text-white border-emerald-500/20 hover:border-emerald-400/40 transition-all duration-200 animate-fade-in-up delay-400"
          >
            Explore the data &rarr;
          </Link>
          <div className="flex gap-4 justify-center mt-4 animate-fade-in-up delay-500">
            <Link
              href="/analytics"
              className="text-sm text-slate-500 hover:text-slate-200 transition-colors"
            >
              Analytics dashboard &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* What is this */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <h2 className="text-2xl font-semibold mb-10 text-slate-200">
          The salmon data nobody can find
        </h2>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            {
              title: "Scattered data",
              desc: "DFO tracks 9,800+ salmon populations across British Columbia in the NuSEDS database \u2014 the most comprehensive salmon dataset in the world. But it's buried in CSVs, spread across 10+ portals, and inaccessible to the people who need it most.",
            },
            {
              title: "Monitoring crisis",
              desc: "80% of BC spawning streams haven't been surveyed since 2018 \u2014 the worst monitoring decade since the 1950s. Two-thirds of historically tracked stocks had zero estimates between 2014\u20132023.",
            },
            {
              title: "No unified tool",
              desc: "DFO's own Pacific Salmon Data Portal is still in early development. There is no single platform that combines population trends, conservation status, and real-time water conditions. SalmonWatch fills that gap.",
            },
          ].map((card) => (
            <div key={card.title} className="glass-panel p-6">
              <div className="text-sm font-semibold text-slate-200 mb-3">{card.title}</div>
              <p className="text-sm text-slate-400 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Built by */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="glass-panel p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold text-sm flex items-center justify-center border border-emerald-500/20">
              Ar
            </div>
            <div>
              <div className="font-semibold text-slate-200">ArgonBI Systems Inc.</div>
              <div className="text-xs text-slate-500">
                Data Intelligence &amp; ML Systems
              </div>
            </div>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed mb-4">
            SalmonWatch is built by ArgonBI Systems, the same team behind{" "}
            <a
              href="https://infernis.ca"
              className="text-emerald-400 hover:text-emerald-300 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Infernis
            </a>{" "}
            &mdash; a production ML system for wildfire risk prediction in BC.
            We build environmental intelligence platforms that turn scattered
            government data into accessible, actionable tools.
          </p>
          <div className="flex gap-4">
            <a
              href="https://argonbi.com"
              className="text-sm text-slate-500 hover:text-slate-200 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              argonbi.com &rarr;
            </a>
            <Link
              href="/analytics"
              className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Analytics &rarr;
            </Link>
            <a
              href="https://github.com/argonBIsystems/salmonwatch"
              className="text-sm text-slate-500 hover:text-slate-200 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open source on GitHub &rarr;
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
