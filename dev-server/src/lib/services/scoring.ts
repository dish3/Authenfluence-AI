// Pure, isomorphic scoring engine. No network. No env.
// Weights: Engagement 30, FollowerQuality 25, CommentAuth 25, Consistency 20.
// v2: Dynamic benchmarks, creator classification, uncertainty engine, temporal analysis.

export interface RawChannelSignals {
  subscribers: number;
  totalVideos: number;
  totalViews: number;
  recentVideos: Array<{
    videoId: string;
    publishedAt: string; // ISO
    views: number;
    likes: number;
    comments: number;
    categoryId?: string;
  }>;
}

export interface CommentSignals {
  botRatio: number; // 0..1
  sentimentScore: number; // 0..100
  spamPatterns: string[];
  fandomDetected?: boolean; // true if fandom/fan-culture patterns dominate
}

// Multi-category creator classification
export interface CreatorCategory {
  type: string;
  weight: number; // 0..1, all weights sum to 1
}

// Confidence and uncertainty
export type ConfidenceLevel = "High" | "Medium" | "Low";

export interface UncertaintyFactors {
  limitedCommentData: boolean;
  insufficientRecentUploads: boolean;
  mixedAudienceSignals: boolean;
  partialApiVisibility: boolean;
  smallSampleSize: boolean;
}

// Temporal trust signals
export interface TemporalSignals {
  uploadTrend: "improving" | "stable" | "declining" | "insufficient_data";
  engagementTrend: "improving" | "stable" | "declining" | "insufficient_data";
  suspiciousSpikesDetected: boolean;
  suddenBehaviorChange: boolean;
  growthIrregularity: boolean;
}

// Public credibility (mild stabilizing signal only)
export interface PublicCredibilitySignal {
  score: number; // 0..100 — how well-known/established the channel is
  reducesHarshPenalties: boolean; // softens unfair penalties for large established creators
  note: string;
}

export interface ScoreBreakdown {
  engagement: number;
  followerQuality: number;
  commentAuthenticity: number;
  postingConsistency: number;
  contextualSignals: number;
}

export interface ScoreResult {
  finalScore: number;
  breakdown: ScoreBreakdown;
  metrics: {
    engagementRatePct: number; // (likes+comments)/views * 100, averaged
    likesToFollowersPct: number;
    avgGapDays: number;
    gapStdDays: number;
    spikeFactor: number; // max/median ratio of likes
    viewsPerSubscriber: number; // additional signal
    commentToViewRatio: number; // depth of interaction
  };
  // New v2 fields
  creatorCategories: CreatorCategory[];
  confidenceLevel: ConfidenceLevel;
  uncertaintyFactors: UncertaintyFactors;
  temporalSignals: TemporalSignals;
  publicCredibility: PublicCredibilitySignal;
  benchmarkContext: string; // human-readable benchmark explanation
  dataLimitations: string[]; // explicit acknowledgment of what we cannot see
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

// ─── Dynamic benchmark engine ────────────────────────────────────────────────
// Benchmarks adapt based on creator size tier and category context.
// This prevents large creators from being unfairly penalized for lower
// percentage engagement (which is normal at scale).

interface BenchmarkSet {
  engagementRateTarget: number; // % — what counts as "healthy" for this tier
  likesToFollowersTarget: number; // % — healthy likes/follower ratio
  postingGapIdeal: number; // days — ideal posting cadence
  label: string;
}

function getCreatorTier(subscribers: number): "nano" | "micro" | "mid" | "macro" | "mega" {
  if (subscribers < 10_000) return "nano";
  if (subscribers < 100_000) return "micro";
  if (subscribers < 1_000_000) return "mid";
  if (subscribers < 10_000_000) return "macro";
  return "mega";
}

function getDynamicBenchmarks(subscribers: number, categories: CreatorCategory[]): BenchmarkSet {
  const tier = getCreatorTier(subscribers);

  // Base benchmarks per tier — larger creators naturally have lower % engagement
  const tierBenchmarks: Record<string, BenchmarkSet> = {
    nano: { engagementRateTarget: 6.0, likesToFollowersTarget: 8.0, postingGapIdeal: 7, label: "Nano creator (<10K)" },
    micro: { engagementRateTarget: 4.5, likesToFollowersTarget: 5.5, postingGapIdeal: 7, label: "Micro creator (10K–100K)" },
    mid: { engagementRateTarget: 3.0, likesToFollowersTarget: 4.0, postingGapIdeal: 7, label: "Mid-tier creator (100K–1M)" },
    macro: { engagementRateTarget: 1.8, likesToFollowersTarget: 2.5, postingGapIdeal: 10, label: "Macro creator (1M–10M)" },
    mega: { engagementRateTarget: 0.5, likesToFollowersTarget: 0.75, postingGapIdeal: 14, label: "Mega creator (10M+)" },
  };

  const base = tierBenchmarks[tier];

  // Category adjustments — music/entertainment naturally have different patterns
  const topCategory = categories[0]?.type?.toLowerCase() ?? "";
  let engMult = 1.0;
  let postingMult = 1.0;

  if (["music", "celebrity"].includes(topCategory)) {
    engMult = 0.35; // celebrity/music creators have very passive audiences, reduce benchmark expectations
    postingMult = 2.5; // very infrequent/irregular uploads are completely normal
  } else if (["entertainment"].includes(topCategory)) {
    engMult = 0.55;
    postingMult = 1.8;
  } else if (["education", "tutorial", "howto"].includes(topCategory)) {
    engMult = 1.1; // education tends to have slightly higher engagement
    postingMult = 0.9;
  } else if (["gaming", "meme", "comedy"].includes(topCategory)) {
    engMult = 1.15; // gaming/meme has high engagement
    postingMult = 0.8;
  } else if (["news", "commentary", "politics"].includes(topCategory)) {
    engMult = 0.9;
    postingMult = 0.7; // news posts more frequently
  }

  return {
    ...base,
    engagementRateTarget: base.engagementRateTarget * engMult,
    likesToFollowersTarget: base.likesToFollowersTarget * engMult,
    postingGapIdeal: base.postingGapIdeal * postingMult,
  };
}

// ─── Creator category detection ──────────────────────────────────────────────
// Infers multi-category classification from channel signals.
// In production this would use channel description/tags from the API.
// Here we use heuristics from engagement patterns and subscriber/view ratios.

export function inferCreatorCategories(raw: RawChannelSignals): CreatorCategory[] {
  const { subscribers, totalVideos, totalViews, recentVideos } = raw;
  
  const categoryCounts: Record<string, number> = {};
  let totalValidVideos = 0;
  
  for (const v of recentVideos) {
    if (v.categoryId) {
      categoryCounts[v.categoryId] = (categoryCounts[v.categoryId] || 0) + 1;
      totalValidVideos++;
    }
  }

  const scores: Record<string, number> = {
    Entertainment: 0.2, // baseline buffer
    Education: 0,
    Gaming: 0,
    Music: 0,
    News: 0,
    Lifestyle: 0,
    Comedy: 0,
  };

  if (totalValidVideos > 0) {
    // Map YouTube categoryId to platform creator categories
    for (const [catId, count] of Object.entries(categoryCounts)) {
      const weight = count / totalValidVideos;
      if (catId === "10") {
        scores["Music"] += weight * 0.8;
      } else if (catId === "20") {
        scores["Gaming"] += weight * 0.8;
      } else if (catId === "23" || catId === "34") {
        scores["Comedy"] += weight * 0.8;
      } else if (["27", "28", "35"].includes(catId)) {
        scores["Education"] += weight * 0.8;
      } else if (["25", "29"].includes(catId)) {
        scores["News"] += weight * 0.8;
      } else if (["2", "15", "19", "21", "22", "26"].includes(catId)) {
        if (catId === "22") {
          scores["Lifestyle"] += weight * 0.4;
          scores["Entertainment"] += weight * 0.4;
        } else {
          scores["Lifestyle"] += weight * 0.8;
        }
      } else if (["1", "17", "24", "30", "31", "32", "36", "37", "38", "39", "40", "41", "42", "43", "44"].includes(catId)) {
        scores["Entertainment"] += weight * 0.8;
      }
    }
  } else {
    // Legacy heuristic fallback
    const avgViews = totalViews / Math.max(1, totalVideos);
    const vids = recentVideos.filter((v) => v.views > 0);
    const avgLikes = vids.length ? vids.reduce((a, b) => a + b.likes, 0) / vids.length : 0;
    const avgComments = vids.length ? vids.reduce((a, b) => a + b.comments, 0) / vids.length : 0;
    const commentToLikeRatio = avgLikes > 0 ? avgComments / avgLikes : 0;
    const viewsPerSub = subscribers > 0 ? avgViews / subscribers : 0;

    if (commentToLikeRatio > 0.08) {
      scores["News"] += 0.25;
      scores["Education"] += 0.2;
    }
    if (viewsPerSub > 5) {
      scores["Entertainment"] += 0.3;
      scores["Comedy"] += 0.15;
    }
    if (viewsPerSub < 0.5 && subscribers > 1_000_000) {
      scores["Music"] += 0.35;
      scores["Entertainment"] += 0.1;
    }
    if (commentToLikeRatio > 0.03 && commentToLikeRatio < 0.08) {
      scores["Education"] += 0.2;
      scores["Lifestyle"] += 0.15;
    }
    if (commentToLikeRatio < 0.02 && avgLikes > 1000) {
      scores["Gaming"] += 0.25;
      scores["Entertainment"] += 0.1;
    }
  }

  // Normalize to top 2–3 categories
  const sorted = Object.entries(scores)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const total = sorted.reduce((a, [, v]) => a + v, 0) || 1;
  return sorted.map(([type, weight]) => ({
    type,
    weight: Math.round((weight / total) * 100) / 100,
  }));
}

// ─── Public credibility signal ────────────────────────────────────────────────
// Acts ONLY as a mild stabilizing signal — reduces false positives for
// well-established creators. Does NOT guarantee trust or override fraud signals.

export function computePublicCredibility(raw: RawChannelSignals): PublicCredibilitySignal {
  const { subscribers, totalVideos, totalViews } = raw;
  const tier = getCreatorTier(subscribers);

  // Establishment signals: longevity (video count), scale (subscribers), reach (views)
  const videoMaturity = clamp(Math.round((Math.min(totalVideos, 500) / 500) * 40));
  const scaleSignal = clamp(Math.round((Math.log10(Math.max(1, subscribers)) / Math.log10(50_000_000)) * 40));
  const reachSignal = clamp(Math.round((Math.log10(Math.max(1, totalViews)) / Math.log10(10_000_000_000)) * 20));

  const score = clamp(videoMaturity + scaleSignal + reachSignal);
  const reducesHarshPenalties = tier === "macro" || tier === "mega";

  const note =
    score >= 70
      ? "Well-established channel with significant reach. Reduces likelihood of false-positive fraud flags."
      : score >= 40
      ? "Moderately established channel. Mild stabilizing effect on scoring."
      : "Emerging channel. Limited credibility history available.";

  return { score, reducesHarshPenalties, note };
}

// ─── Uncertainty & confidence engine ─────────────────────────────────────────

export function computeUncertainty(
  raw: RawChannelSignals,
  comments: CommentSignals
): { level: ConfidenceLevel; factors: UncertaintyFactors } {
  const vids = raw.recentVideos.filter((v) => v.views > 0);

  const factors: UncertaintyFactors = {
    limitedCommentData: comments.spamPatterns.length === 0 && comments.botRatio === 0.15,
    insufficientRecentUploads: vids.length < 5,
    mixedAudienceSignals: comments.botRatio > 0.2 && comments.botRatio < 0.45,
    partialApiVisibility: raw.totalVideos > 0 && vids.length < 3,
    smallSampleSize: vids.length < 8,
  };

  const flagCount = Object.values(factors).filter(Boolean).length;

  const level: ConfidenceLevel =
    flagCount === 0 ? "High" : flagCount <= 2 ? "Medium" : "Low";

  return { level, factors };
}

// ─── Temporal analysis ────────────────────────────────────────────────────────

export function computeTemporalSignals(
  raw: RawChannelSignals
): TemporalSignals {
  const vids = [...raw.recentVideos]
    .filter((v) => v.views > 0)
    .sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());

  if (vids.length < 4) {
    return {
      uploadTrend: "insufficient_data",
      engagementTrend: "insufficient_data",
      suspiciousSpikesDetected: false,
      suddenBehaviorChange: false,
      growthIrregularity: false,
    };
  }

  // Split into first half and second half to detect trends
  const mid = Math.floor(vids.length / 2);
  const older = vids.slice(0, mid);
  const newer = vids.slice(mid);

  const avgEngOlder = older.reduce((a, v) => a + (v.likes + v.comments) / Math.max(1, v.views), 0) / older.length;
  const avgEngNewer = newer.reduce((a, v) => a + (v.likes + v.comments) / Math.max(1, v.views), 0) / newer.length;

  const engChange = avgEngOlder > 0 ? (avgEngNewer - avgEngOlder) / avgEngOlder : 0;
  const engagementTrend =
    engChange > 0.15 ? "improving" : engChange < -0.2 ? "declining" : "stable";

  // Upload frequency trend
  const olderGaps: number[] = [];
  for (let i = 1; i < older.length; i++) {
    olderGaps.push((new Date(older[i].publishedAt).getTime() - new Date(older[i - 1].publishedAt).getTime()) / 86400000);
  }
  const newerGaps: number[] = [];
  for (let i = 1; i < newer.length; i++) {
    newerGaps.push((new Date(newer[i].publishedAt).getTime() - new Date(newer[i - 1].publishedAt).getTime()) / 86400000);
  }
  const avgOlderGap = olderGaps.length ? olderGaps.reduce((a, b) => a + b, 0) / olderGaps.length : 14;
  const avgNewerGap = newerGaps.length ? newerGaps.reduce((a, b) => a + b, 0) / newerGaps.length : 14;
  const gapChange = avgOlderGap > 0 ? (avgNewerGap - avgOlderGap) / avgOlderGap : 0;
  const uploadTrend =
    gapChange < -0.2 ? "improving" : gapChange > 0.3 ? "declining" : "stable";

  // Spike detection: any video with >5× median likes in recent half
  const allLikes = vids.map((v) => v.likes).sort((a, b) => a - b);
  const medianLikes = allLikes[Math.floor(allLikes.length / 2)] || 1;
  const suspiciousSpikesDetected = newer.some((v) => v.likes > medianLikes * 5);

  // Sudden behavior change: engagement in newest 3 videos is very different from rest
  const last3 = vids.slice(-3);
  const rest = vids.slice(0, -3);
  const avgEngLast3 = last3.reduce((a, v) => a + (v.likes + v.comments) / Math.max(1, v.views), 0) / last3.length;
  const avgEngRest = rest.length
    ? rest.reduce((a, v) => a + (v.likes + v.comments) / Math.max(1, v.views), 0) / rest.length
    : avgEngLast3;
  const suddenBehaviorChange = avgEngRest > 0 && Math.abs(avgEngLast3 - avgEngRest) / avgEngRest > 0.5;

  // Growth irregularity: high variance in likes across videos
  const likesArr = vids.map((v) => v.likes);
  const avgLikes = likesArr.reduce((a, b) => a + b, 0) / likesArr.length;
  const likeVariance = likesArr.reduce((a, b) => a + (b - avgLikes) ** 2, 0) / likesArr.length;
  const likeStd = Math.sqrt(likeVariance);
  const growthIrregularity = avgLikes > 0 && likeStd / avgLikes > 1.5; // coefficient of variation > 150%

  return {
    uploadTrend,
    engagementTrend,
    suspiciousSpikesDetected,
    suddenBehaviorChange,
    growthIrregularity,
  };
}

// ─── Main scoring function ────────────────────────────────────────────────────

export function computeScore(raw: RawChannelSignals, comments: CommentSignals): ScoreResult {
  const vids = raw.recentVideos.filter((v) => v.views > 0);
  const n = vids.length || 1;

  // Infer creator categories for dynamic benchmarking
  const creatorCategories = inferCreatorCategories(raw);
  const benchmarks = getDynamicBenchmarks(raw.subscribers, creatorCategories);
  const publicCredibility = computePublicCredibility(raw);
  const tier = getCreatorTier(raw.subscribers);

  // ── Engagement score (dynamic benchmark) ──
  // Use outlier-resistant averaging: drop the top value if it's >3× the median
  // (spike manipulation resistance). This prevents a single purchased-spike video
  // from inflating the overall engagement score.
  const engagementRates = vids
    .map((v) => (v.likes + v.comments) / Math.max(1, v.views))
    .sort((a, b) => a - b);
  const medianEngRate = engagementRates[Math.floor(engagementRates.length / 2)] || 0;
  const topEngRate = engagementRates[engagementRates.length - 1] || 0;
  // Drop top outlier if it's >3× the median AND we have enough data points
  const filteredRates =
    engagementRates.length >= 5 && topEngRate > medianEngRate * 3
      ? engagementRates.slice(0, -1)
      : engagementRates;
  const avgEng = filteredRates.reduce((a, b) => a + b, 0) / (filteredRates.length || 1);
  const engagementRatePct = avgEng * 100;

  // Score relative to tier-appropriate benchmark
  let engagement = clamp(Math.round((engagementRatePct / benchmarks.engagementRateTarget) * 88 + 6));
  const topCategory = creatorCategories[0]?.type?.toLowerCase() ?? "";

  if (tier === "mega" || tier === "macro" || ["music", "celebrity", "entertainment"].includes(topCategory)) {
    // Passive subscriber base is expected, establish a stable floor of 70 if comments are authentic
    const erFloor = comments.botRatio > 0.4 ? 45 : 70;
    engagement = Math.max(erFloor, engagement);
  }

  // ── Follower quality (dynamic benchmark) ──
  const avgLikes = vids.reduce((a, b) => a + b.likes, 0) / n;
  const likesToFollowers = avgLikes / Math.max(1, raw.subscribers);
  const likesToFollowersPct = likesToFollowers * 100;

  let followerQuality = clamp(Math.round((likesToFollowersPct / benchmarks.likesToFollowersTarget) * 88 + 6));
  if (tier === "mega" || tier === "macro" || ["music", "celebrity", "entertainment"].includes(topCategory)) {
    // Large passive audiences are normal. Do not penalize below 72 unless there is clear bot presence.
    const fqFloor = comments.botRatio > 0.4 ? 50 : 72;
    followerQuality = Math.max(fqFloor, followerQuality);
  }

  // ── Public credibility as mild stabilizer ──
  // For large established creators, soften harsh penalties (not boost scores)
  if (publicCredibility.reducesHarshPenalties) {
    const softener = Math.round(publicCredibility.score * 0.08); // max ~8 point softening
    if (engagement < 40) engagement = clamp(engagement + softener);
    if (followerQuality < 40) followerQuality = clamp(followerQuality + softener);
  }

  // ── Comment authenticity (fandom-aware) ──
  // Fandom creators naturally have high bot-ratio-looking patterns that are actually fans
  const isFandomCategory = ["music", "celebrity", "entertainment", "gaming", "comedy"].includes(topCategory);
  const finalFandomDetected = comments.fandomDetected || isFandomCategory;
  const fanAdjustedBotRatio = finalFandomDetected
    ? Math.max(0, comments.botRatio - 0.25) // higher reduction for fandom
    : comments.botRatio;

  const commentAuthenticity = clamp(
    Math.round((1 - fanAdjustedBotRatio) * 70 + (comments.sentimentScore / 100) * 30)
  );

  // ── Posting consistency (dynamic cadence benchmark) ──
  const sorted = [...vids].sort(
    (a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
  );
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push(
      (new Date(sorted[i].publishedAt).getTime() - new Date(sorted[i - 1].publishedAt).getTime()) /
        86400000
    );
  }
  const avgGap = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : benchmarks.postingGapIdeal;
  const variance = gaps.length
    ? gaps.reduce((a, b) => a + (b - avgGap) ** 2, 0) / gaps.length
    : 0;
  const std = Math.sqrt(variance);

  // Use dynamic ideal gap instead of hardcoded 5 days
  const consistencyScoreRaw = 100 - std * 5 - Math.abs(avgGap - benchmarks.postingGapIdeal) * 1.5;
  let postingConsistency = clamp(Math.round(consistencyScoreRaw));
  if (["music", "celebrity"].includes(topCategory)) {
    // Release-based irregular schedule is expected for music and celebrity creators. Do not penalize.
    postingConsistency = Math.max(75, postingConsistency);
  }

  // ── Spike factor ──
  const likesArr = vids.map((v) => v.likes).sort((a, b) => a - b);
  const median = likesArr[Math.floor(likesArr.length / 2)] || 1;
  const spikeFactor = (likesArr[likesArr.length - 1] || 0) / Math.max(1, median);

  // ── Additional metrics ──
  const avgComments = vids.reduce((a, b) => a + b.comments, 0) / n;
  const avgViews = vids.reduce((a, b) => a + b.views, 0) / n;
  const viewsPerSubscriber = raw.subscribers > 0 ? avgViews / raw.subscribers : 0;
  const commentToViewRatio = avgViews > 0 ? avgComments / avgViews : 0;

  // ── Uncertainty & temporal ──
  const { level: confidenceLevel, factors: uncertaintyFactors } = computeUncertainty(raw, comments);
  const temporalSignals = computeTemporalSignals(raw);

  // ── Contextual trust signals (dynamic category weight, temporal alignment) ──
  const uploadTrendBonus = temporalSignals.uploadTrend === "improving" ? 5 : temporalSignals.uploadTrend === "declining" ? -10 : 0;
  const engagementTrendBonus = temporalSignals.engagementTrend === "improving" ? 5 : temporalSignals.engagementTrend === "declining" ? -10 : 0;
  const spikePenalty = temporalSignals.suspiciousSpikesDetected ? -15 : 0;

  const contextualSignals = clamp(
    Math.round(
      publicCredibility.score * 0.35 +
      (100 - Math.max(0, fanAdjustedBotRatio * 100)) * 0.35 +
      30 + uploadTrendBonus + engagementTrendBonus + spikePenalty
    )
  );

  // ── Final score (re-allocated context weights to match Phase 8 spec) ──
  const rawFinal = Math.round(
    engagement * 0.30 +
      followerQuality * 0.25 +
      commentAuthenticity * 0.20 +
      postingConsistency * 0.15 +
      contextualSignals * 0.10
  );
  const finalScore = clamp(rawFinal);

  // ── Benchmark context string ──
  const benchmarkContext = `Scored against ${benchmarks.label} benchmarks. Healthy engagement target: ${benchmarks.engagementRateTarget.toFixed(1)}% (your rate: ${engagementRatePct.toFixed(2)}%). Ideal posting cadence: every ${benchmarks.postingGapIdeal} days.`;

  // ── Data limitations ──
  const dataLimitations: string[] = [
    "Audience demographic data is not publicly accessible via YouTube API.",
    "True follower authenticity cannot be directly verified — estimated from engagement patterns.",
    "Hidden analytics (impressions, click-through rates) are not available.",
    "Inactive subscriber quality is inferred, not measured directly.",
  ];
  if (vids.length < 5) {
    dataLimitations.push("Limited recent video data reduces scoring confidence.");
  }
  if (comments.fandomDetected) {
    dataLimitations.push("Fandom-style comment patterns detected — comment authenticity adjusted to avoid false positives.");
  }

  return {
    finalScore,
    breakdown: { engagement, followerQuality, commentAuthenticity, postingConsistency, contextualSignals },
    metrics: {
      engagementRatePct,
      likesToFollowersPct,
      avgGapDays: avgGap,
      gapStdDays: std,
      spikeFactor,
      viewsPerSubscriber,
      commentToViewRatio,
    },
    creatorCategories,
    confidenceLevel,
    uncertaintyFactors,
    temporalSignals,
    publicCredibility,
    benchmarkContext,
    dataLimitations,
  };
}

export function trustLabel(score: number) {
  if (score >= 90) return { label: "Highly Trusted", tone: "success" as const };
  if (score >= 70) return { label: "Mostly Authentic", tone: "success" as const };
  if (score >= 50) return { label: "Moderate Risk", tone: "warning" as const };
  return { label: "Suspicious Activity", tone: "destructive" as const };
}
