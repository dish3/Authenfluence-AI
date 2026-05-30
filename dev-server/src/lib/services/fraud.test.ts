import { describe, test, expect } from "bun:test";
import { detectFraudSignals } from "./fraud";
import type { ScoreResult, CommentSignals } from "./scoring";

describe("Fraud Detection Engine Tests", () => {
  // Helper to create a base mock ScoreResult
  const createMockScore = (overrides: Partial<ScoreResult> = {}): ScoreResult => {
    return {
      finalScore: 80,
      breakdown: {
        engagement: 85,
        followerQuality: 80,
        commentAuthenticity: 80,
        postingConsistency: 80,
      },
      metrics: {
        engagementRatePct: 4.5,
        likesToFollowersPct: 4.0,
        avgGapDays: 7,
        gapStdDays: 2,
        spikeFactor: 2.0,
        viewsPerSubscriber: 0.1,
        commentToViewRatio: 0.01,
      },
      creatorCategories: [{ type: "Education", weight: 1.0 }],
      confidenceLevel: "High",
      uncertaintyFactors: {
        limitedCommentData: false,
        insufficientRecentUploads: false,
        mixedAudienceSignals: false,
        partialApiVisibility: false,
        smallSampleSize: false,
      },
      temporalSignals: {
        uploadTrend: "stable",
        engagementTrend: "stable",
        suspiciousSpikesDetected: false,
        suddenBehaviorChange: false,
        growthIrregularity: false,
      },
      publicCredibility: {
        score: 50,
        reducesHarshPenalties: false,
        note: "",
      },
      benchmarkContext: "",
      dataLimitations: [],
      ...overrides,
    };
  };

  const defaultComments: CommentSignals = {
    botRatio: 0.1,
    sentimentScore: 80,
    spamPatterns: [],
    fandomDetected: false,
  };

  test("should return positive trust signals when no negative indicators are present", () => {
    const score = createMockScore();
    const flags = detectFraudSignals(score, defaultComments, {
      subscribers: 200000,
      videoCount: 150,
      fandomDetected: false,
    });
    const hasRisk = flags.some((f) => f.severity === "high" || f.severity === "medium");
    expect(hasRisk).toBe(false);
    expect(flags.some((f) => f.id === "legacy-strength")).toBe(true);
  });

  test("should trigger low-eng flag when engagement is below tier threshold", () => {
    const score = createMockScore({
      metrics: {
        engagementRatePct: 0.2, // Below the 3.0% target for mid-tier
        likesToFollowersPct: 4.0,
        avgGapDays: 7,
        gapStdDays: 2,
        spikeFactor: 2.0,
        viewsPerSubscriber: 0.1,
        commentToViewRatio: 0.01,
      },
    });
    const flags = detectFraudSignals(score, defaultComments, {
      subscribers: 250000, // mid-tier
      videoCount: 100,
    });
    const lowEngFlag = flags.find((f) => f.id === "low-eng");
    expect(lowEngFlag).toBeDefined();
    expect(lowEngFlag?.severity).toBe("medium");
  });

  test("should elevate low-eng to high severity if follower quality is also poor", () => {
    const score = createMockScore({
      breakdown: {
        engagement: 10,
        followerQuality: 20, // poor quality (<35)
        commentAuthenticity: 80,
        postingConsistency: 80,
      },
      metrics: {
        engagementRatePct: 0.2,
        likesToFollowersPct: 0.1,
        avgGapDays: 7,
        gapStdDays: 2,
        spikeFactor: 2.0,
        viewsPerSubscriber: 0.1,
        commentToViewRatio: 0.01,
      },
    });
    const flags = detectFraudSignals(score, defaultComments, {
      subscribers: 250000,
      videoCount: 100,
    });
    const lowEngFlag = flags.find((f) => f.id === "low-eng");
    expect(lowEngFlag).toBeDefined();
    expect(lowEngFlag?.severity).toBe("high");
  });

  test("should trigger bot comments flag for high botRatio", () => {
    const score = createMockScore();
    const comments: CommentSignals = {
      ...defaultComments,
      botRatio: 0.55, // above default botThreshold of 0.45
    };
    const flags = detectFraudSignals(score, comments, {
      subscribers: 20000,
      videoCount: 50,
      fandomDetected: false,
    });
    const botFlag = flags.find((f) => f.id === "bot-comments");
    expect(botFlag).toBeDefined();
    expect(botFlag?.severity).toBe("medium");
  });

  test("should suppress bot comments flag if fandom is detected and bot ratio is moderate", () => {
    const score = createMockScore();
    const comments: CommentSignals = {
      ...defaultComments,
      botRatio: 0.55, // above normal threshold (0.45), but below fandom botThreshold (0.65)
    };
    const flags = detectFraudSignals(score, comments, {
      subscribers: 20000,
      videoCount: 50,
      fandomDetected: true, // Fandom detected!
    });
    const botFlag = flags.find((f) => f.id === "bot-comments");
    expect(botFlag).toBeUndefined(); // adjusted for fandom!
  });

  test("should aggregate weak signals into a pattern cluster", () => {
    // We want to trigger 3 weak signals to check aggregation:
    // 1. borderline-eng: engagementRatePct < engThreshold * 1.5 (for mid: 0.5 * 1.5 = 0.75, so let's set to 0.6)
    // 2. mild-spike: spikeFactor between 5 and 8 (let's set to 6)
    // 3. borderline-bot: botRatio between 0.315 and 0.45 (let's set to 0.35)
    const score = createMockScore({
      metrics: {
        engagementRatePct: 0.6, // borderline eng
        likesToFollowersPct: 4.0,
        avgGapDays: 7,
        gapStdDays: 2,
        spikeFactor: 6.0, // mild-spike
        viewsPerSubscriber: 0.1,
        commentToViewRatio: 0.01,
      },
    });
    const comments: CommentSignals = {
      ...defaultComments,
      botRatio: 0.35, // borderline bot ratio
    };

    const flags = detectFraudSignals(score, comments, {
      subscribers: 250000, // mid-tier (engThreshold = 0.5)
      videoCount: 100,
      fandomDetected: false,
    });

    const clusterFlag = flags.find((f) => f.id === "pattern-cluster");
    expect(clusterFlag).toBeDefined();
    expect(clusterFlag?.severity).toBe("medium");
  });
});
