import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { Nav } from "@/components/Nav";
import { ScoreRing } from "@/components/ScoreRing";
import { BreakdownCard } from "@/components/BreakdownCard";
import { AnalyzingOverlay } from "@/components/AnalyzingOverlay";
import { MOCK_INFLUENCERS, type InfluencerAnalysis } from "@/lib/mock-data";
import { compareInfluencers } from "@/lib/analyze.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles, Trophy, ArrowRight, FlaskConical, AlertCircle, Download } from "lucide-react";
import { downloadComparisonReport } from "@/lib/report";
import { z } from "zod";

const searchSchema = z.object({ a: z.string().optional(), b: z.string().optional() });

export const Route = createFileRoute("/compare")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Compare Influencers — Authenfluence AI" },
      { name: "description", content: "Compare authenticity and trust between two influencers side-by-side." },
    ],
  }),
  component: ComparePage,
});

interface CompareResult {
  a: InfluencerAnalysis;
  b: InfluencerAnalysis;
  recommendation: string;
}

function ComparePage() {
  const { a: aInit, b: bInit } = Route.useSearch();
  const [aIn, setAIn] = useState(aInit ?? "techwithpriya");
  const [bIn, setBIn] = useState(bInit ?? "cryptokingz");
  const [pair, setPair] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const compare = useServerFn(compareInfluencers);

  const run = async () => {
    if (!aIn.trim() || !bIn.trim()) return;
    setLoading(true);
    setPair(null);
    setError(null);
    const started = Date.now();
    try {
      const res = await compare({ data: { a: aIn, b: bIn } });
      const elapsed = Date.now() - started;
      if (elapsed < 3400) await new Promise((r) => setTimeout(r, 3400 - elapsed));
      setPair(res);
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Comparison failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const winner = pair && (pair.a.score >= pair.b.score ? 0 : 1);
  const pairArr = pair ? [pair.a, pair.b] : null;

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="container mx-auto max-w-6xl px-4 sm:px-6 py-10 space-y-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Compare two influencers</h1>
          <p className="text-muted-foreground mt-1.5">Side-by-side trust analysis with AI recommendation.</p>
        </div>

        <div className="glass-strong rounded-3xl p-5">
          <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Creator A</label>
              <Input value={aIn} onChange={(e) => setAIn(e.target.value)} placeholder="username" className="mt-1.5 h-11" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Creator B</label>
              <Input value={bIn} onChange={(e) => setBIn(e.target.value)} placeholder="username" className="mt-1.5 h-11" />
            </div>
            <Button onClick={run} size="lg" className="gradient-bg border-0 text-white h-11" disabled={loading}>
              Compare <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            Try: {Object.keys(MOCK_INFLUENCERS).join(" · ")}
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-fade-in"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {pairArr && (
          <div className="grid md:grid-cols-2 gap-5">
            {pairArr.map((p, idx) => (
              <motion.div
                key={p.username + idx}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                className={`glass-strong rounded-3xl p-6 relative ${winner === idx ? "ring-glow" : ""}`}
              >
                {winner === idx && (
                  <div className="absolute -top-3 left-6 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full gradient-bg text-white text-[11px] font-medium">
                    <Trophy className="w-3 h-3" /> Higher Trust
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-lg">{p.displayName}</div>
                    <div className="text-xs text-muted-foreground">@{p.username}</div>
                  </div>
                  {p.dataSource === "fallback" && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-warning/15 text-warning border border-warning/30">
                      <FlaskConical className="w-3 h-3" /> demo
                    </span>
                  )}
                </div>
                <div className="flex justify-center my-4">
                  <ScoreRing score={p.score} size={180} />
                </div>
                <BreakdownCard breakdown={p.breakdown} creatorCategories={p.creatorCategories} />
              </motion.div>
            ))}
          </div>
        )}

        {pair && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-3xl p-6 sm:p-8 border border-border/40 space-y-4"
          >
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> Multi-Dimensional Predictive Match Matrix
            </h3>
            <p className="text-xs text-muted-foreground">Detailed comparative vectors evaluated by Authenfluence AI models</p>

            <div className="space-y-4 pt-2">
              {[
                { name: "Overall Trust Score", key: "score", format: (v: number) => `${v}/100`, max: 100 },
                { name: "Growth Potential Score", key: "growthPotentialScore", format: (v: number) => `${v}/100`, max: 100 },
                { name: "Campaign Success Probability", key: "campaignSuccessProbability", format: (v: number) => `${v}%`, max: 100 },
                { name: "Comment Authenticity (Organic %)", key: "commentAuthenticityDetailed", format: (v: any) => `${v.organicPct}%`, valExtractor: (v: any) => v.commentAuthenticityDetailed?.organicPct || 75, max: 100 },
                { name: "Posting Consistency", key: "breakdown", format: (v: any) => `${v.postingConsistency}/100`, valExtractor: (v: any) => v.breakdown?.postingConsistency || 80, max: 100 },
              ].map((row) => {
                const valA = row.valExtractor ? row.valExtractor(pair.a) : (pair.a as any)[row.key];
                const valB = row.valExtractor ? row.valExtractor(pair.b) : (pair.b as any)[row.key];
                const labelA = row.format(row.valExtractor ? pair.a : (pair.a as any)[row.key]);
                const labelB = row.format(row.valExtractor ? pair.b : (pair.b as any)[row.key]);

                return (
                  <div key={row.name} className="grid grid-cols-[1fr_2fr_1fr] gap-4 items-center border-b border-border/20 pb-3 last:border-b-0 last:pb-0 font-normal">
                    <div className="text-xs font-semibold text-right text-foreground/80 pr-2">
                      <div className="font-medium text-muted-foreground text-[10px] uppercase">Creator A</div>
                      <div className="text-sm font-bold text-primary">{labelA}</div>
                    </div>

                    <div className="space-y-1.5 text-center">
                      <div className="text-xs font-semibold text-foreground/90">{row.name}</div>
                      <div className="flex gap-2 items-center justify-center">
                        <div className="flex-1 bg-muted/30 rounded-full h-2 overflow-hidden flex justify-end">
                          <div 
                            className="bg-primary h-full rounded-l-full"
                            style={{ width: `${(valA / row.max) * 100}%` }}
                          />
                        </div>
                        <div className="w-1.5 h-1.5 rounded-full bg-border" />
                        <div className="flex-1 bg-muted/30 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-purple-500 h-full rounded-r-full"
                            style={{ width: `${(valB / row.max) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="text-xs font-semibold text-left text-foreground/80 pl-2">
                      <div className="font-medium text-muted-foreground text-[10px] uppercase">Creator B</div>
                      <div className="text-sm font-bold text-purple-400">{labelB}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {pair && winner !== null && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center"
          >
            <div className="flex-1 rounded-3xl p-[1px]" style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-purple))" }}>
              <div className="rounded-3xl bg-card/95 p-6 flex items-start gap-3 h-full">
                <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shrink-0 glow">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-semibold mb-1">AI Recommendation</div>
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    {pair.recommendation ||
                      `${pairArr![winner].displayName} is more authentic for long-term partnerships, scoring ${pairArr![winner].score} vs ${pairArr![1 - winner].score}. The trust gap of ${Math.abs(pair.a.score - pair.b.score)} points reflects healthier engagement, more genuine comments, and stronger audience quality.`}
                  </p>
                </div>
              </div>
            </div>
            <Button
              onClick={() => downloadComparisonReport(pair.a, pair.b, pair.recommendation || `${pairArr![winner].displayName} is more authentic for long-term partnerships, scoring ${pairArr![winner].score} vs ${pairArr![1 - winner].score}. The trust gap of ${Math.abs(pair.a.score - pair.b.score)} points reflects healthier engagement, more genuine comments, and stronger audience quality.`)}
              size="lg"
              className="gradient-bg border-0 text-white font-semibold h-full min-h-[4rem] px-6 shrink-0 shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 rounded-2xl w-full sm:w-auto"
            >
              <Download className="w-4 h-4" /> Export Comparison (PDF)
            </Button>
          </motion.div>
        )}
      </main>

      <AnimatePresence>
        {loading && <AnalyzingOverlay onDone={() => { /* loading state cleared in run() */ }} />}
      </AnimatePresence>
    </div>
  );
}
