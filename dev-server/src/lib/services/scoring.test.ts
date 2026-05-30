import { describe, test, expect } from "bun:test";
import {
  computeScore,
  inferCreatorCategories,
  computePublicCredibility,
  computeUncertainty,
  computeTemporalSignals,
  trustLabel,
  type RawChannelSignals,
  type CommentSignals,
} from "./scoring";

describe("Scoring Engine Tests", () => {
  // Mock base channel signals for a healthy creator
  const healthyChannel: RawChannelSignals = {
    subscribers: 250000,
    totalVideos: 120,
    totalViews: 5000000,
    recentVideos: [
      { videoId: "v1", publishedAt: new Date(Date.now() - 2 * 86400000).toISOString(), views: 25000, likes: 1100, comments: 80 },
      { videoId: "v2", publishedAt: new Date(Date.now() - 9 * 86400000).toISOString(), views: 22000, likes: 950, comments: 70 },
      { videoId: "v3", publishedAt: new Date(Date.now() - 16 * 86400000).toISOString(), views: 30000, likes: 1400, comments: 110 },
      { videoId: "v4", publishedAt: new Date(Date.now() - 23 * 86400000).toISOString(), views: 18000, likes: 800, comments: 60 },
      { videoId: "v5", publishedAt: new Date(Date.now() - 30 * 86400000).toISOString(), views: 28000, likes: 1250, comments: 95 },
      { videoId: "v6", publishedAt: new Date(Date.now() - 37 * 86400000).toISOString(), views: 21000, likes: 900, comments: 65 },
      { videoId: "v7", publishedAt: new Date(Date.now() - 44 * 86400000).toISOString(), views: 24000, likes: 1050, comments: 75 },
      { videoId: "v8", publishedAt: new Date(Date.now() - 51 * 86400000).toISOString(), views: 23000, likes: 1000, comments: 70 },
    ],
  };

  const cleanComments: CommentSignals = {
    botRatio: 0.1,
    sentimentScore: 82,
    spamPatterns: [],
    fandomDetected: false,
  };

  describe("Creator Category Inference", () => {
    test("should detect Education category for discussion-heavy signals (legacy fallback)", () => {
      const channel: RawChannelSignals = {
        subscribers: 100000,
        totalVideos: 100,
        totalViews: 2000000,
        recentVideos: [
          { videoId: "1", publishedAt: new Date().toISOString(), views: 10000, likes: 400, comments: 50 }, // comment/like ratio = 12.5%
        ],
      };
      const categories = inferCreatorCategories(channel);
      const types = categories.map((c) => c.type);
      expect(types).toContain("Education");
    });

    test("should detect Music for large channels with low views per sub (legacy fallback)", () => {
      const channel: RawChannelSignals = {
        subscribers: 5000000,
        totalVideos: 50,
        totalViews: 10000000, // 200k avg views per video, sub to view ratio is small
        recentVideos: [
          { videoId: "1", publishedAt: new Date().toISOString(), views: 100000, likes: 2000, comments: 30 },
        ],
      };
      const categories = inferCreatorCategories(channel);
      const types = categories.map((c) => c.type);
      expect(types).toContain("Music");
    });

    test("should map categories correctly via YouTube categoryId", () => {
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
      expect(categories[0].type).toBe("Music");
      expect(categories[0].weight).toBeGreaterThan(0.5);
    });
  });

  describe("Public Credibility Signal", () => {
    test("should score higher for well-established channels", () => {
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

      expect(megaCred.score).toBeGreaterThan(newCred.score);
      expect(megaCred.reducesHarshPenalties).toBe(true);
      expect(newCred.reducesHarshPenalties).toBe(false);
    });
  });

  describe("Uncertainty & Confidence Engine", () => {
    test("should report Low confidence for small sample sizes", () => {
      const smallDataChannel: RawChannelSignals = {
        subscribers: 50000,
        totalVideos: 10,
        totalViews: 100000,
        recentVideos: [
          { videoId: "v1", publishedAt: new Date().toISOString(), views: 5000, likes: 200, comments: 10 },
        ],
      };
      const uncertainty = computeUncertainty(smallDataChannel, cleanComments);
      expect(uncertainty.level).toBe("Low");
      expect(uncertainty.factors.smallSampleSize).toBe(true);
    });

    test("should report High confidence for well-behaved large datasets", () => {
      const uncertainty = computeUncertainty(healthyChannel, cleanComments);
      expect(uncertainty.level).toBe("High");
    });
  });

  describe("Temporal Signals", () => {
    test("should detect suspicious spikes", () => {
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
          // Suspicious spike: >5x median likes (median is ~20, v7 has 150 likes)
          { videoId: "v7", publishedAt: new Date(Date.now() - 1 * 86400000).toISOString(), views: 2000, likes: 150, comments: 10 },
        ],
      };
      const signals = computeTemporalSignals(spikedChannel);
      expect(signals.suspiciousSpikesDetected).toBe(true);
    });
  });

  describe("Main Scoring Function", () => {
    test("should compute high score for healthy channel", () => {
      const result = computeScore(healthyChannel, cleanComments);
      expect(result.finalScore).toBeGreaterThanOrEqual(80);
      expect(result.breakdown.engagement).toBeGreaterThan(80);
      expect(result.breakdown.commentAuthenticity).toBeGreaterThan(80);
    });

    test("should resistant-outlier filter engagement spike", () => {
      const spikedChannel: RawChannelSignals = {
        subscribers: 250000,
        totalVideos: 120,
        totalViews: 5000000,
        recentVideos: [
          // Spike video (very high engagement rate)
          { videoId: "v1", publishedAt: new Date(Date.now() - 2 * 86400000).toISOString(), views: 10000, likes: 3000, comments: 500 }, // 35% ER
          { videoId: "v2", publishedAt: new Date(Date.now() - 9 * 86400000).toISOString(), views: 22000, likes: 950, comments: 70 },  // 4.6% ER
          { videoId: "v3", publishedAt: new Date(Date.now() - 16 * 86400000).toISOString(), views: 30000, likes: 1400, comments: 110 }, // 5.0% ER
          { videoId: "v4", publishedAt: new Date(Date.now() - 23 * 86400000).toISOString(), views: 18000, likes: 800, comments: 60 },  // 4.7% ER
          { videoId: "v5", publishedAt: new Date(Date.now() - 30 * 86400000).toISOString(), views: 28000, likes: 1250, comments: 95 }, // 4.8% ER
        ],
      };
      const result = computeScore(spikedChannel, cleanComments);
      // Spike should be dropped by outlier-resistant logic, resulting in normal engagement rating
      // Median ER is ~4.8%, Spiked is 35% (>3x median). Dropping v1 leads to ~4.8% ER which gets scored reasonably,
      // rather than being inflated by the 35% ER.
      expect(result.metrics.engagementRatePct).toBeLessThan(10); // dropped the 35% outlier!
    });
  });

  describe("Score Label Brackets", () => {
    test("should map scores to correct labels based on brackets", () => {
      expect(trustLabel(95).label).toBe("Highly Trusted");
      expect(trustLabel(90).label).toBe("Highly Trusted");
      expect(trustLabel(89).label).toBe("Mostly Authentic");
      expect(trustLabel(70).label).toBe("Mostly Authentic");
      expect(trustLabel(69).label).toBe("Moderate Risk");
      expect(trustLabel(50).label).toBe("Moderate Risk");
      expect(trustLabel(49).label).toBe("Suspicious Activity");
      expect(trustLabel(10).label).toBe("Suspicious Activity");
    });
  });
});
