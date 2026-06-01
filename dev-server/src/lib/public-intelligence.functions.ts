import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { loadEnv } from "./services/env.server";
import {
  DEFAULT_PUBLIC_INTELLIGENCE,
  getPublicCreatorIntelligenceInternal,
} from "./services/public-intelligence.server";

export const getPublicCreatorIntelligence = createServerFn({ method: "POST" })
  .inputValidator(z.any())
  .handler(async ({ data }) => {
    try {
      await loadEnv();
    } catch (e) {
      console.warn("[Public Intelligence] Environment loader failed:", e);
    }

    try {
      const rawData = data || {};
      const analysis = rawData.analysis || rawData;
      const coreData = rawData.coreData || analysis;
      
      const username = typeof analysis?.username === "string" 
        ? analysis.username 
        : typeof rawData.username === "string" 
          ? rawData.username 
          : "unknown";
          
      const platform = typeof analysis?.platform === "string" 
        ? analysis.platform 
        : typeof rawData.platform === "string" 
          ? rawData.platform 
          : "youtube";
          
      return await getPublicCreatorIntelligenceInternal(username, platform, coreData);
    } catch (error) {
      console.error("[Public Intelligence] getPublicCreatorIntelligence failed:", error);
      return DEFAULT_PUBLIC_INTELLIGENCE;
    }
  });

export const getCreatorCollaborationSummary = createServerFn({ method: "POST" })
  .inputValidator(z.any())
  .handler(async ({ data }) => {
    try {
      await loadEnv();
    } catch (e) {
      console.warn("[Public Intelligence] Environment loader failed:", e);
    }

    try {
      const rawData = data || {};
      const analysis = rawData.analysis || rawData;
      const coreData = rawData.coreData || analysis;
      const username = typeof analysis?.username === "string" ? analysis.username : typeof rawData.username === "string" ? rawData.username : "unknown";
      const platform = typeof analysis?.platform === "string" ? analysis.platform : typeof rawData.platform === "string" ? rawData.platform : "youtube";
      const intelligence = await getPublicCreatorIntelligenceInternal(username, platform, coreData);
      return {
        collaborationSummary: intelligence.collaborationSummary,
        aiExplanation: intelligence.aiExplanation ?? DEFAULT_PUBLIC_INTELLIGENCE.aiExplanation,
        confidence: intelligence.confidence,
      };
    } catch (error) {
      console.error("[Public Intelligence] getCreatorCollaborationSummary failed:", error);
      return {
        collaborationSummary: DEFAULT_PUBLIC_INTELLIGENCE.collaborationSummary,
        aiExplanation: DEFAULT_PUBLIC_INTELLIGENCE.aiExplanation,
        confidence: DEFAULT_PUBLIC_INTELLIGENCE.confidence,
      };
    }
  });

export const getBrandProfitabilityEstimate = createServerFn({ method: "POST" })
  .inputValidator(z.any())
  .handler(async ({ data }) => {
    try {
      await loadEnv();
    } catch (e) {
      console.warn("[Public Intelligence] Environment loader failed:", e);
    }

    try {
      const rawData = data || {};
      const analysis = rawData.analysis || rawData;
      const coreData = rawData.coreData || analysis;
      const username = typeof analysis?.username === "string" ? analysis.username : typeof rawData.username === "string" ? rawData.username : "unknown";
      const platform = typeof analysis?.platform === "string" ? analysis.platform : typeof rawData.platform === "string" ? rawData.platform : "youtube";
      const intelligence = await getPublicCreatorIntelligenceInternal(username, platform, coreData);
      return {
        brandProfitabilityScore: intelligence.brandProfitabilityScore,
        sponsorshipTier: intelligence.sponsorshipTier,
        confidence: intelligence.confidence,
      };
    } catch (error) {
      console.error("[Public Intelligence] getBrandProfitabilityEstimate failed:", error);
      return {
        brandProfitabilityScore: DEFAULT_PUBLIC_INTELLIGENCE.brandProfitabilityScore,
        sponsorshipTier: DEFAULT_PUBLIC_INTELLIGENCE.sponsorshipTier,
        confidence: DEFAULT_PUBLIC_INTELLIGENCE.confidence,
      };
    }
  });
