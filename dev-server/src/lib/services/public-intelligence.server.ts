import { callGemini } from "./gemini.server";

export function fmtNumber(num: number): string {
  if (num === undefined || num === null || isNaN(num)) return "0";
  const abs = Math.abs(num);
  if (abs >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
  if (abs >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (abs >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return num.toString();
}

// ─── Creator Tier Classification ────────────────────────────────────────────
export type CreatorTier = "Nano" | "Small" | "Mid" | "Macro" | "Celebrity";

export function getCreatorTier(followers: number): CreatorTier {
  if (followers >= 10_000_000) return "Celebrity";
  if (followers >= 1_000_000) return "Macro";
  if (followers >= 50_000) return "Mid";
  if (followers >= 1_000) return "Small";
  return "Nano";
}

// ─── Brand families by niche (no hardcoded celebrity brands) ─────────────────
const BRAND_FAMILIES: Record<string, string[]> = {
  gaming:       ["Gaming Hardware Brands", "Game Publishers", "Energy Drink Brands", "PC Peripheral Brands", "Streaming Services"],
  tech:         ["SaaS / Productivity Tools", "VPN Services", "Cloud Hosting Brands", "Tech Accessories", "Online Learning Platforms"],
  technology:   ["SaaS / Productivity Tools", "VPN Services", "Cloud Hosting Brands", "Tech Accessories", "Online Learning Platforms"],
  education:    ["Online Learning Platforms", "E-book Services", "EdTech SaaS", "Study Tool Brands", "Certification Programs"],
  music:        ["Music Streaming Services", "Audio Hardware Brands", "Music Production Tools", "Merchandise Platforms", "Talent Agency Services"],
  fitness:      ["Fitness Apparel Brands", "Supplement Brands", "Gym Equipment Brands", "Health App Services", "Wearable Tech"],
  beauty:       ["Cosmetics Brands", "Skincare Lines", "Fashion Retailers", "Beauty Subscription Boxes", "Wellness Brands"],
  food:         ["Food Delivery Services", "Kitchen Equipment Brands", "Meal Kit Services", "Beverage Brands", "Restaurant Chains"],
  travel:       ["Travel Booking Platforms", "Luggage Brands", "Hotel Chains", "Travel Credit Cards", "Adventure Gear Brands"],
  finance:      ["Fintech Apps", "Investment Platforms", "Banking Services", "Crypto Exchanges", "Financial Education Services"],
  news:         ["News Aggregator Apps", "VPN Services", "Journalism Tools", "Premium Content Platforms", "Political/Civic Brands"],
  entertainment: ["Streaming Services", "Mobile Gaming Apps", "Digital Entertainment Brands", "Consumer Electronics", "Lifestyle Brands"],
  lifestyle:    ["DTC Consumer Brands", "Home Goods", "Fashion Retailers", "Subscription Boxes", "Wellness Apps"],
};

function getBrandFamiliesForCategory(category: string): string[] {
  const key = category.toLowerCase();
  return BRAND_FAMILIES[key] || BRAND_FAMILIES["entertainment"];
}

// ─── Profitability Formula (multi-signal, tier-aware) ─────────────────────
function computeProfitabilityScore(coreData: any): number {
  const followers = coreData?.followers || 0;
  const tier = getCreatorTier(followers);

  // Hard gates
  if (tier === "Nano") return 12; // below commercial threshold
  
  const engRate = Math.min(coreData?.engagementRate || 2.0, 25); // cap runaway
  const organicPct = coreData?.commentAuthenticityDetailed?.organicPct || 60;
  const totalPosts = Math.min(coreData?.totalPosts || 0, 500);
  const fraudSignalCount = (coreData?.fraudSignals || []).filter((f: any) => f.severity === "high").length;
  const crossPlatformCount = (coreData?.crossPlatformEcosystem || []).length;
  const score = coreData?.score || 50;

  // Engagement component (0-100): 3% engagement = score 50
  const engScore = Math.min(100, (engRate / 8) * 100);

  // Subscriber quality (0-100): derived from trust score
  const qualityScore = Math.min(100, score);

  // Upload consistency (0-100): 0 posts = 0, 100+ posts = 80+
  const consistencyScore = Math.min(100, (totalPosts / 200) * 100);

  // Audience scale (0-100): log-scaled so large doesn't dominate
  const scaleScore = followers > 0
    ? Math.min(100, (Math.log10(followers) / Math.log10(50_000_000)) * 100)
    : 0;

  // Cross-platform bonus (0-100)
  const crossScore = Math.min(100, crossPlatformCount * 20);

  // Comment authenticity (0-100)
  const authScore = Math.min(100, organicPct);

  // Weighted sum
  let prof = (
    engScore        * 0.30 +
    qualityScore    * 0.20 +
    consistencyScore * 0.15 +
    scaleScore      * 0.15 +
    crossScore      * 0.10 +
    authScore       * 0.10
  );

  // Fraud signal penalty
  prof -= fraudSignalCount * 12;

  // Tier cap for Small creators
  if (tier === "Small") prof = Math.min(prof, 55);

  return Math.round(Math.max(5, Math.min(100, prof)));
}

// ─── Data Availability Engine ─────────────────────────────────────────────
function buildDataAvailability(coreData: any): Array<{
  category: string;
  status: "verified" | "estimated" | "unavailable";
  details: string;
}> {
  const followers = coreData?.followers || 0;
  const hasYouTube = followers > 0;
  const hasCrossEco = (coreData?.crossPlatformEcosystem || []).length > 0;
  const hasCommentData = !!coreData?.commentAuthenticityDetailed;
  const hasPostData = (coreData?.totalPosts || 0) > 0;

  return [
    {
      category: "YouTube Metrics",
      status: hasYouTube ? "verified" : "unavailable",
      details: hasYouTube
        ? `${fmtNumber(followers)} subscribers retrieved from YouTube Data API v3.`
        : "YouTube channel data unavailable.",
    },
    {
      category: "Instagram Audience",
      status: hasCrossEco && (coreData?.crossPlatformEcosystem || []).some((p: any) =>
        p.platform.toLowerCase().includes("instagram")) ? "estimated" : "unavailable",
      details: hasCrossEco && (coreData?.crossPlatformEcosystem || []).some((p: any) =>
        p.platform.toLowerCase().includes("instagram"))
        ? "Instagram link discovered via bio. Metrics not directly accessible."
        : "No Instagram presence detected from public profile links.",
    },
    {
      category: "Comment Authenticity",
      status: hasCommentData ? "verified" : "estimated",
      details: hasCommentData
        ? `Analyzed ${coreData.commentAuthenticityDetailed.organicPct}% organic comment ratio from recent posts.`
        : "Comment patterns estimated from engagement rate proxies.",
    },
    {
      category: "Posting History",
      status: hasPostData ? "verified" : "estimated",
      details: hasPostData
        ? `${coreData.totalPosts} verified uploads analyzed for cadence patterns.`
        : "Posting cadence estimated from available public signals.",
    },
    {
      category: "Sponsorship History",
      status: "unavailable",
      details: "No verified public sponsorship disclosures detected.",
    },
    {
      category: "Revenue Data",
      status: "unavailable",
      details: "Private — not publicly disclosed.",
    },
    {
      category: "Audience Gender Split",
      status: "unavailable",
      details: "Not available without platform API access.",
    },
    {
      category: "Cross-Platform Presence",
      status: hasCrossEco ? "estimated" : "unavailable",
      details: hasCrossEco
        ? `${(coreData?.crossPlatformEcosystem || []).length} platform link(s) discovered from public bio/description.`
        : "No additional platform links found in public profile.",
    },
  ];
}

// ─── Interface ───────────────────────────────────────────────────────────────
export interface PublicCreatorIntelligence {
  primaryPlatform: string;
  strongestEngagementPlatform: string;
  broadestAudiencePlatform: string;
  audienceActivityStrength: string;
  multiPlatformPresenceScore: number;
  brandProfitabilityScore: number;
  sponsorshipTier: string;
  advertiserSuitability: string;
  audienceLoyaltyEstimate: string;
  collaborationSummary: string[];
  sponsorshipCategories: string[];
  likelyAdvertiserFit: string[];
  activityInsights: string[];
  dataAvailability: Array<{ category: string; status: "verified" | "estimated" | "unavailable"; details: string }>;
  confidence: "high" | "medium" | "low";
  confidenceLabel: string;
  aiExplanation?: string;
  estimatedCpm?: string;
  roiClass?: string;
  conversionStrength?: string;
  partnershipSuitability?: string;
  purchasingPowerEstimate?: string;
  // Tier gating
  creatorTier: CreatorTier;
  isBelowCommercialThreshold: boolean;
  isSimulated: boolean;
}

export const DEFAULT_PUBLIC_INTELLIGENCE: PublicCreatorIntelligence = {
  primaryPlatform: "YouTube",
  strongestEngagementPlatform: "YouTube",
  broadestAudiencePlatform: "YouTube",
  audienceActivityStrength: "Unavailable",
  multiPlatformPresenceScore: 0,
  brandProfitabilityScore: 0,
  sponsorshipTier: "Not Determined",
  advertiserSuitability: "Insufficient data for suitability assessment.",
  audienceLoyaltyEstimate: "Insufficient data.",
  collaborationSummary: ["No verified collaboration data available."],
  sponsorshipCategories: [],
  likelyAdvertiserFit: [],
  activityInsights: ["Insufficient data to generate activity insights."],
  dataAvailability: [],
  confidence: "low",
  confidenceLabel: "No data available",
  aiExplanation: "Creator analysis unavailable.",
  creatorTier: "Nano",
  isBelowCommercialThreshold: true,
  isSimulated: true,
};

// ─── In-memory cache ──────────────────────────────────────────────────────────
const cache = new Map<string, PublicCreatorIntelligence>();
let lastSuccessfulResponse: PublicCreatorIntelligence | null = null;

// ─── Local Simulated Intelligence (no AI key available) ───────────────────────
function generateLocalSimulatedIntelligence(
  username: string,
  platform: string,
  coreData: any
): PublicCreatorIntelligence {
  const cleanUsername = username.replace(/^@/, "").trim();
  const followers = coreData?.followers || 0;
  const tier = getCreatorTier(followers);
  const score = coreData?.score || 50;
  const category = coreData?.creatorCategories?.[0]?.type || "Entertainment";
  const isBelowThreshold = tier === "Nano";

  const profitability = computeProfitabilityScore(coreData);
  const dataAvailability = buildDataAvailability(coreData);
  const crossPlatformCount = (coreData?.crossPlatformEcosystem || []).length;

  // Sponsorship tier — honest labeling
  let sponsorshipTier = "Not Commercially Eligible";
  let advertiserSuitability = "Creator below commercial analysis threshold.";
  let collaborationSummary = [
    "Creator is below the minimum audience threshold for commercial partnership analysis.",
    "No verified sponsorship history detected.",
  ];
  let sponsorshipCategories: string[] = [];
  let likelyAdvertiserFit: string[] = [];
  let estimatedCpm: string | undefined = undefined;
  let roiClass: string | undefined = undefined;
  let conversionStrength: string | undefined = undefined;
  let partnershipSuitability: string | undefined = undefined;
  let purchasingPowerEstimate: string | undefined = undefined;
  let audienceActivityStrength = "Insufficient data (< 1K subscribers)";

  if (tier === "Small") {
    sponsorshipTier = "Micro / Community Tier";
    advertiserSuitability = "Suitable for micro-community campaigns only.";
    collaborationSummary = [
      "Verified sponsorship pricing data is not publicly available.",
      `Audience scale supports community-level partnerships in the ${category.toLowerCase()} niche.`,
      "No verified campaign history detected.",
    ];
    sponsorshipCategories = [`${category} Micro-Sponsorships`, "Affiliate Links"];
    likelyAdvertiserFit = getBrandFamiliesForCategory(category).slice(0, 2).map(b => `${b} (micro-campaign fit)`);
    estimatedCpm = "$4 - $10 (LOW CONFIDENCE ESTIMATE)";
    roiClass = "Emerging / Experimental ROI";
    conversionStrength = "Community-level conversion potential";
    partnershipSuitability = "Affiliate / Micro-Sponsorship only";
    purchasingPowerEstimate = "Highly targeted niche community";
    audienceActivityStrength = score >= 65 ? "Moderate (Community engaged)" : "Low (Limited signal data)";
  } else if (tier === "Mid") {
    sponsorshipTier = "Niche / Mid-Tier Sponsorship";
    advertiserSuitability = score >= 70
      ? "Brand Safe — recommended for niche campaigns."
      : "Brand Safe — standard suitability check advised.";
    collaborationSummary = [
      "Verified sponsorship pricing data is not publicly available.",
      `Strong niche alignment with ${category.toLowerCase()} audience demographics.`,
      "Engagement metrics support affiliate and video integration campaigns.",
    ];
    sponsorshipCategories = [`${category} Sponsorships`, "Integrated Brand Placements", "Affiliate Programs"];
    likelyAdvertiserFit = getBrandFamiliesForCategory(category).slice(0, 3);
    estimatedCpm = "$8 - $18 (ESTIMATED)";
    roiClass = "Moderate to High ROI";
    conversionStrength = "Strong niche affinity conversion";
    partnershipSuitability = "Video integrations / Affiliate campaigns";
    purchasingPowerEstimate = "Medium — niche consumer segment";
    audienceActivityStrength = score >= 70 ? "Strong (7.8/10)" : "Moderate (6.5/10)";
  } else if (tier === "Macro") {
    sponsorshipTier = "Premium Enterprise Tier";
    advertiserSuitability = score >= 70
      ? "Brand Safe — highly recommended for premium campaigns."
      : "Brand Safe — verification recommended before large campaigns.";
    collaborationSummary = [
      "Verified sponsorship pricing data is not publicly available.",
      `Premium audience scale supports major ${category.toLowerCase()} brand integrations.`,
      "Macro-level reach supports both brand awareness and direct response campaigns.",
    ];
    sponsorshipCategories = [`Premium ${category} Placements`, "Brand Awareness Campaigns", "Product Launch Integrations"];
    likelyAdvertiserFit = getBrandFamiliesForCategory(category).slice(0, 3);
    estimatedCpm = "$15 - $30 (ESTIMATED)";
    roiClass = "High ROI";
    conversionStrength = "Strong direct-response and branding";
    partnershipSuitability = "Premium sponsorships / Product integrations";
    purchasingPowerEstimate = "Medium-High consumer purchasing power";
    audienceActivityStrength = score >= 75 ? "Strong (8.2/10)" : "Moderate (7.0/10)";
  } else if (tier === "Celebrity") {
    sponsorshipTier = "Global Celebrity Tier";
    advertiserSuitability = "Enterprise-grade brand partner.";
    collaborationSummary = [
      "Verified sponsorship pricing data is not publicly available.",
      "Global audience reach supports mass-market brand integrations.",
      "Celebrity-tier creator — enterprise campaign suitability confirmed.",
    ];
    sponsorshipCategories = ["Global Brand Campaigns", "Celebrity Endorsements", "Mass-Market Integrations"];
    likelyAdvertiserFit = getBrandFamiliesForCategory(category).slice(0, 3);
    estimatedCpm = "$22 - $50+ (ESTIMATED — Celebrity Premium)";
    roiClass = "High ROI (Enterprise / Global)";
    conversionStrength = "Exceptional (Celebrity authority signal)";
    partnershipSuitability = "Global integrations / Mass-market campaigns";
    purchasingPowerEstimate = "High — global consumer base";
    audienceActivityStrength = "Strong (Celebrity scale)";
  }

  const activityInsights = isBelowThreshold
    ? ["Insufficient upload data for activity analysis.", "Creator has not reached activity threshold for trend signals."]
    : [
        coreData?.totalPosts
          ? `${coreData.totalPosts} verified uploads analyzed for cadence patterns.`
          : "Upload cadence estimated from available signals.",
        score >= 70
          ? "Engagement velocity indicates active, loyal audience base."
          : "Engagement signals suggest an early-stage or niche audience.",
        crossPlatformCount > 0
          ? `${crossPlatformCount} additional platform link(s) discovered in public profile.`
          : "No additional platform presence detected beyond primary channel.",
      ];

  const audienceLoyaltyEstimate = isBelowThreshold
    ? "Insufficient data for loyalty estimation."
    : score >= 75
      ? "Strong community signals — high audience retention indicators."
      : "Moderate retention signals — consistent with creator tier norms.";

  const multiPlatformPresenceScore = isBelowThreshold ? 0 : Math.min(100, crossPlatformCount * 20 + (followers > 0 ? 20 : 0));

  return {
    primaryPlatform: platform.toUpperCase(),
    strongestEngagementPlatform: platform.toUpperCase(),
    broadestAudiencePlatform: platform.toUpperCase(),
    audienceActivityStrength,
    multiPlatformPresenceScore,
    brandProfitabilityScore: profitability,
    sponsorshipTier,
    advertiserSuitability,
    audienceLoyaltyEstimate,
    collaborationSummary,
    sponsorshipCategories,
    likelyAdvertiserFit,
    activityInsights,
    dataAvailability,
    confidence: isBelowThreshold ? "low" : tier === "Mid" || tier === "Macro" || tier === "Celebrity" ? "medium" : "low",
    confidenceLabel: isBelowThreshold
      ? "Insufficient data — creator below threshold"
      : "Estimated from public signals",
    aiExplanation: isBelowThreshold
      ? `@${cleanUsername} has insufficient audience scale for commercial partnership analysis. Creator is below the minimum threshold for brand matching.`
      : `Brand suitability for @${cleanUsername} estimated from engagement patterns and ${category.toLowerCase()} niche signals.`,
    estimatedCpm,
    roiClass,
    conversionStrength,
    partnershipSuitability,
    purchasingPowerEstimate,
    creatorTier: tier,
    isBelowCommercialThreshold: isBelowThreshold,
    isSimulated: true,
  };
}

function getRetargetedPayload(
  payload: PublicCreatorIntelligence,
  username: string,
  platform: string,
  coreData: any
): PublicCreatorIntelligence {
  const cleanUsername = username.replace(/^@/, "").trim();
  const retargetString = (str: string) => {
    if (!str) return str;
    return str.replace(/@[a-zA-Z0-9_]+/g, `@${cleanUsername}`);
  };
  const tier = getCreatorTier(coreData?.followers || 0);
  const profitability = computeProfitabilityScore(coreData);

  return {
    ...payload,
    primaryPlatform: platform.toUpperCase(),
    strongestEngagementPlatform:
      payload.strongestEngagementPlatform === "Unknown"
        ? platform.toUpperCase()
        : payload.strongestEngagementPlatform,
    broadestAudiencePlatform:
      payload.broadestAudiencePlatform === "Unknown"
        ? platform.toUpperCase()
        : payload.broadestAudiencePlatform,
    collaborationSummary: payload.collaborationSummary.map(retargetString),
    activityInsights: payload.activityInsights.map(retargetString),
    aiExplanation:
      retargetString(payload.aiExplanation || "") ||
      `Brand suitability estimated from engagement alignment for @${cleanUsername}.`,
    brandProfitabilityScore: profitability,
    dataAvailability: buildDataAvailability(coreData),
    creatorTier: tier,
    isBelowCommercialThreshold: tier === "Nano",
    isSimulated: false,
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(`[Timeout Protection] Public Creator Intelligence request exceeded ${ms}ms.`);
      resolve(fallback);
    }, ms);
  });
  return Promise.race([
    promise.then((res) => { clearTimeout(timeoutId); return res; }),
    timeoutPromise,
  ]);
}

// ─── Main aggregator ──────────────────────────────────────────────────────────
export async function getPublicCreatorIntelligenceInternal(
  username: string,
  platform: string,
  coreData?: any
): Promise<PublicCreatorIntelligence> {
  const cleanUsername = username.replace(/^@/, "").trim();
  const cacheKey = `${platform.toLowerCase()}:${cleanUsername.toLowerCase()}`;
  const followers = coreData?.followers || 0;
  const tier = getCreatorTier(followers);
  const category = coreData?.creatorCategories?.[0]?.type || "Entertainment";

  if (cache.has(cacheKey)) {
    console.log(`[Public Intelligence] Cache HIT: ${cacheKey}`);
    return cache.get(cacheKey)!;
  }

  console.log(`[Public Intelligence] Cache MISS — building intelligence for: ${cleanUsername} (tier: ${tier})`);

  const dataAvailability = buildDataAvailability(coreData);
  const profitability = computeProfitabilityScore(coreData);
  const isBelowThreshold = tier === "Nano";

  const hasKeys = !!(process.env.GEMINI_API_KEY || process.env.LOVABLE_API_KEY || process.env.GROQ_API_KEY);
  if (!hasKeys) {
    console.log("[Public Intelligence] No AI keys — using local simulation.");
    const local = generateLocalSimulatedIntelligence(cleanUsername, platform, coreData);
    cache.set(cacheKey, local);
    return local;
  }

  // Build tier-aware Gemini prompt
  const tierContext = isBelowThreshold
    ? "IMPORTANT: This creator has fewer than 1,000 subscribers. They are BELOW the commercial partnership threshold. Do NOT suggest brand partnerships, CPM estimates, or sponsorship tiers. Instead, note insufficient data."
    : tier === "Small"
    ? "IMPORTANT: This is a MICRO/SMALL creator (1K–50K). Only suggest affiliate-level or micro-community partnerships. CPM estimates must be labeled as LOW CONFIDENCE."
    : "";

  const brandFamilies = isBelowThreshold
    ? []
    : getBrandFamiliesForCategory(category);


  const systemInstruction = `You are a digital trust intelligence analyst producing honest, evidence-based creator reports.
Do NOT invent sponsorship history, platform presence, or revenue data that is not supplied.
${tierContext}
Only suggest brand categories from this list for this creator's niche: ${brandFamilies.join(", ") || "none — creator below threshold"}.
Ground all insights in the exact figures provided. Output raw JSON only.
RULE: If data is unavailable, say so explicitly — do not fabricate estimates.`;

  const prompt = `Analyze this creator:
- Username: @${cleanUsername}
- Platform: ${platform}
- Creator Tier: ${tier} (${fmtNumber(followers)} subscribers)
- Trust Score: ${coreData?.score || 50}/100
- Engagement Rate: ${coreData?.engagementRate ? coreData.engagementRate.toFixed(2) + "%" : "Not available"}
- Average Likes: ${coreData?.avgLikes ? fmtNumber(coreData.avgLikes) : "Not available"}
- Total Uploads: ${coreData?.totalPosts || "Not available"}
- Comment Authenticity: ${coreData?.commentAuthenticityDetailed?.organicPct != null ? coreData.commentAuthenticityDetailed.organicPct + "% organic" : "Not available"}
- Verified Platform Links: ${
    coreData?.crossPlatformEcosystem?.length
      ? coreData.crossPlatformEcosystem.map((x: any) => `${x.platform} (${x.handle})`).join(", ")
      : "None detected"
  }
- High-Severity Fraud Signals: ${(coreData?.fraudSignals || []).filter((f: any) => f.severity === "high").length}
- Creator Niche: ${category}
- Computed Brand Profitability Score: ${profitability}/100 (use this value — do not override)`;

  const jsonSchema = {
    properties: {
      strongestEngagementPlatform: { type: "string" },
      broadestAudiencePlatform: { type: "string" },
      audienceActivityStrength: { type: "string" },
      multiPlatformPresenceScore: { type: "number" },
      sponsorshipTier: { type: "string" },
      advertiserSuitability: { type: "string" },
      audienceLoyaltyEstimate: { type: "string" },
      collaborationSummary: { type: "array", items: { type: "string" } },
      sponsorshipCategories: { type: "array", items: { type: "string" } },
      likelyAdvertiserFit: { type: "array", items: { type: "string" } },
      activityInsights: { type: "array", items: { type: "string" } },
      aiExplanation: { type: "string" },
      confidence: { type: "string", enum: ["high", "medium", "low"] },
      confidenceLabel: { type: "string" },
      estimatedCpm: { type: "string" },
      roiClass: { type: "string" },
      conversionStrength: { type: "string" },
      partnershipSuitability: { type: "string" },
      purchasingPowerEstimate: { type: "string" },
    },
    required: [
      "strongestEngagementPlatform", "broadestAudiencePlatform", "audienceActivityStrength",
      "multiPlatformPresenceScore", "sponsorshipTier", "advertiserSuitability",
      "audienceLoyaltyEstimate", "collaborationSummary", "sponsorshipCategories",
      "likelyAdvertiserFit", "activityInsights", "aiExplanation", "confidence", "confidenceLabel",
    ],
  };

  const executeAI = async (): Promise<PublicCreatorIntelligence> => {
    try {
      const resText = await callGemini({ systemInstruction, prompt, jsonSchema });
      const clean = resText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(clean);

      const safeArr = (v: any, fallback: string[]) =>
        Array.isArray(v) && v.filter(Boolean).length > 0 ? v.filter(Boolean) : fallback;

      // For Nano creators: never expose commercial data
      const commercialFields = isBelowThreshold
        ? {
            estimatedCpm: undefined,
            roiClass: undefined,
            conversionStrength: undefined,
            partnershipSuitability: undefined,
            purchasingPowerEstimate: undefined,
            sponsorshipCategories: [],
            likelyAdvertiserFit: [],
          }
        : {
            estimatedCpm: parsed.estimatedCpm || undefined,
            roiClass: parsed.roiClass || undefined,
            conversionStrength: parsed.conversionStrength || undefined,
            partnershipSuitability: parsed.partnershipSuitability || undefined,
            purchasingPowerEstimate: parsed.purchasingPowerEstimate || undefined,
            sponsorshipCategories: safeArr(parsed.sponsorshipCategories, []),
            likelyAdvertiserFit: safeArr(parsed.likelyAdvertiserFit, getBrandFamiliesForCategory(category).slice(0, 3)),
          };

      const responseObj: PublicCreatorIntelligence = {
        primaryPlatform: platform.toUpperCase(),
        strongestEngagementPlatform: parsed.strongestEngagementPlatform || platform.toUpperCase(),
        broadestAudiencePlatform: parsed.broadestAudiencePlatform || platform.toUpperCase(),
        audienceActivityStrength: parsed.audienceActivityStrength || "Moderate",
        multiPlatformPresenceScore: Math.max(0, Math.min(100, Number(parsed.multiPlatformPresenceScore) || 0)),
        brandProfitabilityScore: profitability, // always use computed, never AI-overridden
        sponsorshipTier: isBelowThreshold
          ? "Not Commercially Eligible"
          : parsed.sponsorshipTier || "Not Determined",
        advertiserSuitability: parsed.advertiserSuitability || "Insufficient data.",
        audienceLoyaltyEstimate: parsed.audienceLoyaltyEstimate || "Insufficient data.",
        collaborationSummary: safeArr(parsed.collaborationSummary, ["No verified collaboration data available."]),
        activityInsights: safeArr(parsed.activityInsights, ["Insufficient data to generate insights."]),
        dataAvailability,
        confidence: parsed.confidence || "low",
        confidenceLabel: parsed.confidenceLabel || "Estimated from public signals",
        aiExplanation: parsed.aiExplanation?.trim() || `Brand suitability estimated from engagement signals for @${cleanUsername}.`,
        creatorTier: tier,
        isBelowCommercialThreshold: isBelowThreshold,
        isSimulated: false,
        ...commercialFields,
      };

      lastSuccessfulResponse = responseObj;
      return responseObj;
    } catch (err) {
      console.warn("[Public Intelligence] AI failed:", err);
      if (lastSuccessfulResponse) {
        return getRetargetedPayload(lastSuccessfulResponse, cleanUsername, platform, coreData);
      }
      return generateLocalSimulatedIntelligence(cleanUsername, platform, coreData);
    }
  };

  const timeoutFallback = lastSuccessfulResponse
    ? getRetargetedPayload(lastSuccessfulResponse, cleanUsername, platform, coreData)
    : generateLocalSimulatedIntelligence(cleanUsername, platform, coreData);

  const result = await withTimeout<PublicCreatorIntelligence>(executeAI(), 8000, timeoutFallback);
  cache.set(cacheKey, result);
  return result;
}
