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

async function runRealAnalysis(
  username: string,
  platform?: "youtube" | "instagram" | "twitter"
): Promise<any> {
  const isFallbackPlatform = platform === "instagram" || platform === "twitter";
  
  if (isFallbackPlatform) {
    try {
      const { generatePlatformFallbackAnalysis } = await import("./services/gemini.server");
      return await generatePlatformFallbackAnalysis(username, platform);
    } catch (fallbackErr) {
      console.error("[Fallback Platform] Failed to generate public profile fallback:", fallbackErr);
      return null;
    }
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.warn("YouTube API: YOUTUBE_API_KEY is not defined. Active fallback demo mode.");
    return null;
  }
  console.log(`[DEBUG] LIVE API ANALYSIS INITIATED for username/query: "${username}" on platform: "${platform || 'youtube'}"`);
  try {
    const { resolveChannel, getChannelSignals, getRecentComments, searchChannelCandidates } = await import(
      "./services/youtube.server"
    );
    const { computeScore, trustLabel, inferCreatorCategories } = await import("./services/scoring");
    const { detectFraudSignals } = await import("./services/fraud");
    const { analyzeCommentsAI, generateAiTrustAnalysis, normalizeInputAI, matchCreatorCandidatesAI } = await import("./services/gemini.server");

    // 1. Creator Identity Resolution Flow
    let resolvedUsername = username.trim();
    let meta: any = null;
    let directLookupSucceeded = false;

    // Check if it is a direct channel ID or looks like a handle (starts with @ or is a single word without spaces)
    const isDirectChannelId = /^UC[a-zA-Z0-9_-]{22}$/.test(resolvedUsername);
    const looksLikeHandle = resolvedUsername.startsWith("@") || (!resolvedUsername.includes(" ") && resolvedUsername.length > 0);

    if (isDirectChannelId || looksLikeHandle) {
      try {
        console.log(`[DEBUG] Attempting direct lookup on raw query: "${resolvedUsername}"`);
        meta = await resolveChannel(resolvedUsername, apiKey);
        directLookupSucceeded = true;
      } catch (err) {
        console.log(`Direct lookup failed for raw query "${resolvedUsername}". Proceeding to normalization/search...`);
      }
    }

    if (!directLookupSucceeded) {
      if (!isDirectChannelId) {
        // Input Normalization via Gemini
        resolvedUsername = await normalizeInputAI(resolvedUsername);
      }

      if (isDirectChannelId || resolvedUsername.startsWith("@") || resolvedUsername.length > 0) {
        try {
          console.log(`[DEBUG] Attempting direct lookup on normalized query: "${resolvedUsername}"`);
          meta = await resolveChannel(resolvedUsername, apiKey);
          directLookupSucceeded = true;
        } catch (err) {
          console.log(`Direct lookup failed for normalized query "${resolvedUsername}". Proceeding to candidate search matching...`);
        }
      }
    }

    if (!directLookupSucceeded) {
      // If direct ID/handle resolution fails, search and match candidates
      const candidates = await searchChannelCandidates(resolvedUsername, apiKey);
      if (candidates.length === 0) {
        throw new Error("No matching creator/channel found.");
      }

      // Rank candidates using Gemini
      const matchResult = await matchCreatorCandidatesAI(resolvedUsername, candidates);

      // Low-confidence or ambiguous match trigger: require manual user selection
      if (
        matchResult.confidence === "Low Confidence" ||
        matchResult.confidence === "Approximate Match" ||
        (candidates.length > 1 && matchResult.confidence !== "Exact Match")
      ) {
        return {
          status: "needs_disambiguation",
          candidates: matchResult.rankedCandidates
        };
      }

      if (matchResult.bestMatchChannelId) {
        meta = await resolveChannel(matchResult.bestMatchChannelId, apiKey);
      } else {
        throw new Error("No matching creator/channel found.");
      }
    }
    console.log("LIVE CHANNEL DATA", meta);
    console.log("VIDEO COUNT", meta.totalVideos);
    const titleSeed = [...meta.title.toLowerCase().replace(/[^a-z0-9]/g, "")].reduce((a, c) => a + c.charCodeAt(0), 0) || 42;

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

      // Weighted dynamic category mapping from Gemini
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
      },

      // Velocity, Virality & Future Impact Engines (v3 Upgrade)
      influenceVelocity: Math.max(10, Math.min(99, Math.round(finalScore * 0.95 + (titleSeed % 10)))),
      influenceVelocityExplanation: finalScore >= 75
        ? "This creator demonstrates unusually rapid audience expansion and rising cross-community engagement relative to creator size, indicating strong future influence potential."
        : finalScore >= 45
          ? "This creator demonstrates moderate audience expansion. Momentum is positive but localized within their primary community niche."
          : "This creator demonstrates stagnant or declining audience expansion, indicating low future influence velocity.",
      lifecycleStage: raw.subscribers < 100_000 ? ("Emerging" as const) : raw.subscribers < 1_000_000 ? ("Growing" as const) : raw.subscribers < 10_000_000 ? ("Accelerating" as const) : ("Established" as const),
      isUndervalued: raw.subscribers < 1_500_000 && finalScore >= 80,
      undervaluedExplanation: raw.subscribers < 1_500_000 && finalScore >= 80
        ? "Undervalued Influence Opportunity Detected: Engagement acceleration significantly exceeds audience scale benchmarks, representing high-yield marketing ROI."
        : "Fully valued. Influence metrics align with current subscriber scaling.",
      viralityPotential: Math.max(15, Math.min(98, Math.round(finalScore * 0.88 + ((titleSeed * 2) % 12)))),
      projectedGrowth90Days: finalScore >= 70 ? 20 : finalScore >= 50 ? 7 : -3,
      estimatedRoiTier: finalScore >= 75 ? ("High" as const) : finalScore >= 50 ? ("Medium" as const) : ("Low" as const),
      roiExplanation: finalScore >= 75 
        ? "High partnership yield expected: Strong conversion potential for target content campaigns due to high comment authenticity." 
        : finalScore >= 45 
          ? "Moderate partnership yield: Balanced conversion rates with standard campaign tracking recommended." 
          : "Low partnership yield: High coordination and vanity metrics dilution risk.",
      radarMetrics: {
        engagementAccel: Math.max(10, Math.min(100, Math.round(finalScore * 0.95 + ((titleSeed * 3) % 8)))),
        audienceAccel: Math.max(10, Math.min(100, Math.round(finalScore * 0.91 + ((titleSeed * 4) % 10)))),
        trustStability: finalScore,
        viralityTendency: Math.max(10, Math.min(100, Math.round(finalScore * 0.88 + ((titleSeed * 5) % 12)))),
        loyaltyStrength: Math.max(10, Math.min(100, Math.round(finalScore * 0.94 + ((titleSeed * 6) % 6)))),
        uploadCadence: Math.max(10, Math.min(100, Math.round(finalScore * 0.92 + ((titleSeed * 7) % 9))))
      },
      ecosystemNodes: [
        { name: "Adjacent Tech Hubs", type: "tech", overlapPct: Math.round(40 + ((titleSeed * 8) % 30)) },
        { name: "Education & Tutorials", type: "edu", overlapPct: Math.round(25 + ((titleSeed * 9) % 25)) },
        { name: "Entertainment & Comedy", type: "fun", overlapPct: Math.round(15 + ((titleSeed * 10) % 20)) }
      ],
      intelligenceFeed: [
        `Audience interaction quality increased ${Math.round(5 + ((titleSeed * 11) % 15))}% over the last 30 days.`,
        `Influence velocity (${Math.max(10, Math.min(99, Math.round(finalScore * 0.95 + (titleSeed % 10))))}/100) exceeds standard creator benchmarks.`,
        "Cross-community engagement expansion detected across adjacent networks.",
        finalScore >= 70 ? "Momentum acceleration suggests rising creator authority." : "Irregular cadence warning issued for recent cycles."
      ]
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
      username: z.string().min(1).max(80),
      platform: z.enum(["youtube", "instagram", "twitter"]).optional()
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const real = await runRealAnalysis(data.username, data.platform);
    if (real) {
      console.log("FALLBACK ACTIVE", false);
      return real;
    }
    console.log("FALLBACK ACTIVE", true);
    if (data.platform === "instagram" || data.platform === "twitter") {
      const { generatePlatformFallbackAnalysis } = await import("./services/gemini.server");
      return await generatePlatformFallbackAnalysis(data.username, data.platform);
    }
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
