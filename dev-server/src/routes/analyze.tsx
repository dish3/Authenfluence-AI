import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { Nav } from "@/components/Nav";
import { SearchBar } from "@/components/SearchBar";
import { AnalysisView } from "@/components/AnalysisView";
import { AnalyzingOverlay } from "@/components/AnalyzingOverlay";
import { type InfluencerAnalysis, MOCK_INFLUENCERS } from "@/lib/mock-data";
import { analyzeInfluencer, compareInfluencers } from "@/lib/analyze.functions";
import { addHistory, getHistory } from "@/lib/history";
import { 
  LayoutDashboard, UserCheck, ShieldAlert, TrendingUp, Target, Award, Users, GitCompare, 
  LineChart, FileSpreadsheet, History, Settings, Shield, Clock, ChevronRight, AlertCircle, 
  ArrowRight, CheckCircle2, Play, Activity, Sparkles, Heart, FileText, Check, Trophy, BadgeCheck, 
  Minus, RefreshCw, Download, Youtube, Globe, TrendingDown, BarChart3, ThumbsUp, MessageSquare, 
  DollarSign, ArrowUpRight, Sliders, Database, Share2, Instagram, Twitter, Linkedin, ExternalLink, Info
} from "lucide-react";
import { z } from "zod";
import { ScoreRing } from "@/components/ScoreRing";
import { BreakdownCard } from "@/components/BreakdownCard";
import { downloadReport, downloadComparisonReport } from "@/lib/report";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const searchSchema = z.object({ u: z.string().optional(), p: z.string().optional() });

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

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function AnalyzePage() {
  const { u, p } = Route.useSearch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InfluencerAnalysis | null>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setRecent(getHistory());
  }, []);

  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reportType, setReportType] = useState<"full" | "audience" | "brand" | "compare">("full");
  const [includeWatermark, setIncludeWatermark] = useState(true);
  const [historySearch, setHistorySearch] = useState("");
  const [slackActive, setSlackActive] = useState(false);
  const [slackUrl, setSlackUrl] = useState("https://hooks.slack.com/services/T000/B000/XXXXXX");
  const [themePref, setThemePref] = useState<"dark" | "light" | "system">("dark");
  const [analysisDepth, setAnalysisDepth] = useState<50 | 100>(50);
  const [confidencePref, setConfidencePref] = useState<"strict" | "balanced" | "lenient">("balanced");
  const [disambiguationData, setDisambiguationData] = useState<{ query: string; platform: "youtube" | "instagram" | "twitter"; candidates: any[] } | null>(null);

  // Creator Comparison specific states
  const [compA, setCompA] = useState("mrbeast");
  const [compB, setCompB] = useState("cryptokingz");
  const [compPair, setCompPair] = useState<any | null>(null);
  const [compLoading, setCompLoading] = useState(false);
  const [compError, setCompError] = useState<string | null>(null);
  const compareFn = useServerFn(compareInfluencers);

  const analyze = useServerFn(analyzeInfluencer);

  const run = async (username: string, platform: "youtube" | "instagram" | "twitter" = "youtube") => {
    setLoading(true);
    setResult(null);
    setError(null);
    const started = Date.now();
    try {
      const a = (await analyze({ data: { username, platform } })) as any;
      if (a && a.status === "needs_disambiguation") {
        setDisambiguationData({ query: username, platform, candidates: a.candidates });
        setLoading(false);
        return;
      }
      setDisambiguationData(null);
      // ensure loading overlay shows full cinematic sequence (~3.4s)
      const elapsed = Date.now() - started;
      const minDuration = 3400;
      if (elapsed < minDuration) await new Promise((r) => setTimeout(r, minDuration - elapsed));
      setResult(a);
      addHistory(a);
      setRecent(getHistory());
      setLoading(false);
      navigate({ to: "/analyze", search: { u: a.username, p: a.platform }, replace: true });
      setActiveTab("creator"); // automatically open creator analysis view on done
    } catch (e: any) {
      console.error("[Analyze] Server function error:", e);
      setLoading(false);
      setError(e?.message ?? "Analysis failed. Please try again.");
    }
  };

  const runComp = async () => {
    if (!compA.trim() || !compB.trim()) return;
    setCompLoading(true);
    setCompPair(null);
    setCompError(null);
    try {
      const res = await compareFn({ data: { a: compA, b: compB } });
      setCompPair(res);
    } catch (e: any) {
      setCompError(e?.message ?? "Comparison failed. Please try again.");
    } finally {
      setCompLoading(false);
    }
  };

  useEffect(() => {
    if (u && !result && !loading) {
      run(u, (p as any) || "youtube");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === "compare" && !compPair && !compLoading) {
      runComp();
    }
  }, [activeTab]);

  const renderAnalyzeFirst = (moduleName: string) => {
    return (
      <div className="glass rounded-3xl p-10 text-center border border-border/40 font-normal space-y-4 max-w-lg mx-auto mt-10">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold text-base">Creator Audit Required</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The **{moduleName}** module requires active metric evaluations. Please enter a creator username in the search bar below to begin.
          </p>
        </div>
        <div className="pt-2">
          <SearchBar onAnalyze={run} defaultValue={u} />
        </div>
      </div>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "var(--color-success)";
    if (score >= 50) return "var(--color-warning)";
    return "var(--color-destructive)";
  };

  const renderCreatorForecastHeader = () => {
    if (!result) return null;

    return (
      <div className="space-y-4">
        {result.dataSource === "fallback" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 rounded-2xl bg-warning/10 border border-warning/20 text-warning text-xs sm:text-sm font-normal"
          >
            <AlertCircle className="w-5 h-5 shrink-0 animate-pulse" />
            <div>
              <span className="font-semibold">Demo Fallback Mode:</span> The live YouTube API is offline or unavailable (e.g. quota limit reached, network issue, or API key missing). Displaying simulated trust intelligence data for demonstration.
            </div>
          </motion.div>
        )}
        {/* Unified Forecast Header */}
        <div className="glass-strong rounded-3xl p-5 border border-border/40 relative overflow-hidden font-normal text-xs">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative z-10">
            {/* Identity Group */}
            <div className="flex items-center gap-3.5">
              {result.avatarUrl ? (
                <img
                  src={result.avatarUrl}
                  alt={result.displayName}
                  className="w-12 h-12 rounded-full object-cover border border-border/40 shadow-sm shrink-0"
                />
              ) : (
                <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${result.avatarColor || 'from-blue-500 to-purple-500'} flex items-center justify-center text-white text-base font-bold shadow-sm shrink-0`}>
                  {result.displayName.charAt(0)}
                </div>
              )}
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-1">
                    {result.displayName}
                    {result.isVerified && (
                      <BadgeCheck className="w-4 h-4 text-blue-500 fill-blue-500/10 shrink-0" />
                    )}
                  </h3>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-semibold font-mono">
                    {result.lifecycleStage ?? "Growing"}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground bg-muted/40 px-1.5 py-0.2 rounded">
                    <Youtube className="w-3 h-3 text-red-500" /> YouTube
                  </span>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span className="capitalize">{result.creatorCategories?.[0]?.type || "Entertainment"}</span>
                </div>
              </div>
            </div>

            {/* Core Analytics Vectors */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full md:w-auto flex-1 md:justify-end">
              {/* Trust Score */}
              <div className="glass bg-muted/5 rounded-2xl p-2.5 border border-border/20 text-center shrink-0 min-w-[5.5rem] flex flex-col items-center justify-center">
                <div className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
                  <Shield className="w-2.5 h-2.5 text-success" />
                  <span>Trust Index</span>
                </div>
                <div className="text-sm font-black mt-0.5" style={{ color: getScoreColor(result.score) }}>{result.score}/100</div>
              </div>

              {/* Influence Velocity */}
              <div className="glass bg-muted/5 rounded-2xl p-2.5 border border-border/20 text-center shrink-0 min-w-[6.5rem] flex flex-col items-center justify-center">
                <div className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
                  <Activity className="w-2.5 h-2.5 text-primary" />
                  <span>Influence Velocity</span>
                </div>
                <div className="text-sm font-black mt-0.5 text-primary">{result.influenceVelocity ?? 80}/100</div>
              </div>

              {/* Virality Potential */}
              <div className="glass bg-muted/5 rounded-2xl p-2.5 border border-border/20 text-center shrink-0 min-w-[6rem] flex flex-col items-center justify-center">
                <div className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                  <span>Virality Index</span>
                </div>
                <div className="text-sm font-black mt-0.5 text-purple-400">{result.viralityPotential ?? 75}/100</div>
              </div>

              {/* Projected Growth */}
              <div className="glass bg-muted/5 rounded-2xl p-2.5 border border-border/20 text-center shrink-0 min-w-[6.5rem] flex flex-col items-center justify-center">
                <div className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="w-2.5 h-2.5 text-emerald-400" />
                  <span>Growth (90d)</span>
                </div>
                <div className="text-sm font-black mt-0.5 text-emerald-400">+{result.projectedGrowth90Days ?? 15}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Undervalued Opportunity Warning callout */}
        {result.isUndervalued && (
          <div className="relative overflow-hidden rounded-2xl p-[1px]" style={{ background: "linear-gradient(135deg, rgba(234, 179, 8, 0.4), rgba(249, 115, 22, 0.4))" }}>
            <div className="rounded-2xl bg-card/95 p-3.5 flex items-start gap-2.5 text-xs text-foreground/90 font-normal">
              <div className="w-6 h-6 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-500 shrink-0"><Sparkles className="w-4 h-4" /></div>
              <div>
                <div className="font-bold text-xs text-yellow-500">Undervalued Influence Opportunity Detected</div>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{result.undervaluedExplanation || "Engagement acceleration significantly exceeds audience scale benchmarks, representing high-yield marketing ROI."}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMomentumRadar = () => {
    if (!result || !result.radarMetrics) return null;
    
    const metrics = result.radarMetrics;
    const data = [
      { name: "Engagement Accel", val: metrics.engagementAccel },
      { name: "Audience Accel", val: metrics.audienceAccel },
      { name: "Trust Stability", val: metrics.trustStability },
      { name: "Virality Tendency", val: metrics.viralityTendency },
      { name: "Audience Loyalty", val: metrics.loyaltyStrength },
      { name: "Upload Cadence", val: metrics.uploadCadence }
    ];

    const size = 260;
    const center = size / 2;
    const radius = 80;

    const getPoint = (i: number, val: number) => {
      const angle = (Math.PI * 2 / 6) * i - Math.PI / 2;
      const r = (val / 100) * radius;
      return {
        x: center + r * Math.cos(angle),
        y: center + r * Math.sin(angle)
      };
    };

    const getAxisPoint = (i: number) => {
      const angle = (Math.PI * 2 / 6) * i - Math.PI / 2;
      return {
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle)
      };
    };

    const getLabelPoint = (i: number) => {
      const angle = (Math.PI * 2 / 6) * i - Math.PI / 2;
      const labelRadius = radius + 20;
      return {
        x: center + labelRadius * Math.cos(angle),
        y: center + labelRadius * Math.sin(angle)
      };
    };

    const gridHexagons = [25, 50, 75, 100].map((pct) => {
      const points = Array.from({ length: 6 }, (_, i) => {
        const angle = (Math.PI * 2 / 6) * i - Math.PI / 2;
        const r = (pct / 100) * radius;
        return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
      }).join(" ");
      return <polygon key={pct} points={points} fill="none" stroke="oklch(1 0 0 / 0.08)" strokeWidth="1" />;
    });

    const polyPoints = data.map((d, i) => {
      const pt = getPoint(i, d.val);
      return `${pt.x},${pt.y}`;
    }).join(" ");

    return (
      <div className="glass rounded-3xl p-5 border border-border/40 flex flex-col items-center justify-center font-normal">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 w-full text-left flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" /> Momentum Radar System
        </h3>
        <div className="relative w-full flex justify-center">
          <svg width={size} height={size + 10} className="overflow-visible">
            {gridHexagons}
            {Array.from({ length: 6 }).map((_, i) => {
              const pt = getAxisPoint(i);
              return <line key={i} x1={center} y1={center} x2={pt.x} y2={pt.y} stroke="oklch(1 0 0 / 0.08)" strokeWidth="1" />;
            })}
            <polygon 
              points={polyPoints} 
              fill="url(#radarGrad)" 
              stroke="oklch(0.62 0.21 265)" 
              strokeWidth="2" 
              className="glow-polygon"
            />
            {data.map((d, i) => {
              const pt = getPoint(i, d.val);
              return (
                <circle 
                  key={i} 
                  cx={pt.x} 
                  cy={pt.y} 
                  r="3.5" 
                  fill="oklch(0.62 0.21 265)" 
                  stroke="oklch(1 0 0 / 0.8)" 
                  strokeWidth="1.5" 
                />
              );
            })}
            {data.map((d, i) => {
              const pt = getLabelPoint(i);
              let textAnchor: "start" | "middle" | "end" = "middle";
              let dy = "0.33em";
              if (pt.x < center - 10) textAnchor = "end";
              else if (pt.x > center + 10) textAnchor = "start";
              
              if (pt.y < center - radius + 10) dy = "-0.6em";
              else if (pt.y > center + radius - 10) dy = "1.2em";

              return (
                <g key={i} className="text-[8px] font-mono">
                  <text 
                    x={pt.x} 
                    y={pt.y} 
                    dy={dy} 
                    textAnchor={textAnchor} 
                    fill="oklch(0.72 0.03 258)" 
                    className="font-semibold"
                  >
                    {d.name}
                  </text>
                  <text 
                    x={pt.x} 
                    y={pt.y} 
                    dy={dy === "-0.6em" ? "0.6em" : dy === "1.2em" ? "2.2em" : "1.33em"} 
                    textAnchor={textAnchor} 
                    fill="oklch(0.62 0.21 265)" 
                    className="font-bold text-[8px]"
                  >
                    {d.val}/100
                  </text>
                </g>
              );
            })}
            <defs>
              <linearGradient id="radarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.62 0.21 265)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="oklch(0.62 0.21 265)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    );
  };

  const renderEcosystemGraph = () => {
    if (!result || !result.ecosystemNodes) return null;

    const size = 260;
    const center = size / 2;
    const nodes = result.ecosystemNodes;
    const radius = 80;

    return (
      <div className="glass rounded-3xl p-5 border border-border/40 flex flex-col items-center justify-center font-normal">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 w-full text-left flex items-center gap-2">
          <Globe className="w-4 h-4 text-purple-400" /> Creator Ecosystem Overlap
        </h3>
        <div className="relative w-full flex justify-center">
          <svg width={size} height={size} className="overflow-visible">
            <defs>
              <radialGradient id="centerNodeGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="oklch(0.62 0.21 265)" stopOpacity={1} />
                <stop offset="100%" stopColor="oklch(0.45 0.15 264)" stopOpacity={0.8} />
              </radialGradient>
              <radialGradient id="neighborNodeGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="oklch(0.72 0.03 258)" stopOpacity={0.8} />
                <stop offset="100%" stopColor="oklch(0.21 0.04 264)" stopOpacity={0.6} />
              </radialGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {nodes.map((node, i) => {
              const angle = (Math.PI * 2 / nodes.length) * i - Math.PI / 2;
              const x = center + radius * Math.cos(angle);
              const y = center + radius * Math.sin(angle);
              return (
                <line 
                  key={i} 
                  x1={center} 
                  y1={center} 
                  x2={x} 
                  y2={y} 
                  stroke="oklch(0.62 0.21 265 / 0.3)" 
                  strokeWidth="2" 
                  strokeDasharray="3 3"
                />
              );
            })}

            {nodes.map((node, i) => {
              const angle = (Math.PI * 2 / nodes.length) * i - Math.PI / 2;
              const x = center + radius * Math.cos(angle);
              const y = center + radius * Math.sin(angle);
              const nodeRadius = 24 + (node.overlapPct / 100) * 12;

              return (
                <g key={i} className="cursor-pointer font-mono group">
                  <circle 
                    cx={x} 
                    cy={y} 
                    r={nodeRadius} 
                    fill="url(#neighborNodeGrad)" 
                    stroke="oklch(0.72 0.03 258 / 0.4)" 
                    strokeWidth="1.5"
                  />
                  <text 
                    x={x} 
                    y={y - 2} 
                    textAnchor="middle" 
                    fill="oklch(1 0 0)" 
                    className="text-[8px] font-bold fill-foreground"
                  >
                    {node.overlapPct}%
                  </text>
                  <text 
                    x={x} 
                    y={y + 8} 
                    textAnchor="middle" 
                    fill="oklch(0.72 0.03 258)" 
                    className="text-[7px] fill-muted-foreground font-semibold"
                  >
                    {node.type.toUpperCase()}
                  </text>
                  <text 
                    x={x} 
                    y={y - nodeRadius - 5} 
                    textAnchor="middle" 
                    fill="oklch(0.62 0.21 265)" 
                    className="text-[8px] font-bold opacity-80"
                  >
                    {node.name}
                  </text>
                </g>
              );
            })}

            <g filter="url(#glow)">
              <circle 
                cx={center} 
                cy={center} 
                r="32" 
                fill="url(#centerNodeGrad)" 
                stroke="oklch(0.62 0.21 265)" 
                strokeWidth="2"
              />
              <text 
                x={center} 
                y={center + 3} 
                textAnchor="middle" 
                fill="#ffffff" 
                className="text-[8px] font-bold font-mono tracking-wider fill-white"
              >
                @{result.username}
              </text>
            </g>
          </svg>
        </div>
      </div>
    );
  };

  const renderIntelligenceFeed = () => {
    if (!result || !result.intelligenceFeed) return null;

    return (
      <div className="glass rounded-3xl p-5 border border-border/40 space-y-4 font-normal">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Database className="w-4 h-4 text-cyan-400" /> AI Intelligence Insights Feed
        </h3>
        <div className="bg-black/90 border border-cyan-500/20 rounded-2xl p-4 font-mono text-[10px] leading-relaxed text-cyan-400/90 shadow-inner h-[170px] overflow-y-auto space-y-2">
          <div className="flex items-center gap-1.5 text-cyan-500/50 text-[9px] border-b border-cyan-500/10 pb-1.5 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-ping" />
            <span>CONNECTING AUTHENFLUENCE AI FORECAST ENGINE... DONE</span>
          </div>
          {result.intelligenceFeed.map((item, idx) => (
            <div key={idx} className="flex gap-2 items-start animate-fade-in" style={{ animationDelay: `${idx * 150}ms` }}>
              <span className="text-cyan-500/60 shrink-0 select-none">&gt;&gt;</span>
              <span>{item}</span>
            </div>
          ))}
          <div className="flex gap-2 items-center text-cyan-400/40 text-[8px] pt-1">
            <span>&gt;&gt; SYSTEM ANALYST CONTINUOUS INFERENCE MODE</span>
            <span className="w-1 h-2.5 bg-cyan-400/70 animate-pulse" />
          </div>
        </div>
      </div>
    );
  };

  const renderDashboard = () => {
    const displayRecent = recent.length > 0 ? recent.slice(0, 3) : [
      { username: "mrbeast", displayName: "MrBeast", score: 94, category: "Entertainment", timestamp: Date.now() - 3600000 * 2, platform: "youtube" },
      { username: "justinbieber", displayName: "Justin Bieber", score: 78, category: "Music", timestamp: Date.now() - 3600000 * 5, platform: "youtube" },
      { username: "cryptokingz", displayName: "CryptoKingz", score: 32, category: "Finance", timestamp: Date.now() - 3600000 * 12, platform: "youtube" }
    ];

    const avgTrustScore = recent.length > 0 
      ? Math.round(recent.reduce((acc, h) => acc + h.score, 0) / recent.length) 
      : 81;

    const topCreators = [
      { name: "MrBeast", username: "mrbeast", score: 94, category: "Entertainment", followers: 310000000 },
      { name: "Justin Bieber", username: "justinbieber", score: 78, category: "Music", followers: 78400000 },
      { name: "CryptoKingz", username: "cryptokingz", score: 32, category: "Finance", followers: 1200000 }
    ];

    return (
      <div className="space-y-6 animate-fade-in font-normal">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">AI Creator Intelligence Control Center</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Real-time stats, audits, and model velocity metrics</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-muted-foreground">System Live: All models active</span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="glass rounded-2xl p-4 border border-border/40 relative overflow-hidden">
            <div className="absolute top-2 right-2 text-primary opacity-10"><Shield className="w-8 h-8" /></div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Total Audits</div>
            <div className="text-2xl font-black mt-1 text-foreground">15,240</div>
            <p className="text-[9px] text-muted-foreground mt-1">Real-time indexed audits</p>
          </div>
          <div className="glass rounded-2xl p-4 border border-border/40 relative overflow-hidden">
            <div className="absolute top-2 right-2 text-primary opacity-10"><Activity className="w-8 h-8" /></div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Model Accuracy</div>
            <div className="text-2xl font-black mt-1 text-primary">96.8%</div>
            <p className="text-[9px] text-muted-foreground mt-1">NLP & sentiment confidence</p>
          </div>
          <div className="glass rounded-2xl p-4 border border-border/40 relative overflow-hidden">
            <div className="absolute top-2 right-2 text-primary opacity-10"><Award className="w-8 h-8" /></div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Avg Trust Score</div>
            <div className="text-2xl font-black mt-1 text-foreground flex items-center gap-1.5">
              {avgTrustScore}
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">Optimal</span>
            </div>
            <p className="text-[9px] text-muted-foreground mt-1">Platform average index</p>
          </div>
          <div className="glass rounded-2xl p-4 border border-border/40 relative overflow-hidden">
            <div className="absolute top-2 right-2 text-primary opacity-10"><Database className="w-8 h-8" /></div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Connected APIs</div>
            <div className="text-2xl font-black mt-1 text-purple-400">Google Gemini</div>
            <p className="text-[9px] text-muted-foreground mt-1">Synched & calibrated</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Main search and demo creators */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass rounded-3xl p-6 border border-border/40 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">Start Creator Audit</h3>
              </div>
              <SearchBar onAnalyze={run} defaultValue={u} />
            </div>

            {/* Recent analyses in dashboard */}
            <div className="glass rounded-3xl p-6 border border-border/40 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" /> Recent Creator Analyses
              </h3>
              <div className="divide-y divide-border/20">
                {displayRecent.map((item) => (
                  <div 
                    key={item.username} 
                    className="py-3 flex items-center justify-between font-normal text-xs hover:bg-muted/10 px-2 rounded-xl transition cursor-pointer"
                    onClick={() => { run(item.username); }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                        {item.displayName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{item.displayName}</div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                          <span>@{item.username}</span>
                          <span className="w-1 h-1 rounded-full bg-border" />
                          <span className="capitalize">{item.category}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[10px] text-muted-foreground/60">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span 
                        className="text-sm font-bold tabular-nums w-8 text-right"
                        style={{ color: item.score >= 70 ? "var(--color-success)" : item.score >= 50 ? "var(--color-warning)" : "var(--color-destructive)" }}
                      >
                        {item.score}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Creators Analyzed */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Top Creators Analyzed</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {topCreators.map((m) => (
                  <button
                    key={m.username}
                    onClick={() => run(m.username)}
                    className="glass rounded-2xl p-4 text-left hover:border-primary/40 transition group relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-sm">{m.name}</div>
                        <div className="text-[10px] text-muted-foreground">@{m.username}</div>
                      </div>
                      <span
                        className="text-sm font-bold tabular-nums"
                        style={{ color: m.score >= 70 ? "var(--color-success)" : m.score >= 50 ? "var(--color-warning)" : "var(--color-destructive)" }}
                      >
                        {m.score}
                      </span>
                    </div>
                    <div className="mt-2 text-[9px] text-muted-foreground flex items-center justify-between font-normal">
                      <span>{fmt(m.followers)} subs</span>
                      <span>{m.category}</span>
                    </div>
                    <div className="mt-3 flex items-center text-[10px] text-primary opacity-0 group-hover:opacity-100 transition">
                      Run assessment <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: AI Insights & Activity summary log */}
          <div className="space-y-6">
            <div className="glass rounded-3xl p-6 border border-border/40 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-500" /> Quick Insights
              </h3>
              <div className="space-y-3 font-normal text-xs text-muted-foreground">
                <div className="p-3 rounded-2xl bg-primary/5 border border-primary/10">
                  <div className="font-semibold text-foreground text-xs">Engagement Volatility</div>
                  <p className="text-[11px] leading-relaxed mt-1 text-muted-foreground">YouTube engagement rates are averaging 2.1% across audited channels, outperforming Instagram counterparts by 34%.</p>
                </div>
                <div className="p-3 rounded-2xl bg-yellow-500/5 border border-yellow-500/10">
                  <div className="font-semibold text-foreground text-xs">Spam Detection Wave</div>
                  <p className="text-[11px] leading-relaxed mt-1 text-muted-foreground">NLP scans flagged a +12% spike in emoji-cluster spam threads in tech categories, primarily driving down trust scores.</p>
                </div>
                <div className="p-3 rounded-2xl bg-success/5 border border-success/10">
                  <div className="font-semibold text-foreground text-xs">Credibility Anchors</div>
                  <p className="text-[11px] leading-relaxed mt-1 text-muted-foreground">High public credibility signals reduced false positive risk by 28% for verified enterprise handles this week.</p>
                </div>
              </div>
            </div>

            <div className="glass rounded-3xl p-6 border border-border/40 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> AI Activity Log
              </h3>
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {[
                  { time: "09:42:15", log: "Audit completed: @mrbeast (Trust Score: 94)" },
                  { time: "09:40:02", log: "NLP comment scan complete: 120 nodes analyzed" },
                  { time: "09:37:44", log: "Semantic alignment computed for @justinbieber" },
                  { time: "09:35:10", log: "Model cache purged: 24 profiles updated" },
                  { time: "09:32:00", log: "Connected endpoints validation check passed" }
                ].map((act, i) => (
                  <div key={i} className="text-xs border-b border-border/20 pb-2 last:border-0 last:pb-0 font-normal flex items-start gap-2">
                    <span className="font-mono text-[9px] text-muted-foreground/80 mt-0.5 shrink-0">{act.time}</span>
                    <span className="text-muted-foreground leading-normal">{act.log}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCreatorAnalysis = () => {
    if (!result) return renderAnalyzeFirst("Creator Analysis");
    
    const engagementVal = typeof result.engagementRate === "number"
      ? result.engagementRate.toFixed(2)
      : (result.avgLikes && result.followers 
          ? ((result.avgLikes / result.followers) * 100).toFixed(2) 
          : "1.50");

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Creator Profile Analysis</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Audited channel information and AI profile overview</p>
          </div>
          <div className={`text-xs px-2.5 py-1 rounded-full border font-mono font-semibold flex items-center gap-1.5 shrink-0 ${
            result.dataSource === "live" 
              ? "bg-primary/10 text-primary border-primary/20" 
              : "bg-warning/15 text-warning border-warning/30"
          }`}>
            {result.dataSource === "live" ? (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            ) : result.platform === "youtube" ? (
              <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>
              {result.dataSource === "live" 
                ? "Live API Data" 
                : result.platform === "youtube" 
                  ? "Demo Fallback Mode" 
                  : "AI-Researched Public Profile"}
            </span>
          </div>
        </div>

        <SearchBar onAnalyze={run} defaultValue={u} />
        {renderCreatorForecastHeader()}

        {/* Main creator profile layout */}
        <div className="grid md:grid-cols-3 gap-6 font-normal">
          {/* Left Column: Identity card */}
          <div className="glass rounded-3xl p-6 border border-border/40 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {result.avatarUrl ? (
                  <img
                    src={result.avatarUrl}
                    alt={result.displayName}
                    className="w-16 h-16 rounded-full object-cover border-2 border-border/40 shadow-md shrink-0"
                  />
                ) : (
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${result.avatarColor || 'from-blue-500 to-purple-500'} flex items-center justify-center text-white text-xl font-bold shadow-md shrink-0`}>
                    {result.displayName.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <h1 className="text-xl font-bold flex items-center gap-1.5 truncate">
                    {result.displayName}
                    {result.isVerified && (
                      <BadgeCheck className="w-5 h-5 text-blue-500 fill-blue-500/10 shrink-0" />
                    )}
                  </h1>
                  <p className="text-xs text-muted-foreground truncate">@{result.username}</p>
                </div>
              </div>

              {/* Categorization */}
              <div className="space-y-2 pt-2 border-t border-border/20">
                <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Category Alignment</div>
                <div className="flex flex-wrap gap-1.5">
                  {(result.creatorCategories || [{ type: "Entertainment", weight: 1.0 }]).map((cat, i) => (
                    <span 
                      key={i} 
                      className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold"
                    >
                      {cat.type} ({Math.round(cat.weight * 100)}%)
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Social handles presence */}
            <div className="space-y-2.5 pt-4 border-t border-border/20 text-xs">
              <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Globe className="w-3 h-3" /> Verified Presence
              </div>
              {(() => {
                const presence = result.mediaPresence || [
                  { platform: "YouTube", url: `https://youtube.com/@${result.username}`, handle: `@${result.username}`, isVerified: true }
                ];
                // Check if we only have YouTube (no external links discovered)
                const hasExternalLinks = presence.some((p) => p.platform.toLowerCase() !== "youtube");

                const getPlatformIcon = (platform: string) => {
                  const p = platform.toLowerCase();
                  if (p === "youtube") return <Youtube className="w-3.5 h-3.5 text-red-500 shrink-0" />;
                  if (p === "instagram") return <Instagram className="w-3.5 h-3.5 text-pink-500 shrink-0" />;
                  if (p === "twitter/x" || p === "twitter" || p === "x") return <Twitter className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
                  if (p === "facebook") return <span className="w-3.5 h-3.5 shrink-0 text-[10px] font-black text-blue-500">f</span>;
                  if (p === "tiktok") return <span className="w-3.5 h-3.5 shrink-0 text-[10px] font-black text-foreground">TK</span>;
                  if (p === "linkedin") return <Linkedin className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
                  if (p === "discord") return <span className="w-3.5 h-3.5 shrink-0 text-[10px] font-black text-indigo-400">DC</span>;
                  if (p === "telegram") return <span className="w-3.5 h-3.5 shrink-0 text-[10px] font-black text-sky-400">TG</span>;
                  if (p === "linktree") return <ExternalLink className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
                  if (p === "twitch") return <span className="w-3.5 h-3.5 shrink-0 text-[10px] font-black text-purple-500">TV</span>;
                  return <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />;
                };

                return (
                  <>
                    <div className="space-y-2 font-normal">
                      {presence.map((p) => (
                        <a
                          key={p.platform + p.handle}
                          href={p.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="flex items-center justify-between text-muted-foreground hover:text-foreground transition group"
                        >
                          <span className="flex items-center gap-1.5">
                            {getPlatformIcon(p.platform)}
                            <span>{p.platform}</span>
                          </span>
                          <span className="text-[11px] truncate max-w-[110px] font-mono">{p.handle}</span>
                        </a>
                      ))}
                    </div>
                    {!hasExternalLinks && (
                      <div className="flex items-start gap-1.5 mt-2 p-2 rounded-xl bg-muted/10 border border-border/20 text-[10px] text-muted-foreground leading-normal">
                        <Info className="w-3 h-3 shrink-0 mt-0.5 text-primary/60" />
                        <span>ℹ️ No verified external creator links discovered.</span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Right Column (2/3 width): Stats and Summary */}
          <div className="md:col-span-2 space-y-6">
            {/* Live Creator Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="glass rounded-2xl p-4 border border-border/40">
                <div className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Subscribers</div>
                <div className="text-lg font-black mt-1">{fmt(result.followers)}</div>
              </div>
              <div className="glass rounded-2xl p-4 border border-border/40">
                <div className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Total Uploads</div>
                <div className="text-lg font-black mt-1">{fmt(result.totalPosts)}</div>
              </div>
              <div className="glass rounded-2xl p-4 border border-border/40">
                <div className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Avg Likes</div>
                <div className="text-lg font-black mt-1">{fmt(result.avgLikes)}</div>
              </div>
              <div className="glass rounded-2xl p-4 border border-border/40">
                <div className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Engagement Rate</div>
                <div className="text-lg font-black mt-1 text-primary">{engagementVal}%</div>
              </div>
            </div>

            {/* AI Summary and Profile Verdict */}
            <div className="glass rounded-3xl p-6 border border-border/40 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4.5 h-4.5 text-primary" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">AI-Generated Creator Verdict</h3>
              </div>
              <p className="text-sm leading-relaxed text-foreground/90 font-normal">
                {result.verdict}
              </p>
            </div>

            {/* Benchmark and data limitations */}
            <div className="grid sm:grid-cols-2 gap-4">
              {result.benchmarkContext && (
                <div className="glass rounded-2xl p-4 border border-border/40">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1.5">Algorithmic Niche Benchmark</div>
                  <p className="text-xs text-muted-foreground leading-normal">{result.benchmarkContext}</p>
                </div>
              )}
              {result.dataLimitations && result.dataLimitations.length > 0 && (
                <div className="glass rounded-2xl p-4 border border-border/40">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1.5">Model Constraints & Limitations</div>
                  <ul className="list-disc list-inside text-xs text-muted-foreground/80 space-y-1">
                    {result.dataLimitations.map((lim, i) => (
                      <li key={i} className="truncate">{lim}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTrustIntelligence = () => {
    if (!result) return renderAnalyzeFirst("Trust Intelligence");
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Trust Intelligence Engine</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Authenticity scoring and algorithmic creator due diligence</p>
        </div>
        {renderCreatorForecastHeader()}

        <div className="flex flex-col lg:grid lg:grid-cols-[200px_1fr] gap-6 items-center glass-strong rounded-3xl p-5 sm:p-6 border border-border/40">
          <div className="justify-self-center">
            <ScoreRing score={result.score} size={180} />
          </div>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-destructive/15 text-destructive border-destructive/30">
                <Youtube className="w-3.5 h-3.5" /> YouTube
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full border bg-success/15 text-success border-success/30 font-semibold">
                {result.score >= 75 ? "Mostly Authentic" : result.score >= 45 ? "Moderate Risk" : "Suspicious Activity"}
              </span>
              {result.confidenceLevel && (
                <span className="text-xs px-2.5 py-1 rounded-full border bg-primary/10 text-primary border-primary/20 font-semibold">
                  {result.confidenceLevel} Confidence
                </span>
              )}
            </div>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Influence Reliability Score</span>
                  <span>{result.breakdown.engagement}/100</span>
                </div>
                <div className="w-full bg-muted/40 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${result.breakdown.engagement}%` }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Audience Trust Quality</span>
                  <span>{result.breakdown.followerQuality}/100</span>
                </div>
                <div className="w-full bg-muted/40 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-success rounded-full" style={{ width: `${result.breakdown.followerQuality}%` }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Comment Authenticity Score</span>
                  <span>{result.breakdown.commentAuthenticity}/100</span>
                </div>
                <div className="w-full bg-muted/40 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${result.breakdown.commentAuthenticity}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Why this score */}
        <div className="glass rounded-3xl p-6 border border-border/40 space-y-4">
          <h3 className="font-semibold text-sm flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">Why This Score?</h3>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-success uppercase tracking-wider">✓ Positive Signals</h4>
              <ul className="space-y-1.5">
                {(result.whyThisScore?.positive || result.strengths || []).map((str, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2 font-normal">
                    <span className="text-success shrink-0 font-bold">✓</span>
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-warning uppercase tracking-wider">⚠ Monitoring Signals</h4>
              <ul className="space-y-1.5">
                {(result.whyThisScore?.monitoring || result.risks || []).map((risk, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2 font-normal">
                    <span className="text-warning shrink-0 font-bold">⚠</span>
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Niche Benchmark Comparison */}
        <div className="glass rounded-3xl p-6 border border-border/40 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">Niche Benchmark Comparison</h3>
          <div className="space-y-4 font-normal">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span>@{result.username} (This Creator)</span>
                <span className="text-primary font-bold">{result.score}/100</span>
              </div>
              <div className="w-full bg-muted/40 h-2.5 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${result.score}%` }} />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 pt-2 text-xs">
              <div className="p-4 rounded-2xl bg-muted/10 border border-border/20">
                <div className="text-[10px] text-muted-foreground uppercase font-semibold">Niche Benchmark Average</div>
                <div className="text-lg font-bold mt-1 text-foreground">72 / 100</div>
                <p className="text-[10px] text-muted-foreground leading-normal mt-1">Based on similar scale channels in category.</p>
              </div>
              <div className="p-4 rounded-2xl bg-muted/10 border border-border/20">
                <div className="text-[10px] text-muted-foreground uppercase font-semibold">Platform Credibility Score</div>
                <div className="text-lg font-bold mt-1 text-emerald-400">
                  {result.publicCredibility?.score || 85} / 100
                </div>
                <p className="text-[10px] text-muted-foreground leading-normal mt-1">Calculated verification trust anchor weight.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Indicators */}
        <div className="glass rounded-3xl p-6 border border-border/40 space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">Contextual Trust Risk Indicators</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {result.fraudSignals.map((s) => (
              <div key={s.id} className="glass bg-muted/10 p-3 rounded-2xl border border-border/20 space-y-1 text-left font-normal">
                <div className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>{s.title}</span>
                  <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-mono ${
                    s.severity === "high" ? "bg-destructive/10 text-destructive border border-destructive/20" :
                    s.severity === "medium" ? "bg-warning/10 text-warning border border-warning/20" :
                    "bg-muted text-muted-foreground"
                  }`}>{s.severity}</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-normal">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderGrowthPrediction = () => {
    if (!result) return renderAnalyzeFirst("Growth Prediction");

    const currentSubs = result.followers;
    const growthRate = (result.momentumSignals?.thirtyDayGrowth || 4.2) / 100;
    const projectionData = Array.from({ length: 6 }, (_, i) => {
      const month = i + 1;
      const projectedValue = Math.round(currentSubs * Math.pow(1 + growthRate, month));
      return {
        name: `M${month}`,
        projected: projectedValue,
        current: currentSubs
      };
    });

    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Growth Prediction Engine</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Machine learning forecasts on creator expansion and audience velocity</p>
        </div>
        {renderCreatorForecastHeader()}

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="glass rounded-2xl p-4 border border-border/40 relative overflow-hidden flex flex-col justify-between min-h-[7rem]">
            <div className="absolute top-2 right-2 opacity-5"><TrendingUp className="w-16 h-16" /></div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Growth Potential Score</div>
            <div className="text-2xl font-bold text-primary my-2">{result.growthPotentialScore || 80}/100</div>
            <p className="text-[10px] text-muted-foreground">Estimated audience trajectory velocity</p>
          </div>
          <div className="glass rounded-2xl p-4 border border-border/40 relative overflow-hidden flex flex-col justify-between min-h-[7rem]">
            <div className="absolute top-2 right-2 opacity-5"><Activity className="w-16 h-16" /></div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">30-Day Growth</div>
            <div className="text-2xl font-bold text-success my-2">+{result.momentumSignals?.thirtyDayGrowth || 4.2}%</div>
            <p className="text-[10px] text-muted-foreground">Historical expansion velocity</p>
          </div>
          <div className="glass rounded-2xl p-4 border border-border/40 relative overflow-hidden flex flex-col justify-between min-h-[7rem]">
            <div className="absolute top-2 right-2 opacity-5"><LineChart className="w-16 h-16" /></div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Engagement Trajectory</div>
            <div className="text-2xl font-bold text-foreground my-2 capitalize">{result.momentumSignals?.engagementTrajectory || "Stable"}</div>
            <p className="text-[10px] text-muted-foreground">Engagement volatility indices</p>
          </div>
        </div>

        {/* 6-Month Audience Expansion Forecast */}
        <div className="glass rounded-3xl p-6 border border-border/40">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">6-Month Future Audience Expansion Forecast</h3>
          <div className="h-[240px] font-normal">
            <ResponsiveContainer>
              <AreaChart data={projectionData}>
                <defs>
                  <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.62 0.21 265)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="oklch(0.62 0.21 265)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="oklch(1 0 0 / 0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="oklch(0.72 0.03 258)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis 
                  stroke="oklch(0.72 0.03 258)" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(v) => fmt(v)}
                  width={42} 
                />
                <Tooltip
                  contentStyle={{ background: "oklch(0.21 0.04 264)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 12, fontSize: 12 }}
                  labelStyle={{ color: "oklch(0.72 0.03 258)" }}
                  formatter={(value: number) => [fmt(value), "Projected Followers"]}
                />
                <Area type="monotone" dataKey="projected" stroke="oklch(0.62 0.21 265)" strokeWidth={2} fill="url(#growthGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Two-Column Momentum & AI Analysis */}
        <div className="grid md:grid-cols-2 gap-6">
          {renderMomentumRadar()}

          <div className="glass rounded-3xl p-6 border border-border/40 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">AI Growth Prediction Analysis</h3>
            <p className="text-sm leading-relaxed text-foreground/80 font-normal">
              {result.growthPotentialExplanation}
            </p>
            <div className="pt-3 border-t border-border/20 space-y-1.5">
              <div className="text-xs font-semibold text-muted-foreground/80 mb-1">Momentum Trend Signals:</div>
              {result.momentumSignals?.signals.map((sig, i) => (
                <div key={i} className="text-xs text-muted-foreground flex items-center gap-2 font-normal">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>{sig}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCampaignSuccess = () => {
    if (!result) return renderAnalyzeFirst("Campaign Success");

    // Dynamic ROI Estimations
    const estViews = result.avgLikes * 6; // estimate views
    const minCPM = 15;
    const maxCPM = 28;
    const estMinVal = Math.round((estViews * minCPM) / 1000);
    const estMaxVal = Math.round((estViews * maxCPM) / 1000);

    const partnerTier = result.score >= 85 ? "Platinum Tier Partner" 
      : result.score >= 70 ? "Premium Gold Tier" 
      : result.score >= 50 ? "Standard Silver Tier" 
      : "High Caution Tier";

    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Campaign Success Estimator</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Sponsorship suitability and audience conversion potential indices</p>
        </div>
        {renderCreatorForecastHeader()}

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="glass rounded-2xl p-5 border border-border/40 relative overflow-hidden flex flex-col justify-between min-h-[8rem]">
            <div className="absolute top-2 right-2 opacity-5"><Target className="w-16 h-16" /></div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Campaign Success Probability</div>
            <div className="text-3xl font-black text-emerald-400 my-2">{result.campaignSuccessProbability || 85}%</div>
            <p className="text-[10px] text-muted-foreground leading-normal font-normal">Algorithmic success probability model.</p>
          </div>

          <div className="glass rounded-2xl p-5 border border-border/40 relative overflow-hidden flex flex-col justify-between min-h-[8rem]">
            <div className="absolute top-2 right-2 opacity-5"><Award className="w-16 h-16" /></div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Audience Conversion</div>
            <div className="text-3xl font-black text-foreground my-2">{result.businessImpact?.conversionPotential || "High"}</div>
            <p className="text-[10px] text-muted-foreground leading-normal font-normal">Calculated engagement loyalty conversion.</p>
          </div>

          <div className="glass rounded-2xl p-5 border border-border/40 relative overflow-hidden flex flex-col justify-between min-h-[8rem]">
            <div className="absolute top-2 right-2 opacity-5"><DollarSign className="w-16 h-16" /></div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Partnership Class</div>
            <div className="text-base font-bold text-primary my-3">{partnerTier}</div>
            <p className="text-[10px] text-muted-foreground leading-normal font-normal">Creator safety & scale class rating.</p>
          </div>
        </div>

        {/* ROI-style creator evaluation */}
        <div className="glass rounded-3xl p-6 border border-border/40 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">ROI-Style Sponsor Evaluation</h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 font-normal text-xs">
            <div className="p-4 rounded-2xl bg-muted/10 border border-border/20">
              <div className="text-[10px] text-muted-foreground uppercase font-semibold">Estimated CPM Range</div>
              <div className="text-base font-bold mt-1 text-foreground">${minCPM}.00 - ${maxCPM}.00</div>
              <p className="text-[9px] text-muted-foreground mt-0.5">Industry category average.</p>
            </div>
            <div className="p-4 rounded-2xl bg-muted/10 border border-border/20">
              <div className="text-[10px] text-muted-foreground uppercase font-semibold">Est. Media Value / Post</div>
              <div className="text-base font-bold mt-1 text-foreground">${fmt(estMinVal)} - ${fmt(estMaxVal)}</div>
              <p className="text-[9px] text-muted-foreground mt-0.5">Based on average views multiplier.</p>
            </div>
            <div className="p-4 rounded-2xl bg-muted/10 border border-border/20">
              <div className="text-[10px] text-muted-foreground uppercase font-semibold">Engagement Efficiency</div>
              <div className="text-base font-bold mt-1 text-emerald-400">Excellent</div>
              <p className="text-[9px] text-muted-foreground mt-0.5">High conversational density ratio.</p>
            </div>
            <div className="p-4 rounded-2xl bg-muted/10 border border-border/20">
              <div className="text-[10px] text-muted-foreground uppercase font-semibold">Optimal Campaign Fit</div>
              <div className="text-base font-bold mt-1 text-primary">Integrated Sponsor</div>
              <p className="text-[9px] text-muted-foreground mt-0.5">Recommended format integration.</p>
            </div>
          </div>
        </div>

        {/* Two-Column Business Impact Reasoning & AI terminal Feed */}
        <div className="grid md:grid-cols-3 gap-6 items-start">
          <div className="md:col-span-2 glass rounded-3xl p-6 border border-border/40 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">AI Business Impact Reasoning</h3>
            <div className="grid sm:grid-cols-3 gap-4 font-normal">
              <div className="glass bg-muted/10 p-4 rounded-2xl border border-border/20">
                <div className="text-[10px] text-muted-foreground uppercase font-semibold">Suitability Verdict</div>
                <p className="text-xs text-foreground mt-1.5">{result.businessImpact?.suitability || result.brandRecommendation?.sponsorshipSuitability}</p>
              </div>
              <div className="glass bg-muted/10 p-4 rounded-2xl border border-border/20">
                <div className="text-[10px] text-muted-foreground uppercase font-semibold">Reach Stability</div>
                <p className="text-xs text-foreground mt-1.5">{result.businessImpact?.stability || "Consistent high-impact impressions."}</p>
              </div>
              <div className="glass bg-muted/10 p-4 rounded-2xl border border-border/20">
                <div className="text-[10px] text-muted-foreground uppercase font-semibold">Audience Loyalty</div>
                <p className="text-xs text-foreground mt-1.5">{result.businessImpact?.loyalty || "Highly dedicated core audience interactions."}</p>
              </div>
            </div>
          </div>
          <div className="md:col-span-1">
            {renderIntelligenceFeed()}
          </div>
        </div>
      </div>
    );
  };

  const renderBrandMatchEngine = () => {
    if (!result) return renderAnalyzeFirst("Brand Match Engine");
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Brand Match Intelligence</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Semantic AI alignment scoring against leading industry brands</p>
        </div>
        {renderCreatorForecastHeader()}

        <div className="grid md:grid-cols-3 gap-6 items-start">
          <div className="md:col-span-2 glass rounded-3xl p-6 sm:p-8 border border-border/40 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Award className="w-4 h-4 text-yellow-500" />
              </div>
              <div>
                <h4 className="font-semibold text-base">Recommended Brand Fit</h4>
                <p className="text-xs text-muted-foreground">Matches calculated using content categories and audience compatibility</p>
              </div>
            </div>

            <div className="space-y-4">
              {result.brandMatches?.map((match) => {
                // Simulated breakdown values
                const nicheAlign = Math.round(match.score * 0.95 + Math.random() * 4);
                const audCompat = Math.round(match.score * 0.91 + Math.random() * 6);
                const semanticSim = Math.round(match.score * 0.97 + Math.random() * 3);

                return (
                  <div key={match.brandName} className="glass bg-muted/10 p-5 rounded-2xl border border-border/20 space-y-4 font-normal">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-sm font-semibold flex items-center gap-2">
                        <span className="text-base font-bold text-foreground">{match.brandName}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 font-mono font-semibold">
                          {match.score}% compatibility
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground leading-normal">
                      {match.reason}
                    </div>

                    {/* Similarity breakdown indicators */}
                    <div className="grid sm:grid-cols-3 gap-4 pt-2 border-t border-border/10 font-normal">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                          <span>Niche Alignment</span>
                          <span>{nicheAlign}%</span>
                        </div>
                        <div className="w-full bg-muted/40 h-1.5 rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${nicheAlign}%` }} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                          <span>Audience Compatibility</span>
                          <span>{audCompat}%</span>
                        </div>
                        <div className="w-full bg-muted/40 h-1.5 rounded-full overflow-hidden">
                          <div className="h-full bg-success rounded-full" style={{ width: `${audCompat}%` }} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                          <span>Semantic Similarity</span>
                          <span>{semanticSim}%</span>
                        </div>
                        <div className="w-full bg-muted/40 h-1.5 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${semanticSim}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="md:col-span-1">
            {renderEcosystemGraph()}
          </div>
        </div>
      </div>
    );
  };

  const renderAudienceInsights = () => {
    if (!result) return renderAnalyzeFirst("Audience Insights");
    const detailed = result.commentAuthenticityDetailed || {
      lowAuthenticityPct: 25,
      reason: "Standard evaluation comments.",
      spamPct: 5,
      repetitivePct: 10,
      emojiSpamPct: 5,
      botLanguagePct: 5,
      organicPct: 75
    };

    // Demographic values (simulated based on creator category)
    const ageData = [
      { bracket: "13-17", value: 18 },
      { bracket: "18-24", value: 45 },
      { bracket: "25-34", value: 27 },
      { bracket: "35-44", value: 8 },
      { bracket: "45+", value: 2 },
    ];
    const topCountries = [
      { country: "United States", value: 48 },
      { country: "United Kingdom", value: 12 },
      { country: "India", value: 10 },
      { country: "Germany", value: 6 },
      { country: "Canada", value: 5 },
    ];

    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Audience Trust & Sentiment Insights</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Scans public commenter dialogue for repetitive patterns, emoji spam, and bot signatures</p>
        </div>
        {renderCreatorForecastHeader()}

        {/* Comment Authenticity Breakdown */}
        <div className="glass rounded-3xl p-6 sm:p-8 border border-border/40 space-y-6">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">Comment Authenticity Quality</h4>
            <p className="text-xs text-muted-foreground font-normal">Findings: {detailed.reason}</p>
          </div>

          <div className="grid sm:grid-cols-5 gap-3 pt-2 text-center">
            {[
              { name: "Organic Genuine", val: detailed.organicPct },
              { name: "Duplicated / Repetitive", val: detailed.repetitivePct },
              { name: "Promo Links / Spam", val: detailed.spamPct },
              { name: "Emoji Clusters", val: detailed.emojiSpamPct },
              { name: "Bot Syntaxes", val: detailed.botLanguagePct },
            ].map((col) => (
              <div key={col.name} className="glass bg-muted/10 rounded-2xl p-4 border border-border/20">
                <div className="text-sm font-bold">{col.val}%</div>
                <div className="text-[9px] text-muted-foreground leading-normal mt-1">{col.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Fandom Behavior & Interaction Health */}
        <div className="grid md:grid-cols-3 gap-6 font-normal">
          <div className="glass rounded-3xl p-6 border border-border/40 space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Fandom Behavior</h3>
              <div className="space-y-3.5 text-xs">
                <div className="flex items-center justify-between border-b border-border/10 pb-2">
                  <span className="text-muted-foreground">Community Sentiment</span>
                  <span className="font-semibold text-success">84% Positive</span>
                </div>
                <div className="flex items-center justify-between border-b border-border/10 pb-2">
                  <span className="text-muted-foreground">Comment Density</span>
                  <span className="font-semibold text-primary">High (1.2%)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Interaction Health</span>
                  <span className="font-semibold text-foreground">Optimal Ratio</span>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed mt-2">
              Based on the comment density velocity relative to raw views counts.
            </p>
          </div>

          <div className="glass rounded-3xl p-6 border border-border/40 space-y-4 md:col-span-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Audience Demographics</h3>
            <div className="grid sm:grid-cols-2 gap-6 text-xs">
              {/* Age Distribution */}
              <div className="space-y-2">
                <div className="text-[10px] text-muted-foreground uppercase font-semibold">Age Distribution Estimate</div>
                <div className="space-y-2">
                  {ageData.map((age) => (
                    <div key={age.bracket} className="space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span>{age.bracket}</span>
                        <span>{age.value}%</span>
                      </div>
                      <div className="w-full bg-muted/30 h-1.5 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${age.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Geography Distribution */}
              <div className="space-y-2">
                <div className="text-[10px] text-muted-foreground uppercase font-semibold">Top Geography Reach</div>
                <div className="space-y-2">
                  {topCountries.map((c) => (
                    <div key={c.country} className="space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span>{c.country}</span>
                        <span>{c.value}%</span>
                      </div>
                      <div className="w-full bg-muted/30 h-1.5 rounded-full overflow-hidden">
                        <div className="h-full bg-success rounded-full" style={{ width: `${c.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="glass rounded-3xl p-6 border border-border/40 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">AI Intelligence Observation Timeline</h3>
          <div className="space-y-3 font-normal">
            {result.timelineEvents?.map((evt, i) => (
              <div key={i} className="flex gap-3 text-xs items-start border-b border-border/10 pb-2 last:border-b-0">
                <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-mono shrink-0 ${
                  evt.status === "success" ? "bg-success/15 text-success border border-success/20" :
                  evt.status === "warning" ? "bg-destructive/15 text-destructive border border-destructive/20" :
                  "bg-muted text-muted-foreground"
                }`}>{evt.category}</span>
                <span className="text-muted-foreground">{evt.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderCreatorComparison = () => {
    const compWinner = compPair && (compPair.a.score >= compPair.b.score ? 0 : 1);
    const compPairArr = compPair ? [compPair.a, compPair.b] : null;

    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Creator Comparison Engine</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Compare digital trust, growth velocity, and brand fit side-by-side</p>
        </div>

        <div className="glass rounded-3xl p-5 border border-border/40">
          <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end font-semibold text-xs">
            <div>
              <label className="text-muted-foreground uppercase tracking-wider">Creator A Handle</label>
              <Input value={compA} onChange={(e) => setCompA(e.target.value)} className="mt-1.5 h-11" />
            </div>
            <div>
              <label className="text-muted-foreground uppercase tracking-wider">Creator B Handle</label>
              <Input value={compB} onChange={(e) => setCompB(e.target.value)} className="mt-1.5 h-11" />
            </div>
            <Button onClick={runComp} size="lg" className="gradient-bg border-0 text-white h-11" disabled={compLoading}>
              Compare <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        {compLoading && (
          <div className="glass rounded-3xl p-10 text-center border border-border/40 animate-pulse">
            <RefreshCw className="w-6 h-6 text-primary animate-spin mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Running side-by-side predictive model checks...</p>
          </div>
        )}

        {compError && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-normal">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{compError}</span>
          </div>
        )}

        {compPairArr && (
          <div className="grid md:grid-cols-2 gap-5">
            {compPairArr.map((p, idx) => (
              <div
                key={p.username + idx}
                className={`glass-strong rounded-3xl p-6 relative border border-border/40 ${compWinner === idx ? "ring-glow" : ""}`}
              >
                {compWinner === idx && (
                  <div className="absolute -top-3 left-6 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full gradient-bg text-white text-[10px] font-bold">
                    <Trophy className="w-3 h-3" /> Higher Trust
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-base">{p.displayName}</div>
                    <div className="text-[10px] text-muted-foreground">@{p.username}</div>
                  </div>
                  <span className="text-lg font-extrabold text-primary">{p.score}</span>
                </div>
                <div className="mt-4 pt-3 border-t border-border/10">
                  <BreakdownCard breakdown={p.breakdown} creatorCategories={p.creatorCategories} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* COMPARATIVE MATRIX TABLE */}
        {compPair && (
          <div className="glass rounded-3xl p-6 sm:p-8 border border-border/40 space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Symmetric Match Matrix</h3>
            <div className="space-y-4 pt-2">
              {[
                { name: "Overall Trust Score", key: "score", format: (v: number) => `${v}/100`, max: 100 },
                { name: "Growth Potential Score", key: "growthPotentialScore", format: (v: number) => `${v}/100`, max: 100 },
                { name: "Campaign Success Probability", key: "campaignSuccessProbability", format: (v: number) => `${v}%`, max: 100 },
                { name: "Comment Authenticity (Organic %)", key: "commentAuthenticityDetailed", format: (v: any) => `${v.organicPct}%`, valExtractor: (v: any) => v.commentAuthenticityDetailed?.organicPct || 75, max: 100 },
                { name: "Posting Consistency", key: "breakdown", format: (v: any) => `${v.postingConsistency}/100`, valExtractor: (v: any) => v.breakdown?.postingConsistency || 80, max: 100 },
              ].map((row) => {
                const valA = row.valExtractor ? row.valExtractor(compPair.a) : (compPair.a as any)[row.key];
                const valB = row.valExtractor ? row.valExtractor(compPair.b) : (compPair.b as any)[row.key];
                const labelA = row.format(row.valExtractor ? compPair.a : (compPair.a as any)[row.key]);
                const labelB = row.format(row.valExtractor ? compPair.b : (compPair.b as any)[row.key]);

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
                          <div className="bg-primary h-full rounded-l-full" style={{ width: `${(valA / row.max) * 100}%` }} />
                        </div>
                        <div className="w-1.5 h-1.5 rounded-full bg-border" />
                        <div className="flex-1 bg-muted/30 rounded-full h-2 overflow-hidden">
                          <div className="bg-purple-500 h-full rounded-r-full" style={{ width: `${(valB / row.max) * 100}%` }} />
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
          </div>
        )}

        {compPair && (
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            <div className="flex-1 glass rounded-3xl p-[1px] overflow-hidden" style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-purple))" }}>
              <div className="rounded-3xl bg-card/95 p-6 flex items-start gap-3 h-full">
                <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center shrink-0 glow"><Sparkles className="w-5 h-5 text-white" /></div>
                <div>
                  <div className="font-semibold text-sm mb-1">AI Recommendation Summary</div>
                  <p className="text-xs text-foreground/90 leading-relaxed font-normal">{compPair.recommendation}</p>
                </div>
              </div>
            </div>
            <Button 
              onClick={() => downloadComparisonReport(compPair.a, compPair.b, compPair.recommendation)} 
              size="lg" 
              className="gradient-bg border-0 text-white font-semibold h-full min-h-[4rem] px-6 shrink-0 shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 rounded-2xl w-full sm:w-auto"
            >
              <Download className="w-4 h-4" /> Export Comparison
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderTrendAnalysis = () => {
    if (!result) return renderAnalyzeFirst("Trend Analysis");

    const sVal = result.score;
    const stabilityData = [
      { month: 'Jan', trust: Math.max(10, sVal - 3) },
      { month: 'Feb', trust: Math.max(10, sVal - 1) },
      { month: 'Mar', trust: sVal },
      { month: 'Apr', trust: sVal },
      { month: 'May', trust: Math.max(10, sVal - 2) },
      { month: 'Jun', trust: sVal }
    ];

    const consistencyVal = result.breakdown?.postingConsistency || 92;
    const momentumVal = result.growthPotentialScore || 80;

    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Trend & Momentum Analysis</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Dynamic posting cadence, upload consistency, and engagement trajectories</p>
        </div>
        {renderCreatorForecastHeader()}

        {/* Momentum Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass rounded-2xl p-4 border border-border/40">
            <div className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Upload Consistency</div>
            <div className="text-lg font-black mt-1 text-foreground">{consistencyVal} / 100</div>
            <p className="text-[8px] text-muted-foreground mt-0.5">Variance in upload intervals</p>
          </div>
          <div className="glass rounded-2xl p-4 border border-border/40">
            <div className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Interaction Trajectory</div>
            <div className="text-lg font-black mt-1 text-emerald-400">Stable</div>
            <p className="text-[8px] text-muted-foreground mt-0.5">Comment-to-like volatility</p>
          </div>
          <div className="glass rounded-2xl p-4 border border-border/40">
            <div className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Trust Stability Index</div>
            <div className="text-lg font-black mt-1 text-primary">Highly Stable</div>
            <p className="text-[8px] text-muted-foreground mt-0.5">Algorithmic risk variance</p>
          </div>
          <div className="glass rounded-2xl p-4 border border-border/40">
            <div className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Growth Velocity</div>
            <div className="text-lg font-black mt-1 text-purple-400">{momentumVal} / 100</div>
            <p className="text-[8px] text-muted-foreground mt-0.5">ML-estimated momentum slope</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 font-normal">
          {/* Chart 1: 14-Day Engagement Pattern */}
          <div className="glass rounded-3xl p-6 border border-border/40 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">14-Day Engagement Pattern</h3>
            <div className="h-[220px]">
              <ResponsiveContainer>
                <AreaChart data={result.engagementSeries}>
                  <defs>
                    <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.62 0.21 265)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="oklch(0.62 0.21 265)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="oklch(1 0 0 / 0.05)" vertical={false} />
                  <XAxis dataKey="day" stroke="oklch(0.72 0.03 258)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="oklch(0.72 0.03 258)" fontSize={10} tickLine={false} axisLine={false} width={24} />
                  <Tooltip
                    contentStyle={{ background: "oklch(0.21 0.04 264)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 12, fontSize: 11 }}
                    labelStyle={{ color: "oklch(0.72 0.03 258)" }}
                  />
                  <Area type="monotone" dataKey="baseline" stroke="oklch(0.72 0.03 258 / 0.3)" strokeDasharray="3 3" fill="none" />
                  <Area type="monotone" dataKey="engagement" stroke="oklch(0.62 0.21 265)" strokeWidth={2} fill="url(#engGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Trust Stability Trends */}
          <div className="glass rounded-3xl p-6 border border-border/40 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">6-Month Trust Stability Trend</h3>
            <div className="h-[220px]">
              <ResponsiveContainer>
                <AreaChart data={stabilityData}>
                  <defs>
                    <linearGradient id="trustGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.62 0.21 265)" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="oklch(0.62 0.21 265)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="oklch(1 0 0 / 0.05)" vertical={false} />
                  <XAxis dataKey="month" stroke="oklch(0.72 0.03 258)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="oklch(0.72 0.03 258)" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} width={24} />
                  <Tooltip
                    contentStyle={{ background: "oklch(0.21 0.04 264)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 12, fontSize: 11 }}
                    labelStyle={{ color: "oklch(0.72 0.03 258)" }}
                  />
                  <Area type="monotone" dataKey="trust" stroke="oklch(0.62 0.21 265)" strokeWidth={2} fill="url(#trustGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderReports = () => {
    if (!result) return renderAnalyzeFirst("Reports & Exports");
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reports & Export Utility</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Download enterprise-grade digital trust due diligence reports</p>
        </div>
        {renderCreatorForecastHeader()}

        <div className="grid md:grid-cols-[1.5fr_1fr] gap-6 font-normal">
          {/* Left Column: Report templates selection */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select Report Format</h3>
            
            <button
              onClick={() => setReportType("full")}
              className={`w-full text-left p-4 rounded-2xl glass transition border ${
                reportType === "full" ? "border-primary/60 bg-primary/5" : "border-border/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center shrink-0 glow">
                  <FileSpreadsheet className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Full Creator Intelligence Report</div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Includes full score breakdown, growth predictions, NLP analysis, and brand suitability indices.</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setReportType("audience")}
              className={`w-full text-left p-4 rounded-2xl glass transition border ${
                reportType === "audience" ? "border-primary/60 bg-primary/5" : "border-border/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500 shrink-0">
                  <Users className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Trust & Audience Due Diligence</div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Focuses on comment authenticity breakdown, bot ratios, and demographic summaries.</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setReportType("brand")}
              className={`w-full text-left p-4 rounded-2xl glass transition border ${
                reportType === "brand" ? "border-primary/60 bg-primary/5" : "border-border/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-500 shrink-0">
                  <Award className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Brand Compatibility & ROI Estimates</div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Contains recommended brand match scores, niche alignment data, and CPM estimations.</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setReportType("compare")}
              className={`w-full text-left p-4 rounded-2xl glass transition border ${
                reportType === "compare" ? "border-primary/60 bg-primary/5" : "border-border/30"
              }`}
              disabled={!compPair}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0">
                  <GitCompare className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold flex items-center gap-2">
                    Creator Comparison Report
                    {!compPair && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground">Compare Tab First</span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Symmetrical side-by-side comparative table and recommendation matrix.</p>
                </div>
              </div>
            </button>
          </div>

          {/* Right Column: Compilation controls */}
          <div className="glass rounded-3xl p-6 border border-border/40 space-y-6 self-start">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/20 pb-2">Export Parameters</h3>
            
            <div className="space-y-4 text-xs font-normal">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-foreground">Include Verification Watermark</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Embeds a tamper-proof cryptographically signed trust anchor seal.</p>
                </div>
                <button
                  onClick={() => setIncludeWatermark(!includeWatermark)}
                  className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none shrink-0 ${
                    includeWatermark ? "gradient-bg" : "bg-muted"
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                    includeWatermark ? "translate-x-4" : "translate-x-0"
                  }`} />
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-muted/10 border border-border/20 space-y-2 text-[11px] leading-relaxed text-muted-foreground">
                <div className="font-bold text-foreground">PDF Compilation Engine Status:</div>
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span>Engine: jsPDF Client-side</span>
                  <span className="text-success">Ready</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span>Compression Level: 1.0</span>
                  <span>Active</span>
                </div>
              </div>
            </div>

            <Button 
              onClick={() => {
                if (reportType === "compare" && compPair) {
                  downloadComparisonReport(compPair.a, compPair.b, compPair.recommendation);
                } else if (result) {
                  downloadReport(result);
                }
              }} 
              size="lg" 
              className="w-full gradient-bg border-0 text-white font-semibold"
            >
              <Download className="w-4 h-4 mr-2" /> Download Report (PDF)
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderHistory = () => {
    const filteredRecent = recent.filter(
      (h) =>
        h.displayName.toLowerCase().includes(historySearch.toLowerCase()) ||
        h.username.toLowerCase().includes(historySearch.toLowerCase())
    );

    return (
      <div className="space-y-6 animate-fade-in font-normal">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Creator Analysis History</h2>
            <p className="text-xs text-muted-foreground mt-0.5">List of recently executed audits on the platform</p>
          </div>
          <div className="w-full sm:w-64">
            <Input
              placeholder="Search history log..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
        </div>

        {filteredRecent.length > 0 ? (
          <div className="glass rounded-3xl border border-border/40 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/30 bg-muted/20 text-muted-foreground uppercase tracking-wider font-bold text-[10px]">
                    <th className="p-4">Creator</th>
                    <th className="p-4">Platform</th>
                    <th className="p-4 text-center">Trust Score</th>
                    <th className="p-4">Primary Category</th>
                    <th className="p-4">Cache Status</th>
                    <th className="p-4">Audit Date</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {filteredRecent.map((h) => {
                    const statusText = Date.now() - h.timestamp < 3600000 * 24 ? "Cached" : "Expired";
                    return (
                      <tr key={h.username} className="hover:bg-muted/10 transition">
                        <td className="p-4 font-semibold text-foreground">
                          <div>
                            <div className="text-sm font-semibold">{h.displayName}</div>
                            <div className="text-[10px] text-muted-foreground">@{h.username}</div>
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-semibold text-[10px]">
                            <Youtube className="w-3 h-3" /> YouTube
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span 
                            className="text-sm font-black tabular-nums"
                            style={{ color: h.score >= 70 ? "var(--color-success)" : h.score >= 50 ? "var(--color-warning)" : "var(--color-destructive)" }}
                          >
                            {h.score}
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground capitalize">{h.category || "General"}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            statusText === "Cached" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusText === "Cached" ? "bg-success" : "bg-warning"}`} />
                            {statusText}
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {new Date(h.timestamp).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="p-4 text-right">
                          <Button
                            onClick={() => { run(h.username); setActiveTab("creator"); }}
                            size="sm"
                            className="h-8 px-3 text-[11px] gradient-bg border-0 text-white"
                          >
                            Open <ChevronRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="glass rounded-3xl p-10 text-center border border-border/40 font-normal">
            <p className="text-xs text-muted-foreground">No recent audits match your query. Try a different search!</p>
          </div>
        )}
      </div>
    );
  };

  const renderSettings = () => {
    const purgeCache = () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem("authenfluence:history");
        setRecent([]);
      }
    };

    return (
      <div className="space-y-6 animate-fade-in font-normal text-xs">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Platform Settings</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Audit preferences, API status, and algorithmic engine settings</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Column: API and Integration */}
          <div className="space-y-6">
            {/* API Status Card */}
            <div className="glass rounded-3xl p-6 border border-border/40 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" /> API Connection Verification
              </h3>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/20 border border-border/30">
                  <span className="text-muted-foreground font-semibold">YouTube API Connector</span>
                  <span className="text-success flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-success" /> Active</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/20 border border-border/30">
                  <span className="text-muted-foreground font-semibold">Gemini LLM Trust Scanner</span>
                  <span className="text-success flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-success" /> Active</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/20 border border-border/30">
                  <span className="text-muted-foreground font-semibold">Meta Graph Api Endpoint</span>
                  <span className="text-muted-foreground flex items-center gap-1"><Minus className="w-4 h-4" /> Connected (Soon)</span>
                </div>
              </div>
            </div>

            {/* Integrations (Slack Webhooks) */}
            <div className="glass rounded-3xl p-6 border border-border/40 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Share2 className="w-4 h-4 text-purple-400" /> Platform Integrations
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-foreground">Slack Notifications Webhook</span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Send alerts automatically when a creator score falls below threshold.</p>
                  </div>
                  <button
                    onClick={() => setSlackActive(!slackActive)}
                    className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none shrink-0 ${
                      slackActive ? "gradient-bg" : "bg-muted"
                    }`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                      slackActive ? "translate-x-4" : "translate-x-0"
                    }`} />
                  </button>
                </div>

                {slackActive && (
                  <div className="space-y-1.5 animate-fade-in">
                    <label className="text-[10px] text-muted-foreground uppercase font-bold">Slack Webhook URL</label>
                    <Input
                      value={slackUrl}
                      onChange={(e) => setSlackUrl(e.target.value)}
                      className="h-9 font-mono text-[10px]"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Cache Status Control */}
            <div className="glass rounded-3xl p-6 border border-border/40 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" /> Cache Status & Control
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/20 border border-border/30">
                  <span className="text-muted-foreground font-semibold">Total Cached Audits</span>
                  <span className="font-mono font-bold text-foreground">{recent.length} profiles</span>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <p className="text-[10px] text-muted-foreground leading-normal max-w-[200px]">
                    Evaluations are cached locally for 24 hours to reduce external API load.
                  </p>
                  <Button
                    onClick={purgeCache}
                    variant="destructive"
                    className="h-8 text-[11px] font-semibold shrink-0"
                    disabled={recent.length === 0}
                  >
                    Purge Cache
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Algorithmic & UI Preferences */}
          <div className="space-y-6">
            {/* Algorithmic Preferences */}
            <div className="glass rounded-3xl p-6 border border-border/40 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Sliders className="w-4 h-4 text-yellow-500" /> Algorithmic Preferences
              </h3>
              
              <div className="space-y-4">
                {/* Confidence Mode */}
                <div className="space-y-2">
                  <div>
                    <span className="font-semibold text-foreground">Confidence Rating Calibration</span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Determine the confidence score threshold tolerance.</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "strict", label: "Strict (95%)" },
                      { id: "balanced", label: "Balanced (80%)" },
                      { id: "lenient", label: "Lenient (50%)" }
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => setConfidencePref(mode.id as any)}
                        className={`py-1.5 px-2 rounded-xl border text-[11px] font-semibold transition ${
                          confidencePref === mode.id
                            ? "gradient-bg border-transparent text-white"
                            : "border-border/30 text-muted-foreground hover:bg-muted/30"
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Analysis Depth */}
                <div className="space-y-2 pt-2 border-t border-border/20">
                  <div>
                    <span className="font-semibold text-foreground">Analysis Node Scan Depth</span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Define how many recent creator videos and comments are scanned.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[50, 100].map((depth) => (
                      <button
                        key={depth}
                        onClick={() => setAnalysisDepth(depth as any)}
                        className={`py-1.5 px-2 rounded-xl border text-[11px] font-semibold transition ${
                          analysisDepth === depth
                            ? "gradient-bg border-transparent text-white"
                            : "border-border/30 text-muted-foreground hover:bg-muted/30"
                        }`}
                      >
                        Scan Last {depth} Nodes
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* UI Theme preferences */}
            <div className="glass rounded-3xl p-6 border border-border/40 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" /> Visual Interface Preference
              </h3>
              <div className="space-y-2">
                <div>
                  <span className="font-semibold text-foreground">Platform Theme Mode</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Toggle between visual rendering modes of the dashboard.</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "dark", label: "Dark Mode" },
                    { id: "light", label: "Light Mode" },
                    { id: "system", label: "System Default" }
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setThemePref(t.id as any)}
                      className={`py-1.5 px-2 rounded-xl border text-[11px] font-semibold transition ${
                        themePref === t.id
                          ? "gradient-bg border-transparent text-white"
                          : "border-border/30 text-muted-foreground hover:bg-muted/30"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case "dashboard": return renderDashboard();
      case "creator": return renderCreatorAnalysis();
      case "trust": return renderTrustIntelligence();
      case "growth": return renderGrowthPrediction();
      case "campaign": return renderCampaignSuccess();
      case "brand": return renderBrandMatchEngine();
      case "audience": return renderAudienceInsights();
      case "compare": return renderCreatorComparison();
      case "trends": return renderTrendAnalysis();
      case "reports": return renderReports();
      case "history": return renderHistory();
      case "settings": return renderSettings();
      default: return renderDashboard();
    }
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
    { id: "creator", label: "Creator Analysis", Icon: UserCheck },
    { id: "trust", label: "Trust Intelligence", Icon: ShieldAlert },
    { id: "growth", label: "Growth Prediction", Icon: TrendingUp },
    { id: "campaign", label: "Campaign Success", Icon: Target },
    { id: "brand", label: "Brand Match Engine", Icon: Award },
    { id: "audience", label: "Audience Insights", Icon: Users },
    { id: "compare", label: "Creator Comparison", Icon: GitCompare },
    { id: "trends", label: "Trend Analysis", Icon: LineChart },
    { id: "reports", label: "Reports & Exports", Icon: FileSpreadsheet },
    { id: "history", label: "Recent Analyses", Icon: History },
    { id: "settings", label: "Settings", Icon: Settings },
  ];

  const SidebarContent = ({ onClose }: { onClose?: () => void }) => (
    <>
      {/* Logo and branding info */}
      <div className="p-5 border-b border-border flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center glow shrink-0">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-bold text-sm leading-none">Authenfluence AI</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">SaaS Intelligence Console</div>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/30 transition"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Sidebar Nav Items */}
      <nav className="p-3 flex-1 space-y-0.5 overflow-y-auto select-none">
        {navItems.map((item) => {
          const ActiveIcon = item.Icon;
          const isTabActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); onClose?.(); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition ${
                isTabActive
                  ? "gradient-bg text-white shadow-sm shadow-primary/25"
                  : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
              }`}
            >
              <ActiveIcon className="w-4 h-4 shrink-0" />
              {item.label}
            </button>
          );
        })}
      </nav>
    </>
  );

  return (
    <div className="min-h-screen flex bg-background animate-fade-in">
      {/* Mobile overlay backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            key="sidebar-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile slide-out sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            key="sidebar-mobile"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 left-0 z-50 w-72 border-r border-border bg-card/95 backdrop-blur-xl flex flex-col md:hidden shadow-2xl"
          >
            <SidebarContent onClose={() => setSidebarOpen(false)} />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop static sidebar */}
      <aside className="hidden md:flex w-64 border-r border-border bg-card/60 backdrop-blur-lg flex-col shrink-0 sticky top-0 h-screen overflow-y-auto">
        <SidebarContent />
      </aside>

      {/* Main page view */}
      <main className="flex-1 overflow-y-auto bg-background/40 min-w-0">
        {/* Mobile top bar with hamburger */}
        <div className="md:hidden sticky top-0 z-30 flex items-center gap-3 px-4 h-14 border-b border-border bg-card/80 backdrop-blur-xl">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/30 transition"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md gradient-bg flex items-center justify-center glow shrink-0">
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-sm">Authenfluence AI</span>
          </div>
          <div className="ml-auto text-[10px] font-semibold text-muted-foreground capitalize truncate">{activeTab}</div>
        </div>
        <div className="hidden md:block"><Nav /></div>
        <div className="container mx-auto max-w-5xl px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 space-y-4 sm:space-y-6">
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

          {disambiguationData ? renderDisambiguationView() : renderActiveTabContent()}
        </div>
      </main>

      <AnimatePresence>
        {loading && <AnalyzingOverlay onDone={() => setLoading(false)} />}
      </AnimatePresence>
    </div>
  );

  function renderDisambiguationView() {
    if (!disambiguationData) return null;

    const confidenceColors = {
      "Exact Match": "bg-success/15 text-success border-success/30",
      "Strong Match": "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      "Approximate Match": "bg-warning/15 text-warning border-warning/30",
      "Low Confidence": "bg-destructive/15 text-destructive border-destructive/30",
    };

    return (
      <div className="space-y-6 animate-fade-in font-normal max-w-2xl mx-auto py-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary glow mb-3">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Possible Creator Matches</h2>
          <p className="text-sm text-muted-foreground">
            We found multiple channels matching "{disambiguationData.query}". Please select the correct creator to resolve matches:
          </p>
        </div>

        <div className="space-y-3">
          {disambiguationData.candidates.map((candidate: any) => (
            <div
              key={candidate.channelId}
              onClick={() => run(candidate.channelId, disambiguationData.platform)}
              className="glass hover:border-primary/45 rounded-3xl p-5 border border-border/30 transition duration-200 cursor-pointer flex gap-4 items-start relative group"
            >
              {candidate.thumbnail ? (
                <img
                  src={candidate.thumbnail}
                  alt={candidate.title}
                  className="w-12 h-12 rounded-full object-cover border border-border/40 shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0">
                  {candidate.title.charAt(0)}
                </div>
              )}
              
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-semibold text-sm truncate text-foreground group-hover:text-primary transition font-sans">
                      {candidate.title}
                    </span>
                    {candidate.subscribers >= 100000 && (
                      <BadgeCheck className="w-4.5 h-4.5 text-blue-500 fill-blue-500/10 shrink-0" />
                    )}
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${confidenceColors[candidate.confidence as keyof typeof confidenceColors] || "bg-muted text-muted-foreground"}`}>
                    {candidate.confidence}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                  <span>{candidate.handle}</span>
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                  <span>{fmt(candidate.subscribers)} subscribers</span>
                </div>

                {candidate.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {candidate.description}
                  </p>
                )}

                <div className="text-[10px] text-primary/80 font-semibold bg-primary/5 border border-primary/10 rounded-xl px-3 py-1.5 mt-2 flex items-start gap-1.5 leading-normal">
                  <span className="font-bold shrink-0">AI Match Reason:</span>
                  <span>{candidate.matchReason}</span>
                </div>
              </div>

              <div className="absolute right-5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition duration-200 text-primary">
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setDisambiguationData(null)}
            className="h-11 rounded-2xl px-6 border-border/40 text-muted-foreground hover:text-foreground"
          >
            Cancel & Return to Control Center
          </Button>
        </div>
      </div>
    );
  };
}
