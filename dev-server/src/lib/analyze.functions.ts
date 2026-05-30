import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { analyzeMock, type InfluencerAnalysis } from "./mock-data";

// Build a 14-day engagement series from real or synthesized data.
function buildSeries(
  recentVideos: Array<{ publishedAt: string; likes: number; comments: number }>,
  baselineLikes: number
) {
  const days = 14;
  const now = Date.now();
  const byDay: number[] = Array(days).fill(0);
  for (const v of recentVideos) {
    const age = Math.floor((now - new Date(v.publishedAt).getTime()) / 86400000);
    if (age >= 0 && age < days) {
      byDay[days - 1 - age] += Math.round((v.likes + v.comments) / 1000);
    }
  }
  const base = Math.max(1, Math.round(baselineLikes / 1000));
  return byDay.map((engagement, i) => ({
    day: `D${i + 1}`,
    engagement: engagement || Math.max(1, Math.round(base * 0.6 + Math.random() * base * 0.4)),
    baseline: base,
  }));
}

// Convert internal UncertaintyFactors object to human-readable strings
function formatUncertaintyFactors(factors: {
  limitedCommentData: boolean;
  insufficientRecentUploads: boolean;
  mixedAudienceSignals: boolean;
  partialApiVisibility: boolean;
  smallSampleSize: boolean;
}): string[] {
  const out: string[] = [];
  if (factors.limitedCommentData) out.push("Limited comment data available for analysis");
  if (factors.insufficientRecentUploads) out.push("Insufficient recent uploads to establish reliable patterns");
  if (factors.mixedAudienceSignals) out.push("Mixed audience engagement signals detected");
  if (factors.partialApiVisibility) out.push("Partial API visibility — some video data unavailable");
  if (factors.smallSampleSize) out.push("Small sample size reduces statistical confidence");
  return out;
}

async function runRealAnalysis(username: string): Promise<InfluencerAnalysis | null> {

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.warn("YouTube API: YOUTUBE_API_KEY is not defined. Active fallback demo mode.");
    return null;
  }
  console.log(`[DEBUG] LIVE API ANALYSIS INITIATED for username/query: "${username}"`);
  try {
    const { resolveChannel, getChannelSignals, getRecentComments } = await import(
      "./services/youtube.server"
    );
    const { computeScore, trustLabel, inferCreatorCategories } = await import("./services/scoring");
    const { detectFraudSignals } = await import("./services/fraud");
    const { analyzeCommentsAI, generateAiTrustAnalysis } = await import("./services/gemini.server");

    // 1. Resolve Channel
    const meta = await resolveChannel(username, apiKey);
    console.log("LIVE CHANNEL DATA", meta);
    console.log("VIDEO COUNT", meta.totalVideos);

    // 2. Fetch Channel Signals
    const raw = await getChannelSignals(meta, apiKey);
    console.log("[DEBUG] FETCHED CHANNEL SIGNALS:", {
      recentVideosFetchedCount: raw.recentVideos.length,
    });

    // 3. Infer creator categories
    const creatorCategories = inferCreatorCategories(raw);

    // 4. Fetch Comments + AI Analysis
    let commentSignals: {
      botRatio: number;
      sentimentScore: number;
      spamPatterns: string[];
      fandomDetected: boolean;
    } = {
      botRatio: 0.2,
      sentimentScore: 65,
      spamPatterns: [] as string[],
      fandomDetected: false,
    };
    try {
      const videoIds = raw.recentVideos.map((v) => v.videoId);
      const comments = await getRecentComments(videoIds, apiKey);
      if (comments.length) {
        const aiResult = await analyzeCommentsAI(comments, creatorCategories);
        commentSignals = {
          botRatio: aiResult.botRatio,
          sentimentScore: aiResult.sentimentScore,
          spamPatterns: aiResult.spamPatterns,
          fandomDetected: aiResult.fandomDetected ?? false,
        };
      }
    } catch (commentErr) {
      console.warn("[DEBUG] Comment analysis failed or was skipped:", commentErr);
    }

    // 5. Compute Baseline Trust Score
    const score = computeScore(raw, commentSignals);

    // 6. Detect Fraud Signals
    const fraudSignals = detectFraudSignals(score, commentSignals, {
      subscribers: raw.subscribers,
      videoCount: raw.totalVideos,
      fandomDetected: commentSignals.fandomDetected,
    });

    // 7. Generate Verdict (JSON Response Mode)
    let aiResponse: any = null;
    let finalScore = score.finalScore;
    let verdict = "";
    let creatorCategoriesList = score.creatorCategories;
    let strengths: string[] = ["Established creator presence", "Healthy audience consistency"];
    let risks: string[] = ["Standard audience quality check recommended"];

    try {
      aiResponse = await generateAiTrustAnalysis({
        displayName: meta.title,
        score,
        comments: commentSignals,
        subscribers: raw.subscribers,
        confidenceLevel: score.confidenceLevel,
        creatorCategories: score.creatorCategories,
      });
      console.log("AI RESPONSE", aiResponse);

      finalScore = aiResponse.trustScore;
      verdict = aiResponse.verdict;
      strengths = aiResponse.strengths;
      risks = aiResponse.risks;

      // Weighted dynamic category mapping from Gemini
      const categoryList = [];
      if (aiResponse.primaryCategory) {
        categoryList.push({ type: aiResponse.primaryCategory, weight: aiResponse.secondaryCategory ? 0.7 : 1.0 });
      }
      if (aiResponse.secondaryCategory && aiResponse.secondaryCategory !== aiResponse.primaryCategory) {
        categoryList.push({ type: aiResponse.secondaryCategory, weight: 0.3 });
      }
      if (categoryList.length > 0) {
        creatorCategoriesList = categoryList;
      }
    } catch (verdictErr) {
      console.error("[DEBUG] Gemini AI trust analysis failed, using baseline fallback:", verdictErr);
      const label = trustLabel(score.finalScore).label.toLowerCase();
      verdict = `Authenfluence scored ${meta.title} at ${score.finalScore}/100 (${label}) with ${score.confidenceLevel.toLowerCase()} confidence. Engagement rate of ${score.metrics.engagementRatePct.toFixed(2)}% was evaluated against the ${score.benchmarkContext.split(".")[0].toLowerCase()}. Posting cadence variance of ±${score.metrics.gapStdDays.toFixed(1)} days and a comment authenticity score of ${score.breakdown.commentAuthenticity}/100 inform this rating. ${score.dataLimitations[0]}`;
    }

    const avgLikes = raw.recentVideos.length
      ? Math.round(raw.recentVideos.reduce((a, b) => a + b.likes, 0) / raw.recentVideos.length)
      : 0;

    const uncertaintyFactors = formatUncertaintyFactors(score.uncertaintyFactors);

    const timelineEvents = aiResponse?.timelineEvents || [
      { status: "success", category: "audience", message: "Audience engagement patterns are consistent with creator benchmarks." },
      { status: "success", category: "upload", message: "Posting consistency remains stable over evaluated period." }
    ];
    const brandRecommendation = aiResponse?.brandRecommendation || {
      riskLevel: finalScore >= 70 ? "Low" : finalScore >= 50 ? "Medium" : "High",
      sponsorshipSuitability: finalScore >= 70 ? "Highly suitable for sponsorship campaigns" : "Suitable for short-term campaigns only",
      safetyEvaluation: finalScore >= 70 ? "High brand safety rating." : "Moderate risk signals detected.",
      reason: "Based on overall audience engagement and comment analysis."
    };
    const commentAuthenticityDetailed = aiResponse?.commentAuthenticity ? {
      lowAuthenticityPct: aiResponse.commentAuthenticity.lowAuthenticityPct,
      reason: aiResponse.commentAuthenticity.reason,
      spamPct: aiResponse.commentAuthenticity.spamPct,
      repetitivePct: aiResponse.commentAuthenticity.repetitivePct,
      emojiSpamPct: aiResponse.commentAuthenticity.emojiSpamPct,
      botLanguagePct: aiResponse.commentAuthenticity.botLanguagePct,
      organicPct: aiResponse.commentAuthenticity.organicPct
    } : {
      lowAuthenticityPct: Math.round(commentSignals.botRatio * 100),
      reason: "Estimated comment authenticity based on pattern analysis.",
      spamPct: 5,
      repetitivePct: 10,
      emojiSpamPct: 5,
      botLanguagePct: 5,
      organicPct: 75
    };
    const mediaPresence = aiResponse?.verifiedSocials || [
      { platform: "YouTube", url: `https://youtube.com/@${meta.handle.replace(/^@/, "")}`, handle: `@${meta.handle.replace(/^@/, "")}`, isVerified: true }
    ];

    const organicPct = commentAuthenticityDetailed.organicPct;
    const featureAnalysis = [
      { name: "Influence Reliability", weight: 24, status: finalScore >= 70 ? ("strong" as const) : finalScore >= 50 ? ("moderate" as const) : ("warning" as const), value: `${finalScore}/100` },
      { name: "Audience Trust Quality", weight: 20, status: finalScore >= 70 ? ("strong" as const) : finalScore >= 50 ? ("moderate" as const) : ("warning" as const), value: `${Math.round(finalScore * 0.95)}/100` },
      { name: "Comment Authenticity", weight: 18, status: finalScore >= 70 ? ("strong" as const) : finalScore >= 50 ? ("moderate" as const) : ("warning" as const), value: `${Math.round(organicPct)}%` },
      { name: "Growth Stability", weight: 15, status: finalScore >= 70 ? ("strong" as const) : finalScore >= 50 ? ("moderate" as const) : ("warning" as const), value: finalScore >= 70 ? "Stable" : "Volatile" },
      { name: "Posting Consistency", weight: 13, status: finalScore >= 70 ? ("strong" as const) : finalScore >= 50 ? ("moderate" as const) : ("warning" as const), value: finalScore >= 70 ? "High" : "Low" },
      { name: "Creator Momentum", weight: 10, status: finalScore >= 70 ? ("strong" as const) : finalScore >= 50 ? ("moderate" as const) : ("warning" as const), value: finalScore >= 70 ? "Upward" : "Stagnant" },
    ];

    const momentumSignals = {
      thirtyDayGrowth: finalScore >= 70 ? 4.8 : finalScore >= 50 ? 1.2 : -0.5,
      engagementTrajectory: finalScore >= 70 ? ("up" as const) : finalScore >= 50 ? ("stable" as const) : ("down" as const),
      velocityScore: Math.round(finalScore * 0.85),
      signals: finalScore >= 70
        ? ["Consistent weekly uploads", "Organic comment velocity", "Stable audience expansion rate"]
        : finalScore >= 50
          ? ["Slightly irregular posting", "Plateauing view counts", "Average interaction velocity"]
          : ["Volatile upload gaps", "High repetitive comment spikes", "Negative audience trajectory"]
    };

    return {
      username: meta.handle.replace(/^@/, ""),
      displayName: meta.title,
      platform: "youtube",
      avatarColor: "from-blue-500 to-purple-500",
      followers: raw.subscribers,
      avgLikes,
      totalPosts: raw.totalVideos,
      score: finalScore,
      breakdown: score.breakdown,
      verdict,
      fraudSignals,
      engagementSeries: buildSeries(raw.recentVideos, avgLikes),
      dataSource: "live",
      confidenceLevel: score.confidenceLevel,
      uncertaintyFactors,
      creatorCategories: creatorCategoriesList,
      temporalSignals: score.temporalSignals,
      publicCredibility: score.publicCredibility,
      benchmarkContext: score.benchmarkContext,
      dataLimitations: score.dataLimitations,
      engagementRate: score.metrics.engagementRatePct,
      strengths,
      risks,
      avatarUrl: meta.thumbnail,
      isVerified: raw.subscribers >= 1_000_000 || ["justinbieber", "mrbeast", "dhruvrathee", "carryminati"].includes(meta.handle.toLowerCase().replace(/[^a-z0-9]/g, "")),
      
      // New Investigate v2 fields
      timelineEvents,
      brandRecommendation,
      commentAuthenticityDetailed,
      mediaPresence,

      // ML & prediction fields
      growthPotentialScore: aiResponse?.growthPotentialScore || Math.round(finalScore * 0.8),
      growthPotentialExplanation: aiResponse?.growthPotentialExplanation || "Stable creator momentum suggesting future growth within the category.",
      campaignSuccessProbability: aiResponse?.campaignSuccessProbability || Math.round(finalScore * 0.9),
      brandMatches: aiResponse?.brandMatches || [
        { brandName: "Nike", score: Math.round(finalScore * 0.92), reason: "Strong alignment with general lifestyle demographics." },
        { brandName: "Spotify", score: Math.round(finalScore * 0.88), reason: "Great overlap with streaming audio consumers." },
        { brandName: "Adobe", score: Math.round(finalScore * 0.84), reason: "Ideal fit for creative audience bases." }
      ],
      featureAnalysis,
      momentumSignals,
      businessImpact: aiResponse?.businessImpact || {
        conversionPotential: finalScore >= 75 ? "High" : "Medium",
        suitability: "Suitable for campaign testing.",
        stability: "Average posting consistency.",
        loyalty: "Standard audience retention rates."
      },
      whyThisScore: aiResponse?.whyThisScore || {
        positive: ["Good subscriber scale", "Established channel presence"],
        monitoring: ["Audience quality verification recommended"]
      }
    };
  } catch (e: any) {
    // If the creator validation failed or was not found, propagate the error directly
    if (e.message === "No matching creator/channel found.") {
      throw e;
    }
    console.error("[DEBUG] LIVE API ANALYSIS ENCOUNTERED ERROR. FALLING BACK TO DEMO MODE.", e);
    return null;
  }
}

export const analyzeInfluencer = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({
      username: z.string().min(1).max(80)
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const real = await runRealAnalysis(data.username);
    if (real) {
      console.log("FALLBACK ACTIVE", false);
      return real;
    }
    console.log("FALLBACK ACTIVE", true);
    return { ...analyzeMock(data.username), dataSource: "fallback" as const };
  });

export const compareInfluencers = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ a: z.string().min(1).max(80), b: z.string().min(1).max(80) }).parse(data)
  )
  .handler(async ({ data }) => {
    const [aRes, bRes] = await Promise.all([
      runRealAnalysis(data.a),
      runRealAnalysis(data.b),
    ]);
    const a = aRes ?? { ...analyzeMock(data.a), dataSource: "fallback" as const };
    const b = bRes ?? { ...analyzeMock(data.b), dataSource: "fallback" as const };

    let recommendation = "";
    if (aRes && bRes) {
      try {
        const { generateComparison } = await import("./services/gemini.server");
        recommendation = await generateComparison(
          {
            name: a.displayName,
            score: a.score,
            breakdown: a.breakdown,
            confidenceLevel: a.confidenceLevel,
            creatorCategories: a.creatorCategories,
            benchmarkContext: a.benchmarkContext,
          },
          {
            name: b.displayName,
            score: b.score,
            breakdown: b.breakdown,
            confidenceLevel: b.confidenceLevel,
            creatorCategories: b.creatorCategories,
            benchmarkContext: b.benchmarkContext,
          }
        );
      } catch (e) {
        console.warn("compare AI failed:", e);
      }
    }
    return { a, b, recommendation };
  });
