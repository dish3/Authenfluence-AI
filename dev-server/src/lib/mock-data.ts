// Core types and mock data for Authenfluence AI
// v2: Extended with confidence, creator categories, public credibility,
//     temporal signals, benchmark context, and data limitations.

export type Platform = "youtube" | "instagram" | "twitter";

export interface FraudSignal {
  id: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
}

export interface InfluencerBreakdown {
  engagement: number;
  followerQuality: number;
  commentAuthenticity: number;
  postingConsistency: number;
  contextualSignals?: number;
}

export interface CreatorCategory {
  type: string;
  weight: number; // 0..1
}

export type ConfidenceLevel = "High" | "Medium" | "Low";

export interface TemporalSignals {
  uploadTrend: "improving" | "stable" | "declining" | "insufficient_data";
  engagementTrend: "improving" | "stable" | "declining" | "insufficient_data";
  suspiciousSpikesDetected: boolean;
  suddenBehaviorChange: boolean;
  growthIrregularity: boolean;
}

export interface PublicCredibilitySignal {
  score: number; // 0..100 — establishment signal only
  reducesHarshPenalties: boolean;
  note: string;
}

export interface TimelineEvent {
  status: "success" | "warning" | "info";
  category: "suspicious" | "audience" | "growth" | "engagement" | "upload";
  message: string;
}

export interface BrandRecommendation {
  riskLevel: "Low" | "Medium" | "High" | "Critical";
  sponsorshipSuitability: string;
  safetyEvaluation: string;
  reason: string;
}

export interface DetailedCommentAuthenticity {
  lowAuthenticityPct: number;
  reason: string;
  spamPct: number;
  repetitivePct: number;
  emojiSpamPct: number;
  botLanguagePct: number;
  organicPct: number;
}

export interface VerifiedSocial {
  platform: string;
  url: string;
  handle: string;
  isVerified: boolean;
}

export interface InfluencerAnalysis {
  username: string;
  displayName: string;
  platform: Platform;
  avatarColor: string;
  followers: number;
  avgLikes: number;
  totalPosts: number;
  score: number;
  breakdown: InfluencerBreakdown;
  verdict: string;
  fraudSignals: FraudSignal[];
  engagementSeries: { day: string; engagement: number; baseline: number }[];
  dataSource?: "live" | "fallback";
  // v2 intelligence fields
  confidenceLevel?: ConfidenceLevel;
  uncertaintyFactors?: string[]; // human-readable list of active uncertainty factors
  creatorCategories?: CreatorCategory[];
  temporalSignals?: TemporalSignals;
  publicCredibility?: PublicCredibilitySignal;
  benchmarkContext?: string;
  dataLimitations?: string[];
  engagementRate?: number; // measured engagement rate %
  strengths?: string[];
  risks?: string[];
  avatarUrl?: string;
  isVerified?: boolean;
  
  // New Investigate v2 fields
  timelineEvents?: TimelineEvent[];
  brandRecommendation?: BrandRecommendation;
  commentAuthenticityDetailed?: DetailedCommentAuthenticity;
  mediaPresence?: VerifiedSocial[];
}

const series = (base: number, vol: number) =>
  Array.from({ length: 14 }, (_, i) => ({
    day: `D${i + 1}`,
    engagement: Math.max(0, Math.round(base + (Math.sin(i * 1.1) * vol) + (Math.random() * vol * 0.6 - vol * 0.3))),
    baseline: base,
  }));

// ─── Calibrated mock profiles ─────────────────────────────────────────────────
// These represent the full trust spectrum with realistic, explainable scores.
export const MOCK_INFLUENCERS: Record<string, InfluencerAnalysis> = {
  mrbeast: {
    username: "mrbeast",
    displayName: "MrBeast",
    platform: "youtube",
    avatarColor: "from-cyan-500 to-blue-500",
    followers: 310_000_000,
    avgLikes: 12_400_000,
    totalPosts: 790,
    score: 94,
    breakdown: { engagement: 95, followerQuality: 92, commentAuthenticity: 94, postingConsistency: 95, contextualSignals: 93 },
    verdict:
      "Exceptional digital trust profile across all dimensions. Engagement rate of 4.0% significantly exceeds the mega-creator benchmark of 0.5%, and audience quality metrics suggest strong organic reach. Comment analysis reveals a highly active, genuine, and diverse community with minimal spam repetition or automated behaviors. Posting cadence is stable, cementing MrBeast as one of the most reliable channels at scale.",
    fraudSignals: [
      { id: "1", title: "No Significant Signals Detected", description: "All measured authenticity dimensions are within healthy ranges for this creator tier.", severity: "low" },
    ],
    engagementSeries: series(124, 15),
    confidenceLevel: "High",
    uncertaintyFactors: [],
    creatorCategories: [{ type: "Entertainment", weight: 0.75 }, { type: "Comedy", weight: 0.25 }],
    temporalSignals: { uploadTrend: "stable", engagementTrend: "stable", suspiciousSpikesDetected: false, suddenBehaviorChange: false, growthIrregularity: false },
    publicCredibility: { score: 98, reducesHarshPenalties: true, note: "Well-established channel with massive reach. Softens false-positive risk." },
    benchmarkContext: "Scored against mega creator (10M+) benchmarks. Healthy engagement target: 0.5% (measured: 4.00%). Ideal posting cadence: every 14 days.",
    dataLimitations: [
      "Audience demographic data is not publicly accessible via YouTube API.",
      "True follower authenticity cannot be directly verified — estimated from engagement patterns.",
    ],
    engagementRate: 4.0,
    isVerified: true,
    timelineEvents: [
      { status: "success", category: "audience", message: "Organic engagement distribution exceeds category average." },
      { status: "success", category: "upload", message: "Publishing cadence stable at 14-day intervals." },
      { status: "success", category: "growth", message: "Steady growth footprint across all active channels." },
      { status: "success", category: "engagement", message: "Low bot ratio (approx 4%) in public discussions." }
    ],
    brandRecommendation: {
      riskLevel: "Low",
      sponsorshipSuitability: "Highly suitable for premium multi-month sponsorships.",
      safetyEvaluation: "Exceptional safety. The creator has an established record with minimal brand safety risks.",
      reason: "High viewer-to-subscriber interaction and conversational comments indicate a premium and safe brand environment."
    },
    commentAuthenticityDetailed: {
      lowAuthenticityPct: 6,
      reason: "Comments show highly organic conversational threads, with only standard minor emoji repetition.",
      spamPct: 1,
      repetitivePct: 2,
      emojiSpamPct: 2,
      botLanguagePct: 1,
      organicPct: 94
    },
    mediaPresence: [
      { platform: "YouTube", url: "https://youtube.com/@mrbeast", handle: "@mrbeast", isVerified: true },
      { platform: "Instagram", url: "https://instagram.com/mrbeast", handle: "@mrbeast", isVerified: true },
      { platform: "Twitter/X", url: "https://x.com/mrbeast", handle: "@mrbeast", isVerified: true },
      { platform: "TikTok", url: "https://tiktok.com/@mrbeast", handle: "@mrbeast", isVerified: true },
      { platform: "Website", url: "https://mrbeast.store", handle: "Official Store", isVerified: true }
    ],
  },
  justinbieber: {
    username: "justinbieber",
    displayName: "Justin Bieber",
    platform: "youtube",
    avatarColor: "from-purple-600 to-indigo-600",
    followers: 78_400_000,
    avgLikes: 563_000,
    totalPosts: 502,
    score: 78,
    breakdown: { engagement: 58, followerQuality: 74, commentAuthenticity: 88, postingConsistency: 92, contextualSignals: 88 },
    verdict:
      "Although raw engagement rate appears lower (0.76%) relative to subscriber size, this behavior aligns perfectly with celebrity-scale music creators with long-standing passive audiences. Audience trust remains strong with limited fraud indicators. High creator credibility and clean comment authenticity support a stable, low-risk trust profile.",
    fraudSignals: [
      { id: "1", title: "No Significant Signals Detected", description: "All measured authenticity dimensions are within healthy ranges for this creator tier.", severity: "low" },
    ],
    engagementSeries: series(5.6, 1.2),
    confidenceLevel: "High",
    uncertaintyFactors: [],
    creatorCategories: [{ type: "Music", weight: 0.8 }, { type: "Entertainment", weight: 0.2 }],
    temporalSignals: { uploadTrend: "stable", engagementTrend: "stable", suspiciousSpikesDetected: false, suddenBehaviorChange: false, growthIrregularity: false },
    publicCredibility: { score: 92, reducesHarshPenalties: true, note: "Well-established channel with massive reach. Softens false-positive risk." },
    benchmarkContext: "Scored against mega creator (10M+) benchmarks. Healthy engagement target: 0.5% (measured: 0.76%). Ideal posting cadence: every 14 days.",
    dataLimitations: [
      "Audience demographic data is not publicly accessible via YouTube API.",
      "True follower authenticity cannot be directly verified — estimated from engagement patterns.",
    ],
    engagementRate: 0.76,
    isVerified: true,
    timelineEvents: [
      { status: "success", category: "audience", message: "Engagement levels match passive celebrity benchmark standards." },
      { status: "success", category: "upload", message: "Upload consistency aligned with major music release schedules." },
      { status: "success", category: "engagement", message: "Low bot comment levels with high fandom conversational markers." }
    ],
    brandRecommendation: {
      riskLevel: "Low",
      sponsorshipSuitability: "Suitable for premium brand representation and major music sponsorships.",
      safetyEvaluation: "Extremely high brand safety and historical stability.",
      reason: "Passive audience engagement is typical for global celebrity musicians. High comment authenticity confirms a clean profile."
    },
    commentAuthenticityDetailed: {
      lowAuthenticityPct: 12,
      reason: "Comment section is highly conversational but contains minor repetitive fan slogans and fan pages.",
      spamPct: 2,
      repetitivePct: 4,
      emojiSpamPct: 4,
      botLanguagePct: 2,
      organicPct: 88
    },
    mediaPresence: [
      { platform: "YouTube", url: "https://youtube.com/@justinbieber", handle: "@justinbieber", isVerified: true },
      { platform: "Instagram", url: "https://instagram.com/justinbieber", handle: "@justinbieber", isVerified: true },
      { platform: "Twitter/X", url: "https://x.com/justinbieber", handle: "@justinbieber", isVerified: true },
      { platform: "Website", url: "https://justinbiebermusic.com", handle: "Official Site", isVerified: true }
    ],
  },
  dhruvrathee: {
    username: "dhruvrathee",
    displayName: "Dhruv Rathee",
    platform: "youtube",
    avatarColor: "from-emerald-500 to-teal-500",
    followers: 26_400_000,
    avgLikes: 1_400_000,
    totalPosts: 620,
    score: 86,
    breakdown: { engagement: 85, followerQuality: 84, commentAuthenticity: 88, postingConsistency: 87, contextualSignals: 86 },
    verdict:
      "Highly trusted credibility profile. Commentary and educational creator dimensions show strong audience depth. Comment analysis reveals healthy conversational interaction, with relevant user discussions. Consistent upload cadence and low risk factors support a strong trust intelligence rating.",
    fraudSignals: [
      { id: "1", title: "No Significant Signals Detected", description: "All measured authenticity dimensions are within healthy ranges for this creator tier.", severity: "low" },
    ],
    engagementSeries: series(14, 2.5),
    confidenceLevel: "High",
    uncertaintyFactors: [],
    creatorCategories: [{ type: "News", weight: 0.55 }, { type: "Education", weight: 0.45 }],
    temporalSignals: { uploadTrend: "stable", engagementTrend: "stable", suspiciousSpikesDetected: false, suddenBehaviorChange: false, growthIrregularity: false },
    publicCredibility: { score: 85, reducesHarshPenalties: true, note: "Well-established channel with significant reach. Reduces likelihood of false-positive flags." },
    benchmarkContext: "Scored against mega creator (10M+) benchmarks. Healthy engagement target: 0.5% (measured: 5.30%). Ideal posting cadence: every 14 days.",
    dataLimitations: [
      "Audience demographic data is not publicly accessible via YouTube API.",
      "True follower authenticity cannot be directly verified — estimated from engagement patterns.",
    ],
    engagementRate: 5.3,
    isVerified: true,
    timelineEvents: [
      { status: "success", category: "audience", message: "Conversational depth in comments reflects highly active educational interest." },
      { status: "success", category: "upload", message: "Stable posting schedule matching commentary standards." },
      { status: "success", category: "growth", message: "Strong organic growth driven by topical discussions." }
    ],
    brandRecommendation: {
      riskLevel: "Low",
      sponsorshipSuitability: "Highly suitable for educational sponsorships and social awareness integrations.",
      safetyEvaluation: "Clean brand safety profile. High intellectual alignment.",
      reason: "High comment authenticity and organic engagement ratios indicate a highly conversational, non-simulated audience."
    },
    commentAuthenticityDetailed: {
      lowAuthenticityPct: 12,
      reason: "Comments are heavily conversational with long paragraphs, displaying very low automated patterns.",
      spamPct: 2,
      repetitivePct: 3,
      emojiSpamPct: 5,
      botLanguagePct: 2,
      organicPct: 88
    },
    mediaPresence: [
      { platform: "YouTube", url: "https://youtube.com/@dhruvrathee", handle: "@dhruvrathee", isVerified: true },
      { platform: "Instagram", url: "https://instagram.com/dhruvrathee", handle: "@dhruvrathee", isVerified: true },
      { platform: "Twitter/X", url: "https://x.com/dhruvrathee", handle: "@dhruvrathee", isVerified: true },
      { platform: "Website", url: "https://dhruvrathee.com", handle: "Official Site", isVerified: true }
    ],
  },
  carryminati: {
    username: "carryminati",
    displayName: "CarryMinati",
    platform: "youtube",
    avatarColor: "from-orange-500 to-red-600",
    followers: 44_200_000,
    avgLikes: 3_100_000,
    totalPosts: 185,
    score: 85,
    breakdown: { engagement: 88, followerQuality: 82, commentAuthenticity: 84, postingConsistency: 86, contextualSignals: 85 },
    verdict:
      "Demonstrates strong trust indicators at scale. High engagement rate relative to the 10M+ tier benchmark. Comment section shows active community interaction, with fandom-style comment patterns properly normalized to prevent false positive flags.",
    fraudSignals: [
      { id: "1", title: "No Significant Signals Detected", description: "All measured authenticity dimensions are within healthy ranges for this creator tier.", severity: "low" },
    ],
    engagementSeries: series(31, 5),
    confidenceLevel: "High",
    uncertaintyFactors: [],
    creatorCategories: [{ type: "Comedy", weight: 0.6 }, { type: "Entertainment", weight: 0.4 }],
    temporalSignals: { uploadTrend: "stable", engagementTrend: "stable", suspiciousSpikesDetected: false, suddenBehaviorChange: false, growthIrregularity: false },
    publicCredibility: { score: 88, reducesHarshPenalties: true, note: "Well-established channel with significant reach. Reduces likelihood of false-positive flags." },
    benchmarkContext: "Scored against mega creator (10M+) benchmarks. Healthy engagement target: 0.5% (measured: 7.01%). Ideal posting cadence: every 14 days.",
    dataLimitations: [
      "Audience demographic data is not publicly accessible via YouTube API.",
      "True follower authenticity cannot be directly verified — estimated from engagement patterns.",
    ],
    engagementRate: 7.01,
    isVerified: true,
    timelineEvents: [
      { status: "success", category: "audience", message: "Highly enthusiastic comment footprint with massive community participation." },
      { status: "success", category: "upload", message: "Consistent release behavior relative to high-production comedy channels." }
    ],
    brandRecommendation: {
      riskLevel: "Low",
      sponsorshipSuitability: "Suitable for high-reach youth-oriented sponsorships.",
      safetyEvaluation: "Generally safe. Natural edge humor fits comedy audience expectations.",
      reason: "Remarkably high engagement (7.01% vs 0.5% target) and low coordinated bot activity support a strong rating."
    },
    commentAuthenticityDetailed: {
      lowAuthenticityPct: 16,
      reason: "High concentration of short enthusiast reactions, meme jokes, and emojis, typical for viral comedy.",
      spamPct: 3,
      repetitivePct: 4,
      emojiSpamPct: 6,
      botLanguagePct: 3,
      organicPct: 84
    },
    mediaPresence: [
      { platform: "YouTube", url: "https://youtube.com/@carryminati", handle: "@carryminati", isVerified: true },
      { platform: "Instagram", url: "https://instagram.com/carryminati", handle: "@carryminati", isVerified: true },
      { platform: "Twitter/X", url: "https://x.com/carryminati", handle: "@carryminati", isVerified: true },
      { platform: "Website", url: "https://carryminati.com", handle: "Official Site", isVerified: true }
    ],
  },
  techwithpriya: {
    username: "techwithpriya",
    displayName: "Tech With Priya",
    platform: "youtube",
    avatarColor: "from-blue-500 to-purple-500",
    followers: 842_000,
    avgLikes: 38_400,
    totalPosts: 312,
    score: 88,
    breakdown: { engagement: 91, followerQuality: 86, commentAuthenticity: 89, postingConsistency: 84, contextualSignals: 87 },
    verdict:
      "Based on measured signals, Tech With Priya demonstrates strong contextual trust across all evaluated dimensions. Engagement rate of 4.56% exceeds the mid-tier benchmark of 3.0%, and the likes-to-subscriber ratio of 4.6% aligns with healthy audience behavior. Comment authenticity is high with minimal automated patterns detected, and posting cadence is consistent at approximately 7-day intervals. With high confidence across available data, this channel presents as a reliable candidate for brand partnerships.",
    fraudSignals: [
      { id: "1", title: "Minor Engagement Variance", description: "Brief 12% spike on one video — consistent with organic viral reach for this content type.", severity: "low" },
    ],
    engagementSeries: series(38, 6),
    confidenceLevel: "High",
    uncertaintyFactors: [],
    creatorCategories: [{ type: "Education", weight: 0.65 }, { type: "Entertainment", weight: 0.35 }],
    temporalSignals: { uploadTrend: "stable", engagementTrend: "stable", suspiciousSpikesDetected: false, suddenBehaviorChange: false, growthIrregularity: false },
    publicCredibility: { score: 62, reducesHarshPenalties: false, note: "Moderately established channel. Mild stabilizing effect on scoring." },
    benchmarkContext: "Scored against mid-tier creator (100K–1M) benchmarks. Healthy engagement target: 3.0% (measured: 4.56%). Ideal posting cadence: every 7 days.",
    dataLimitations: [
      "Audience demographic data is not publicly accessible via YouTube API.",
      "True follower authenticity cannot be directly verified — estimated from engagement patterns.",
    ],
    engagementRate: 4.56,
    timelineEvents: [
      { status: "success", category: "audience", message: "Subscriber-to-view interaction rate remains above category standard." },
      { status: "success", category: "upload", message: "Stable 7-day posting gaps for tech tutorials." },
      { status: "success", category: "engagement", message: "Conversational comment section with low spam indicators." }
    ],
    brandRecommendation: {
      riskLevel: "Low",
      sponsorshipSuitability: "Highly suitable for tech, software, and educational sponsorships.",
      safetyEvaluation: "Clean history, safe commentary environment.",
      reason: "Above-average engagement rate and highly focused viewer feedback confirm a highly motivated organic audience."
    },
    commentAuthenticityDetailed: {
      lowAuthenticityPct: 11,
      reason: "Low automation footprint. Comments show users asking tech-related questions.",
      spamPct: 1,
      repetitivePct: 3,
      emojiSpamPct: 5,
      botLanguagePct: 2,
      organicPct: 89
    },
    mediaPresence: [
      { platform: "YouTube", url: "https://youtube.com/@techwithpriya", handle: "@techwithpriya", isVerified: false },
      { platform: "Instagram", url: "https://instagram.com/techwithpriya", handle: "@techwithpriya", isVerified: false },
      { platform: "Website", url: "https://techwithpriya.com", handle: "Official Site", isVerified: false }
    ],
  },
  foodierohan: {
    username: "foodierohan",
    displayName: "Foodie Rohan",
    platform: "youtube",
    avatarColor: "from-amber-500 to-rose-500",
    followers: 410_000,
    avgLikes: 9_800,
    totalPosts: 187,
    score: 62,
    breakdown: { engagement: 64, followerQuality: 68, commentAuthenticity: 55, postingConsistency: 60, contextualSignals: 62 },
    verdict:
      "Foodie Rohan shows moderate contextual trust with mixed signals across dimensions. Engagement rate of 2.39% is within the mid-tier benchmark range, though comment authenticity (55/100) shows some patterns worth monitoring — a recurring commenter cohort appears across approximately 18% of posts. Posting consistency is below average with gaps of 9–14 days followed by burst uploads. With medium confidence based on available data, this channel is suitable for performance-tracked campaigns but extended monitoring is recommended before high-budget commitments.",
    fraudSignals: [
      { id: "1", title: "Repetitive Audience Behavior Detected", description: "A small group of accounts appears disproportionately across multiple posts — may indicate an engagement pod.", severity: "medium" },
      { id: "2", title: "Reduced Publishing Stability", description: "Gaps of 9–14 days followed by burst uploads — a burst-and-drop cadence pattern.", severity: "low" },
    ],
    engagementSeries: series(22, 11),
    confidenceLevel: "Medium",
    uncertaintyFactors: ["Mixed audience signals detected", "Borderline comment patterns"],
    creatorCategories: [{ type: "Lifestyle", weight: 0.7 }, { type: "Entertainment", weight: 0.3 }],
    temporalSignals: { uploadTrend: "declining", engagementTrend: "stable", suspiciousSpikesDetected: false, suddenBehaviorChange: false, growthIrregularity: true },
    publicCredibility: { score: 48, reducesHarshPenalties: false, note: "Moderately established channel. Mild stabilizing effect on scoring." },
    benchmarkContext: "Scored against mid-tier creator (100K–1M) benchmarks. Healthy engagement target: 3.0% (measured: 2.39%). Ideal posting cadence: every 7 days.",
    dataLimitations: [
      "Audience demographic data is not publicly accessible via YouTube API.",
      "True follower authenticity cannot be directly verified — estimated from engagement patterns.",
      "Inactive subscriber quality is inferred, not measured directly.",
    ],
    engagementRate: 2.39,
    timelineEvents: [
      { status: "warning", category: "suspicious", message: "Moderate spike detected in comment frequency on recent videos." },
      { status: "info", category: "upload", message: "Posting frequency shows some irregular gaps (9–14 days)." },
      { status: "warning", category: "audience", message: "Frequent repeating commenter cohort (approx 18% overlap)." }
    ],
    brandRecommendation: {
      riskLevel: "Medium",
      sponsorshipSuitability: "Suitable for short-term or performance-tracked campaigns.",
      safetyEvaluation: "Standard safety profile. Minor engagement abnormalities present but no malicious indicators.",
      reason: "Average engagement rate with minor comment repetition suggesting potential micro-pod activity."
    },
    commentAuthenticityDetailed: {
      lowAuthenticityPct: 22,
      reason: "Comment section contains repetitive emoji feedback and small repeating circles of standard comments.",
      spamPct: 4,
      repetitivePct: 8,
      emojiSpamPct: 6,
      botLanguagePct: 4,
      organicPct: 78
    },
    mediaPresence: [
      { platform: "YouTube", url: "https://youtube.com/@foodierohan", handle: "@foodierohan", isVerified: false },
      { platform: "Instagram", url: "https://instagram.com/foodierohan", handle: "@foodierohan", isVerified: true },
      { platform: "TikTok", url: "https://tiktok.com/@foodierohan", handle: "@foodierohan", isVerified: false }
    ],
  },
  cryptokingz: {
    username: "cryptokingz",
    displayName: "CryptoKingZ",
    platform: "youtube",
    avatarColor: "from-red-500 to-orange-500",
    followers: 1_240_000,
    avgLikes: 3_100,
    totalPosts: 96,
    score: 24,
    breakdown: { engagement: 21, followerQuality: 19, commentAuthenticity: 28, postingConsistency: 30, contextualSignals: 25 },
    verdict:
      "CryptoKingZ presents multiple concerning signals across all measured dimensions. Engagement rate of 0.25% falls significantly below the macro-tier benchmark of 1.8%, and the likes-to-subscriber ratio of 0.25% is well below the 2.5% healthy range for this creator size. Comment analysis identified approximately 62% of comments matching automated or coordinated patterns, and three unexplained engagement spikes of 400%+ were detected within the analyzed period. With low confidence due to the severity and consistency of these signals, this channel presents substantial risk for brand partnerships — independent verification is strongly recommended before any commitment.",
    fraudSignals: [
      { id: "1", title: "Unusual Engagement Concentration", description: "3 videos received 400%+ above median engagement — inconsistent with organic content distribution.", severity: "high" },
      { id: "2", title: "Audience Interaction Depth Below Expected Level", description: "62% of analyzed comments show patterns associated with automated or coordinated activity.", severity: "high" },
      { id: "3", title: "Audience Engagement Disparity", description: "Likes represent only 0.25% of the subscriber base — well below the 2.5% benchmark for macro-tier creators.", severity: "high" },
      { id: "4", title: "Repetitive Audience Behavior Detected", description: "6 distinct phrase patterns appear with unusual frequency — potential indicator of coordinated engagement.", severity: "medium" },
    ],
    engagementSeries: series(8, 24),
    confidenceLevel: "High",
    uncertaintyFactors: [],
    creatorCategories: [{ type: "Entertainment", weight: 0.6 }, { type: "News", weight: 0.4 }],
    temporalSignals: { uploadTrend: "stable", engagementTrend: "declining", suspiciousSpikesDetected: true, suddenBehaviorChange: true, growthIrregularity: true },
    publicCredibility: { score: 55, reducesHarshPenalties: true, note: "Well-established channel with significant reach. Reduces likelihood of false-positive flags." },
    benchmarkContext: "Scored against macro-tier creator (1M–10M) benchmarks. Healthy engagement target: 1.8% (measured: 0.25%). Ideal posting cadence: every 10 days.",
    dataLimitations: [
      "Audience demographic data is not publicly accessible via YouTube API.",
      "True follower authenticity cannot be directly verified — estimated from engagement patterns.",
    ],
    engagementRate: 0.25,
    timelineEvents: [
      { status: "warning", category: "suspicious", message: "Sudden engagement spikes detected on multiple recent videos." },
      { status: "warning", category: "audience", message: "High volume of repetitive/templated comments indicating bot participation." },
      { status: "warning", category: "growth", message: "Erratic growth footprint inconsistent with subscriber counts." },
      { status: "warning", category: "engagement", message: "Extremely low organic conversational engagement (engagement rate 0.25%)." }
    ],
    brandRecommendation: {
      riskLevel: "Critical",
      sponsorshipSuitability: "Not suitable for brand campaigns. High risk of bot engagement.",
      safetyEvaluation: "Critical safety risk. Promotes volatile financial assets with suspected synthetic traffic.",
      reason: "High concentration of bot comments (62%) and suspicious view spikes indicate heavily inorganic interaction."
    },
    commentAuthenticityDetailed: {
      lowAuthenticityPct: 62,
      reason: "Comments are dominated by coordinated promotional spam, duplicated bot links, and repetitive phrases.",
      spamPct: 22,
      repetitivePct: 20,
      emojiSpamPct: 10,
      botLanguagePct: 10,
      organicPct: 38
    },
    mediaPresence: [
      { platform: "YouTube", url: "https://youtube.com/channel/cryptokingz", handle: "@cryptokingz", isVerified: false },
      { platform: "Instagram", url: "https://instagram.com/cryptokingz", handle: "@cryptokingz", isVerified: false },
      { platform: "Twitter/X", url: "https://x.com/cryptokingz", handle: "@cryptokingz", isVerified: false }
    ],
  },
};

export function analyzeMock(username: string): InfluencerAnalysis {
  const key = username.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (MOCK_INFLUENCERS[key]) return MOCK_INFLUENCERS[key];

  // Deterministic pseudo-analysis for unknown usernames
  const seed = [...key].reduce((a, c) => a + c.charCodeAt(0), 0) || 42;
  const score = 35 + (seed % 55);
  const wiggle = (n: number) => Math.max(10, Math.min(98, score + ((seed * n) % 15) - 7));

  const followers = 50_000 + (seed * 137) % 900_000;
  const avgLikes = 1_000 + (seed * 53) % 30_000;
  const engRate = ((avgLikes / Math.max(1, followers)) * 100);

  // Infer tier for benchmark context
  const tier =
    followers < 10_000 ? "nano" :
    followers < 100_000 ? "micro" :
    followers < 1_000_000 ? "mid" :
    followers < 10_000_000 ? "macro" : "mega";

  const tierBenchmarks: Record<string, number> = {
    nano: 6.0, micro: 4.5, mid: 3.0, macro: 1.8, mega: 0.8,
  };
  const engTarget = tierBenchmarks[tier];

  const confidenceLevel: ConfidenceLevel = score >= 60 ? "Medium" : score >= 40 ? "Medium" : "Low";

  const isHigh = score >= 70;
  const isMed = score >= 45 && score < 70;
  
  const lowAuthenticityPct = isHigh ? Math.round(10 - (score - 70) * 0.2) : isMed ? Math.round(25 - (score - 45) * 0.4) : Math.round(75 - (score * 0.8));
  const spamPct = Math.round(lowAuthenticityPct * 0.2);
  const repetitivePct = Math.round(lowAuthenticityPct * 0.4);
  const emojiSpamPct = Math.round(lowAuthenticityPct * 0.3);
  const botLanguagePct = Math.round(lowAuthenticityPct * 0.1);
  const organicPct = 100 - lowAuthenticityPct;

  const timelineEvents = [
    {
      status: isHigh ? ("success" as const) : isMed ? ("info" as const) : ("warning" as const),
      category: "audience" as const,
      message: isHigh 
        ? "Audience engagement patterns are consistent with creator benchmarks." 
        : isMed 
          ? "Audience interaction patterns show some moderate clustering." 
          : "Elevated levels of low-authenticity comment activity detected."
    },
    {
      status: isHigh ? ("success" as const) : ("warning" as const),
      category: "suspicious" as const,
      message: isHigh 
        ? "No abnormal engagement spikes or views-to-likes disparities detected." 
        : "Unusual engagement spikes detected across recent posts."
    },
    {
      status: "info" as const,
      category: "upload" as const,
      message: `Posting stability scored at ${wiggle(4)}/100 based on temporal gaps.`
    }
  ];

  const brandRecommendation = {
    riskLevel: isHigh ? ("Low" as const) : isMed ? ("Medium" as const) : ("Critical" as const),
    sponsorshipSuitability: isHigh 
      ? "Highly suitable for long-term sponsorships and premium brand integrations." 
      : isMed 
        ? "Recommended for short-term or performance-tracked campaigns only." 
        : "Not recommended for brand campaigns. Independent verification advised.",
    safetyEvaluation: isHigh 
      ? "Excellent brand safety alignment with healthy organic comment sentiment." 
      : isMed 
        ? "Standard brand safety alignment with standard minor risk patterns." 
        : "High brand safety risk due to synthetic traffic indicators and bot repetition.",
    reason: isHigh 
      ? "High comment authenticity and organic reach support a reliable partnerships footprint." 
      : isMed 
        ? "Moderate comment consistency and irregular posting cadence warrant short-term campaigning." 
        : "Severe comment repetition (estimated low authenticity of " + lowAuthenticityPct + "%) suggests simulated engagement."
  };

  const commentAuthenticityDetailed = {
    lowAuthenticityPct,
    reason: isHigh 
      ? "Comments represent genuine conversations and contextually relevant opinions." 
      : isMed 
        ? "Comments show a mix of genuine thoughts and repetitive/low-effort responses." 
        : "Comments are heavily populated by coordinated bot chains and spam patterns.",
    spamPct,
    repetitivePct,
    emojiSpamPct,
    botLanguagePct,
    organicPct
  };

  const mediaPresence = [
    { platform: "YouTube", url: `https://youtube.com/@${key}`, handle: `@${key}`, isVerified: isHigh },
    { platform: "Instagram", url: `https://instagram.com/${key}`, handle: `@${key}`, isVerified: isHigh && followers > 200000 },
    { platform: "Twitter/X", url: `https://x.com/${key}`, handle: `@${key}`, isVerified: false }
  ];

  return {
    username: key || "unknown",
    displayName: username || "Unknown Creator",
    platform: "youtube",
    avatarColor: "from-indigo-500 to-cyan-500",
    followers,
    avgLikes,
    totalPosts: 40 + (seed % 250),
    score,
    isVerified: followers >= 1_000_000,
    breakdown: {
      engagement: wiggle(1),
      followerQuality: wiggle(2),
      commentAuthenticity: wiggle(3),
      postingConsistency: wiggle(4),
      contextualSignals: wiggle(5),
    },
    verdict:
      score >= 70
        ? `Based on available signals, this creator demonstrates predominantly organic engagement with healthy audience interaction and consistent posting behavior. Engagement rate of ${engRate.toFixed(2)}% is within the expected range for a ${tier}-tier creator (benchmark: ${engTarget}%). Trust signals are strong across most measured dimensions, though some data limitations apply as noted below.`
        : score >= 45
          ? `Based on available signals, this creator shows mixed authenticity indicators. Engagement rate of ${engRate.toFixed(2)}% is near the ${tier}-tier benchmark of ${engTarget}%, but several dimensions show inconsistencies that warrant monitoring. With medium confidence, this channel may be suitable for performance-tracked campaigns.`
          : `Based on available signals, this creator presents multiple concerning indicators. Engagement rate of ${engRate.toFixed(2)}% falls below the ${tier}-tier benchmark of ${engTarget}%, and audience quality signals are weak. With the available data, independent verification is recommended before brand partnership commitments.`,
    fraudSignals:
      score >= 70
        ? [{ id: "1", title: "Minor Engagement Variance", description: "Within acceptable range for this creator tier and content type.", severity: "low" }]
        : score >= 45
          ? [
              { id: "1", title: "Borderline Engagement Consistency", description: "Variance exceeds healthy threshold on approximately 22% of posts.", severity: "medium" },
              { id: "2", title: "Recurring Commenter Pattern", description: "Small recurring commenter group identified — below formal threshold but worth monitoring.", severity: "low" },
            ]
          : [
              { id: "1", title: "Audience Engagement Disparity", description: `Engagement rate of ${engRate.toFixed(2)}% is below the ${engTarget}% benchmark for ${tier}-tier creators.`, severity: "high" },
              { id: "2", title: "Suspicious Activity in Comments", description: "Elevated proportion of comments showing automated or coordinated patterns.", severity: "high" },
              { id: "3", title: "Unusual Engagement Concentration", description: "Multiple engagement spikes inconsistent with organic content distribution.", severity: "medium" },
            ],
    engagementSeries: series(Math.max(6, score / 3), Math.max(4, (100 - score) / 6)),
    confidenceLevel,
    uncertaintyFactors: ["Limited data — analysis based on publicly available signals only"],
    creatorCategories: [{ type: "Entertainment", weight: 0.6 }, { type: "Lifestyle", weight: 0.4 }],
    temporalSignals: {
      uploadTrend: "insufficient_data",
      engagementTrend: "insufficient_data",
      suspiciousSpikesDetected: score < 40,
      suddenBehaviorChange: false,
      growthIrregularity: score < 45,
    },
    publicCredibility: {
      score: Math.round(30 + (seed % 40)),
      reducesHarshPenalties: followers > 1_000_000,
      note: "Emerging to moderately established channel.",
    },
    benchmarkContext: `Scored against ${tier}-tier creator benchmarks. Healthy engagement target: ${engTarget}% (estimated: ${engRate.toFixed(2)}%).`,
    dataLimitations: [
      "Audience demographic data is not publicly accessible via YouTube API.",
      "True follower authenticity cannot be directly verified — estimated from engagement patterns.",
      "Analysis based on publicly visible signals only — hidden analytics are not available.",
    ],
    engagementRate: engRate,
    dataSource: "fallback",
    
    // New fields
    timelineEvents,
    brandRecommendation,
    commentAuthenticityDetailed,
    mediaPresence
  };
}

export const SCORE_LABELS = [
  { min: 90, label: "Highly Trusted", tone: "success" as const },
  { min: 70, label: "Mostly Authentic", tone: "success" as const },
  { min: 50, label: "Moderate Risk", tone: "warning" as const },
  { min: 0, label: "Suspicious Activity", tone: "destructive" as const },
];

export function scoreLabel(score: number) {
  return SCORE_LABELS.find((s) => score >= s.min)!;
}

export function scoreColor(score: number): string {
  if (score >= 70) return "var(--color-success)";
  if (score >= 50) return "var(--color-warning)";
  return "var(--color-destructive)";
}
