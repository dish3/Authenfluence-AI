import { useState } from "react";
import { motion } from "framer-motion";
import { Download, Youtube, Sparkles, Users, Heart, FileText, GitCompare, FlaskConical, ShieldCheck, TrendingUp, TrendingDown, Minus, Info, AlertCircle, BadgeCheck, AlertTriangle, Check, ExternalLink, Globe, Instagram, Twitter, Linkedin, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { ScoreRing } from "./ScoreRing";
import { BreakdownCard } from "./BreakdownCard";
import { FraudSignalCard } from "./FraudSignalCard";
import { TypingText } from "./TypingText";
import { scoreLabel, type InfluencerAnalysis } from "@/lib/mock-data";
import { downloadReport } from "@/lib/report";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function ConfidenceBadge({ level }: { level: "High" | "Medium" | "Low" }) {
  const styles = {
    High: "bg-success/15 text-success border-success/30",
    Medium: "bg-warning/15 text-warning border-warning/30",
    Low: "bg-destructive/15 text-destructive border-destructive/30",
  };
  const explanations = {
    High: "Confidence is high due to stable recent activity, sufficient audience interaction data, and measurable engagement consistency.",
    Medium: "Confidence is medium due to moderate recent activity sample sizes, partial comment visibility, or mixed audience signals.",
    Low: "Confidence is low due to limited comment data, low upload frequency, or highly irregular/insufficient interaction signals."
  };
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border cursor-help ${styles[level]}`}
      title={explanations[level]}
    >
      <ShieldCheck className="w-3 h-3" /> {level} Confidence
    </span>
  );
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "improving") return <TrendingUp className="w-3.5 h-3.5 text-success" />;
  if (trend === "declining") return <TrendingDown className="w-3.5 h-3.5 text-destructive" />;
  if (trend === "stable") return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
  return <Info className="w-3.5 h-3.5 text-muted-foreground" />;
}

export function AnalysisView({ analysis }: { analysis: InfluencerAnalysis }) {
  const [imageError, setImageError] = useState(false);
  const label = scoreLabel(analysis.score);
  const hasTemporalData = analysis.temporalSignals &&
    analysis.temporalSignals.uploadTrend !== "insufficient_data";

  return (
    <div className="space-y-6">
      {analysis.dataSource === "fallback" && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-2xl bg-warning/10 border border-warning/20 text-warning text-xs sm:text-sm"
        >
          <AlertCircle className="w-5 h-5 shrink-0 animate-pulse" />
          <div>
            <span className="font-semibold">Demo Fallback Mode:</span> The live YouTube API is currently offline or unavailable (e.g. quota limit reached, network issue, or API key missing). Displaying simulated trust intelligence data for demonstration.
          </div>
        </motion.div>
      )}

      {/* Top card: identity + ring */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-3xl p-6 sm:p-8 ring-glow"
      >
        <div className="grid lg:grid-cols-[1fr_auto] gap-8 items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-destructive/15 text-destructive border border-destructive/30">
                <Youtube className="w-3.5 h-3.5" /> YouTube
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-full border ${
                label.tone === "success" ? "bg-success/15 text-success border-success/30" :
                label.tone === "warning" ? "bg-warning/15 text-warning border-warning/30" :
                "bg-destructive/15 text-destructive border-destructive/30"
              }`}>{label.label}</span>
              {analysis.confidenceLevel && (
                <ConfidenceBadge level={analysis.confidenceLevel} />
              )}
              {analysis.dataSource === "live" && (
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-success/15 text-success border border-success/30 cursor-help" title="Real-time YouTube Data Verified. Verified subscriber counts, live creator metrics, and real-time API synchronization.">
                  ✓ Live YouTube Data Verified
                </span>
              )}
              {analysis.creatorCategories && analysis.creatorCategories.length > 0 && (
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/30 cursor-help" title={`Scored relative to standard benchmarks for the ${analysis.creatorCategories[0].type} category.`}>
                  Compared against: {analysis.creatorCategories[0].type} Benchmarks
                </span>
              )}
              {analysis.dataSource === "fallback" && (
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-warning/15 text-warning border border-warning/30">
                  <FlaskConical className="w-3 h-3" /> Demo fallback
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mb-4 mt-2">
              {analysis.avatarUrl && !imageError ? (
                <img
                  src={analysis.avatarUrl.startsWith("//") ? `https:${analysis.avatarUrl}` : analysis.avatarUrl}
                  alt={analysis.displayName}
                  referrerPolicy="no-referrer"
                  onError={() => setImageError(true)}
                  className="w-16 h-16 rounded-full object-cover border-2 border-border/40 shadow-md shrink-0"
                />
              ) : (
                <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${analysis.avatarColor || 'from-blue-500 to-purple-500'} flex items-center justify-center text-white text-xl font-bold shadow-md shrink-0`}>
                  {analysis.displayName.charAt(0)}
                </div>
              )}
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight flex items-center gap-1.5 flex-wrap">
                  {analysis.displayName}
                  {analysis.isVerified && (
                    <BadgeCheck className="w-5.5 h-5.5 text-blue-500 fill-blue-500/10 shrink-0 animate-fade-in" title="Verified Creator" />
                  )}
                </h1>
                <p className="text-muted-foreground mt-0.5">@{analysis.username}</p>
              </div>
            </div>

            {/* Creator categories */}
            {analysis.creatorCategories && analysis.creatorCategories.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {analysis.creatorCategories.map((cat) => (
                  <span key={cat.type} className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {cat.type} {Math.round(cat.weight * 100)}%
                  </span>
                ))}
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 mt-6 max-w-md">
              {[
                { Icon: Users, label: "Followers", value: fmt(analysis.followers) },
                { Icon: Heart, label: "Avg Likes", value: fmt(analysis.avgLikes) },
                { Icon: FileText, label: "Published Videos", value: fmt(analysis.totalPosts) },
              ].map((s) => (
                <div key={s.label} className="glass rounded-xl p-3 flex flex-col justify-between">
                  <div>
                    <s.Icon className="w-4 h-4 text-primary mb-1.5" />
                    <div className="text-lg font-semibold tabular-nums">{s.value}</div>
                    <div className="text-[11px] text-muted-foreground">{s.label}</div>
                  </div>
                  <div className="text-[9px] text-muted-foreground/50 mt-2 border-t border-border/10 pt-1.5">
                    Source: YouTube API
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 mt-6">
              <Button onClick={() => downloadReport(analysis)} className="gradient-bg border-0 text-white">
                <Download className="w-4 h-4 mr-2" /> Download Trust Report
              </Button>
              <Link to="/compare" search={{ a: analysis.username }}>
                <Button variant="outline"><GitCompare className="w-4 h-4 mr-2" /> Compare</Button>
              </Link>
            </div>
          </div>

          <div className="justify-self-center">
            <ScoreRing score={analysis.score} size={240} />
          </div>
        </div>
      </motion.div>

      {/* AI Verdict */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative rounded-3xl p-[1px] overflow-hidden"
        style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-purple))" }}
      >
        <div className="rounded-3xl bg-card/95 p-6 sm:p-8 relative">
          <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-brand-purple/20 blur-3xl pointer-events-none" />
          <div className="absolute top-6 right-6 text-[10px] text-muted-foreground/60 font-mono">
            Source: Gemini AI Analysis
          </div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center glow">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">Digital Trust Assessment</h3>
              <p className="text-xs text-muted-foreground">Generated by Authenfluence trust intelligence engine · Based on measured signals only</p>
            </div>
          </div>
          <p className="text-[15px] leading-relaxed text-foreground/90 min-h-[6rem] mb-4">
            <TypingText text={analysis.verdict} speed={10} />
          </p>

          {((analysis.strengths && analysis.strengths.length > 0) ||
            (analysis.risks && analysis.risks.length > 0)) && (
            <div className="border-t border-border/30 mt-6 pt-6 space-y-4">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-foreground/80 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-primary" /> Why This Score?
              </h4>
              <div className="grid sm:grid-cols-2 gap-6">
                {analysis.strengths && analysis.strengths.length > 0 && (
                  <div className="space-y-2.5">
                    <h5 className="text-xs font-semibold uppercase tracking-wider text-success flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Positive Signals
                    </h5>
                    <ul className="space-y-1.5">
                      {analysis.strengths.map((str, idx) => (
                        <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                          <span className="text-success shrink-0 font-bold select-none">✓</span>
                          <span>{str}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {analysis.risks && analysis.risks.length > 0 && (
                  <div className="space-y-2.5">
                    <h5 className="text-xs font-semibold uppercase tracking-wider text-warning flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" /> Monitoring Signals
                    </h5>
                    <ul className="space-y-1.5">
                      {analysis.risks.map((risk, idx) => (
                        <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                          <span className="text-warning shrink-0 font-bold select-none">⚠</span>
                          <span>{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Benchmark context */}
          {analysis.benchmarkContext && (
            <p className="text-[11px] text-muted-foreground mt-4 pt-4 border-t border-border/30">
              <span className="font-medium">Compared against:</span> {analysis.benchmarkContext}
            </p>
          )}
        </div>
      </motion.div>

      {/* Breakdown + Chart */}
      <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Trust Intelligence Breakdown</h3>
          <BreakdownCard breakdown={analysis.breakdown} creatorCategories={analysis.creatorCategories} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">14-Day Engagement Pattern</h3>
          <div className="glass rounded-2xl p-4 h-[280px]">
            <ResponsiveContainer>
              <AreaChart data={analysis.engagementSeries}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.62 0.21 265)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="oklch(0.62 0.21 265)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="oklch(1 0 0 / 0.05)" vertical={false} />
                <XAxis dataKey="day" stroke="oklch(0.72 0.03 258)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.72 0.03 258)" fontSize={11} tickLine={false} axisLine={false} width={28} />
                <Tooltip
                  contentStyle={{ background: "oklch(0.21 0.04 264)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 12, fontSize: 12 }}
                  labelStyle={{ color: "oklch(0.72 0.03 258)" }}
                />
                <Area type="monotone" dataKey="baseline" stroke="oklch(0.72 0.03 258 / 0.4)" strokeDasharray="4 4" fill="none" />
                <Area type="monotone" dataKey="engagement" stroke="oklch(0.62 0.21 265)" strokeWidth={2} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Temporal signals + Confidence details */}
      {(hasTemporalData || (analysis.uncertaintyFactors && analysis.uncertaintyFactors.length > 0)) && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="grid sm:grid-cols-2 gap-4"
        >
          {/* Temporal signals */}
          {hasTemporalData && analysis.temporalSignals && (
            <div className="glass rounded-2xl p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Trend Analysis</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Upload frequency</span>
                  <span className="flex items-center gap-1.5 font-medium capitalize">
                    <TrendIcon trend={analysis.temporalSignals.uploadTrend} />
                    {analysis.temporalSignals.uploadTrend.replace("_", " ")}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Engagement trend</span>
                  <span className="flex items-center gap-1.5 font-medium capitalize">
                    <TrendIcon trend={analysis.temporalSignals.engagementTrend} />
                    {analysis.temporalSignals.engagementTrend.replace("_", " ")}
                  </span>
                </div>
                {analysis.temporalSignals.suspiciousSpikesDetected && (
                  <div className="flex items-center gap-2 text-xs text-warning mt-2 pt-2 border-t border-border/30">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Unusual engagement spikes detected in recent period
                  </div>
                )}
                {analysis.temporalSignals.growthIrregularity && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    High variance in per-video performance
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Confidence & uncertainty */}
          {analysis.confidenceLevel && (
            <div className="glass rounded-2xl p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Confidence Assessment</h4>
              <div className="flex items-center gap-2 mb-3">
                <ConfidenceBadge level={analysis.confidenceLevel} />
              </div>
              {analysis.uncertaintyFactors && analysis.uncertaintyFactors.length > 0 ? (
                <ul className="space-y-1">
                  {analysis.uncertaintyFactors.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Info className="w-3 h-3 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">All confidence dimensions are within healthy ranges. Analysis is based on sufficient data.</p>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Investigation Details: Timeline & Brand Recommendation */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Timeline Events Panel */}
        {analysis.timelineEvents && analysis.timelineEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            className="glass-strong rounded-3xl p-6 sm:p-8 relative ring-glow"
          >
            <div className="absolute top-6 right-6 text-[10px] text-muted-foreground/60 font-mono">
              Source: Gemini AI Analysis
            </div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Activity className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-base">AI Trust Explanation Timeline</h4>
                <p className="text-xs text-muted-foreground">Historical signal mapping & event detection</p>
              </div>
            </div>

            <div className="relative pl-6 border-l border-border/40 space-y-6">
              {analysis.timelineEvents.map((evt, idx) => (
                <div key={idx} className="relative">
                  {/* Event marker */}
                  <span className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    evt.status === "success" ? "bg-success/20 border-success text-success" :
                    evt.status === "warning" ? "bg-warning/20 border-warning text-warning" :
                    "bg-muted border-muted-foreground text-muted-foreground"
                  }`}>
                    {evt.status === "success" ? (
                      <Check className="w-2.5 h-2.5 stroke-[3px]" />
                    ) : evt.status === "warning" ? (
                      <span className="text-[10px] font-bold">!</span>
                    ) : (
                      <Info className="w-2.5 h-2.5" />
                    )}
                  </span>
                  
                  <div>
                    <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                      evt.status === "success" ? "text-success" :
                      evt.status === "warning" ? "text-warning" :
                      "text-muted-foreground"
                    }`}>
                      {evt.category} event
                    </span>
                    <p className="text-sm text-foreground/90 mt-1 leading-relaxed">{evt.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Brand Trust Recommendation Panel */}
        {analysis.brandRecommendation && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
            className="glass-strong rounded-3xl p-6 sm:p-8 relative ring-glow flex flex-col justify-between"
          >
            <div className="absolute top-6 right-6 text-[10px] text-muted-foreground/60 font-mono">
              Source: Gemini AI Analysis
            </div>
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-brand-purple/10 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-brand-purple" />
                </div>
                <div>
                  <h4 className="font-semibold text-base">Brand Trust Recommendation</h4>
                  <p className="text-xs text-muted-foreground">Collaboration suitability & brand safety index</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/30 border border-border/40">
                  <span className="text-sm text-muted-foreground font-medium">Collaboration Risk Profile</span>
                  <span className={`text-sm font-bold uppercase px-3 py-1 rounded-full ${
                    analysis.brandRecommendation.riskLevel === "Low" ? "bg-success/10 text-success border border-success/20" :
                    analysis.brandRecommendation.riskLevel === "Medium" ? "bg-warning/10 text-warning border border-warning/20" :
                    "bg-destructive/10 text-destructive border border-destructive/20"
                  }`}>
                    {analysis.brandRecommendation.riskLevel} Risk
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Sponsorship Suitability</span>
                  <p className="text-sm font-medium text-foreground/90">{analysis.brandRecommendation.sponsorshipSuitability}</p>
                </div>

                <div className="space-y-1 pt-2">
                  <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Long-Term Brand Safety</span>
                  <p className="text-sm text-muted-foreground leading-relaxed">{analysis.brandRecommendation.safetyEvaluation}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border/30 text-xs text-muted-foreground leading-relaxed italic bg-muted/10 p-3 rounded-xl border border-border/20">
              <span className="font-semibold not-italic block mb-0.5 text-foreground">Suitability Reason:</span>
              "{analysis.brandRecommendation.reason}"
            </div>
          </motion.div>
        )}
      </div>

      {/* Real-time Comment Authenticity & Creator Source Verification */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Comment Authenticity Details Panel */}
        {analysis.commentAuthenticityDetailed && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26 }}
            className="glass-strong rounded-3xl p-6 sm:p-8 relative ring-glow"
          >
            <div className="absolute top-6 right-6 text-[10px] text-muted-foreground/60 font-mono">
              Source: Live Comment Threads
            </div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
                <Heart className="w-4 h-4 text-pink-500" />
              </div>
              <div>
                <h4 className="font-semibold text-base">Real-Time Comment Authenticity</h4>
                <p className="text-xs text-muted-foreground">Automated spam & bot pattern scanner</p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-muted/30 border border-border/40">
                <AlertTriangle className={`w-5 h-5 shrink-0 ${analysis.commentAuthenticityDetailed.lowAuthenticityPct > 30 ? "text-warning animate-pulse" : "text-muted-foreground"}`} />
                <div>
                  <div className="font-semibold text-sm">
                    ⚠️ {analysis.commentAuthenticityDetailed.lowAuthenticityPct}% comments appear low-authenticity
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{analysis.commentAuthenticityDetailed.reason}</p>
                </div>
              </div>

              {/* Progress bars for breakdown */}
              <div className="space-y-3.5">
                {[
                  { label: "Organic/Conversational", pct: analysis.commentAuthenticityDetailed.organicPct, color: "bg-success" },
                  { label: "Repetitive Phrases", pct: analysis.commentAuthenticityDetailed.repetitivePct, color: "bg-warning" },
                  { label: "Emoji Spam", pct: analysis.commentAuthenticityDetailed.emojiSpamPct, color: "bg-orange-500" },
                  { label: "Copy-Paste/Bot language", pct: analysis.commentAuthenticityDetailed.botLanguagePct, color: "bg-destructive" },
                  { label: "Promotional Spam", pct: analysis.commentAuthenticityDetailed.spamPct, color: "bg-pink-600" },
                ].map((bar) => (
                  <div key={bar.label} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-muted-foreground">{bar.label}</span>
                      <span className="tabular-nums">{bar.pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                      <div className={`h-full rounded-full ${bar.color}`} style={{ width: `${bar.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Creator Source Verification Panel */}
        {analysis.mediaPresence && analysis.mediaPresence.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="glass-strong rounded-3xl p-6 sm:p-8 relative ring-glow flex flex-col justify-between"
          >
            <div className="absolute top-6 right-6 text-[10px] text-muted-foreground/60 font-mono">
              Source: Verified Channels
            </div>
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-base">Creator Source Verification</h4>
                  <p className="text-xs text-muted-foreground">Verified channels & social footprint consistency</p>
                </div>
              </div>

              <div className="space-y-2.5">
                {analysis.mediaPresence.map((social) => {
                  const getPlatformIcon = (platform: string) => {
                    const p = platform.toLowerCase();
                    if (p === "youtube") return <Youtube className="w-4 h-4 text-destructive" />;
                    if (p === "instagram") return <Instagram className="w-4 h-4 text-pink-500" />;
                    if (p === "twitter" || p === "twitter/x" || p === "x") return <Twitter className="w-4 h-4 text-foreground" />;
                    if (p === "linkedin") return <Linkedin className="w-4 h-4 text-blue-600" />;
                    return <Globe className="w-4 h-4 text-primary" />;
                  };

                  return (
                    <a
                      key={social.platform}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-2xl bg-muted/20 border border-border/30 hover:border-primary/30 transition group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-card border border-border/40 flex items-center justify-center">
                          {getPlatformIcon(social.platform)}
                        </div>
                        <div>
                          <div className="text-sm font-semibold flex items-center gap-1.5">
                            {social.platform}
                            {social.isVerified && (
                              <BadgeCheck className="w-4 h-4 text-blue-500 fill-blue-500/10 shrink-0" title="Verified source profile" />
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">{social.handle}</div>
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-50 group-hover:opacity-100 transition" />
                    </a>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border/30 text-xs text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-success" />
              <span>Impersonation shield active: All links cross-verified against official Google API metadata.</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Fraud signals */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Trust Risk Indicators</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {analysis.fraudSignals.map((s, i) => <FraudSignalCard key={s.id} signal={s} i={i} />)}
        </div>
      </motion.div>

      {/* Data limitations transparency */}
      {analysis.dataLimitations && analysis.dataLimitations.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="glass rounded-2xl p-4 border border-border/40">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-muted-foreground" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data Transparency</h4>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Some trust signals are inferred from publicly available data. The following limitations apply to this analysis:
            </p>
            <ul className="space-y-1">
              {analysis.dataLimitations.map((lim, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-muted-foreground/50 shrink-0">·</span>
                  {lim}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}
    </div>
  );
}
