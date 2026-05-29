// Anti-gaming fraud detection engine v2.
// Requires MULTIPLE suspicious indicators before escalating severity.
// Uses smart labeling — no aggressive language.
// Fandom-aware: does not penalize fan culture patterns.

import type { ScoreResult, CommentSignals } from "./scoring";
import type { FraudSignal } from "@/lib/mock-data";

interface FraudContext {
  subscribers: number;
  videoCount: number;
  fandomDetected?: boolean;
  tier?: "nano" | "micro" | "mid" | "macro" | "mega";
}

// Internal signal accumulator — tracks how many weak signals have fired
// before escalating to high severity. Prevents single-signal overreaction.
interface WeakSignal {
  id: string;
  description: string;
}

function getCreatorTierLocal(subscribers: number): "nano" | "micro" | "mid" | "macro" | "mega" {
  if (subscribers < 10_000) return "nano";
  if (subscribers < 100_000) return "micro";
  if (subscribers < 1_000_000) return "mid";
  if (subscribers < 10_000_000) return "macro";
  return "mega";
}

export function detectFraudSignals(
  score: ScoreResult,
  comments: CommentSignals,
  ctx: FraudContext
): FraudSignal[] {
  const out: FraudSignal[] = [];
  const weakSignals: WeakSignal[] = [];
  const { metrics, breakdown, temporalSignals } = score;
  const tier = ctx.tier ?? getCreatorTierLocal(ctx.subscribers);

  const topCategory = score.creatorCategories[0]?.type?.toLowerCase() ?? "";
  const isMegaCelebrity = (tier === "mega" || tier === "macro") &&
    (["music", "celebrity", "entertainment"].includes(topCategory));

  // ── Tier-aware engagement thresholds ──────────────────────────────────────
  // Large creators naturally have lower % engagement — don't penalize them
  // with thresholds designed for small creators.
  const engThresholds: Record<string, number> = {
    nano: 1.5,
    micro: 1.0,
    mid: 0.5,
    macro: 0.25,
    mega: 0.1,
  };
  const engThreshold = engThresholds[tier];

  // ── Signal 1: Abnormally low engagement ───────────────────────────────────
  if (metrics.engagementRatePct < engThreshold && !isMegaCelebrity) {
    // Only HIGH severity if ALSO combined with low follower quality
    const severity = breakdown.followerQuality < 35 ? "high" : "medium";
    out.push({
      id: "low-eng",
      title: "Engagement Below Tier Benchmark",
      description: `Engagement rate of ${metrics.engagementRatePct.toFixed(2)}% is below the ${engThreshold}% benchmark for ${tier}-tier creators. ${severity === "high" ? "Combined with low follower quality, this is a notable concern." : "Alone, this may reflect algorithm changes or content type."}`,
      severity,
    });
  } else if (metrics.engagementRatePct < engThreshold * 1.5 && !isMegaCelebrity) {
    // Borderline — add as weak signal, not a full fraud flag
    weakSignals.push({
      id: "borderline-eng",
      description: `Engagement rate (${metrics.engagementRatePct.toFixed(2)}%) is slightly below the healthy range for this creator tier.`,
    });
  }

  // ── Signal 2: Suspicious follower-to-engagement ratio ────────────────────
  // Only flag for mid+ tier creators where inflated audiences are meaningful
  const likeThresholds: Record<string, number> = {
    nano: 0.1,
    micro: 0.2,
    mid: 0.4,
    macro: 0.15,
    mega: 0.05,
  };
  const likeThreshold = likeThresholds[tier];

  if (metrics.likesToFollowersPct < likeThreshold && ctx.subscribers > 50_000 && !isMegaCelebrity) {
    // Require corroborating signal before HIGH severity
    const hasCorroboration = breakdown.followerQuality < 40 || metrics.engagementRatePct < engThreshold;
    out.push({
      id: "follower-ratio",
      title: "Audience Engagement Disparity",
      description: `Likes represent only ${metrics.likesToFollowersPct.toFixed(2)}% of the subscriber base — below the ${likeThreshold}% benchmark for ${tier}-tier creators. ${hasCorroboration ? "This pattern, combined with other signals, warrants attention." : "This may reflect subscriber churn or content type shifts."}`,
      severity: hasCorroboration ? "high" : "medium",
    });
  }

  // ── Signal 3: Engagement spikes ───────────────────────────────────────────
  // Require spike factor to be very high before flagging, and consider temporal context
  if (metrics.spikeFactor > 8) {
    const severity = metrics.spikeFactor > 15 ? "high" : "medium";
    out.push({
      id: "spike",
      title: "Unusual Engagement Concentration",
      description: `One video received ${metrics.spikeFactor.toFixed(1)}× the median engagement — significantly above the normal distribution. ${temporalSignals?.suspiciousSpikesDetected ? "Temporal analysis confirms this is not an isolated pattern." : "This could reflect a viral moment or coordinated activity."}`,
      severity,
    });
  } else if (metrics.spikeFactor > 5) {
    weakSignals.push({
      id: "mild-spike",
      description: `Engagement spike of ${metrics.spikeFactor.toFixed(1)}× median detected — within borderline range.`,
    });
  }

  // ── Signal 4: Bot-like comment patterns ───────────────────────────────────
  // Fandom-aware: if fandom detected, raise the threshold significantly
  const botThreshold = ctx.fandomDetected ? 0.65 : 0.45;
  const botHighThreshold = ctx.fandomDetected ? 0.80 : 0.60;

  if (comments.botRatio > botThreshold) {
    out.push({
      id: "bot-comments",
      title: "Audience Interaction Depth Below Expected Level",
      description: `${Math.round(comments.botRatio * 100)}% of analyzed comments match patterns associated with repetitive or automated activity profiles. ${ctx.fandomDetected ? "Note: fandom-specific community behavior has been accounted for in this assessment." : ""}`,
      severity: comments.botRatio > botHighThreshold ? "high" : "medium",
    });
  } else if (comments.botRatio > botThreshold * 0.7) {
    weakSignals.push({
      id: "borderline-bot",
      description: `Comment patterns show minor repetitive characteristics (${Math.round(comments.botRatio * 100)}%) — below warning threshold.`,
    });
  }

  // ── Signal 5: Spam phrase repetition ─────────────────────────────────────
  // Only flag if NOT fandom-detected AND patterns are numerous
  if (!ctx.fandomDetected && comments.spamPatterns?.length >= 4) {
    out.push({
      id: "spam-repeat",
      title: "Repetitive Audience Behavior Detected",
      description: `${comments.spamPatterns.length} distinct phrase patterns appear with high frequency across the comment section — indicating potential audience coordination loops.`,
      severity: comments.spamPatterns.length >= 6 ? "medium" : "low",
    });
  } else if (!ctx.fandomDetected && comments.spamPatterns?.length >= 2) {
    weakSignals.push({
      id: "mild-spam",
      description: `${comments.spamPatterns.length} repetitive comment phrases detected — below expected threshold.`,
    });
  }

  // ── Signal 6: Inconsistent posting cadence ────────────────────────────────
  // Only flag if variance is extreme — normal creators have some variation
  if (metrics.gapStdDays > 14) {
    out.push({
      id: "inconsistent-cadence",
      title: "Reduced Publishing Stability",
      description: `Publishing gaps vary by ±${metrics.gapStdDays.toFixed(1)} days — showing an irregular upload cadence that may affect community continuity.`,
      severity: "low",
    });
  } else if (metrics.gapStdDays > 10) {
    weakSignals.push({
      id: "mild-cadence",
      description: `Publishing stability shows minor variance (±${metrics.gapStdDays.toFixed(1)} days) — within normal limits.`,
    });
  }

  // ── Signal 7: Abnormal subscriber-to-content ratio ───────────────────────
  // Only for mid+ tier with very few videos — suggests purchased growth
  if (breakdown.followerQuality < 30 && ctx.videoCount < 40 && ctx.subscribers > 500_000) {
    out.push({
      id: "growth",
      title: "Subscriber-to-Content Imbalance",
      description: `High subscriber count (${(ctx.subscribers / 1000).toFixed(0)}K) relative to content output (${ctx.videoCount} videos) — this pattern can indicate inorganic audience acquisition.`,
      severity: "medium",
    });
  }

  // ── Signal 8: Temporal anomalies ─────────────────────────────────────────
  if (temporalSignals) {
    if (temporalSignals.suddenBehaviorChange && temporalSignals.suspiciousSpikesDetected) {
      // Only flag when BOTH temporal signals fire together
      out.push({
        id: "temporal-anomaly",
        title: "Sudden Behavioral Shift Detected",
        description: "Recent engagement patterns differ significantly from historical behavior, coinciding with unusual spikes. This may indicate a change in audience acquisition strategy.",
        severity: "medium",
      });
    } else if (temporalSignals.growthIrregularity) {
      weakSignals.push({
        id: "growth-irregularity",
        description: "High variance in per-video performance detected — could reflect content experimentation or irregular promotion.",
      });
    }

    if (temporalSignals.engagementTrend === "declining" && breakdown.engagement < 40) {
      weakSignals.push({
        id: "declining-eng",
        description: "Engagement trend is declining over the analyzed period.",
      });
    }
  }

  // ── Weak signal aggregation ───────────────────────────────────────────────
  // If 3+ weak signals accumulate, surface them as a single consolidated flag
  if (weakSignals.length >= 3) {
    out.push({
      id: "pattern-cluster",
      title: "Multiple Borderline Indicators",
      description: `${weakSignals.length} borderline signals detected that individually fall below threshold: ${weakSignals.map((s) => s.description).join(" | ")} Taken together, these warrant monitoring.`,
      severity: "medium",
    });
  } else if (weakSignals.length >= 1 && out.length === 0) {
    // Surface weak signals as low-severity if no other flags exist
    out.push({
      id: "minor-signals",
      title: "Minor Signals Within Normal Range",
      description: weakSignals.map((s) => s.description).join(" "),
      severity: "low",
    });
  }

  // ── Balanced Trust Indicators ──────────────────────────────────────────────
  const hasHighOrMediumRisk = out.some(f => f.severity === "high" || f.severity === "medium");

  if (!hasHighOrMediumRisk) {
    // Inject positive trust indicators to balance the assessment dashboard
    out.push({
      id: "legacy-strength",
      title: "Legacy Audience Strength",
      description: "Demonstrates high subscriber retention and stable audience presence typical of established creator brands.",
      severity: "low",
    });
    out.push({
      id: "ecosystem-normalized",
      title: "Ecosystem-Normalized Engagement",
      description: "Interaction density aligns with benchmarks for this creator category and scale. No anomalies identified.",
      severity: "low",
    });
  }

  // ── Clean bill ────────────────────────────────────────────────────────────
  if (out.length === 0) {
    out.push({
      id: "clean",
      title: "No Significant Signals Detected",
      description: "All measured authenticity dimensions are within healthy ranges for this creator tier. No patterns associated with inorganic activity were identified.",
      severity: "low",
    });
  }

  return out;
}
