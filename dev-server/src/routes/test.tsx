import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ArrowLeft,
  Terminal,
  Activity,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Nav } from "@/components/Nav";
import {
  computeScore,
  inferCreatorCategories,
  computePublicCredibility,
  computeUncertainty,
  computeTemporalSignals,
  trustLabel,
  type RawChannelSignals,
  type CommentSignals,
} from "@/lib/services/scoring";
import { detectFraudSignals } from "@/lib/services/fraud";

export const Route = createFileRoute("/test")({
  head: () => ({
    meta: [
      { title: "Test Suite Dashboard — Authenfluence AI" },
      { name: "description", content: "Run unit tests and verify the integrity of the trust and fraud models." },
    ],
  }),
  component: TestDashboardPage,
});

interface TestCase {
  id: string;
  group: "Scoring Engine" | "Trust Risk Indicators";
  name: string;
  description: string;
  run: () => void;
}

interface TestResult {
  id: string;
  group: "Scoring Engine" | "Trust Risk Indicators";
  name: string;
  description: string;
  status: "passed" | "failed" | "running";
  error?: string;
  logs?: string[];
}

function TestDashboardPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const testCases: TestCase[] = [
    {
      id: "category-edu",
      group: "Scoring Engine",
      name: "Creator Category: Education",
      description: "Verifies that discussion-heavy signals (high comments/likes) infer the Education category.",
      run: () => {
        const channel: RawChannelSignals = {
          subscribers: 100000,
          totalVideos: 100,
          totalViews: 2000000,
          recentVideos: [
            { videoId: "1", publishedAt: new Date().toISOString(), views: 10000, likes: 400, comments: 50 }, // 12.5% ratio
          ],
        };
        const categories = inferCreatorCategories(channel);
        const types = categories.map((c) => c.type);
        if (!types.includes("Education")) {
          throw new Error(`Expected categories [${types.join(", ")}] to contain 'Education'`);
        }
      },
    },
    {
      id: "category-music",
      group: "Scoring Engine",
      name: "Creator Category: Music (legacy fallback)",
      description: "Verifies that music creators are detected via low views-per-subscriber at high sub counts.",
      run: () => {
        const channel: RawChannelSignals = {
          subscribers: 5000000,
          totalVideos: 50,
          totalViews: 10000000,
          recentVideos: [
            { videoId: "1", publishedAt: new Date().toISOString(), views: 100000, likes: 2000, comments: 30 },
          ],
        };
        const categories = inferCreatorCategories(channel);
        const types = categories.map((c) => c.type);
        if (!types.includes("Music")) {
          throw new Error(`Expected categories [${types.join(", ")}] to contain 'Music'`);
        }
      },
    },
    {
      id: "category-mapping",
      group: "Scoring Engine",
      name: "Creator Category: Official YouTube ID Mapping",
      description: "Verifies that YouTube video category ID values (e.g. 10 for Music) map cleanly to categories.",
      run: () => {
        const channel: RawChannelSignals = {
          subscribers: 1000000,
          totalVideos: 200,
          totalViews: 50000000,
          recentVideos: [
            { videoId: "1", publishedAt: new Date().toISOString(), views: 100000, likes: 5000, comments: 200, categoryId: "10" }, // Music
            { videoId: "2", publishedAt: new Date().toISOString(), views: 100000, likes: 5000, comments: 200, categoryId: "10" }, // Music
            { videoId: "3", publishedAt: new Date().toISOString(), views: 100000, likes: 5000, comments: 200, categoryId: "24" }, // Entertainment
          ],
        };
        const categories = inferCreatorCategories(channel);
        if (categories[0].type !== "Music") {
          throw new Error(`Expected primary category to be 'Music', got '${categories[0].type}'`);
        }
        if (categories[0].weight <= 0.5) {
          throw new Error(`Expected 'Music' weight to be > 0.5, got ${categories[0].weight}`);
        }
      },
    },
    {
      id: "credibility-tier",
      group: "Scoring Engine",
      name: "Public Credibility Stabilization",
      description: "Verifies that credibility scores scale with channel longevity and establish penalty-softening flags.",
      run: () => {
        const newChannel: RawChannelSignals = {
          subscribers: 2000,
          totalVideos: 15,
          totalViews: 10000,
          recentVideos: [],
        };
        const megaChannel: RawChannelSignals = {
          subscribers: 20000000,
          totalVideos: 1200,
          totalViews: 5000000000,
          recentVideos: [],
        };
        const newCred = computePublicCredibility(newChannel);
        const megaCred = computePublicCredibility(megaChannel);
        if (megaCred.score <= newCred.score) {
          throw new Error(`Mega channel credibility (${megaCred.score}) should exceed new channel (${newCred.score})`);
        }
        if (!megaCred.reducesHarshPenalties) {
          throw new Error("Mega channel should qualify for penalty reduction");
        }
      },
    },
    {
      id: "uncertainty-confidence",
      group: "Scoring Engine",
      name: "Uncertainty & Confidence Scaling",
      description: "Verifies that small sample sizes trigger Low confidence level and corresponding limitations.",
      run: () => {
        const smallDataChannel: RawChannelSignals = {
          subscribers: 50000,
          totalVideos: 10,
          totalViews: 100000,
          recentVideos: [
            { videoId: "v1", publishedAt: new Date().toISOString(), views: 5000, likes: 200, comments: 10 },
          ],
        };
        const comments = { botRatio: 0.1, sentimentScore: 80, spamPatterns: [] };
        const result = computeUncertainty(smallDataChannel, comments);
        if (result.level !== "Low") {
          throw new Error(`Expected confidence 'Low', got '${result.level}'`);
        }
        if (!result.factors.smallSampleSize) {
          throw new Error("Expected smallSampleSize factor to be true");
        }
      },
    },
    {
      id: "temporal-spikes",
      group: "Scoring Engine",
      name: "Temporal Spike Detection",
      description: "Checks that videos with >5x the median engagement trigger suspicious spike alerts.",
      run: () => {
        const spikedChannel: RawChannelSignals = {
          subscribers: 10000,
          totalVideos: 100,
          totalViews: 200000,
          recentVideos: [
            { videoId: "v1", publishedAt: new Date(Date.now() - 30 * 86400000).toISOString(), views: 1000, likes: 20, comments: 2 },
            { videoId: "v2", publishedAt: new Date(Date.now() - 25 * 86400000).toISOString(), views: 1000, likes: 20, comments: 2 },
            { videoId: "v3", publishedAt: new Date(Date.now() - 20 * 86400000).toISOString(), views: 1000, likes: 20, comments: 2 },
            { videoId: "v4", publishedAt: new Date(Date.now() - 15 * 86400000).toISOString(), views: 1000, likes: 20, comments: 2 },
            { videoId: "v5", publishedAt: new Date(Date.now() - 10 * 86400000).toISOString(), views: 1000, likes: 25, comments: 3 },
            { videoId: "v6", publishedAt: new Date(Date.now() - 5 * 86400000).toISOString(), views: 1000, likes: 30, comments: 4 },
            { videoId: "v7", publishedAt: new Date(Date.now() - 1 * 86400000).toISOString(), views: 2000, likes: 150, comments: 10 }, // Spike!
          ],
        };
        const signals = computeTemporalSignals(spikedChannel);
        if (!signals.suspiciousSpikesDetected) {
          throw new Error("Expected suspiciousSpikesDetected to be true");
        }
      },
    },
    {
      id: "outlier-resistance",
      group: "Scoring Engine",
      name: "Outlier-Resistant Spike Filtering",
      description: "Verifies the outlier dropping logic mitigates inorganic/purchased view spike manipulation.",
      run: () => {
        const spikedChannel: RawChannelSignals = {
          subscribers: 250000,
          totalVideos: 120,
          totalViews: 5000000,
          recentVideos: [
            { videoId: "v1", publishedAt: new Date(Date.now() - 2 * 86400000).toISOString(), views: 10000, likes: 3000, comments: 500 }, // 35% ER
            { videoId: "v2", publishedAt: new Date(Date.now() - 9 * 86400000).toISOString(), views: 22000, likes: 950, comments: 70 },  // 4.6% ER
            { videoId: "v3", publishedAt: new Date(Date.now() - 16 * 86400000).toISOString(), views: 30000, likes: 1400, comments: 110 }, // 5.0% ER
            { videoId: "v4", publishedAt: new Date(Date.now() - 23 * 86400000).toISOString(), views: 18000, likes: 800, comments: 60 },  // 4.7% ER
            { videoId: "v5", publishedAt: new Date(Date.now() - 30 * 86400000).toISOString(), views: 28000, likes: 1250, comments: 95 }, // 4.8% ER
          ],
        };
        const cleanComments = { botRatio: 0.1, sentimentScore: 82, spamPatterns: [] };
        const result = computeScore(spikedChannel, cleanComments);
        if (result.metrics.engagementRatePct >= 10) {
          throw new Error(`Engagement rate (${result.metrics.engagementRatePct.toFixed(2)}%) was not capped. Outlier failed to drop.`);
        }
      },
    },
    {
      id: "score-brackets",
      group: "Scoring Engine",
      name: "Score Bracket Limits",
      description: "Verifies that trust labels correctly align to hackathon threshold brackets.",
      run: () => {
        const brackets = [
          { score: 95, expected: "Highly Trusted" },
          { score: 90, expected: "Highly Trusted" },
          { score: 89, expected: "Mostly Authentic" },
          { score: 70, expected: "Mostly Authentic" },
          { score: 69, expected: "Moderate Risk" },
          { score: 50, expected: "Moderate Risk" },
          { score: 49, expected: "Suspicious Activity" },
          { score: 10, expected: "Suspicious Activity" },
        ];
        for (const { score, expected } of brackets) {
          const result = trustLabel(score);
          if (result.label !== expected) {
            throw new Error(`Expected score ${score} to map to '${expected}', got '${result.label}'`);
          }
        }
      },
    },
    {
      id: "fraud-clean",
      group: "Trust Risk Indicators",
      name: "Clean Bill of Health",
      description: "Ensures an organic creator with healthy signals receives positive trust indicators.",
      run: () => {
        const score = computeScore({
          subscribers: 200000,
          totalVideos: 150,
          totalViews: 5000000,
          recentVideos: Array.from({ length: 8 }, (_, i) => ({
            videoId: `v${i}`,
            publishedAt: new Date(Date.now() - i * 7 * 86400000).toISOString(),
            views: 20000,
            likes: 800,
            comments: 50,
          })),
        }, { botRatio: 0.08, sentimentScore: 85, spamPatterns: [] });

        const flags = detectFraudSignals(score, { botRatio: 0.08, sentimentScore: 85, spamPatterns: [] }, {
          subscribers: 200000,
          videoCount: 150,
        });

        const hasRisk = flags.some(f => f.severity === "high" || f.severity === "medium");
        if (hasRisk) {
          throw new Error(`Expected no risk signals, got: ${JSON.stringify(flags)}`);
        }
        if (!flags.some(f => f.id === "legacy-strength")) {
          throw new Error("Expected legacy audience strength positive indicator");
        }
      },
    },
    {
      id: "fraud-fandom",
      group: "Trust Risk Indicators",
      name: "Fandom-Aware Comment Adjustments",
      description: "Checks that high bot ratios are adjusted on fandom channels to avoid false positive warnings.",
      run: () => {
        const mockScore = computeScore({
          subscribers: 20000,
          totalVideos: 50,
          totalViews: 300000,
          recentVideos: Array.from({ length: 8 }, (_, i) => ({
            videoId: `v${i}`,
            publishedAt: new Date(Date.now() - i * 7 * 86400000).toISOString(),
            views: 5000,
            likes: 250,
            comments: 80,
          })),
        }, { botRatio: 0.55, sentimentScore: 70, spamPatterns: [] });

        const comments = { botRatio: 0.55, sentimentScore: 70, spamPatterns: [], fandomDetected: true };
        
        // Under fandom adjustment, 55% bot ratio is under the adjusted threshold (0.65) and should not trigger fraud
        const flags = detectFraudSignals(mockScore, comments, {
          subscribers: 20000,
          videoCount: 50,
          fandomDetected: true,
        });

        const botFlag = flags.find((f) => f.id === "bot-comments");
        if (botFlag) {
          throw new Error("Bot-comments flag should not trigger under fandom-adjusted thresholds at 55% ratio");
        }
      },
    },
    {
      id: "fraud-weak-signals",
      group: "Trust Risk Indicators",
      name: "Weak Signals Cluster Escalation",
      description: "Verifies that multiple weak/borderline signals escalate into a unified 'medium' severity flag.",
      run: () => {
        const mockScore = computeScore({
          subscribers: 250000, // mid tier
          totalVideos: 100,
          totalViews: 4000000,
          recentVideos: Array.from({ length: 8 }, (_, i) => ({
            videoId: `v${i}`,
            publishedAt: new Date(Date.now() - i * 7 * 86400000).toISOString(),
            views: 20000,
            likes: 120, // Low engagement rate (~0.6% - borderline)
            comments: 10,
          })),
        }, { botRatio: 0.35, sentimentScore: 80, spamPatterns: [] });

        // Set high spikeFactor to force mild-spike
        mockScore.metrics.spikeFactor = 6.0;

        const comments = { botRatio: 0.35, sentimentScore: 80, spamPatterns: [] }; // Borderline bot comments (0.35)

        const flags = detectFraudSignals(mockScore, comments, {
          subscribers: 250000,
          videoCount: 100,
          fandomDetected: false,
        });

        const clusterFlag = flags.find((f) => f.id === "pattern-cluster");
        if (!clusterFlag) {
          throw new Error("Expected 3 weak signals to cluster into a 'pattern-cluster' flag");
        }
        if (clusterFlag.severity !== "medium") {
          throw new Error(`Expected cluster flag severity 'medium', got '${clusterFlag.severity}'`);
        }
      },
    },
  ];

  const runAllTests = async () => {
    setRunning(true);
    // Initialize results as running
    setResults(testCases.map(tc => ({ ...tc, status: "running", logs: ["Test initialized..."] })));

    // Let the UI render the running states
    await new Promise((r) => setTimeout(r, 800));

    const finalResults: TestResult[] = [];
    for (const tc of testCases) {
      const logs = ["Setting up environment...", `Running test: ${tc.name}`];
      try {
        tc.run();
        logs.push("Assertions complete.", "Test passed successfully.");
        finalResults.push({
          ...tc,
          status: "passed",
          logs,
        });
      } catch (e: any) {
        logs.push(`Assertion failed: ${e.message}`, "Test failed.");
        finalResults.push({
          ...tc,
          status: "failed",
          error: e.message || String(e),
          logs,
        });
      }
      // Small stagger effect
      setResults([...finalResults, ...testCases.slice(finalResults.length).map(t => ({ ...t, status: "running" as const }))]);
      await new Promise((r) => setTimeout(r, 150));
    }
    setRunning(false);
  };

  useEffect(() => {
    runAllTests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = results.length;
  const passed = results.filter((r) => r.status === "passed").length;
  const failed = results.filter((r) => r.status === "failed").length;

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="container mx-auto max-w-5xl px-4 sm:px-6 py-10 space-y-8">
        {/* Back navigation */}
        <div>
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Test Suite Dashboard</h1>
            <p className="text-muted-foreground mt-1.5">Verify system integrity, algorithm thresholds, and model edge cases.</p>
          </div>
          <Button
            onClick={runAllTests}
            disabled={running}
            className="gradient-bg border-0 text-white glow hover:opacity-95 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${running ? "animate-spin" : ""}`} />
            {running ? "Running Tests..." : "Run Test Suite"}
          </Button>
        </div>

        {/* Stats Summary Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass rounded-2xl p-5 flex flex-col justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Total Tests</span>
            <div className="text-3xl font-bold mt-2 tabular-nums">{total}</div>
          </div>
          <div className="glass rounded-2xl p-5 flex flex-col justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Passed</span>
            <div className="text-3xl font-bold mt-2 text-success tabular-nums">{passed}</div>
          </div>
          <div className="glass rounded-2xl p-5 flex flex-col justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Failed</span>
            <div className="text-3xl font-bold mt-2 text-destructive tabular-nums">{failed}</div>
          </div>
          <div className="glass rounded-2xl p-5 flex flex-col justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Success Rate</span>
            <div className="text-3xl font-bold mt-2 text-primary tabular-nums">
              {total ? Math.round((passed / total) * 100) : 0}%
            </div>
          </div>
        </div>

        {/* Test Cases List */}
        <div className="space-y-6">
          {["Scoring Engine", "Trust Risk Indicators"].map((groupName) => {
            const groupResults = results.filter((r) => r.group === groupName);
            if (groupResults.length === 0) return null;

            return (
              <div key={groupName} className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground px-1 flex items-center gap-2">
                  {groupName === "Scoring Engine" ? <Activity className="w-4 h-4 text-primary" /> : <ShieldCheck className="w-4 h-4 text-brand-purple" />}
                  {groupName}
                </h3>

                <div className="space-y-2">
                  {groupResults.map((r) => {
                    const isExpanded = expandedId === r.id;
                    return (
                      <div
                        key={r.id}
                        className={`glass rounded-2xl transition border ${
                          r.status === "failed"
                            ? "border-destructive/30 hover:border-destructive/50"
                            : r.status === "passed"
                            ? "border-success/20 hover:border-success/45"
                            : "border-border"
                        }`}
                      >
                        {/* Header card toggle */}
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : r.id)}
                          className="w-full text-left p-4 sm:p-5 flex items-start sm:items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="font-semibold flex items-center gap-2">
                              {r.name}
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">{r.description}</p>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {r.status === "passed" && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-success/15 text-success border border-success/30">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Passed
                              </span>
                            )}
                            {r.status === "failed" && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-destructive/15 text-destructive border border-destructive/30">
                                <XCircle className="w-3.5 h-3.5" /> Failed
                              </span>
                            )}
                            {r.status === "running" && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 animate-pulse">
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Running
                              </span>
                            )}
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                          </div>
                        </button>

                        {/* Collapsible log view */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t border-border overflow-hidden bg-background/50 rounded-b-2xl"
                            >
                              <div className="p-4 sm:p-5 space-y-4">
                                <div className="space-y-2">
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <Terminal className="w-3.5 h-3.5" /> Execution logs
                                  </h4>
                                  <div className="bg-black/40 border border-border rounded-xl p-3 font-mono text-[11px] sm:text-xs text-muted-foreground space-y-1.5 leading-relaxed overflow-x-auto max-h-48">
                                    {r.logs?.map((log, idx) => (
                                      <div key={idx} className={log.includes("failed") || log.includes("Error") ? "text-destructive" : log.includes("passed") ? "text-success" : ""}>
                                        <span className="text-muted-foreground/40 select-none mr-2">&gt;</span>
                                        {log}
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {r.error && (
                                  <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs sm:text-sm text-destructive font-mono leading-relaxed">
                                    <span className="font-bold">Assertion Failure:</span> {r.error}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
