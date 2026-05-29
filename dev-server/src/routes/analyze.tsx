import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { Nav } from "@/components/Nav";
import { SearchBar } from "@/components/SearchBar";
import { AnalysisView } from "@/components/AnalysisView";
import { AnalyzingOverlay } from "@/components/AnalyzingOverlay";
import { type InfluencerAnalysis, MOCK_INFLUENCERS } from "@/lib/mock-data";
import { analyzeInfluencer } from "@/lib/analyze.functions";
import { addHistory, getHistory } from "@/lib/history";
import { Clock, ChevronRight, AlertCircle } from "lucide-react";
import { z } from "zod";

const searchSchema = z.object({ u: z.string().optional() });

export const Route = createFileRoute("/analyze")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Analyze Influencer — Authenfluence AI" },
      { name: "description", content: "Run a trust intelligence scan on any YouTube creator." },
    ],
  }),
  component: AnalyzePage,
});

function AnalyzePage() {
  const { u } = Route.useSearch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InfluencerAnalysis | null>(null);
  const [recent, setRecent] = useState(getHistory());
  const [error, setError] = useState<string | null>(null);

  const analyze = useServerFn(analyzeInfluencer);

  const run = async (username: string) => {
    setLoading(true);
    setResult(null);
    setError(null);
    const started = Date.now();
    try {
      const a = await analyze({ data: { username } });
      // ensure loading overlay shows full cinematic sequence (~3.4s)
      const elapsed = Date.now() - started;
      const minDuration = 3400;
      if (elapsed < minDuration) await new Promise((r) => setTimeout(r, minDuration - elapsed));
      setResult(a);
      addHistory(a);
      setRecent(getHistory());
      setLoading(false);
      navigate({ to: "/analyze", search: { u: a.username }, replace: true });
    } catch (e: any) {
      console.error("[Analyze] Server function error:", e);
      setLoading(false);
      setError(e?.message ?? "Analysis failed. Please try again.");
    }
  };

  useEffect(() => {
    if (u && !result && !loading) run(u);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="container mx-auto max-w-6xl px-4 sm:px-6 py-10 space-y-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Evaluate creator trust</h1>
          <p className="text-muted-foreground mt-1.5">Get a digital trust intelligence assessment in seconds.</p>
        </div>

        <SearchBar onAnalyze={run} defaultValue={u} />

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {!result && !loading && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Try a demo creator</h3>
              <div className="grid sm:grid-cols-3 gap-3">
                {["mrbeast", "justinbieber", "cryptokingz"].map((username) => {
                  const m = MOCK_INFLUENCERS[username];
                  if (!m) return null;
                  return (
                    <button
                      key={m.username}
                      onClick={() => run(m.username)}
                      className="glass rounded-2xl p-4 text-left hover:border-primary/40 transition group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{m.displayName}</div>
                          <div className="text-xs text-muted-foreground">@{m.username}</div>
                        </div>
                        <span
                          className="text-lg font-semibold tabular-nums"
                          style={{ color: m.score >= 75 ? "var(--color-success)" : m.score >= 45 ? "var(--color-warning)" : "var(--color-destructive)" }}
                        >
                          {m.score}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center text-xs text-primary opacity-0 group-hover:opacity-100 transition">
                        Run assessment <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {recent.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" /> Recent Creator Analyses
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {recent.map((h) => (
                    <button
                      key={h.username}
                      onClick={() => run(h.username)}
                      className="glass rounded-xl p-3 text-left hover:border-primary/40 transition flex flex-col justify-between min-h-[5.5rem]"
                    >
                      <div className="w-full">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-medium text-sm truncate flex-1">{h.displayName}</div>
                          <span
                            className="text-sm font-semibold tabular-nums shrink-0"
                            style={{ color: h.score >= 70 ? "var(--color-success)" : h.score >= 50 ? "var(--color-warning)" : "var(--color-destructive)" }}
                          >
                            {h.score}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className="text-[10px] text-muted-foreground">@{h.username}</span>
                          {h.category && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                              {h.category}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-[9px] text-muted-foreground/60 mt-3 pt-1.5 border-t border-border/20 w-full">
                        {new Date(h.timestamp).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {result && !loading && <AnalysisView analysis={result} />}
      </main>

      <AnimatePresence>
        {loading && <AnalyzingOverlay onDone={() => setLoading(false)} />}
      </AnimatePresence>
    </div>
  );
}
