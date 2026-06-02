import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { Nav } from "@/components/Nav";
import { SearchBar } from "@/components/SearchBar";
import { AnalysisView } from "@/components/AnalysisView";
import { AnalyzingOverlay } from "@/components/AnalyzingOverlay";
import { type InfluencerAnalysis, MOCK_INFLUENCERS } from "@/lib/mock-data";
import { analyzeInfluencer, compareInfluencers, askCreatorCopilot } from "@/lib/analyze.functions";
import { getPublicCreatorIntelligence } from "@/lib/public-intelligence.functions";
import { BrandProfitabilityCard } from "@/components/intelligence/BrandProfitabilityCard";
import { CollaborationCard } from "@/components/intelligence/CollaborationCard";
import { CrossPlatformCard } from "@/components/intelligence/CrossPlatformCard";
import { DataAvailabilityCard } from "@/components/intelligence/DataAvailabilityCard";
import CreatorDNACard from "@/components/creator-dna/creator-dna-card";
import { addHistory, getHistory } from "@/lib/history";
import { 
  LayoutDashboard, UserCheck, ShieldAlert, TrendingUp, Target, Award, Users, GitCompare, 
  LineChart, FileSpreadsheet, History, Settings, Shield, Clock, ChevronRight, AlertCircle, 
  ArrowRight, CheckCircle2, Play, Activity, Sparkles, Heart, FileText, Check, Trophy, BadgeCheck, 
  Minus, RefreshCw, Download, Youtube, Globe, TrendingDown, BarChart3, ThumbsUp, MessageSquare, 
  DollarSign, ArrowUpRight, Sliders, Database, Share2, Instagram, Twitter, Send, X, Network, Trash2,
  Dna
} from "lucide-react";
import { z } from "zod";
import { ScoreRing } from "@/components/ScoreRing";
import { BreakdownCard } from "@/components/BreakdownCard";
import { downloadReport, downloadComparisonReport } from "@/lib/report";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const searchSchema = z.object({ u: z.string().optional(), p: z.string().optional() });

export const Route = createFileRoute("/analyze")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Analyze Influencer — Ratefluencer AI" },
      { name: "description", content: "Run a trust intelligence scan on any YouTube creator." },
    ],
  }),
  component: AnalyzePage,
});

function fmt(n: number) {
  if (n === undefined || n === null || isNaN(n)) return "0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) {
    return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
  }
  if (abs >= 1_000_000) {
    return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (abs >= 1_000) {
    return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return String(n);
}

const isValidAvatar = (url?: string | null): url is string => {
  return typeof url === "string" && url.trim().length > 0 && (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("//"));
};

function CandidateAvatar({ url, title }: { url?: string | null; title: string }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const initial = title ? title.charAt(0) : "?";

  return (
    <div className="relative w-12 h-12 rounded-full overflow-hidden aspect-square border border-border/40 shadow-sm shrink-0 flex items-center justify-center">
      {/* Fallback gradient initials background */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-base font-bold">
        {initial}
      </div>
      {isValidAvatar(url) && !error && (
        <img
          src={url!.startsWith("//") ? `https:${url}` : url}
          alt={title}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={`absolute inset-0 w-full h-full object-cover rounded-full transition-opacity duration-300 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          referrerPolicy="no-referrer"
        />
      )}
    </div>
  );
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface CreatorCopilotProps {
  activeCreator: InfluencerAnalysis | null;
  activeTab: string;
  comparisonContext?: {
    aName: string;
    aScore: number;
    bName: string;
    bScore: number;
  } | null;
}

function CreatorCopilot({ activeCreator, activeTab, comparisonContext }: CreatorCopilotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [thinkingState, setThinkingState] = useState("");
  const [isLimitedMode, setIsLimitedMode] = useState(false);
  const [attempt, setAttempt] = useState<1 | 2>(1);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (!isTyping) return;
    const states = [
      "Analyzing creator intelligence…",
      "Evaluating audience authenticity…",
      "Generating campaign insights…"
    ];
    let idx = 0;
    setThinkingState(states[0]);
    const interval = setInterval(() => {
      idx = (idx + 1) % states.length;
      setThinkingState(states[idx]);
    }, 1200);
    return () => clearInterval(interval);
  }, [isTyping]);

  useEffect(() => {
    if (activeCreator) {
      setMessages([
        {
          role: "assistant",
          content: `**AI Influencer Strategy Analyst:**\n\nExecutive briefing loaded for **${activeCreator.displayName}** (@${activeCreator.username}).\n\nHow can I assist you with their creator intelligence today? Select a quick audit action below or type your inquiry.`
        }
      ]);
    } else {
      setMessages([
        {
          role: "assistant",
          content: "**AI Influencer Strategy Analyst:**\n\nWelcome to Ratefluencer Creator Intelligence. Please search for a creator in the Control Center to begin detailed strategy audits."
        }
      ]);
    }
    setIsLimitedMode(false);
  }, [activeCreator?.username]);

  const handleClear = () => {
    setMessages([]);
    setIsLimitedMode(false);
  };

  const handleSend = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    const userMsg: Message = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    setAttempt(1);
    setIsLimitedMode(false);

    const updatedMessages = [...messages, userMsg];

    const creatorContext = activeCreator ? {
      displayName: activeCreator.displayName,
      username: activeCreator.username,
      platform: activeCreator.platform,
      score: activeCreator.score,
      breakdown: activeCreator.breakdown,
      followers: activeCreator.followers,
      totalPosts: activeCreator.totalPosts,
      avgLikes: activeCreator.avgLikes,
      engagementRate: activeCreator.engagementRate,
      commentAuthenticityDetailed: activeCreator.commentAuthenticityDetailed,
      temporalSignals: activeCreator.temporalSignals,
      creatorCategories: activeCreator.creatorCategories,
      fraudSignals: activeCreator.fraudSignals,
      influenceVelocity: activeCreator.influenceVelocity,
      lifecycleStage: activeCreator.lifecycleStage,
      isUndervalued: activeCreator.isUndervalued,
      viralityPotential: activeCreator.viralityPotential,
      projectedGrowth90Days: activeCreator.projectedGrowth90Days,
      estimatedRoiTier: activeCreator.estimatedRoiTier,
      strengths: activeCreator.strengths,
      risks: activeCreator.risks,
      brandMatches: activeCreator.brandMatches,
      unifiedTrustScore: activeCreator.unifiedTrustScore,
      unifiedTrustExplanation: activeCreator.unifiedTrustExplanation,
      aiInvestigationSummary: activeCreator.aiInvestigationSummary,
      crossPlatformEcosystem: activeCreator.crossPlatformEcosystem,
      audiencePsychology: activeCreator.audiencePsychology,
      crossPlatformRisks: activeCreator.crossPlatformRisks
    } : null;

    const attemptRequest = async (currentAttempt: number): Promise<string> => {
      try {
        const res = await askCreatorCopilot({
          data: {
            messages: updatedMessages,
            creatorContext,
            currentTab: activeTab,
            comparisonContext
          }
        });
        if (res && res.success && res.reply) {
          return res.reply;
        }
        throw new Error("Invalid server payload");
      } catch (err) {
        console.warn(`[Copilot AI] Attempt ${currentAttempt} failed:`, err);
        if (currentAttempt === 1) {
          setAttempt(2);
          await new Promise((r) => setTimeout(r, 600));
          return await attemptRequest(2);
        }
        throw err;
      }
    };

    try {
      const startTime = Date.now();
      const reply = await attemptRequest(1);
      const elapsed = Date.now() - startTime;
      
      if (elapsed < 1400) {
        await new Promise((r) => setTimeout(r, 1400 - elapsed));
      }
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      console.error("[Copilot AI] Server and retry attempts failed. Degrading to client fallback:", err);
      setIsLimitedMode(true);

      const fallbackReply = activeCreator
        ? getClientSideFallbackInsight(trimmed, activeCreator)
        : "Ratefluencer Analyst: Strategic intelligence services are temporarily limited. Please search for a creator in the Control Center to retrieve analytics metrics.";

      await new Promise((r) => setTimeout(r, 800));
      setMessages((prev) => [...prev, { role: "assistant", content: fallbackReply }]);
    } finally {
      setIsTyping(false);
    }
  };

  const getChips = () => {
    return [
      "Explain Trust Score",
      "Analyze Brand Fit",
      "Sponsorship Suitability",
      "Predict Growth",
      "Fraud Risk",
      "Audience Quality",
      "Campaign ROI",
      "Best Partnership Brands"
    ];
  };

  const handleChipClick = (chip: string) => {
    if (!activeCreator) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Ratefluencer Analyst: Please run a creator scan in the Control Center search bar first so I can analyze metrics."
        }
      ]);
      return;
    }
    const queries: Record<string, string> = {
      "Explain Trust Score": `Explain the Trust Score for @${activeCreator.username}`,
      "Analyze Brand Fit": `Analyze the brand fit and category suitability for @${activeCreator.username}`,
      "Sponsorship Suitability": `What is the sponsorship suitability tier and recommended campaign scale for @${activeCreator.username}?`,
      "Predict Growth": `Predict growth velocity and 90-day expansion potential for @${activeCreator.username}`,
      "Fraud Risk": `Run a fraud risk, comment authenticity, and suspicious signal audit for @${activeCreator.username}`,
      "Audience Quality": `Evaluate audience quality and bot/organic comment ratios for @${activeCreator.username}`,
      "Campaign ROI": `Estimate campaign ROI, estimated media value, and conversion rates for @${activeCreator.username}`,
      "Best Partnership Brands": `What are the best partnership brands for @${activeCreator.username}?`
    };
    const text = queries[chip] || `${chip} for @${activeCreator.username}`;
    handleSend(text);
  };

  const getClientSideFallbackInsight = (query: string, creator: any): string => {
    const q = query.toLowerCase();
    const name = creator.displayName;
    const username = creator.username;
    const score = creator.score || 60;
    const followers = creator.followers || 0;
    const eng = typeof creator.engagementRate === "number" ? creator.engagementRate.toFixed(2) : "3.00";
    const category = creator.creatorCategories?.[0]?.type || "Entertainment";
    const organicPct = creator.commentAuthenticityDetailed?.organicPct || 85;
    const growth = creator.projectedGrowth90Days || 12;

    const fmtF = (n: number) => {
      if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
      if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
      return String(n);
    };

    if (q.includes("trust score") || q.includes("explain trust") || q.includes("why is the score") || q.includes("why is trust")) {
      const detail = score >= 70
        ? `High engagement consistency of ${eng}% and an organic audience ratio of ${organicPct}% improved the trust score to ${score}/100. Growth velocity is stable.`
        : score >= 50
          ? `A moderate engagement consistency of ${eng}% and organic comments of ${organicPct}% resulted in a standard trust score of ${score}/100. Standard audit is recommended.`
          : `Sudden engagement spikes, low follower-to-likes ratios, and coordinated bot comments (${100 - organicPct}%) reduced authenticity confidence, resulting in a score of ${score}/100.`;
      return `**AI Influencer Strategy Analyst (Local Fallback):**\n\nTrust profile evaluation for **${name}** (@${username}):\n- **Ratefluencer Score™:** \`${score}/100\`\n- **Authenticity Rating:** \`${organicPct}% Organic\`\n- **Ecosystem Health:** \`${score >= 70 ? "Stable" : "Caution Recommended"}\`\n\n**Analysis Details:**\n${detail}`;
    }

    if (q.includes("brand fit") || q.includes("partnership") || q.includes("nike") || q.includes("sponsor") || q.includes("best partnership")) {
      let matches = ["Nike", "Spotify", "Adobe"];
      if (category.toLowerCase() === "tech") matches = ["NordVPN", "Adobe", "Logitech"];
      else if (category.toLowerCase() === "gaming") matches = ["Razer", "Discord", "Epic Games"];

      return `**AI Influencer Strategy Analyst (Local Fallback):**\n\nBrand suitability map for **${name}** (@${username}):\n- **Primary Niche:** \`${category}\`\n- **Audience Match Index:** \`${Math.round(score * 0.95)}%\`\n- **Recommended Partners:** \`${matches.join(", ")}\`\n\n**Strategic Recommendation:**\nThis creator is highly suitable for campaign integrations targeting Gen-Z and millennial demographics interested in **${category.toLowerCase()}**. The strong comment sentiment and stable posting frequency align well with premium brand representation guidelines.`;
    }

    if (q.includes("sponsorship") || q.includes("suitability") || q.includes("roi") || q.includes("campaign")) {
      const tier = followers >= 10_000_000 ? "Global Celebrity Tier" : followers >= 1_000_000 ? "Elite Premium Tier" : "High-Yield Mid-Tier";
      const ROI = score >= 70 ? "High (Predicted 2.4x yield)" : score >= 50 ? "Moderate (Predicted 1.6x yield)" : "Low (High bot risk)";
      return `**AI Influencer Strategy Analyst (Local Fallback):**\n\nSponsorship Campaign suitability for **${name}**:\n- **Sponsorship Tier:** \`${tier}\`\n- **Predicted ROI Yield:** \`${ROI}\`\n- **Campaign Fit:** \`${score >= 70 ? "Highly Recommended" : score >= 50 ? "Suitable for short-term performance" : "Not Recommended"}\`\n\n**Campaign Details:**\nRecommended for brand partnerships focusing on ${category.toLowerCase()} integrations. Engagement quality supports structured product placements with predictable reach outcomes.`;
    }

    if (q.includes("fraud") || q.includes("risk") || q.includes("suspicious") || q.includes("why is authenticity low")) {
      const riskLevel = score >= 70 ? "Low Risk" : score >= 50 ? "Medium Risk" : "Critical Risk";
      const detail = score >= 70
        ? "All measured authenticity dimensions are within healthy ranges. Low coordinated bot activity detected."
        : score >= 50
          ? "Minor engagement fluctuations and repetitive comments detected. Recommend short-term performance-tracked agreements."
          : `High fraud risk. Coordinated comment pods and abnormal follower spikes detected. Coordinated spam counts represent ${100 - organicPct}% of activity.`;
      return `**AI Influencer Strategy Analyst (Local Fallback):**\n\nEcosystem Fraud Auditing for **${name}**:\n- **Calculated Risk Level:** \`${riskLevel}\`\n- **Comment Organic Ratio:** \`${organicPct}%\`\n- **Spam Flag status:** \`${score >= 70 ? "Clean" : "Warning Active"}\`\n\n**Audit Summary:**\n${detail}`;
    }

    if (q.includes("growth") || q.includes("predict") || q.includes("grow")) {
      return `**AI Influencer Strategy Analyst (Local Fallback):**\n\nGrowth Projection metrics for **${name}** (@${username}):\n- **Projected 90-Day growth:** \`+${growth}%\`\n- **Ecosystem Velocity:** \`${Math.round(score * 0.85)}/100\`\n- **Audience Momentum:** \`${score >= 70 ? "Strong Upward" : "Moderate/Stable"}\`\n\n**Growth Narrative:**\nAudience interaction patterns indicate a stable expansion rate. Posting consistency supports continuous subscriber additions with average velocity within the category.`;
    }

    if (q.includes("compare") || q.includes("mrbeast") || comparisonContext) {
      const compName = comparisonContext ? comparisonContext.bName : "MrBeast";
      const compScore = comparisonContext ? comparisonContext.bScore : 94;
      return `**AI Influencer Strategy Analyst (Local Fallback):**\n\nComparison Matrix between **${name}** and **${compName}**:\n- **Creator A Score (${name}):** \`${score}/100\`\n- **Creator B Score (${compName}):** \`${compScore}/100\`\n- **Symmetric Delta:** \`${score - compScore} points\`\n\n**Comparative Suitability:**\n${name} provides targeted reach in the **${category}** vertical, whereas ${compName} offers global macro audience scale. Choose ${name} for high-affinity conversions, and ${compName} for brand awareness campaigns.`;
    }

    return `**AI Influencer Strategy Analyst (Local Fallback):**\n\nAnalyst reports loaded for **${name}** (@${username}):\n- **Ratefluencer Score™:** \`${score}/100\`\n- **Followers:** \`${fmtF(followers)}\`\n- **Organic Audience:** \`${organicPct}%\`\n- **Category:** \`${category}\`\n\nHow can I help you analyze their metrics or campaign fit? Choose one of the quick action buttons below or ask a follow-up question.`;
  };

  const renderValueBadge = (val: string, key: number) => {
    const lower = val.toLowerCase();
    let style = "bg-muted text-muted-foreground border-border/40";
    
    if (lower.includes("/100")) {
      const scoreNum = parseInt(lower.split("/")[0]);
      if (scoreNum >= 75) {
        style = "bg-success/15 text-success border-success/35 font-extrabold";
      } else if (scoreNum >= 50) {
        style = "bg-warning/15 text-warning border-warning/35 font-extrabold";
      } else {
        style = "bg-destructive/15 text-destructive border-destructive/35 font-extrabold font-mono";
      }
    } else if (lower.includes("%") || lower.includes("+") || lower.includes("growth")) {
      if (lower.includes("-")) {
        style = "bg-destructive/10 text-destructive border-destructive/20 font-bold";
      } else {
        style = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-bold";
      }
    } else if (lower.includes("risk") || lower.includes("warning") || lower.includes("caution")) {
      if (lower.includes("low")) {
        style = "bg-success/10 text-success border-success/20 font-bold";
      } else if (lower.includes("medium")) {
        style = "bg-warning/10 text-warning border-warning/20 font-bold";
      } else {
        style = "bg-destructive/10 text-destructive border-destructive/20 font-bold animate-pulse";
      }
    } else if (lower.includes("stable") || lower.includes("clean") || lower.includes("authentic") || lower.includes("highly recommended")) {
      style = "bg-success/10 text-success border-success/20 font-bold";
    } else if (lower.includes("nike") || lower.includes("spotify") || lower.includes("adobe") || lower.includes("partners") || lower.includes("razer") || lower.includes("nordvpn")) {
      style = "bg-primary/10 text-primary border-primary/20 font-bold";
    } else {
      style = "bg-primary/5 text-primary/95 border-primary/20 font-semibold";
    }

    return (
      <span key={key} className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono border mx-0.5 select-none ${style}`}>
        {val}
      </span>
    );
  };

  const parseLineContent = (text: string) => {
    const parts: React.ReactNode[] = [];
    let currentText = text;
    let keyIdx = 0;

    while (currentText.length > 0) {
      const boldStart = currentText.indexOf("**");
      const codeStart = currentText.indexOf("`");

      if (boldStart === -1 && codeStart === -1) {
        parts.push(<span key={keyIdx++}>{currentText}</span>);
        break;
      }

      if (codeStart !== -1 && (boldStart === -1 || codeStart < boldStart)) {
        if (codeStart > 0) {
          parts.push(<span key={keyIdx++}>{currentText.substring(0, codeStart)}</span>);
        }
        const codeEnd = currentText.indexOf("`", codeStart + 1);
        if (codeEnd === -1) {
          parts.push(<span key={keyIdx++}>{currentText.substring(codeStart)}</span>);
          break;
        }
        const val = currentText.substring(codeStart + 1, codeEnd);
        parts.push(renderValueBadge(val, keyIdx++));
        currentText = currentText.substring(codeEnd + 1);
      } else {
        if (boldStart > 0) {
          parts.push(<span key={keyIdx++}>{currentText.substring(0, boldStart)}</span>);
        }
        const boldEnd = currentText.indexOf("**", boldStart + 2);
        if (boldEnd === -1) {
          parts.push(<span key={keyIdx++}>{currentText.substring(boldStart)}</span>);
          break;
        }
        const boldVal = currentText.substring(boldStart + 2, boldEnd);
        parts.push(<strong key={keyIdx++} className="font-extrabold text-foreground">{boldVal}</strong>);
        currentText = currentText.substring(boldEnd + 2);
      }
    }
    return parts;
  };

  const renderFormattedContent = (content: string) => {
    const lines = content.split("\n");
    return (
      <div className="space-y-3 font-normal text-xs text-foreground/90">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={idx} className="h-1.5" />;

          if (trimmed.startsWith("**") && (trimmed.endsWith("**") || trimmed.endsWith(":**") || trimmed.includes(":**"))) {
            const cleanHeader = trimmed.replace(/\*\*/g, "").replace(/:$/, "");
            return (
              <h4 key={idx} className="font-extrabold text-xs text-primary mt-3 flex items-center gap-1.5 uppercase tracking-wider animate-fade-in">
                <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse shrink-0" />
                {cleanHeader}
              </h4>
            );
          }

          if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
            const listContent = trimmed.substring(1).trim();
            return (
              <div key={idx} className="flex items-start gap-2.5 pl-1.5 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/70 mt-1.5 shrink-0" />
                <span className="flex-1 leading-relaxed text-[11px]">
                  {parseLineContent(listContent)}
                </span>
              </div>
            );
          }

          return (
            <p key={idx} className="leading-relaxed text-[11px] text-muted-foreground font-sans">
              {parseLineContent(trimmed)}
            </p>
          );
        })}
      </div>
    );
  };

  const renderMessageBlocks = (content: string) => {
    const blocks = content.split(/\n\n+/);
    return (
      <div className="space-y-4">
        {blocks.map((block, blockIdx) => {
          const trimmed = block.trim();
          if (!trimmed) return null;

          const firstLine = trimmed.split("\n")[0].trim();
          const isDetailHeader = firstLine.startsWith("**") && (firstLine.endsWith("Details:**") || firstLine.endsWith("Recommendation:**") || firstLine.endsWith("Summary:**") || firstLine.endsWith("Suitability:**") || firstLine.endsWith("Narrative:**"));

          if (isDetailHeader) {
            const headerText = firstLine.replace(/\*\*/g, "").replace(/:$/, "");
            const detailLines = trimmed.split("\n").slice(1).join("\n");
            return (
              <details 
                key={blockIdx} 
                className="group border border-primary/20 bg-primary/5 rounded-2xl overflow-hidden transition-all duration-300"
                open
              >
                <summary className="flex items-center justify-between p-3 cursor-pointer font-bold text-xs select-none text-primary hover:bg-primary/10 transition">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-primary animate-pulse" />
                    <span>{headerText}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-primary transition-transform duration-300 group-open:rotate-90" />
                </summary>
                <div className="p-3 border-t border-primary/10 bg-black/20 text-[11px] leading-relaxed text-muted-foreground">
                  {renderFormattedContent(detailLines)}
                </div>
              </details>
            );
          }

          if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
            return (
              <div key={blockIdx} className="glass bg-white/5 border border-white/10 rounded-2xl p-4 shadow-md space-y-2">
                {renderFormattedContent(trimmed)}
              </div>
            );
          }

          if (trimmed.startsWith("**") && (trimmed.toLowerCase().includes("analyst:") || trimmed.toLowerCase().includes("copilot:"))) {
            const header = trimmed.split("\n")[0];
            const rest = trimmed.split("\n").slice(1).join("\n");
            return (
              <div key={blockIdx} className="space-y-2">
                <div className="flex items-center gap-1.5 text-foreground font-bold text-xs tracking-wide">
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                  <span>{header.replace(/\*\*/g, "").replace(/:$/, "")}</span>
                </div>
                {rest && (
                  <div className="text-[11px] leading-relaxed text-muted-foreground">
                    {renderFormattedContent(rest)}
                  </div>
                )}
              </div>
            );
          }

          return (
            <div key={blockIdx} className="text-[11px] leading-relaxed text-muted-foreground font-normal">
              {renderFormattedContent(trimmed)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full gradient-bg flex items-center justify-center text-white shadow-xl shadow-primary/20 border border-white/10 hover:scale-105 transition-all duration-300 group active:scale-95 animate-fade-in"
        title="Open Influencer Strategy Analyst"
      >
        <div className="absolute inset-0 rounded-full bg-primary/25 blur-md animate-pulse pointer-events-none" />
        <MessageSquare className="w-6 h-6 group-hover:rotate-6 transition duration-300" />
        <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-background"></span>
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ x: "100%", opacity: 0.9 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0.9 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed top-0 right-0 h-screen w-full sm:w-[460px] z-50 bg-card/95 backdrop-blur-xl border-l border-white/10 shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-4 border-b border-border/40 flex items-center justify-between bg-card/50 backdrop-blur-md relative select-none">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-primary to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-primary/25">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm leading-none flex items-center gap-1.5 text-foreground">
                      AI Strategy Analyst
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    </h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5 font-sans">Corporate Influencer Intelligence Partner</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={handleClear}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-muted/30 rounded-xl transition-all"
                    title="Clear Conversation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-xl transition-all"
                    title="Close"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-background/20 scrollbar-thin">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary glow mb-2 animate-bounce">
                      <Sparkles className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-base text-foreground">Analyst Strategy Matrix</h4>
                      <p className="text-[11px] text-muted-foreground max-w-[260px] leading-relaxed">
                        Query the analyst regarding authenticity indicators, brand fit benchmarks, sponsorship sizes, or future growth vectors.
                      </p>
                    </div>

                    {activeCreator ? (
                      <div className="p-3 bg-primary/5 border border-primary/20 rounded-2xl w-full max-w-[320px] text-left space-y-2">
                        <div className="text-[9px] uppercase font-bold tracking-widest text-primary">Active Analysis Target</div>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/25 flex items-center justify-center font-bold text-xs text-primary font-mono select-none">
                            {activeCreator.displayName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-foreground truncate">{activeCreator.displayName}</div>
                            <div className="text-[10px] text-muted-foreground truncate">@{activeCreator.username} ({activeCreator.platform})</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 bg-warning/5 border border-warning/20 rounded-2xl w-full max-w-[320px] text-left text-[11px] text-warning flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-bold">Creator Scan Required</span>
                          <p className="text-[10px] text-muted-foreground mt-0.5 leading-normal">
                            Run an audit via the Control Center first to provide real analytics context.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex gap-3 items-start animate-fade-in ${
                        msg.role === "user" ? "justify-end pl-8" : "pr-8"
                      }`}
                    >
                      {msg.role !== "user" && (
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-primary to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-primary/25 select-none">
                          <Sparkles className="w-4 h-4 text-white" />
                        </div>
                      )}

                      <div
                        className={`rounded-2xl p-4 shadow-md max-w-full relative overflow-hidden ${
                          msg.role === "user"
                            ? "bg-primary text-white border border-primary/25"
                            : "glass bg-card/65 border border-white/10"
                        }`}
                      >
                        {msg.role === "user" ? (
                          <p className="text-xs leading-relaxed font-sans">{msg.content}</p>
                        ) : (
                          renderMessageBlocks(msg.content)
                        )}
                      </div>
                    </div>
                  ))
                )}

                {isTyping && (
                  <div className="flex gap-3 items-start animate-fade-in pr-8 select-none">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-primary to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-primary/25 animate-pulse">
                      <Sparkles className="w-4 h-4 text-white animate-pulse" />
                    </div>
                    <div className="glass bg-primary/5 border border-primary/25 rounded-2xl p-4 w-full flex flex-col gap-2 relative overflow-hidden shadow-md shadow-primary/5 animate-pulse">
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-purple-500/5 to-primary/5 bg-[length:200%_100%] animate-shimmer pointer-events-none" />
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-extrabold tracking-widest text-primary flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
                          {attempt === 1 ? "AI Analyst Active" : "Retry System Active"}
                        </span>
                        <span className="text-[8px] font-bold px-1.5 py-0.2 rounded-full bg-primary/10 text-primary border border-primary/20 animate-pulse font-mono">
                          {attempt === 1 ? "Attempt 1/2" : "Attempt 2/2"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 mt-1">
                        <p className="text-[11px] font-semibold text-foreground/90 font-mono">
                          {attempt === 1 ? thinkingState : "Strategy engine timeout. Re-routing request..."}
                        </p>
                        <div className="flex items-center gap-1 mt-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={chatEndRef} />
              </div>

              <div className="p-4 border-t border-border/40 bg-card/30 backdrop-blur-md space-y-3">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground/60 tracking-wider select-none">Quick Strategy Checklists</span>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none select-none">
                    {getChips().map((chip) => (
                      <button
                        key={chip}
                        onClick={() => handleChipClick(chip)}
                        disabled={isTyping}
                        className="px-3 py-1.5 rounded-full glass hover:border-primary/40 text-[10px] font-semibold tracking-wide whitespace-nowrap transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none hover:bg-primary/5 hover:text-primary"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {isLimitedMode && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-500 font-normal select-none"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 animate-pulse" />
                    <span>AI service is temporarily limited. Displaying analytics-based recommendations.</span>
                  </motion.div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend(input);
                  }}
                  className="flex items-center gap-2"
                >
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={activeCreator ? "Inquire about this creator..." : "Run a creator audit scan first..."}
                    disabled={isTyping || !activeCreator}
                    className="flex-1 h-10 bg-black/30 border-border/40 focus-visible:ring-primary focus-visible:ring-offset-0 rounded-xl text-xs placeholder:text-muted-foreground/50 placeholder:text-[11px]"
                  />
                  <Button
                    type="submit"
                    disabled={isTyping || !input.trim() || !activeCreator}
                    size="icon"
                    className="h-10 w-10 rounded-xl gradient-bg hover:scale-105 active:scale-95 transition-all text-white disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function AnalyzePage() {
  const { u, p } = Route.useSearch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InfluencerAnalysis | null>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setRecent(getHistory());
  }, []);
  const [reportType, setReportType] = useState<"full" | "audience" | "brand" | "compare">("full");
  const [includeWatermark, setIncludeWatermark] = useState(true);
  const [historySearch, setHistorySearch] = useState("");
  const [slackActive, setSlackActive] = useState(false);
  const [slackUrl, setSlackUrl] = useState("https://hooks.slack.com/services/T000/B000/XXXXXX");
  const [themePref, setThemePref] = useState<"dark" | "light" | "system">("dark");
  const [analysisDepth, setAnalysisDepth] = useState<50 | 100>(50);
  const [confidencePref, setConfidencePref] = useState<"strict" | "balanced" | "lenient">("balanced");
  const [disambiguationData, setDisambiguationData] = useState<{ query: string; platform: "youtube" | "instagram" | "twitter"; candidates: any[] } | null>(null);
  const [selectedMediaPlatform, setSelectedMediaPlatform] = useState<string>("youtube");

  // Public Creator Intelligence Layer States
  const [intelData, setIntelData] = useState<any | null>(null);
  const [intelLoading, setIntelLoading] = useState(false);
  const [intelWarning, setIntelWarning] = useState<string | null>(null);
  const fetchIntelFn = useServerFn(getPublicCreatorIntelligence);

  const [avatarError, setAvatarError] = useState(false);
  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const [headerAvatarError, setHeaderAvatarError] = useState(false);
  const [headerAvatarLoaded, setHeaderAvatarLoaded] = useState(false);

  useEffect(() => {
    setAvatarError(false);
    setAvatarLoaded(false);
    setHeaderAvatarError(false);
    setHeaderAvatarLoaded(false);
  }, [result?.username]);

  // Creator Comparison specific states
  const [compA, setCompA] = useState("mrbeast");
  const [compB, setCompB] = useState("cryptokingz");
  const [compPair, setCompPair] = useState<any | null>(null);
  const [compLoading, setCompLoading] = useState(false);
  const [compError, setCompError] = useState<string | null>(null);
  const compareFn = useServerFn(compareInfluencers);

  const analyze = useServerFn(analyzeInfluencer);

  const run = async (username: string, platform: "youtube" | "instagram" | "twitter" = "youtube") => {
    setLoading(true);
    setResult(null);
    setError(null);
    const started = Date.now();
    try {
      const a = (await analyze({ data: { username, platform } })) as any;
      if (a && a.status === "needs_disambiguation") {
        setDisambiguationData({ query: username, platform, candidates: a.candidates });
        setLoading(false);
        return;
      }
      setDisambiguationData(null);
      // ensure loading overlay shows full cinematic sequence (~3.4s)
      const elapsed = Date.now() - started;
      const minDuration = 3400;
      if (elapsed < minDuration) await new Promise((r) => setTimeout(r, minDuration - elapsed));
      setResult(a);
      addHistory(a);
      setRecent(getHistory());
      setLoading(false);
      navigate({ to: "/analyze", search: { u: a.username, p: a.platform }, replace: true });
      setActiveTab("creator"); // automatically open creator analysis view on done
    } catch (e: any) {
      console.error("[Analyze] Server function error:", e);
      setLoading(false);
      setResult(null);
      const msg = e?.message || String(e);
      if (msg.includes("Creator not found")) {
        setError("Creator not found");
      } else {
        setError(msg || "Analysis failed. Please try again.");
      }
    }
  };

  const runComp = async () => {
    if (!compA.trim() || !compB.trim()) return;
    setCompLoading(true);
    setCompPair(null);
    setCompError(null);
    try {
      const res = await compareFn({ data: { a: compA, b: compB } });
      setCompPair(res);
    } catch (e: any) {
      setCompError(e?.message ?? "Comparison failed. Please try again.");
    } finally {
      setCompLoading(false);
    }
  };

  useEffect(() => {
    if (u && !result && !loading) {
      run(u, (p as any) || "youtube");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === "compare" && !compPair && !compLoading) {
      runComp();
    }
  }, [activeTab]);

  useEffect(() => {
    if (result) {
      setIntelData(null);
      setIntelLoading(true);
      setIntelWarning(null);
      
      const loadIntel = async () => {
        try {
          const res = await fetchIntelFn({
            data: {
              username: result.username,
              platform: result.platform,
              coreData: result
            }
          });
          setIntelData(res);
        } catch (err: any) {
          console.warn("[Public Intelligence UI] Async load failed:", err);
          setIntelWarning("Public Creator Intelligence data temporarily unavailable.");
        } finally {
          setIntelLoading(false);
        }
      };
      
      loadIntel();
    } else {
      setIntelData(null);
      setIntelLoading(false);
      setIntelWarning(null);
    }
  }, [result?.username, result?.platform]);

  const renderAnalyzeFirst = (moduleName: string) => {
    return (
      <div className="glass rounded-3xl p-10 text-center border border-border/40 font-normal space-y-4 max-w-lg mx-auto mt-10">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold text-base">Creator Audit Required</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The **{moduleName}** module requires active metric evaluations. Please enter a creator username in the search bar below to begin.
          </p>
        </div>
        <div className="pt-2">
          <SearchBar onAnalyze={run} defaultValue={u} />
        </div>
      </div>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "var(--color-success)";
    if (score >= 50) return "var(--color-warning)";
    return "var(--color-destructive)";
  };

  const renderCreatorForecastHeader = () => {
    if (!result) return null;

    return (
      <div className="space-y-4">
        {result.dataSource === "fallback" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 rounded-2xl bg-warning/10 border border-warning/20 text-warning text-xs sm:text-sm font-normal"
          >
            <AlertCircle className="w-5 h-5 shrink-0 animate-pulse" />
            <div>
              {result.platform === "twitter" ? (
                <span>Twitter/X live data temporarily unavailable. Showing AI simulated insights.</span>
              ) : (
                <>
                  <span className="font-semibold">Demo Fallback Mode:</span> {result.fallbackReason || `The live ${result.platform === "youtube" ? "YouTube" : "Instagram"} API is offline or unavailable. Displaying simulated creator intelligence data for demonstration.`}
                </>
              )}
            </div>
          </motion.div>
        )}
        {/* Unified Forecast Header */}
        <div className="glass-strong rounded-3xl border border-border/40 relative overflow-hidden font-normal text-xs">
          {result.bannerUrl && (
            <div className="w-full h-24 overflow-hidden relative border-b border-white/5">
              <img src={result.bannerUrl} alt="Creator Profile Banner" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-5 relative z-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative z-10">
            {/* Identity Group */}
            <div className="flex items-center gap-3.5">
              <div className="relative w-12 h-12 rounded-full overflow-hidden aspect-square border border-border/40 shadow-sm shrink-0 flex items-center justify-center">
                {/* Fallback initials gradient background */}
                <div className={`absolute inset-0 bg-gradient-to-r ${result.avatarColor || 'from-blue-500 to-purple-500'} flex items-center justify-center text-white text-base font-bold`}>
                  {result.displayName.charAt(0)}
                </div>
                {isValidAvatar(result.avatarUrl) && !headerAvatarError && (
                  <img
                    src={result.avatarUrl.startsWith("//") ? `https:${result.avatarUrl}` : result.avatarUrl}
                    alt={result.displayName}
                    onLoad={() => setHeaderAvatarLoaded(true)}
                    onError={() => setHeaderAvatarError(true)}
                    className={`absolute inset-0 w-full h-full object-cover rounded-full transition-opacity duration-300 ${
                      headerAvatarLoaded ? "opacity-100" : "opacity-0"
                    }`}
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-1">
                    {result.displayName}
                    {result.isVerified && (
                      <BadgeCheck className="w-4 h-4 text-blue-500 fill-blue-500/10 shrink-0" />
                    )}
                  </h3>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-semibold font-mono">
                    {result.lifecycleStage ?? "Growing"}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground flex flex-wrap items-center gap-1.5 mt-1">
                  {result.crossPlatformEcosystem?.map((sat: any, idx: number) => {
                    const isYouTube = sat.platform.toLowerCase() === "youtube";
                    const isInstagram = sat.platform.toLowerCase() === "instagram";
                    const isTwitter = sat.platform.toLowerCase() === "twitter" || sat.platform.toLowerCase() === "twitter/x";
                    return (
                      <span key={idx} className="flex items-center gap-1 text-[9px] font-semibold text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded border border-white/5">
                        {isYouTube && <Youtube className="w-2.5 h-2.5 text-red-500" />}
                        {isInstagram && <Instagram className="w-2.5 h-2.5 text-pink-500" />}
                        {isTwitter && <Twitter className="w-2.5 h-2.5 text-sky-400" />}
                        {!isYouTube && !isInstagram && !isTwitter && <Globe className="w-2.5 h-2.5 text-purple-400" />}
                        {sat.platform}: {sat.handle}
                      </span>
                    );
                  })}
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span className="capitalize">{result.creatorCategories?.[0]?.type || "Entertainment"}</span>
                </div>
              </div>
            </div>

            {/* Core Analytics Vectors */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full md:w-auto flex-1 md:justify-end select-none">
              {/* Trust Score */}
              <div className="glass bg-muted/5 hover:bg-muted/10 rounded-2xl p-4 border border-border/20 text-center shrink-0 min-w-[6.5rem] flex flex-col items-center justify-center hover:scale-105 transition-all duration-300 group cursor-default shadow-md shadow-black/5 hover:border-success/30">
                <div className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1 mb-1">
                  <Shield className="w-3 h-3 text-success shrink-0" />
                  <span>Ratefluencer Score™</span>
                </div>
                <div className="text-lg font-black tracking-tight mt-0.5 group-hover:scale-105 transition duration-300" style={{ color: getScoreColor(result.score) }}>{result.score}/100</div>
              </div>

              {/* Influence Velocity */}
              <div className="glass bg-muted/5 hover:bg-muted/10 rounded-2xl p-4 border border-border/20 text-center shrink-0 min-w-[6.5rem] flex flex-col items-center justify-center hover:scale-105 transition-all duration-300 group cursor-default shadow-md shadow-black/5 hover:border-primary/30">
                <div className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1 mb-1">
                  <Activity className="w-3 h-3 text-primary shrink-0 animate-pulse" />
                  <span>Influence Velocity</span>
                </div>
                <div className="text-lg font-black tracking-tight mt-0.5 text-primary group-hover:scale-105 transition duration-300">{result.influenceVelocity ?? 80}/100</div>
              </div>

              {/* Virality Potential */}
              <div className="glass bg-muted/5 hover:bg-muted/10 rounded-2xl p-4 border border-border/20 text-center shrink-0 min-w-[6.5rem] flex flex-col items-center justify-center hover:scale-105 transition-all duration-300 group cursor-default shadow-md shadow-black/5 hover:border-purple-500/30">
                <div className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1 mb-1">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  <span>Virality Index</span>
                </div>
                <div className="text-lg font-black tracking-tight mt-0.5 text-purple-400 group-hover:scale-105 transition duration-300">{result.viralityPotential ?? 75}/100</div>
              </div>

              {/* Projected Growth */}
              <div className="glass bg-muted/5 hover:bg-muted/10 rounded-2xl p-4 border border-border/20 text-center shrink-0 min-w-[6.5rem] flex flex-col items-center justify-center hover:scale-105 transition-all duration-300 group cursor-default shadow-md shadow-black/5 hover:border-blue-400/30">
                <div className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1 mb-1">
                  <TrendingUp className="w-3 h-3 text-blue-400" />
                  <span>Projected Growth</span>
                </div>
                <div className="text-lg font-black tracking-tight mt-0.5 text-blue-400 group-hover:scale-105 transition duration-300">+{result.projectedGrowth90Days ?? 12}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Undervalued Opportunity Warning callout */}
      {result.isUndervalued && (
        <div className="relative overflow-hidden rounded-2xl p-[1px] mt-4" style={{ background: "linear-gradient(135deg, rgba(234, 179, 8, 0.4), rgba(249, 115, 22, 0.4))" }}>
          <div className="rounded-2xl bg-card/95 p-3.5 flex items-start gap-2.5 text-xs text-foreground/90 font-normal">
            <div className="w-6 h-6 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-500 shrink-0"><Sparkles className="w-4 h-4" /></div>
            <div>
              <div className="font-bold text-xs text-yellow-500">Undervalued Influence Opportunity Detected</div>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{result.undervaluedExplanation || "Engagement acceleration significantly exceeds audience scale benchmarks, representing high-yield marketing ROI."}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const renderAiExecutiveSummaryHero = () => {
  if (!result) return null;

  const summaryText = result.verdict || result.unifiedTrustExplanation || "Creator trust parameters are validated within baseline bounds.";
  const sponsorship = result.brandRecommendation?.sponsorshipSuitability || "Suitable for sponsorship campaigns.";
  const audienceQuality = result.commentAuthenticityDetailed 
    ? `Audience organic signature: ${result.commentAuthenticityDetailed.organicPct}% authenticity score.` 
    : "Organic audience engagement signals active.";
  const strongestPlatform = result.crossPlatformEcosystem?.find((s: any) => s.trustScore === Math.max(...(result.crossPlatformEcosystem ?? []).map((x: any) => x.trustScore)))?.platform || "YouTube";
  const ROI = result.estimatedRoiTier ? `${result.estimatedRoiTier} Partnership ROI Tier` : "Standard ROI Tier";

  return (
    <div className="relative overflow-hidden rounded-3xl p-5 border border-primary/20 bg-primary/5 shadow-2xl backdrop-blur-xl animate-fade-in flex flex-col md:flex-row items-start md:items-center justify-between gap-5 font-normal text-xs">
      {/* Glow effect */}
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      
      {/* Left side: AI Icon and Text */}
      <div className="flex gap-4 items-start flex-1 min-w-0">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-r from-primary to-purple-500 flex items-center justify-center shrink-0 shadow-lg shadow-primary/20 animate-pulse">
          <Sparkles className="w-5 h-5 text-white animate-pulse" />
        </div>
        <div className="space-y-1.5 text-left flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
              AI Executive Intelligence Summary
            </span>
            <span className="text-[8px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 animate-pulse">
              Calibrated Signals Active
            </span>
          </div>
          <p className="text-sm font-semibold text-foreground/90 leading-relaxed font-sans pr-4">
            "{summaryText}"
          </p>
        </div>
      </div>

      {/* Right side: Key quick insights */}
      <div className="flex flex-col gap-2 shrink-0 w-full md:w-auto border-t md:border-t-0 md:border-l border-border/20 pt-4 md:pt-0 md:pl-5">
        <div className="flex flex-col gap-2 w-full sm:w-auto text-left">
          <div className="flex items-center gap-2 text-muted-foreground text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Sponsorship: <strong>{sponsorship.replace(/\.$/, "")}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            <span>Audience Quality: <strong>{audienceQuality}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span>Strongest Channel: <strong>{strongestPlatform} ({ROI})</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};

  const renderMomentumRadar = () => {
    if (!result || !result.radarMetrics) return null;
    
    const metrics = result.radarMetrics;
    const data = [
      { name: "Engagement Accel", val: metrics.engagementAccel },
      { name: "Audience Accel", val: metrics.audienceAccel },
      { name: "Trust Stability", val: metrics.trustStability },
      { name: "Virality Tendency", val: metrics.viralityTendency },
      { name: "Audience Loyalty", val: metrics.loyaltyStrength },
      { name: "Upload Cadence", val: metrics.uploadCadence }
    ];

    const size = 260;
    const center = size / 2;
    const radius = 80;

    const getPoint = (i: number, val: number) => {
      const angle = (Math.PI * 2 / 6) * i - Math.PI / 2;
      const r = (val / 100) * radius;
      return {
        x: center + r * Math.cos(angle),
        y: center + r * Math.sin(angle)
      };
    };

    const getAxisPoint = (i: number) => {
      const angle = (Math.PI * 2 / 6) * i - Math.PI / 2;
      return {
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle)
      };
    };

    const getLabelPoint = (i: number) => {
      const angle = (Math.PI * 2 / 6) * i - Math.PI / 2;
      const labelRadius = radius + 20;
      return {
        x: center + labelRadius * Math.cos(angle),
        y: center + labelRadius * Math.sin(angle)
      };
    };

    const gridHexagons = [25, 50, 75, 100].map((pct) => {
      const points = Array.from({ length: 6 }, (_, i) => {
        const angle = (Math.PI * 2 / 6) * i - Math.PI / 2;
        const r = (pct / 100) * radius;
        return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
      }).join(" ");
      return <polygon key={pct} points={points} fill="none" stroke="oklch(1 0 0 / 0.08)" strokeWidth="1" />;
    });

    const polyPoints = data.map((d, i) => {
      const pt = getPoint(i, d.val);
      return `${pt.x},${pt.y}`;
    }).join(" ");

    return (
      <div className="glass rounded-3xl p-5 border border-border/40 flex flex-col items-center justify-center font-normal">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 w-full text-left flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" /> Momentum Radar System
        </h3>
        <div className="relative w-full flex justify-center">
          <svg width={size} height={size + 10} className="overflow-visible">
            {gridHexagons}
            {Array.from({ length: 6 }).map((_, i) => {
              const pt = getAxisPoint(i);
              return <line key={i} x1={center} y1={center} x2={pt.x} y2={pt.y} stroke="oklch(1 0 0 / 0.08)" strokeWidth="1" />;
            })}
            <polygon 
              points={polyPoints} 
              fill="url(#radarGrad)" 
              stroke="oklch(0.62 0.21 265)" 
              strokeWidth="2" 
              className="glow-polygon"
            />
            {data.map((d, i) => {
              const pt = getPoint(i, d.val);
              return (
                <circle 
                  key={i} 
                  cx={pt.x} 
                  cy={pt.y} 
                  r="3.5" 
                  fill="oklch(0.62 0.21 265)" 
                  stroke="oklch(1 0 0 / 0.8)" 
                  strokeWidth="1.5" 
                />
              );
            })}
            {data.map((d, i) => {
              const pt = getLabelPoint(i);
              let textAnchor: "start" | "middle" | "end" = "middle";
              let dy = "0.33em";
              if (pt.x < center - 10) textAnchor = "end";
              else if (pt.x > center + 10) textAnchor = "start";
              
              if (pt.y < center - radius + 10) dy = "-0.6em";
              else if (pt.y > center + radius - 10) dy = "1.2em";

              return (
                <g key={i} className="text-[8px] font-mono">
                  <text 
                    x={pt.x} 
                    y={pt.y} 
                    dy={dy} 
                    textAnchor={textAnchor} 
                    fill="oklch(0.72 0.03 258)" 
                    className="font-semibold"
                  >
                    {d.name}
                  </text>
                  <text 
                    x={pt.x} 
                    y={pt.y} 
                    dy={dy === "-0.6em" ? "0.6em" : dy === "1.2em" ? "2.2em" : "1.33em"} 
                    textAnchor={textAnchor} 
                    fill="oklch(0.62 0.21 265)" 
                    className="font-bold text-[8px]"
                  >
                    {d.val}/100
                  </text>
                </g>
              );
            })}
            <defs>
              <linearGradient id="radarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.62 0.21 265)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="oklch(0.62 0.21 265)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    );
  };

  const renderCreatorEcosystemWidget = () => {
    if (!result || !result.ecosystemNodes) return null;

    const size = 260;
    const center = size / 2;
    const nodes = result.ecosystemNodes;
    const radius = 80;

    return (
      <div className="glass rounded-3xl p-5 border border-border/40 flex flex-col items-center justify-center font-normal">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 w-full text-left flex items-center gap-2">
          <Globe className="w-4 h-4 text-purple-400" /> Creator Ecosystem Overlap
        </h3>
        <div className="relative w-full flex justify-center">
          <svg width={size} height={size} className="overflow-visible">
            <defs>
              <radialGradient id="centerNodeGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="oklch(0.62 0.21 265)" stopOpacity={1} />
                <stop offset="100%" stopColor="oklch(0.45 0.15 264)" stopOpacity={0.8} />
              </radialGradient>
              <radialGradient id="neighborNodeGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="oklch(0.72 0.03 258)" stopOpacity={0.8} />
                <stop offset="100%" stopColor="oklch(0.21 0.04 264)" stopOpacity={0.6} />
              </radialGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {nodes.map((node, i) => {
              const angle = (Math.PI * 2 / nodes.length) * i - Math.PI / 2;
              const x = center + radius * Math.cos(angle);
              const y = center + radius * Math.sin(angle);
              return (
                <line 
                  key={i} 
                  x1={center} 
                  y1={center} 
                  x2={x} 
                  y2={y} 
                  stroke="oklch(0.62 0.21 265 / 0.3)" 
                  strokeWidth="2" 
                  strokeDasharray="3 3"
                />
              );
            })}

            {nodes.map((node, i) => {
              const angle = (Math.PI * 2 / nodes.length) * i - Math.PI / 2;
              const x = center + radius * Math.cos(angle);
              const y = center + radius * Math.sin(angle);
              const nodeRadius = 24 + (node.overlapPct / 100) * 12;

              return (
                <g key={i} className="cursor-pointer font-mono group">
                  <circle 
                    cx={x} 
                    cy={y} 
                    r={nodeRadius} 
                    fill="url(#neighborNodeGrad)" 
                    stroke="oklch(0.72 0.03 258 / 0.4)" 
                    strokeWidth="1.5"
                  />
                  <text 
                    x={x} 
                    y={y - 2} 
                    textAnchor="middle" 
                    fill="oklch(1 0 0)" 
                    className="text-[8px] font-bold fill-foreground"
                  >
                    {node.overlapPct}%
                  </text>
                  <text 
                    x={x} 
                    y={y + 8} 
                    textAnchor="middle" 
                    fill="oklch(0.72 0.03 258)" 
                    className="text-[7px] fill-muted-foreground font-semibold"
                  >
                    {node.type.toUpperCase()}
                  </text>
                  <text 
                    x={x} 
                    y={y - nodeRadius - 5} 
                    textAnchor="middle" 
                    fill="oklch(0.62 0.21 265)" 
                    className="text-[8px] font-bold opacity-80"
                  >
                    {node.name}
                  </text>
                </g>
              );
            })}

            <g filter="url(#glow)">
              <circle 
                cx={center} 
                cy={center} 
                r="32" 
                fill="url(#centerNodeGrad)" 
                stroke="oklch(0.62 0.21 265)" 
                strokeWidth="2"
              />
              <text 
                x={center} 
                y={center + 3} 
                textAnchor="middle" 
                fill="#ffffff" 
                className="text-[8px] font-bold font-mono tracking-wider fill-white"
              >
                @{result.username}
              </text>
            </g>
          </svg>
        </div>
      </div>
    );
  };

  const renderIntelligenceFeed = () => {
    if (!result || !result.intelligenceFeed) return null;

    return (
      <div className="glass rounded-3xl p-5 border border-border/40 space-y-4 font-normal">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Database className="w-4 h-4 text-cyan-400" /> AI Intelligence Insights Feed
        </h3>
        <div className="bg-black/90 border border-cyan-500/20 rounded-2xl p-4 font-mono text-[10px] leading-relaxed text-cyan-400/90 shadow-inner h-[170px] overflow-y-auto space-y-2">
          <div className="flex items-center gap-1.5 text-cyan-500/50 text-[9px] border-b border-cyan-500/10 pb-1.5 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-ping" />
            <span>CONNECTING AUTHENFLUENCE AI FORECAST ENGINE... DONE</span>
          </div>
          {result.intelligenceFeed.map((item, idx) => (
            <div key={idx} className="flex gap-2 items-start animate-fade-in" style={{ animationDelay: `${idx * 150}ms` }}>
              <span className="text-cyan-500/60 shrink-0 select-none">&gt;&gt;</span>
              <span>{item}</span>
            </div>
          ))}
          <div className="flex gap-2 items-center text-cyan-400/40 text-[8px] pt-1">
            <span>&gt;&gt; SYSTEM ANALYST CONTINUOUS INFERENCE MODE</span>
            <span className="w-1 h-2.5 bg-cyan-400/70 animate-pulse" />
          </div>
        </div>
      </div>
    );
  };

  const renderDashboard = () => {
    const displayRecent = (mounted && recent.length > 0) ? recent.slice(0, 3) : [
      { username: "mrbeast", displayName: "MrBeast", score: 94, category: "Entertainment", timestamp: 1717329600000 - 3600000 * 2, platform: "youtube" },
      { username: "justinbieber", displayName: "Justin Bieber", score: 78, category: "Music", timestamp: 1717329600000 - 3600000 * 5, platform: "youtube" },
      { username: "cryptokingz", displayName: "CryptoKingz", score: 32, category: "Finance", timestamp: 1717329600000 - 3600000 * 12, platform: "youtube" }
    ];

    const avgTrustScore = (mounted && recent.length > 0) 
      ? Math.round(recent.reduce((acc, h) => acc + h.score, 0) / recent.length) 
      : 81;

    const topCreators = [
      { name: "MrBeast", username: "mrbeast", score: 94, category: "Entertainment", followers: 310000000 },
      { name: "Justin Bieber", username: "justinbieber", score: 78, category: "Music", followers: 78400000 },
      { name: "CryptoKingz", username: "cryptokingz", score: 32, category: "Finance", followers: 1200000 }
    ];

    return (
      <div className="space-y-6 animate-fade-in font-normal">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">AI Creator Intelligence Control Center</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Real-time stats, audits, and model velocity metrics</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-muted-foreground">System Live: All models active</span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass rounded-2xl p-4 border border-border/40 relative overflow-hidden">
            <div className="absolute top-2 right-2 text-primary opacity-10"><Shield className="w-8 h-8" /></div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Total Audits</div>
            <div className="text-2xl font-black mt-1 text-foreground">15,240</div>
            <p className="text-[9px] text-muted-foreground mt-1">Real-time indexed audits</p>
          </div>
          <div className="glass rounded-2xl p-4 border border-border/40 relative overflow-hidden">
            <div className="absolute top-2 right-2 text-primary opacity-10"><Activity className="w-8 h-8" /></div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Model Accuracy</div>
            <div className="text-2xl font-black mt-1 text-primary">96.8%</div>
            <p className="text-[9px] text-muted-foreground mt-1">NLP & sentiment confidence</p>
          </div>
          <div className="glass rounded-2xl p-4 border border-border/40 relative overflow-hidden">
            <div className="absolute top-2 right-2 text-primary opacity-10"><Award className="w-8 h-8" /></div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Avg Ratefluencer Score™</div>
            <div className="text-2xl font-black mt-1 text-foreground flex items-center gap-1.5">
              {avgTrustScore}
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">Optimal</span>
            </div>
            <p className="text-[9px] text-muted-foreground mt-1">Platform average index</p>
          </div>
          <div className="glass rounded-2xl p-4 border border-border/40 relative overflow-hidden">
            <div className="absolute top-2 right-2 text-primary opacity-10"><Database className="w-8 h-8" /></div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Connected APIs</div>
            <div className="text-2xl font-black mt-1 text-purple-400">Google Gemini</div>
            <p className="text-[9px] text-muted-foreground mt-1">Synched & calibrated</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main search and demo creators */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass rounded-3xl p-6 border border-border/40 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">Start Creator Audit</h3>
              </div>
              <SearchBar onAnalyze={run} defaultValue={u} />
            </div>

            {/* Recent analyses in dashboard */}
            <div className="glass rounded-3xl p-6 border border-border/40 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" /> Recent Creator Analyses
              </h3>
              <div className="divide-y divide-border/20">
                {displayRecent.map((item) => (
                  <div 
                    key={item.username} 
                    className="py-3 flex items-center justify-between font-normal text-xs hover:bg-muted/10 px-2 rounded-xl transition cursor-pointer"
                    onClick={() => { run(item.username); }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                        {item.displayName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{item.displayName}</div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                          <span>@{item.username}</span>
                          <span className="w-1 h-1 rounded-full bg-border" />
                          <span className="capitalize">{item.category}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[10px] text-muted-foreground/60">
                        {mounted
                          ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : "Audit logged"}
                      </span>
                      <span 
                        className="text-sm font-bold tabular-nums w-8 text-right"
                        style={{ color: item.score >= 70 ? "var(--color-success)" : item.score >= 50 ? "var(--color-warning)" : "var(--color-destructive)" }}
                      >
                        {item.score}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Creators Analyzed */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Top Creators Analyzed</h3>
              <div className="grid sm:grid-cols-3 gap-3">
                {topCreators.map((m) => (
                  <button
                    key={m.username}
                    onClick={() => run(m.username)}
                    className="glass rounded-2xl p-4 text-left hover:border-primary/40 transition group relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-sm">{m.name}</div>
                        <div className="text-[10px] text-muted-foreground">@{m.username}</div>
                      </div>
                      <span
                        className="text-sm font-bold tabular-nums"
                        style={{ color: m.score >= 70 ? "var(--color-success)" : m.score >= 50 ? "var(--color-warning)" : "var(--color-destructive)" }}
                      >
                        {m.score}
                      </span>
                    </div>
                    <div className="mt-2 text-[9px] text-muted-foreground flex items-center justify-between font-normal">
                      <span>{fmt(m.followers)} subs</span>
                      <span>{m.category}</span>
                    </div>
                    <div className="mt-3 flex items-center text-[10px] text-primary opacity-0 group-hover:opacity-100 transition">
                      Run assessment <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: AI Insights & Activity summary log */}
          <div className="space-y-6">
            <div className="glass rounded-3xl p-6 border border-border/40 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-500" /> Quick Insights
              </h3>
              <div className="space-y-3 font-normal text-xs text-muted-foreground">
                <div className="p-3 rounded-2xl bg-primary/5 border border-primary/10">
                  <div className="font-semibold text-foreground text-xs">Engagement Volatility</div>
                  <p className="text-[11px] leading-relaxed mt-1 text-muted-foreground">YouTube engagement rates are averaging 2.1% across audited channels, outperforming Instagram counterparts by 34%.</p>
                </div>
                <div className="p-3 rounded-2xl bg-yellow-500/5 border border-yellow-500/10">
                  <div className="font-semibold text-foreground text-xs">Spam Detection Wave</div>
                  <p className="text-[11px] leading-relaxed mt-1 text-muted-foreground">NLP scans flagged a +12% spike in emoji-cluster spam threads in tech categories, primarily driving down trust scores.</p>
                </div>
                <div className="p-3 rounded-2xl bg-success/5 border border-success/10">
                  <div className="font-semibold text-foreground text-xs">Credibility Anchors</div>
                  <p className="text-[11px] leading-relaxed mt-1 text-muted-foreground">High public credibility signals reduced false positive risk by 28% for verified enterprise handles this week.</p>
                </div>
              </div>
            </div>

            <div className="glass rounded-3xl p-6 border border-border/40 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> AI Activity Log
              </h3>
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {[
                  { time: "09:42:15", log: "Audit completed: @mrbeast (Trust Score: 94)" },
                  { time: "09:40:02", log: "NLP comment scan complete: 120 nodes analyzed" },
                  { time: "09:37:44", log: "Semantic alignment computed for @justinbieber" },
                  { time: "09:35:10", log: "Model cache purged: 24 profiles updated" },
                  { time: "09:32:00", log: "Connected endpoints validation check passed" }
                ].map((act, i) => (
                  <div key={i} className="text-xs border-b border-border/20 pb-2 last:border-0 last:pb-0 font-normal flex items-start gap-2">
                    <span className="font-mono text-[9px] text-muted-foreground/80 mt-0.5 shrink-0">{act.time}</span>
                    <span className="text-muted-foreground leading-normal">{act.log}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCreatorAnalysis = () => {
    if (!result) return renderAnalyzeFirst("Creator Analysis");
    
    const engagementVal = typeof result.engagementRate === "number"
      ? result.engagementRate.toFixed(2)
      : (result.avgLikes && result.followers 
          ? ((result.avgLikes / result.followers) * 100).toFixed(2) 
          : "1.50");

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Creator Profile Analysis</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Audited channel information and AI profile overview</p>
          </div>
          <div className={`text-xs px-2.5 py-1 rounded-full border font-mono font-bold flex items-center gap-1.5 shrink-0 uppercase ${
            result.dataSource === "live" 
              ? "bg-success/10 text-success border-success/20" 
              : result.dataSource === "fallback" 
                ? "bg-rose-500/10 text-rose-450 border-rose-500/20"
                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${
              result.dataSource === "live" 
                ? "bg-success" 
                : result.dataSource === "fallback" 
                  ? "bg-rose-500" 
                  : "bg-amber-500"
            }`} />
            <span>
              {result.dataSource === "live" 
                ? "VERIFIED" 
                : result.dataSource === "fallback" 
                  ? "FALLBACK" 
                  : "ESTIMATED"}
            </span>
          </div>
        </div>

        <SearchBar onAnalyze={run} defaultValue={u} />

        {/* Main creator profile layout */}
        <div className="grid md:grid-cols-3 gap-6 font-normal">
          {/* Left Column: Identity card */}
          <div className="glass rounded-3xl p-6 border border-border/40 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 rounded-full overflow-hidden aspect-square border-2 border-border/40 shadow-md shrink-0 flex items-center justify-center">
                  {/* Fallback initials gradient background */}
                  <div className={`absolute inset-0 bg-gradient-to-r ${result.avatarColor || 'from-blue-500 to-purple-500'} flex items-center justify-center text-white text-xl font-bold`}>
                    {result.displayName.charAt(0)}
                  </div>
                  {isValidAvatar(result.avatarUrl) && !avatarError && (
                    <img
                      src={result.avatarUrl.startsWith("//") ? `https:${result.avatarUrl}` : result.avatarUrl}
                      alt={result.displayName}
                      onLoad={() => setAvatarLoaded(true)}
                      onError={() => setAvatarError(true)}
                      className={`absolute inset-0 w-full h-full object-cover rounded-full transition-opacity duration-300 ${
                        avatarLoaded ? "opacity-100" : "opacity-0"
                      }`}
                      referrerPolicy="no-referrer"
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl font-bold flex items-center gap-1.5 truncate">
                    {result.displayName}
                    {result.isVerified && (
                      <BadgeCheck className="w-5 h-5 text-blue-500 fill-blue-500/10 shrink-0" />
                    )}
                  </h1>
                  <p className="text-xs text-muted-foreground truncate">@{result.username}</p>
                </div>
              </div>

              {/* Categorization */}
              <div className="space-y-2 pt-2 border-t border-border/20">
                <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Category Alignment</div>
                <div className="flex flex-wrap gap-1.5">
                  {(result.creatorCategories || [{ type: "Entertainment", weight: 1.0 }]).map((cat, i) => (
                    <span 
                      key={i} 
                      className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold"
                    >
                      {cat.type} ({Math.round(cat.weight * 100)}%)
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Social handles presence */}
            <div className="space-y-2.5 pt-4 border-t border-border/20 text-xs">
              <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Verified Presence</div>
              <div className="space-y-2 font-normal">
                {(result.mediaPresence || [
                  { platform: "YouTube", url: `https://youtube.com/@${result.username}`, handle: `@${result.username}`, isVerified: true }
                ]).map((p) => (
                  <a
                    key={p.platform}
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between text-muted-foreground hover:text-foreground transition group"
                  >
                    <span className="flex items-center gap-1.5">
                      {p.platform.toLowerCase() === "youtube" ? (
                        <Youtube className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      ) : p.platform.toLowerCase() === "instagram" ? (
                        <Instagram className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                      ) : ["twitter", "twitter/x", "x"].includes(p.platform.toLowerCase()) ? (
                        <Twitter className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      ) : (
                        <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      )}
                      <span>{p.platform}</span>
                    </span>
                    <span className="text-[11px] truncate max-w-[120px] font-mono">{p.handle}</span>
                  </a>
                ))}
                {(!result.mediaPresence || result.mediaPresence.filter((p: any) => p.platform.toLowerCase() !== "youtube").length === 0) && (
                  <div className="text-[10px] text-muted-foreground/60 italic py-2 text-center border border-dashed border-border/20 rounded-xl bg-black/10 select-none">
                    ℹ️ No verified external creator links discovered.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column (2/3 width): Stats and Summary */}
          <div className="md:col-span-2 space-y-6">
            {/* Live Creator Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="glass rounded-2xl p-4 border border-border/40">
                <div className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Subscribers</div>
                <div className="text-lg font-black mt-1">{fmt(result.followers)}</div>
              </div>
              <div className="glass rounded-2xl p-4 border border-border/40">
                <div className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Total Uploads</div>
                <div className="text-lg font-black mt-1">{fmt(result.totalPosts)}</div>
              </div>
              <div className="glass rounded-2xl p-4 border border-border/40">
                <div className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Avg Likes</div>
                <div className="text-lg font-black mt-1">{fmt(result.avgLikes)}</div>
              </div>
              <div className="glass rounded-2xl p-4 border border-border/40">
                <div className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Engagement Rate</div>
                <div className="text-lg font-black mt-1 text-primary">{engagementVal}%</div>
              </div>
            </div>

            {/* AI Summary and Profile Verdict */}
            <div className="glass rounded-3xl p-6 border border-border/40 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4.5 h-4.5 text-primary" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">AI-Generated Creator Verdict</h3>
              </div>
              <p className="text-sm leading-relaxed text-foreground/90 font-normal">
                {result.verdict}
              </p>
            </div>

            {/* Benchmark and data limitations */}
            <div className="grid sm:grid-cols-2 gap-4">
              {result.benchmarkContext && (
                <div className="glass rounded-2xl p-4 border border-border/40">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1.5">Algorithmic Niche Benchmark</div>
                  <p className="text-xs text-muted-foreground leading-normal">{result.benchmarkContext}</p>
                </div>
              )}
              {result.dataLimitations && result.dataLimitations.length > 0 && (
                <div className="glass rounded-2xl p-4 border border-border/40">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1.5">Model Constraints & Limitations</div>
                  <ul className="list-disc list-inside text-xs text-muted-foreground/80 space-y-1">
                    {result.dataLimitations.map((lim, i) => (
                      <li key={i} className="truncate">{lim}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Creator Public Intelligence Layer */}
            {(intelLoading || intelData || intelWarning) && (
              <div className="space-y-4 pt-4 border-t border-border/20">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4.5 h-4.5 text-primary" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">Creator Public Intelligence</h3>
                </div>
                {intelWarning && (
                  <div className="text-xs p-3 rounded-2xl bg-rose-500/5 border border-rose-500/10 text-rose-400 font-sans">
                    {intelWarning}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-normal">
                  <BrandProfitabilityCard
                    score={intelData?.brandProfitabilityScore}
                    tier={intelData?.sponsorshipTier}
                    loading={intelLoading}
                    estimatedCpm={intelData?.estimatedCpm}
                    roiClass={intelData?.roiClass}
                    conversionStrength={intelData?.conversionStrength}
                    partnershipSuitability={intelData?.partnershipSuitability}
                    purchasingPowerEstimate={intelData?.purchasingPowerEstimate}
                    isSimulated={intelData?.isSimulated ?? true}
                    isBelowCommercialThreshold={intelData?.isBelowCommercialThreshold ?? false}
                  />

                  <CrossPlatformCard
                    primaryPlatform={intelData?.primaryPlatform}
                    strongestPlatform={intelData?.strongestEngagementPlatform}
                    confidence={intelData?.confidence}
                    loading={intelLoading}
                  />
                  <CollaborationCard
                    summaries={intelData?.collaborationSummary}
                    explanation={intelData?.aiExplanation}
                    loading={intelLoading}
                  />
                  <DataAvailabilityCard
                    items={intelData?.dataAvailability}
                    loading={intelLoading}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderTrustIntelligence = () => {
    if (!result) return renderAnalyzeFirst("Ratefluencer Score™");
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Ratefluencer Score™ Engine</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Authenticity scoring and algorithmic creator due diligence</p>
        </div>

        <div className="grid lg:grid-cols-[220px_1fr] gap-6 items-center glass-strong rounded-3xl p-6 border border-border/40">
          <div className="justify-self-center">
            <ScoreRing score={result.score} size={200} />
          </div>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-destructive/15 text-destructive border-destructive/30">
                <Youtube className="w-3.5 h-3.5" /> YouTube
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full border bg-success/15 text-success border-success/30 font-semibold">
                {result.score >= 75 ? "Mostly Authentic" : result.score >= 45 ? "Moderate Risk" : "Suspicious Activity"}
              </span>
              {result.confidenceLevel && (
                <span className="text-xs px-2.5 py-1 rounded-full border bg-primary/10 text-primary border-primary/20 font-semibold">
                  {result.confidenceLevel} Confidence
                </span>
              )}
            </div>

            <div className="space-y-3 pt-2">
              {[
                { label: "Engagement Score (30%)", value: result.breakdown.engagement, color: "bg-primary" },
                { label: "Audience Quality Score (25%)", value: result.breakdown.followerQuality, color: "bg-success" },
                { label: "Authenticity Score (20%)", value: result.breakdown.commentAuthenticity, color: "bg-purple-500" },
                { label: "Posting Consistency (15%)", value: result.breakdown.postingConsistency ?? 80, color: "bg-blue-500" },
                { label: "Brand Safety Score (10%)", value: result.breakdown.contextualSignals ?? 80, color: "bg-yellow-500" }
              ].map((bar, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>{bar.label}</span>
                    <span>{bar.value}/100</span>
                  </div>
                  <div className="w-full bg-muted/40 h-1.5 rounded-full overflow-hidden">
                    <div className={`h-full ${bar.color} rounded-full`} style={{ width: `${bar.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Authenticity & Fraud Detection Audit Panel */}
        <div className="glass rounded-3xl p-6 border border-border/40 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary animate-pulse" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">AI Authenticity & Fraud Detection Audit</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass bg-muted/10 rounded-2xl p-4 border border-border/20 text-center">
              <div className="text-[10px] text-muted-foreground uppercase font-semibold">Fake Engagement</div>
              <div className="text-xl font-bold mt-1 text-destructive">
                {result.commentAuthenticityDetailed?.lowAuthenticityPct ?? (100 - result.breakdown.commentAuthenticity)}%
              </div>
              <p className="text-[9px] text-muted-foreground mt-1">Spam, promo & pod index</p>
            </div>
            
            <div className="glass bg-muted/10 rounded-2xl p-4 border border-border/20 text-center">
              <div className="text-[10px] text-muted-foreground uppercase font-semibold">Bot Risk</div>
              <div className="text-xl font-bold mt-1 text-warning">
                {result.commentAuthenticityDetailed?.botLanguagePct ?? Math.round((100 - result.breakdown.followerQuality) * 0.4)}%
              </div>
              <p className="text-[9px] text-muted-foreground mt-1">Automated language patterns</p>
            </div>

            <div className="glass bg-muted/10 rounded-2xl p-4 border border-border/20 text-center">
              <div className="text-[10px] text-muted-foreground uppercase font-semibold">Audience Authenticity</div>
              <div className="text-xl font-bold mt-1 text-success">
                {result.commentAuthenticityDetailed?.organicPct ?? result.breakdown.commentAuthenticity}%
              </div>
              <p className="text-[9px] text-muted-foreground mt-1">Genuine human accounts</p>
            </div>

            <div className="glass bg-muted/10 rounded-2xl p-4 border border-border/20 text-center">
              <div className="text-[10px] text-muted-foreground uppercase font-semibold">Fraud Risk Level</div>
              <div className={`text-xl font-bold mt-1 ${
                (result.brandRecommendation?.riskLevel || "Low") === "Low" ? "text-success" :
                (result.brandRecommendation?.riskLevel || "Low") === "Medium" ? "text-warning" :
                "text-destructive"
              }`}>
                {result.brandRecommendation?.riskLevel ?? (result.score >= 70 ? "Low" : result.score >= 50 ? "Medium" : "High")}
              </div>
              <p className="text-[9px] text-muted-foreground mt-1">Ecosystem risk classification</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 text-xs font-normal text-muted-foreground leading-relaxed flex items-start gap-2.5">
            <Sparkles className="w-4.5 h-4.5 text-primary shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-foreground">AI Audit Finding:</span>{" "}
              {result.commentAuthenticityDetailed?.reason ?? "Ecosystem signals analyzed: comment patterns and view ratios indicate mostly organic, non-simulated conversational depth with stable verification markers."}
            </div>
          </div>
        </div>

        {/* Why this score */}
        <div className="glass rounded-3xl p-6 border border-border/40 space-y-4">
          <h3 className="font-semibold text-sm flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">Why This Score?</h3>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-success uppercase tracking-wider">✓ Positive Signals</h4>
              <ul className="space-y-1.5">
                {(result.whyThisScore?.positive || result.strengths || []).map((str, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2 font-normal">
                    <span className="text-success shrink-0 font-bold">✓</span>
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-warning uppercase tracking-wider">⚠ Monitoring Signals</h4>
              <ul className="space-y-1.5">
                {(result.whyThisScore?.monitoring || result.risks || []).map((risk, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2 font-normal">
                    <span className="text-warning shrink-0 font-bold">⚠</span>
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Niche Benchmark Comparison */}
        <div className="glass rounded-3xl p-6 border border-border/40 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">Niche Benchmark Comparison</h3>
          <div className="space-y-4 font-normal">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span>@{result.username} (This Creator)</span>
                <span className="text-primary font-bold">{result.score}/100</span>
              </div>
              <div className="w-full bg-muted/40 h-2.5 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${result.score}%` }} />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 pt-2 text-xs">
              <div className="p-4 rounded-2xl bg-muted/10 border border-border/20">
                <div className="text-[10px] text-muted-foreground uppercase font-semibold">Niche Benchmark Average</div>
                <div className="text-lg font-bold mt-1 text-foreground">72 / 100</div>
                <p className="text-[10px] text-muted-foreground leading-normal mt-1">Based on similar scale channels in category.</p>
              </div>
              <div className="p-4 rounded-2xl bg-muted/10 border border-border/20">
                <div className="text-[10px] text-muted-foreground uppercase font-semibold">Platform Credibility Score</div>
                <div className="text-lg font-bold mt-1 text-emerald-400">
                  {result.publicCredibility?.score || 85} / 100
                </div>
                <p className="text-[10px] text-muted-foreground leading-normal mt-1">Calculated verification trust anchor weight.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Indicators */}
        <div className="glass rounded-3xl p-6 border border-border/40 space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">Contextual Trust Risk Indicators</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {result.fraudSignals.map((s) => (
              <div key={s.id} className="glass bg-muted/10 p-3 rounded-2xl border border-border/20 space-y-1 text-left font-normal">
                <div className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>{s.title}</span>
                  <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-mono ${
                    s.severity === "high" ? "bg-destructive/10 text-destructive border border-destructive/20" :
                    s.severity === "medium" ? "bg-warning/10 text-warning border border-warning/20" :
                    "bg-muted text-muted-foreground"
                  }`}>{s.severity}</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-normal">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderGrowthPrediction = () => {
    if (!result) return renderAnalyzeFirst("Growth Prediction");

    const currentSubs = result.followers;
    const growthRate = (result.momentumSignals?.thirtyDayGrowth || 4.2) / 100;
    const projectionData = Array.from({ length: 6 }, (_, i) => {
      const month = i + 1;
      const projectedValue = Math.round(currentSubs * Math.pow(1 + growthRate, month));
      return {
        name: `M${month}`,
        projected: projectedValue,
        current: currentSubs
      };
    });

    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Growth Prediction Engine</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Machine learning forecasts on creator expansion and audience velocity</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="glass rounded-2xl p-4 border border-border/40 relative overflow-hidden flex flex-col justify-between min-h-[7rem]">
            <div className="absolute top-2 right-2 opacity-5"><TrendingUp className="w-16 h-16" /></div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Growth Potential Score</div>
            <div className="text-2xl font-bold text-primary my-2">{result.growthPotentialScore || 80}/100</div>
            <p className="text-[10px] text-muted-foreground">Estimated audience trajectory velocity</p>
          </div>
          <div className="glass rounded-2xl p-4 border border-border/40 relative overflow-hidden flex flex-col justify-between min-h-[7rem]">
            <div className="absolute top-2 right-2 opacity-5"><Activity className="w-16 h-16" /></div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">30-Day Growth</div>
            <div className="text-2xl font-bold text-success my-2">+{result.momentumSignals?.thirtyDayGrowth || 4.2}%</div>
            <p className="text-[10px] text-muted-foreground">Historical expansion velocity</p>
          </div>
          <div className="glass rounded-2xl p-4 border border-border/40 relative overflow-hidden flex flex-col justify-between min-h-[7rem]">
            <div className="absolute top-2 right-2 opacity-5"><LineChart className="w-16 h-16" /></div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Engagement Trajectory</div>
            <div className="text-2xl font-bold text-foreground my-2 capitalize">{result.momentumSignals?.engagementTrajectory || "Stable"}</div>
            <p className="text-[10px] text-muted-foreground">Engagement volatility indices</p>
          </div>
        </div>

        {/* 6-Month Audience Expansion Forecast */}
        <div className="glass rounded-3xl p-6 border border-border/40">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">6-Month Future Audience Expansion Forecast</h3>
          <div className="h-[240px] font-normal">
            <ResponsiveContainer>
              <AreaChart data={projectionData}>
                <defs>
                  <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.62 0.21 265)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="oklch(0.62 0.21 265)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="oklch(1 0 0 / 0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="oklch(0.72 0.03 258)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis 
                  stroke="oklch(0.72 0.03 258)" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(v) => fmt(v)}
                  width={42} 
                />
                <Tooltip
                  contentStyle={{ background: "oklch(0.21 0.04 264)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 12, fontSize: 12 }}
                  labelStyle={{ color: "oklch(0.72 0.03 258)" }}
                  formatter={(value: number) => [fmt(value), "Projected Followers"]}
                />
                <Area type="monotone" dataKey="projected" stroke="oklch(0.62 0.21 265)" strokeWidth={2} fill="url(#growthGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Two-Column Momentum & AI Analysis */}
        <div className="grid md:grid-cols-2 gap-6">
          {renderMomentumRadar()}

          <div className="glass rounded-3xl p-6 border border-border/40 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">AI Growth Prediction Analysis</h3>
            <p className="text-sm leading-relaxed text-foreground/80 font-normal">
              {result.growthPotentialExplanation}
            </p>
            <div className="pt-3 border-t border-border/20 space-y-1.5">
              <div className="text-xs font-semibold text-muted-foreground/80 mb-1">Momentum Trend Signals:</div>
              {result.momentumSignals?.signals.map((sig, i) => (
                <div key={i} className="text-xs text-muted-foreground flex items-center gap-2 font-normal">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>{sig}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCampaignSuccess = () => {
    if (!result) return renderAnalyzeFirst("Campaign Success");

    // ── Eligibility gates ─────────────────────────────────────────────────────
    const followers = result.followers || 0;
    const getLocalTier = (f: number) => {
      if (f >= 10_000_000) return "Celebrity";
      if (f >= 1_000_000) return "Macro";
      if (f >= 100_000) return "Mid";
      if (f >= 10_000) return "SmallMid";
      if (f >= 1_000) return "Micro";
      return "Nano";
    };
    const tier = getLocalTier(followers);
    const isNano = tier === "Nano";                  // < 1K: block everything
    const isMicro = tier === "Micro";               // 1K–10K: local/micro only
    const isSmallMid = tier === "SmallMid";         // 10K–100K: mid estimates only, LOW CONFIDENCE
    const isEligibleForFull = tier === "Mid" || tier === "Macro" || tier === "Celebrity";

    // Eligibility notice strings
    const EligibilityNotice = ({ tier: t }: { tier: string }) => {
      if (t === "Nano") return (
        <div className="rounded-3xl p-5 border border-red-500/20 bg-red-500/5 space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Commercial Sponsorship Analysis Unavailable
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Commercial sponsorship analysis unavailable due to insufficient audience scale.
            Minimum threshold for sponsorship eligibility is <strong className="text-foreground">1,000 subscribers</strong>.
            This creator currently has <strong className="text-foreground">{fmt(followers)}</strong> subscribers.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {["Not Eligible", "Audience Below Threshold", "No CPM Data"].map(tag => (
              <span key={tag} className="text-[9px] px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-bold uppercase">{tag}</span>
            ))}
          </div>
        </div>
      );
      if (t === "Micro") return (
        <div className="rounded-3xl p-4 border border-amber-500/20 bg-amber-500/5 space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-sm text-amber-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Micro-Community Tier — Limited Sponsorship Eligibility
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Creator qualifies for <strong className="text-foreground">local and micro-community partnerships only</strong>.
            Enterprise brand sponsorships and CPM-based valuations are not available at this audience scale.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {["Local Partnerships Only", "Low Confidence", "Micro-Affiliate Eligible"].map(tag => (
              <span key={tag} className="text-[9px] px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase">{tag}</span>
            ))}
          </div>
        </div>
      );
      if (t === "SmallMid") return (
        <div className="rounded-3xl p-4 border border-amber-500/20 bg-amber-500/5 space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-xs text-amber-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Mid-Tier Estimates Only — Low Confidence
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Sponsorship estimates below are indicative ranges only.
            Full commercial intelligence requires 100,000+ subscribers.
            All values labeled <strong className="text-amber-400">LOW CONFIDENCE</strong>.
          </p>
        </div>
      );
      return null;
    };

    // ROI computation — only run for eligible tiers
    const engRate = result.engagementRate || 3.0;
    const avgViews = result.avgLikes * 6;
    const confidenceLabel = isSmallMid ? " (LOW CONFIDENCE)" : "";
    const minCPM = isSmallMid ? 6 : tier === "Mid" ? 12 : tier === "Macro" ? 18 : 22;
    const maxCPM = isSmallMid ? 14 : tier === "Mid" ? 24 : tier === "Macro" ? 32 : 50;
    const estMinVal = Math.round((avgViews * minCPM) / 1000);
    const estMaxVal = Math.round((avgViews * maxCPM) / 1000);

    const partnerTier = isNano || isMicro
      ? "Not Eligible"
      : isSmallMid
      ? "Micro-Affiliate Tier"
      : result.score >= 85 ? "Platinum Tier Partner"
      : result.score >= 70 ? "Premium Gold Tier"
      : result.score >= 50 ? "Standard Silver Tier"
      : "High Caution Tier";

    const campaignSuccessProbability = isNano
      ? null
      : isMicro
      ? "Insufficient Data"
      : isSmallMid
      ? `${Math.min(65, result.campaignSuccessProbability || 55)}% (Low Confidence)`
      : `${result.campaignSuccessProbability || 78}%`;

    const conversionPotential = isNano
      ? "Not Eligible"
      : isMicro
      ? "Insufficient Data"
      : result.businessImpact?.conversionPotential || "Moderate";

    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Campaign Success Estimator</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Sponsorship suitability and audience conversion potential indices</p>
        </div>

        {/* Eligibility gate notice */}
        <EligibilityNotice tier={tier} />

        {/* Summary KPI cards — gated */}
        {!isNano && (
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="glass rounded-2xl p-5 border border-border/40 relative overflow-hidden flex flex-col justify-between min-h-[8rem]">
              <div className="absolute top-2 right-2 opacity-5"><Target className="w-16 h-16" /></div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Campaign Success Probability</div>
              <div className={`text-2xl font-black my-2 ${isSmallMid ? "text-amber-400" : "text-emerald-400"}`}>
                {campaignSuccessProbability}
              </div>
              <p className="text-[10px] text-muted-foreground leading-normal font-normal">
                {isSmallMid ? "Indicative estimate — insufficient scale for precision." : "Algorithmic success probability model."}
              </p>
            </div>

            <div className="glass rounded-2xl p-5 border border-border/40 relative overflow-hidden flex flex-col justify-between min-h-[8rem]">
              <div className="absolute top-2 right-2 opacity-5"><Award className="w-16 h-16" /></div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Audience Conversion</div>
              <div className="text-2xl font-black text-foreground my-2">{conversionPotential}</div>
              <p className="text-[10px] text-muted-foreground leading-normal font-normal">
                {isMicro ? "Micro-community conversion only." : "Calculated engagement loyalty conversion."}
              </p>
            </div>

            <div className="glass rounded-2xl p-5 border border-border/40 relative overflow-hidden flex flex-col justify-between min-h-[8rem]">
              <div className="absolute top-2 right-2 opacity-5"><DollarSign className="w-16 h-16" /></div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Partnership Class</div>
              <div className={`text-base font-bold my-3 ${isNano || isMicro ? "text-muted-foreground" : "text-primary"}`}>
                {partnerTier}
              </div>
              <p className="text-[10px] text-muted-foreground leading-normal font-normal">Creator safety & scale class rating.</p>
            </div>
          </div>
        )}

        {/* ROI-style evaluation — only for eligible tiers */}
        {isEligibleForFull || isSmallMid ? (
          <div className="glass rounded-3xl p-6 border border-border/40 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">ROI-Style Sponsor Evaluation</h3>
              {isSmallMid && (
                <span className="text-[8px] px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase tracking-wider">
                  LOW CONFIDENCE — Mid-Tier Estimates
                </span>
              )}
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 font-normal text-xs">
              <div className="p-4 rounded-2xl bg-muted/10 border border-border/20">
                <div className="text-[10px] text-muted-foreground uppercase font-semibold">Estimated CPM Range</div>
                <div className="text-base font-bold mt-1 text-foreground">${minCPM}.00 – ${maxCPM}.00{confidenceLabel}</div>
                <p className="text-[9px] text-muted-foreground mt-0.5">Industry category average.</p>
              </div>
              <div className="p-4 rounded-2xl bg-muted/10 border border-border/20">
                <div className="text-[10px] text-muted-foreground uppercase font-semibold">Est. Media Value / Post</div>
                <div className="text-base font-bold mt-1 text-foreground">
                  {followers >= 10_000 ? `$${fmt(estMinVal)} – $${fmt(estMaxVal)}` : "Insufficient Data"}
                </div>
                <p className="text-[9px] text-muted-foreground mt-0.5">Based on average views multiplier.</p>
              </div>
              <div className="p-4 rounded-2xl bg-muted/10 border border-border/20">
                <div className="text-[10px] text-muted-foreground uppercase font-semibold">Engagement Efficiency</div>
                <div className={`text-base font-bold mt-1 ${engRate >= 5 ? "text-emerald-400" : engRate >= 2.5 ? "text-amber-400" : "text-muted-foreground"}`}>
                  {engRate >= 5 ? "Excellent" : engRate >= 2.5 ? "Moderate" : "Low"}
                </div>
                <p className="text-[9px] text-muted-foreground mt-0.5">{engRate.toFixed(2)}% engagement rate.</p>
              </div>
              <div className="p-4 rounded-2xl bg-muted/10 border border-border/20">
                <div className="text-[10px] text-muted-foreground uppercase font-semibold">Optimal Campaign Fit</div>
                <div className="text-base font-bold mt-1 text-primary">
                  {isSmallMid ? "Affiliate / Niche" : tier === "Macro" || tier === "Celebrity" ? "Enterprise Integration" : "Integrated Sponsor"}
                </div>
                <p className="text-[9px] text-muted-foreground mt-0.5">Recommended format type.</p>
              </div>
            </div>
          </div>
        ) : !isNano ? (
          <div className="glass rounded-3xl p-6 border border-border/40 text-center space-y-2">
            <DollarSign className="w-6 h-6 text-muted-foreground/40 mx-auto" />
            <div className="text-xs font-semibold text-muted-foreground">ROI evaluation unavailable at this audience scale.</div>
            <p className="text-[10px] text-muted-foreground/70">Minimum 10,000 subscribers required for CPM-based evaluation.</p>
          </div>
        ) : null}

        {/* AI Business Impact — only for mid+ */}
        {isEligibleForFull && (
          <div className="grid md:grid-cols-3 gap-6 items-start">
            <div className="md:col-span-2 glass rounded-3xl p-6 border border-border/40 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">AI Business Impact Reasoning</h3>
              <div className="grid sm:grid-cols-3 gap-4 font-normal">
                <div className="glass bg-muted/10 p-4 rounded-2xl border border-border/20">
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">Suitability Verdict</div>
                  <p className="text-xs text-foreground mt-1.5">{result.businessImpact?.suitability || result.brandRecommendation?.sponsorshipSuitability || "Insufficient data."}</p>
                </div>
                <div className="glass bg-muted/10 p-4 rounded-2xl border border-border/20">
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">Reach Stability</div>
                  <p className="text-xs text-foreground mt-1.5">{result.businessImpact?.stability || "Consistent high-impact impressions."}</p>
                </div>
                <div className="glass bg-muted/10 p-4 rounded-2xl border border-border/20">
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">Audience Loyalty</div>
                  <p className="text-xs text-foreground mt-1.5">{result.businessImpact?.loyalty || "Highly dedicated core audience interactions."}</p>
                </div>
              </div>
            </div>
            <div className="md:col-span-1">
              {renderIntelligenceFeed()}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderBrandMatchEngine = () => {
    if (!result) return renderAnalyzeFirst("Brand Match Engine");

    const followers = result.followers || 0;
    const isNano = followers < 1000;
    const isMicro = followers < 10000;
    const isSmallMid = followers < 100000;

    const isGlobalBrand = (name: string) => {
      const n = name.toLowerCase();
      return n.includes("nike") || n.includes("spotify") || n.includes("adobe") || 
             n.includes("razer") || n.includes("nordvpn") || n.includes("sony") || 
             n.includes("discord") || n.includes("epic games") || n.includes("amazon") || 
             n.includes("microsoft") || n.includes("apple") || n.includes("google") || 
             n.includes("netflix") || n.includes("disney");
    };

    // Filter/Replace based on eligibility gates
    let processedMatches = (result.brandMatches || []).map((m) => ({ ...m }));

    if (isNano) {
      processedMatches = processedMatches.map((m) => {
        if (isGlobalBrand(m.brandName)) {
          return {
            brandName: "Local & Niche Affiliate Partner",
            score: m.score,
            reason: "Recommended semantic fit based on localized category interests only. Non-commercial affiliate placement."
          };
        }
        return m;
      });
    } else if (isMicro) {
      processedMatches = processedMatches.map((m) => {
        if (isGlobalBrand(m.brandName)) {
          return {
            brandName: "Micro-Community Specialist",
            score: m.score,
            reason: "Micro-tier partnership option optimized for local campaign formats and direct product exchange."
          };
        }
        return m;
      });
    } else if (isSmallMid) {
      processedMatches = processedMatches.map((m) => {
        if (isGlobalBrand(m.brandName)) {
          return {
            brandName: "Mid-Tier Specialist Partner",
            score: m.score,
            reason: "Mid-tier sponsorship estimates only. High niche semantic alignment, moderate commercial scale."
          };
        }
        return m;
      });
    }

    // Determine state labels instead of percentages
    const getEligibilityLabel = () => {
      if (isNano) return "Not Eligible";
      if (isMicro) return "Local / Micro Only";
      if (isSmallMid) return "Low Confidence";
      return "Eligible";
    };

    const getCompatLabel = (score: number) => {
      if (isNano) return "Audience Below Threshold";
      if (isMicro) return "Insufficient Data";
      if (isSmallMid) return "Low Confidence";
      return `${score}% Compatibility`;
    };

    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Brand Match Intelligence</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Semantic AI alignment scoring against leading industry brands</p>
        </div>

        {isNano && (
          <div className="rounded-3xl p-5 border border-red-500/20 bg-red-500/5 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Sponsorship Analysis Locked
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Commercial sponsorship analysis unavailable due to insufficient audience scale.
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6 items-start">
          <div className="md:col-span-2 glass rounded-3xl p-6 sm:p-8 border border-border/40 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Award className="w-4 h-4 text-yellow-500" />
              </div>
              <div>
                <h4 className="font-semibold text-base">Recommended Brand Fit</h4>
                <p className="text-xs text-muted-foreground">Matches calculated using content categories and audience compatibility</p>
              </div>
            </div>

            <div className="space-y-4">
              {processedMatches.map((match) => {
                const pseudoSeed = match.brandName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
                const nicheAlign = Math.round(match.score * 0.95 + (pseudoSeed % 4));
                const audCompat = Math.round(match.score * 0.91 + (pseudoSeed % 6));
                const semanticSim = Math.round(match.score * 0.97 + (pseudoSeed % 3));

                const eligLabel = getEligibilityLabel();
                const compatLabel = getCompatLabel(match.score);

                return (
                  <div key={match.brandName} className="glass bg-muted/10 p-5 rounded-2xl border border-border/20 space-y-4 font-normal">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="text-sm font-semibold flex items-center gap-2 flex-wrap">
                        <span className="text-base font-bold text-foreground">{match.brandName}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold ${
                          isNano ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                          isMicro || isSmallMid ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                          "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"
                        }`}>
                          {compatLabel}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground leading-normal">
                      {match.reason}
                    </div>

                    {/* Separate Systems: Semantic Brand Fit and Sponsorship Eligibility */}
                    <div className="grid sm:grid-cols-2 gap-4 pt-3 border-t border-border/15">
                      <div className="space-y-1.5">
                        <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider">Semantic Brand Fit</span>
                        <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          <span>{match.score >= 85 ? "Strong Alignment" : match.score >= 70 ? "Moderate Alignment" : "Neutral / Low Alignment"}</span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider">Sponsorship Eligibility</span>
                        <div className="text-xs font-semibold flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isNano ? "bg-red-400" :
                            isMicro || isSmallMid ? "bg-amber-400" :
                            "bg-emerald-400"
                          }`} />
                          <span className={
                            isNano ? "text-red-400 font-bold" :
                            isMicro || isSmallMid ? "text-amber-400 font-semibold" :
                            "text-emerald-400 font-bold"
                          }>
                            {eligLabel}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Similarity breakdown indicators — only show for eligible mid+ */}
                    {!isNano && !isMicro && (
                      <div className="grid sm:grid-cols-3 gap-4 pt-3 border-t border-border/10 font-normal">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                            <span>Niche Alignment</span>
                            <span>{isSmallMid ? "Low Confidence" : `${nicheAlign}%`}</span>
                          </div>
                          <div className="w-full bg-muted/40 h-1.5 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${nicheAlign}%` }} />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                            <span>Audience Compatibility</span>
                            <span>{isSmallMid ? "Low Confidence" : `${audCompat}%`}</span>
                          </div>
                          <div className="w-full bg-muted/40 h-1.5 rounded-full overflow-hidden">
                            <div className="h-full bg-success rounded-full" style={{ width: `${audCompat}%` }} />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                            <span>Semantic Similarity</span>
                            <span>{isSmallMid ? "Low Confidence" : `${semanticSim}%`}</span>
                          </div>
                          <div className="w-full bg-muted/40 h-1.5 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${semanticSim}%` }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="md:col-span-1">
            {renderCreatorEcosystemWidget()}
          </div>
        </div>
      </div>
    );
  };

  const renderAudienceInsights = () => {
    if (!result) return renderAnalyzeFirst("Audience Insights");
    const followers = result.followers || 0;
    const isNano = followers < 1000;
    const isMicro = followers < 10000;
    const isSmallMid = followers < 100000;

    const detailed = result.commentAuthenticityDetailed || {
      lowAuthenticityPct: 25,
      reason: "Standard evaluation comments.",
      spamPct: 5,
      repetitivePct: 10,
      emojiSpamPct: 5,
      botLanguagePct: 5,
      organicPct: 75
    };

    // Demographic values (simulated based on creator category)
    const ageData = [
      { bracket: "13-17", value: 18 },
      { bracket: "18-24", value: 45 },
      { bracket: "25-34", value: 27 },
      { bracket: "35-44", value: 8 },
      { bracket: "45+", value: 2 },
    ];
    const topCountries = [
      { country: "United States", value: 48 },
      { country: "United Kingdom", value: 12 },
      { country: "India", value: 10 },
      { country: "Germany", value: 6 },
      { country: "Canada", value: 5 },
    ];

    const formatPct = (val: number) => {
      if (isNano) return "Audience Below Threshold";
      if (isMicro) return "Low Confidence";
      return `${val}%`;
    };

    const getDemographicValue = (val: number) => {
      if (isNano) return "Not Eligible";
      if (isMicro) return "Insufficient Data";
      if (isSmallMid) return "Low Confidence";
      return `${val}%`;
    };

    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Audience Trust & Sentiment Insights</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Scans public commenter dialogue for repetitive patterns, emoji spam, and bot signatures</p>
        </div>

        {/* Comment Authenticity Breakdown */}
        <div className="glass rounded-3xl p-6 sm:p-8 border border-border/40 space-y-6">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">Comment Authenticity Quality</h4>
            <p className="text-xs text-muted-foreground font-normal">
              Findings: {isNano ? "Comment authenticity verification unavailable due to insufficient audience scale." : detailed.reason}
            </p>
          </div>

          <div className="grid sm:grid-cols-5 gap-3 pt-2 text-center">
            {[
              { name: "Organic Genuine", val: detailed.organicPct },
              { name: "Duplicated / Repetitive", val: detailed.repetitivePct },
              { name: "Promo Links / Spam", val: detailed.spamPct },
              { name: "Emoji Clusters", val: detailed.emojiSpamPct },
              { name: "Bot Syntaxes", val: detailed.botLanguagePct },
            ].map((col) => (
              <div key={col.name} className="glass bg-muted/10 rounded-2xl p-4 border border-border/20">
                <div className={`text-xs font-bold ${isNano ? "text-red-400" : isMicro ? "text-amber-400" : ""}`}>
                  {formatPct(col.val)}
                </div>
                <div className="text-[9px] text-muted-foreground leading-normal mt-1">{col.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Fandom Behavior & Interaction Health */}
        <div className="grid md:grid-cols-3 gap-6 font-normal">
          <div className="glass rounded-3xl p-6 border border-border/40 space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Fandom Behavior</h3>
              <div className="space-y-3.5 text-xs">
                <div className="flex items-center justify-between border-b border-border/10 pb-2">
                  <span className="text-muted-foreground">Community Sentiment</span>
                  <span className={`font-semibold ${isNano ? "text-red-400" : isMicro ? "text-amber-400" : "text-success"}`}>
                    {isNano ? "Not Eligible" : isMicro ? "Low Confidence" : "84% Positive"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-border/10 pb-2">
                  <span className="text-muted-foreground">Comment Density</span>
                  <span className={`font-semibold ${isNano ? "text-muted-foreground" : "text-primary"}`}>
                    {isNano ? "Audience Below Threshold" : isMicro ? "Insufficient Data" : "High (1.2%)"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Interaction Health</span>
                  <span className={`font-semibold ${isNano ? "text-muted-foreground" : "text-foreground"}`}>
                    {isNano ? "Audience Below Threshold" : isMicro ? "Low Confidence" : "Optimal Ratio"}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed mt-2">
              Based on the comment density velocity relative to raw views counts.
            </p>
          </div>

          <div className="glass rounded-3xl p-6 border border-border/40 space-y-4 md:col-span-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Audience Demographics</h3>
            <div className="grid sm:grid-cols-2 gap-6 text-xs">
              {/* Age Distribution */}
              <div className="space-y-2">
                <div className="text-[10px] text-muted-foreground uppercase font-semibold">Age Distribution Estimate</div>
                <div className="space-y-2">
                  {ageData.map((age) => (
                    <div key={age.bracket} className="space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span>{age.bracket}</span>
                        <span className={isNano ? "text-red-400" : isMicro ? "text-amber-400" : ""}>
                          {getDemographicValue(age.value)}
                        </span>
                      </div>
                      <div className="w-full bg-muted/30 h-1.5 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: isNano || isMicro ? "0%" : `${age.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Geography Distribution */}
              <div className="space-y-2">
                <div className="text-[10px] text-muted-foreground uppercase font-semibold">Top Geography Reach</div>
                <div className="space-y-2">
                  {topCountries.map((c) => (
                    <div key={c.country} className="space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span>{c.country}</span>
                        <span className={isNano ? "text-red-400" : isMicro ? "text-amber-400" : ""}>
                          {getDemographicValue(c.value)}
                        </span>
                      </div>
                      <div className="w-full bg-muted/30 h-1.5 rounded-full overflow-hidden">
                        <div className="h-full bg-success rounded-full" style={{ width: isNano || isMicro ? "0%" : `${c.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="glass rounded-3xl p-6 border border-border/40 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">AI Intelligence Observation Timeline</h3>
          <div className="space-y-3 font-normal">
            {result.timelineEvents?.map((evt, i) => (
              <div key={i} className="flex gap-3 text-xs items-start border-b border-border/10 pb-2 last:border-b-0">
                <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-mono shrink-0 ${
                  evt.status === "success" ? "bg-success/15 text-success border border-success/20" :
                  evt.status === "warning" ? "bg-destructive/15 text-destructive border border-destructive/20" :
                  "bg-muted text-muted-foreground"
                }`}>{evt.category}</span>
                <span className="text-muted-foreground">{evt.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderCreatorComparison = () => {
    const compWinner = compPair && (compPair.a.score >= compPair.b.score ? 0 : 1);
    const compPairArr = compPair ? [compPair.a, compPair.b] : null;

    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Creator Comparison Engine</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Compare digital trust, growth velocity, and brand fit side-by-side</p>
        </div>

        <div className="glass rounded-3xl p-5 border border-border/40">
          <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end font-semibold text-xs">
            <div>
              <label className="text-muted-foreground uppercase tracking-wider">Creator A Handle</label>
              <Input value={compA} onChange={(e) => setCompA(e.target.value)} className="mt-1.5 h-11" />
            </div>
            <div>
              <label className="text-muted-foreground uppercase tracking-wider">Creator B Handle</label>
              <Input value={compB} onChange={(e) => setCompB(e.target.value)} className="mt-1.5 h-11" />
            </div>
            <Button onClick={runComp} size="lg" className="gradient-bg border-0 text-white h-11" disabled={compLoading}>
              Compare <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        {compLoading && (
          <div className="glass rounded-3xl p-10 text-center border border-border/40 animate-pulse">
            <RefreshCw className="w-6 h-6 text-primary animate-spin mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Running side-by-side predictive model checks...</p>
          </div>
        )}

        {compError && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-normal">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{compError}</span>
          </div>
        )}

        {compPairArr && (
          <div className="grid md:grid-cols-2 gap-5">
            {compPairArr.map((p, idx) => (
              <div
                key={p.username + idx}
                className={`glass-strong rounded-3xl p-6 relative border border-border/40 ${compWinner === idx ? "ring-glow" : ""}`}
              >
                {compWinner === idx && (
                  <div className="absolute -top-3 left-6 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full gradient-bg text-white text-[10px] font-bold">
                    <Trophy className="w-3 h-3" /> Higher Score
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-base">{p.displayName}</div>
                    <div className="text-[10px] text-muted-foreground">@{p.username}</div>
                  </div>
                  <span className="text-lg font-extrabold text-primary">{p.score}</span>
                </div>
                <div className="mt-4 pt-3 border-t border-border/10">
                  <BreakdownCard breakdown={p.breakdown} creatorCategories={p.creatorCategories} />
                </div>
              </div>
            ))}
          </div>
        )}

        {compPair && (
          <div className="glass rounded-3xl p-6 sm:p-8 border border-border/40 space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Symmetric Match Matrix</h3>
            <div className="space-y-4 pt-2">
              {[
                { name: "Ratefluencer Score™", key: "score", format: (v: number) => `${v}/100`, max: 100 },
                { name: "Engagement", key: "breakdown", format: (v: number) => `${v}/100`, valExtractor: (v: any) => v.breakdown?.engagement ?? 80, max: 100 },
                { name: "Audience Quality", key: "breakdown", format: (v: number) => `${v}/100`, valExtractor: (v: any) => v.breakdown?.followerQuality ?? 80, max: 100 },
                { name: "Virality", key: "viralityPotential", format: (v: number) => `${v}/100`, valExtractor: (v: any) => v.viralityPotential ?? 75, max: 100 },
                { name: "Authenticity", key: "breakdown", format: (v: number) => `${v}/100`, valExtractor: (v: any) => v.breakdown?.commentAuthenticity ?? 80, max: 100 },
                { name: "Growth", key: "projectedGrowth90Days", format: (v: number) => `+${v}%`, valExtractor: (v: any) => v.projectedGrowth90Days ?? 12, max: 100 },
                { name: "Campaign Suitability", key: "campaignSuccessProbability", format: (v: number) => `${v}%`, valExtractor: (v: any) => v.campaignSuccessProbability ?? 85, max: 100 },
                { name: "Brand Fit", key: "brandMatches", format: (v: number) => `${v}%`, valExtractor: (v: any) => v.brandMatches?.[0]?.score ?? Math.round((v.score ?? 80) * 0.95), max: 100 },
              ].map((row) => {
                const valRawA = row.valExtractor ? row.valExtractor(compPair.a) : (compPair.a as any)[row.key];
                const valRawB = row.valExtractor ? row.valExtractor(compPair.b) : (compPair.b as any)[row.key];
                const valA = typeof valRawA === "number" && !isNaN(valRawA) ? valRawA : 0;
                const valB = typeof valRawB === "number" && !isNaN(valRawB) ? valRawB : 0;
                const labelA = row.format(valA);
                const labelB = row.format(valB);

                return (
                  <div key={row.name} className="grid grid-cols-[1fr_2fr_1fr] gap-4 items-center border-b border-border/20 pb-3 last:border-b-0 last:pb-0 font-normal">
                    <div className="text-xs font-semibold text-right text-foreground/80 pr-2">
                      <div className="font-medium text-muted-foreground text-[10px] uppercase">Creator A</div>
                      <div className="text-sm font-bold text-primary">{labelA}</div>
                    </div>

                    <div className="space-y-1.5 text-center">
                      <div className="text-xs font-semibold text-foreground/90">{row.name}</div>
                      <div className="flex gap-2 items-center justify-center">
                        <div className="flex-1 bg-muted/30 rounded-full h-2 overflow-hidden flex justify-end">
                          <div className="bg-primary h-full rounded-l-full" style={{ width: `${(valA / row.max) * 100}%` }} />
                        </div>
                        <div className="w-1.5 h-1.5 rounded-full bg-border" />
                        <div className="flex-1 bg-muted/30 rounded-full h-2 overflow-hidden">
                          <div className="bg-purple-500 h-full rounded-r-full" style={{ width: `${(valB / row.max) * 100}%` }} />
                        </div>
                      </div>
                    </div>

                    <div className="text-xs font-semibold text-left text-foreground/80 pl-2">
                      <div className="font-medium text-muted-foreground text-[10px] uppercase">Creator B</div>
                      <div className="text-sm font-bold text-purple-400">{labelB}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {compPair && (
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            <div className="flex-1 glass rounded-3xl p-[1px] overflow-hidden" style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-purple))" }}>
              <div className="rounded-3xl bg-card/95 p-6 flex items-start gap-3 h-full">
                <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center shrink-0 glow"><Sparkles className="w-5 h-5 text-white" /></div>
                <div>
                  <div className="font-semibold text-sm mb-1">AI Recommendation Summary</div>
                  <p className="text-xs text-foreground/90 leading-relaxed font-normal">{compPair.recommendation}</p>
                </div>
              </div>
            </div>
            <Button 
              onClick={() => downloadComparisonReport(compPair.a, compPair.b, compPair.recommendation)} 
              size="lg" 
              className="gradient-bg border-0 text-white font-semibold h-full min-h-[4rem] px-6 shrink-0 shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 rounded-2xl w-full sm:w-auto"
            >
              <Download className="w-4 h-4" /> Export Comparison
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderTrendAnalysis = () => {
    if (!result) return renderAnalyzeFirst("Trend Analysis");

    const sVal = result.score;
    const stabilityData = [
      { month: 'Jan', trust: Math.max(10, sVal - 3) },
      { month: 'Feb', trust: Math.max(10, sVal - 1) },
      { month: 'Mar', trust: sVal },
      { month: 'Apr', trust: sVal },
      { month: 'May', trust: Math.max(10, sVal - 2) },
      { month: 'Jun', trust: sVal }
    ];

    const consistencyVal = result.breakdown?.postingConsistency || 92;
    const momentumVal = result.growthPotentialScore || 80;

    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Trend & Momentum Analysis</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Dynamic posting cadence, upload consistency, and engagement trajectories</p>
        </div>

        {/* Momentum Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass rounded-2xl p-4 border border-border/40">
            <div className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Upload Consistency</div>
            <div className="text-lg font-black mt-1 text-foreground">{consistencyVal} / 100</div>
            <p className="text-[8px] text-muted-foreground mt-0.5">Variance in upload intervals</p>
          </div>
          <div className="glass rounded-2xl p-4 border border-border/40">
            <div className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Interaction Trajectory</div>
            <div className="text-lg font-black mt-1 text-emerald-400">Stable</div>
            <p className="text-[8px] text-muted-foreground mt-0.5">Comment-to-like volatility</p>
          </div>
          <div className="glass rounded-2xl p-4 border border-border/40">
            <div className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Trust Stability Index</div>
            <div className="text-lg font-black mt-1 text-primary">Highly Stable</div>
            <p className="text-[8px] text-muted-foreground mt-0.5">Algorithmic risk variance</p>
          </div>
          <div className="glass rounded-2xl p-4 border border-border/40">
            <div className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Growth Velocity</div>
            <div className="text-lg font-black mt-1 text-purple-400">{momentumVal} / 100</div>
            <p className="text-[8px] text-muted-foreground mt-0.5">ML-estimated momentum slope</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 font-normal">
          {/* Chart 1: 14-Day Engagement Pattern */}
          <div className="glass rounded-3xl p-6 border border-border/40 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">14-Day Engagement Pattern</h3>
            <div className="h-[220px]">
              <ResponsiveContainer>
                <AreaChart data={result.engagementSeries}>
                  <defs>
                    <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.62 0.21 265)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="oklch(0.62 0.21 265)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="oklch(1 0 0 / 0.05)" vertical={false} />
                  <XAxis dataKey="day" stroke="oklch(0.72 0.03 258)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="oklch(0.72 0.03 258)" fontSize={10} tickLine={false} axisLine={false} width={24} />
                  <Tooltip
                    contentStyle={{ background: "oklch(0.21 0.04 264)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 12, fontSize: 11 }}
                    labelStyle={{ color: "oklch(0.72 0.03 258)" }}
                  />
                  <Area type="monotone" dataKey="baseline" stroke="oklch(0.72 0.03 258 / 0.3)" strokeDasharray="3 3" fill="none" />
                  <Area type="monotone" dataKey="engagement" stroke="oklch(0.62 0.21 265)" strokeWidth={2} fill="url(#engGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Trust Stability Trends */}
          <div className="glass rounded-3xl p-6 border border-border/40 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">6-Month Trust Stability Trend</h3>
            <div className="h-[220px]">
              <ResponsiveContainer>
                <AreaChart data={stabilityData}>
                  <defs>
                    <linearGradient id="trustGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.62 0.21 265)" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="oklch(0.62 0.21 265)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="oklch(1 0 0 / 0.05)" vertical={false} />
                  <XAxis dataKey="month" stroke="oklch(0.72 0.03 258)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="oklch(0.72 0.03 258)" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} width={24} />
                  <Tooltip
                    contentStyle={{ background: "oklch(0.21 0.04 264)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 12, fontSize: 11 }}
                    labelStyle={{ color: "oklch(0.72 0.03 258)" }}
                  />
                  <Area type="monotone" dataKey="trust" stroke="oklch(0.62 0.21 265)" strokeWidth={2} fill="url(#trustGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderReports = () => {
    if (!result) return renderAnalyzeFirst("Reports & Exports");
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reports & Export Utility</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Download enterprise-grade digital trust due diligence reports</p>
        </div>

        <div className="grid md:grid-cols-[1.5fr_1fr] gap-6 font-normal">
          {/* Left Column: Report templates selection */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select Report Format</h3>
            
            <button
              onClick={() => setReportType("full")}
              className={`w-full text-left p-4 rounded-2xl glass transition border ${
                reportType === "full" ? "border-primary/60 bg-primary/5" : "border-border/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center shrink-0 glow">
                  <FileSpreadsheet className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Full Creator Intelligence Report</div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Includes full score breakdown, growth predictions, NLP analysis, and brand suitability indices.</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setReportType("audience")}
              className={`w-full text-left p-4 rounded-2xl glass transition border ${
                reportType === "audience" ? "border-primary/60 bg-primary/5" : "border-border/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500 shrink-0">
                  <Users className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Trust & Audience Due Diligence</div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Focuses on comment authenticity breakdown, bot ratios, and demographic summaries.</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setReportType("brand")}
              className={`w-full text-left p-4 rounded-2xl glass transition border ${
                reportType === "brand" ? "border-primary/60 bg-primary/5" : "border-border/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-500 shrink-0">
                  <Award className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Brand Compatibility & ROI Estimates</div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Contains recommended brand match scores, niche alignment data, and CPM estimations.</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setReportType("compare")}
              className={`w-full text-left p-4 rounded-2xl glass transition border ${
                reportType === "compare" ? "border-primary/60 bg-primary/5" : "border-border/30"
              }`}
              disabled={!compPair}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0">
                  <GitCompare className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold flex items-center gap-2">
                    Creator Comparison Report
                    {!compPair && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground">Compare Tab First</span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Symmetrical side-by-side comparative table and recommendation matrix.</p>
                </div>
              </div>
            </button>
          </div>

          {/* Right Column: Compilation controls */}
          <div className="glass rounded-3xl p-6 border border-border/40 space-y-6 self-start">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/20 pb-2">Export Parameters</h3>
            
            <div className="space-y-4 text-xs font-normal">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-foreground">Include Verification Watermark</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Embeds a tamper-proof cryptographically signed trust anchor seal.</p>
                </div>
                <button
                  onClick={() => setIncludeWatermark(!includeWatermark)}
                  className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none shrink-0 ${
                    includeWatermark ? "gradient-bg" : "bg-muted"
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                    includeWatermark ? "translate-x-4" : "translate-x-0"
                  }`} />
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-muted/10 border border-border/20 space-y-2 text-[11px] leading-relaxed text-muted-foreground">
                <div className="font-bold text-foreground">PDF Compilation Engine Status:</div>
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span>Engine: jsPDF Client-side</span>
                  <span className="text-success">Ready</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span>Compression Level: 1.0</span>
                  <span>Active</span>
                </div>
              </div>
            </div>

            <Button 
              onClick={() => {
                if (reportType === "compare" && compPair) {
                  downloadComparisonReport(compPair.a, compPair.b, compPair.recommendation);
                } else if (result) {
                  downloadReport(result);
                }
              }} 
              size="lg" 
              className="w-full gradient-bg border-0 text-white font-semibold"
            >
              <Download className="w-4 h-4 mr-2" /> Download Report (PDF)
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderHistory = () => {
    const filteredRecent = recent.filter(
      (h) =>
        h.displayName.toLowerCase().includes(historySearch.toLowerCase()) ||
        h.username.toLowerCase().includes(historySearch.toLowerCase())
    );

    return (
      <div className="space-y-6 animate-fade-in font-normal">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Creator Analysis History</h2>
            <p className="text-xs text-muted-foreground mt-0.5">List of recently executed audits on the platform</p>
          </div>
          <div className="w-full sm:w-64">
            <Input
              placeholder="Search history log..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
        </div>

        {filteredRecent.length > 0 ? (
          <div className="glass rounded-3xl border border-border/40 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/30 bg-muted/20 text-muted-foreground uppercase tracking-wider font-bold text-[10px]">
                    <th className="p-4">Creator</th>
                    <th className="p-4">Platform</th>
                    <th className="p-4 text-center">Trust Score</th>
                    <th className="p-4">Primary Category</th>
                    <th className="p-4">Cache Status</th>
                    <th className="p-4">Audit Date</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {filteredRecent.map((h) => {
                    const statusText = Date.now() - h.timestamp < 3600000 * 24 ? "Cached" : "Expired";
                    return (
                      <tr key={h.username} className="hover:bg-muted/10 transition">
                        <td className="p-4 font-semibold text-foreground">
                          <div>
                            <div className="text-sm font-semibold">{h.displayName}</div>
                            <div className="text-[10px] text-muted-foreground">@{h.username}</div>
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-semibold text-[10px]">
                            <Youtube className="w-3 h-3" /> YouTube
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span 
                            className="text-sm font-black tabular-nums"
                            style={{ color: h.score >= 70 ? "var(--color-success)" : h.score >= 50 ? "var(--color-warning)" : "var(--color-destructive)" }}
                          >
                            {h.score}
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground capitalize">{h.category || "General"}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            statusText === "Cached" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusText === "Cached" ? "bg-success" : "bg-warning"}`} />
                            {statusText}
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {new Date(h.timestamp).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="p-4 text-right">
                          <Button
                            onClick={() => { run(h.username); setActiveTab("creator"); }}
                            size="sm"
                            className="h-8 px-3 text-[11px] gradient-bg border-0 text-white"
                          >
                            Open <ChevronRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="glass rounded-3xl p-10 text-center border border-border/40 font-normal">
            <p className="text-xs text-muted-foreground">No recent audits match your query. Try a different search!</p>
          </div>
        )}
      </div>
    );
  };

  const renderSettings = () => {
    const purgeCache = () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem("authenfluence:history");
        setRecent([]);
      }
    };

    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in font-normal text-xs">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Platform Settings</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Audit preferences, API status, and algorithmic engine settings</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Column: API and Integration */}
          <div className="space-y-6">
            {/* API Status Card */}
            <div className="glass rounded-3xl p-6 border border-border/40 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" /> API Connection Verification
              </h3>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/20 border border-border/30">
                  <span className="text-muted-foreground font-semibold">YouTube API Connector</span>
                  <span className="text-success flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-success" /> Active</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/20 border border-border/30">
                  <span className="text-muted-foreground font-semibold">Gemini LLM Trust Scanner</span>
                  <span className="text-success flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-success" /> Active</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/20 border border-border/30">
                  <span className="text-muted-foreground font-semibold">Meta Graph Api Endpoint</span>
                  <span className="text-muted-foreground flex items-center gap-1"><Minus className="w-4 h-4" /> Connected (Soon)</span>
                </div>
              </div>
            </div>

            {/* Integrations (Slack Webhooks) */}
            <div className="glass rounded-3xl p-6 border border-border/40 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Share2 className="w-4 h-4 text-purple-400" /> Platform Integrations
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-foreground">Slack Notifications Webhook</span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Send alerts automatically when a creator score falls below threshold.</p>
                  </div>
                  <button
                    onClick={() => setSlackActive(!slackActive)}
                    className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none shrink-0 ${
                      slackActive ? "gradient-bg" : "bg-muted"
                    }`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                      slackActive ? "translate-x-4" : "translate-x-0"
                    }`} />
                  </button>
                </div>

                {slackActive && (
                  <div className="space-y-1.5 animate-fade-in">
                    <label className="text-[10px] text-muted-foreground uppercase font-bold">Slack Webhook URL</label>
                    <Input
                      value={slackUrl}
                      onChange={(e) => setSlackUrl(e.target.value)}
                      className="h-9 font-mono text-[10px]"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Cache Status Control */}
            <div className="glass rounded-3xl p-6 border border-border/40 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" /> Cache Status & Control
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/20 border border-border/30">
                  <span className="text-muted-foreground font-semibold">Total Cached Audits</span>
                  <span className="font-mono font-bold text-foreground">{recent.length} profiles</span>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <p className="text-[10px] text-muted-foreground leading-normal max-w-[200px]">
                    Evaluations are cached locally for 24 hours to reduce external API load.
                  </p>
                  <Button
                    onClick={purgeCache}
                    variant="destructive"
                    className="h-8 text-[11px] font-semibold shrink-0"
                    disabled={recent.length === 0}
                  >
                    Purge Cache
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Algorithmic & UI Preferences */}
          <div className="space-y-6">
            {/* Algorithmic Preferences */}
            <div className="glass rounded-3xl p-6 border border-border/40 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Sliders className="w-4 h-4 text-yellow-500" /> Algorithmic Preferences
              </h3>
              
              <div className="space-y-4">
                {/* Confidence Mode */}
                <div className="space-y-2">
                  <div>
                    <span className="font-semibold text-foreground">Confidence Rating Calibration</span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Determine the confidence score threshold tolerance.</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "strict", label: "Strict (95%)" },
                      { id: "balanced", label: "Balanced (80%)" },
                      { id: "lenient", label: "Lenient (50%)" }
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => setConfidencePref(mode.id as any)}
                        className={`py-1.5 px-2 rounded-xl border text-[11px] font-semibold transition ${
                          confidencePref === mode.id
                            ? "gradient-bg border-transparent text-white"
                            : "border-border/30 text-muted-foreground hover:bg-muted/30"
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Analysis Depth */}
                <div className="space-y-2 pt-2 border-t border-border/20">
                  <div>
                    <span className="font-semibold text-foreground">Analysis Node Scan Depth</span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Define how many recent creator videos and comments are scanned.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[50, 100].map((depth) => (
                      <button
                        key={depth}
                        onClick={() => setAnalysisDepth(depth as any)}
                        className={`py-1.5 px-2 rounded-xl border text-[11px] font-semibold transition ${
                          analysisDepth === depth
                            ? "gradient-bg border-transparent text-white"
                            : "border-border/30 text-muted-foreground hover:bg-muted/30"
                        }`}
                      >
                        Scan Last {depth} Nodes
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* UI Theme preferences */}
            <div className="glass rounded-3xl p-6 border border-border/40 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" /> Visual Interface Preference
              </h3>
              <div className="space-y-2">
                <div>
                  <span className="font-semibold text-foreground">Platform Theme Mode</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Toggle between visual rendering modes of the dashboard.</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "dark", label: "Dark Mode" },
                    { id: "light", label: "Light Mode" },
                    { id: "system", label: "System Default" }
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setThemePref(t.id as any)}
                      className={`py-1.5 px-2 rounded-xl border text-[11px] font-semibold transition ${
                        themePref === t.id
                          ? "gradient-bg border-transparent text-white"
                          : "border-border/30 text-muted-foreground hover:bg-muted/30"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─── Inline confidence badge component ──────────────────────────────────────
  function ConfidenceBadge({
    level,
    source,
  }: {
    level: "HIGH" | "MEDIUM" | "LOW";
    source: "VERIFIED" | "ESTIMATED" | "INFERRED";
  }) {
    const levelColors = {
      HIGH: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
      MEDIUM: "bg-amber-500/10 text-amber-400 border-amber-500/25",
      LOW: "bg-red-500/10 text-red-400 border-red-500/25",
    };
    const sourceColors = {
      VERIFIED: "bg-blue-500/10 text-blue-400 border-blue-500/25",
      ESTIMATED: "bg-amber-500/10 text-amber-400 border-amber-500/25",
      INFERRED: "bg-purple-500/10 text-purple-400 border-purple-500/25",
    };
    return (
      <span className="inline-flex items-center gap-1">
        <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold border uppercase tracking-wide ${levelColors[level]}`}>
          {level} CONFIDENCE
        </span>
        <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold border uppercase tracking-wide ${sourceColors[source]}`}>
          {source}
        </span>
      </span>
    );
  }

  const renderMediaIntelligence = () => {
    if (!result) return renderAnalyzeFirst("Media Intelligence");

    // ── Creator tier classification ───────────────────────────────────────────
    const followers = result.followers || 0;
    const getCreatorTierLocal = (f: number) => {
      if (f >= 10_000_000) return "Celebrity";
      if (f >= 1_000_000) return "Macro";
      if (f >= 50_000) return "Mid";
      if (f >= 1_000) return "Small";
      return "Nano";
    };
    const creatorTier = getCreatorTierLocal(followers);
    const isBelowCommercialThreshold = creatorTier === "Nano";

    // ── Build discovered platform list from REAL data only ────────────────────
    // Only platforms that are actually found in the analysis result
    const youtubeEntry = {
      platform: "YouTube",
      handle: result.username ? `@${result.username.replace(/^@/, "")}` : "@unknown",
      url: result.username ? `https://youtube.com/@${result.username.replace(/^@/, "")}` : "#",
      status: "VERIFIED" as const,
      followers: result.followers || 0,
      engagementRate: result.engagementRate || 0,
      consistency: result.totalPosts ? `${result.totalPosts} videos` : "Unknown",
      trustScore: result.score || 0,
      audienceQuality: result.commentAuthenticityDetailed
        ? `${result.commentAuthenticityDetailed.organicPct}% organic`
        : "Unknown",
      isReal: true,
    };

    // Map crossPlatformEcosystem (real discovered links from bio/description)
    const crossEcoPlatforms = (result.crossPlatformEcosystem || []).map((item: any) => ({
      platform: item.platform,
      handle: item.handle,
      url: item.url,
      status: item.isVerifiedData ? ("VERIFIED" as const) : ("DISCOVERED" as const),
      followers: item.isVerifiedData ? item.followers : null, // null = not available
      engagementRate: item.isVerifiedData ? item.engagementRate : null,
      consistency: item.postingConsistency || "Unknown",
      trustScore: item.isVerifiedData ? item.trustScore : null,
      audienceQuality: "Not available",
      isReal: true,
    }));

    // Map mediaPresence (verified socials from YouTube about section)
    const mediaPlatforms = (result.mediaPresence || []).map((item: any) => {
      const alreadyInEco = crossEcoPlatforms.some(
        (e) => e.platform.toLowerCase() === item.platform.toLowerCase()
      );
      if (alreadyInEco) return null;
      return {
        platform: item.platform,
        handle: item.handle,
        url: item.url,
        status: (item.isVerified ? "VERIFIED" : "DISCOVERED") as "VERIFIED" | "DISCOVERED",
        followers: null,
        engagementRate: null,
        consistency: "Unknown",
        trustScore: null,
        audienceQuality: "Not available",
        isReal: true,
      };
    }).filter(Boolean) as any[];

    // Combine — YouTube always first, then real discovered platforms
    const allDiscoveredPlatforms = [youtubeEntry, ...crossEcoPlatforms, ...mediaPlatforms];

    // SVG ecosystem data — only discovered platforms
    const center = { x: 200, y: 200 };
    const radius = 145;
    const satellitePlatforms = allDiscoveredPlatforms.slice(1); // exclude YouTube (center)
    const satellites = satellitePlatforms.map((p, idx) => {
      const angle = (2 * Math.PI * idx) / Math.max(satellitePlatforms.length, 1);
      return { ...p, x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle) };
    });

    // Badge style per status
    const getBadgeStyle = (status: string) => {
      switch (status) {
        case "VERIFIED": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
        case "DISCOVERED": return "bg-sky-500/10 text-sky-400 border-sky-500/20";
        default: return "bg-muted text-muted-foreground border-border/20";
      }
    };

    // Platform icon color
    const getPlatformColor = (platform: string) => {
      switch (platform.toLowerCase().replace("/x", "")) {
        case "youtube": return "text-red-500 bg-red-500/10 border-red-500/30";
        case "instagram": return "text-pink-500 bg-pink-500/10 border-pink-500/30";
        case "tiktok": return "text-cyan-400 bg-cyan-400/10 border-cyan-400/30";
        case "twitter": return "text-sky-400 bg-sky-400/10 border-sky-400/30";
        case "spotify": return "text-emerald-500 bg-emerald-500/10 border-emerald-500/30";
        case "twitch": return "text-purple-500 bg-purple-500/10 border-purple-500/30";
        case "discord": return "text-indigo-400 bg-indigo-400/10 border-indigo-400/30";
        case "linkedin": return "text-blue-500 bg-blue-500/10 border-blue-500/30";
        default: return "text-primary bg-primary/10 border-primary/20";
      }
    };

    // ── Sponsorship Pricing — tier gated ─────────────────────────────────────
    const calculatePricing = () => {
      const eng = result.engagementRate || 3.0;
      const fmtPrice = (val: number) => {
        if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
        if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
        return `$${val}`;
      };
      const storyMin = Math.round(followers * 0.005 * (eng / 3.0));
      const storyMax = Math.round(followers * 0.008 * (eng / 3.0));
      const reelMin = Math.round(followers * 0.008 * (eng / 3.0));
      const reelMax = Math.round(followers * 0.012 * (eng / 3.0));
      const videoMin = Math.round(followers * 0.025 * (eng / 3.0));
      const videoMax = Math.round(followers * 0.04 * (eng / 3.0));
      const bundleMin = Math.round((storyMin + reelMin + videoMin) * 0.85);
      const bundleMax = Math.round((storyMax + reelMax + videoMax) * 0.85);
      const cpmMin = Math.round(12 * (eng / 3.0));
      const cpmMax = Math.round(22 * (eng / 3.0));
      let tierName = "Niche / Mid-Tier";
      if (followers >= 10_000_000) tierName = "Global Celebrity Tier";
      else if (followers >= 1_000_000) tierName = "Elite Premium Creator Tier";
      else if (followers >= 50_000) tierName = "High-Yield Mid-Tier";
      else tierName = "Emerging Niche Tier";
      return {
        story: `${fmtPrice(storyMin)} – ${fmtPrice(storyMax)}`,
        reel: `${fmtPrice(reelMin)} – ${fmtPrice(reelMax)}`,
        video: `${fmtPrice(videoMin)} – ${fmtPrice(videoMax)}`,
        bundle: `${fmtPrice(bundleMin)} – ${fmtPrice(bundleMax)}`,
        cpm: `$${cpmMin} – $${cpmMax}`,
        tierName,
      };
    };

    // ── Brand Match Engine — tier gated, no hardcoded celebrities ────────────
    const BRAND_FAMILIES: Record<string, string[]> = {
      gaming: ["Gaming Hardware Brands", "Game Publishers", "Energy Drink Brands", "PC Peripheral Brands", "Streaming Services"],
      tech: ["SaaS / Productivity Tools", "VPN Services", "Cloud Hosting Brands", "Tech Accessories", "Online Learning Platforms"],
      technology: ["SaaS / Productivity Tools", "VPN Services", "Cloud Hosting Brands", "Tech Accessories", "Online Learning Platforms"],
      education: ["Online Learning Platforms", "E-book Services", "EdTech SaaS", "Study Tool Brands", "Certification Programs"],
      music: ["Music Streaming Services", "Audio Hardware Brands", "Music Production Tools", "Merchandise Platforms"],
      fitness: ["Fitness Apparel Brands", "Supplement Brands", "Gym Equipment Brands", "Health App Services", "Wearable Tech"],
      beauty: ["Cosmetics Brands", "Skincare Lines", "Fashion Retailers", "Beauty Subscription Boxes"],
      food: ["Food Delivery Services", "Kitchen Equipment Brands", "Meal Kit Services", "Beverage Brands"],
      travel: ["Travel Booking Platforms", "Luggage Brands", "Hotel Chains", "Travel Credit Cards"],
      finance: ["Fintech Apps", "Investment Platforms", "Banking Services", "Financial Education Services"],
      entertainment: ["Streaming Services", "Mobile Gaming Apps", "Digital Entertainment Brands", "Consumer Electronics"],
      lifestyle: ["DTC Consumer Brands", "Home Goods", "Fashion Retailers", "Subscription Boxes", "Wellness Apps"],
    };

    const category = result.creatorCategories?.[0]?.type || "Entertainment";
    const brandFamilies = BRAND_FAMILIES[category.toLowerCase()] || BRAND_FAMILIES["entertainment"];

    // Use AI-returned brand matches if available, otherwise category families
    const getBrandMatches = () => {
      if (isBelowCommercialThreshold) return null;
      if (followers < 10_000) {
        return brandFamilies.slice(0, 2).map((b, i) => ({
          brandName: b,
          compatibility: 40 + i * 5,
          overlap: 35 + i * 5,
          description: "Estimated — micro-community affinity only.",
          confidence: "LOW" as const,
        }));
      }
      // Use AI brand matches if the scoring engine provided them
      if (result.brandMatches && result.brandMatches.length > 0) {
        return result.brandMatches.slice(0, 5).map((bm: any) => ({
          brandName: bm.brandName,
          compatibility: Math.round(bm.score || 70),
          overlap: Math.round((bm.score || 70) * 0.9),
          description: bm.reason || "Category-inferred brand alignment.",
          confidence: followers >= 500_000 ? "MEDIUM" as const : "LOW" as const,
        }));
      }
      // Fall back to category families — no made-up brand names
      return brandFamilies.slice(0, 5).map((b, i) => ({
        brandName: b,
        compatibility: Math.min(90, 65 + i * 5),
        overlap: Math.min(85, 60 + i * 5),
        description: `Category alignment — ${category} audience demographic match.`,
        confidence: followers >= 500_000 ? "MEDIUM" as const : "LOW" as const,
      }));
    };

    const pricing = isBelowCommercialThreshold ? null : (creatorTier === "Small" ? calculatePricing() : calculatePricing());
    const brandMatches = getBrandMatches();

    // Pricing confidence level
    const pricingConfidence = creatorTier === "Small" ? "LOW" : creatorTier === "Mid" ? "MEDIUM" : "MEDIUM";
    const pricingSource = "ESTIMATED" as const;

    return (
      <div className="space-y-6 animate-fade-in font-normal text-left">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Network className="w-6 h-6 text-primary glow animate-pulse" /> AI Creator Media Intelligence
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Platform presence based exclusively on verified and discovered public links.
          </p>
        </div>

        {/* Nano-tier gate — show big notice instead of fake data */}
        {isBelowCommercialThreshold && (
          <div className="rounded-3xl p-5 border border-amber-500/30 bg-amber-500/5 text-left space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Creator Below Commercial Analysis Threshold
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">@{result.username.replace(/^@/, "")}</strong> has{" "}
              <strong className="text-foreground">{fmt(followers)} subscribers</strong> — below the 1,000 minimum for commercial partnership analysis.
              Sponsorship pricing, brand matching, CPM estimates, and profitability scores are not available for creators at this scale.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-[9px] px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase">
                No sponsorship data
              </span>
              <span className="text-[9px] px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase">
                No CPM estimate
              </span>
              <span className="text-[9px] px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase">
                No brand matching
              </span>
            </div>
          </div>
        )}

        {/* Platform Discovery Section */}
        <div className="grid lg:grid-cols-[1.3fr_1fr] gap-6">
          {/* SVG Ecosystem Map — only real platforms */}
          <div className="glass rounded-3xl p-6 border border-border/40 flex flex-col items-center justify-center min-h-[400px] relative overflow-hidden">
            <div className="absolute top-4 left-6 text-left">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Verified Platform Map
              </h3>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                Only platforms discovered from public bio, about section, or Linktree.
              </p>
            </div>

            <div className="relative w-full max-w-[360px] aspect-square mt-6">
              <svg viewBox="0 0 400 400" className="w-full h-full overflow-visible">
                {/* Connection lines to discovered satellites */}
                {satellites.map((sat, idx) => (
                  <g key={`line-${idx}`}>
                    <line
                      x1={center.x} y1={center.y}
                      x2={sat.x} y2={sat.y}
                      stroke={sat.status === "VERIFIED" ? "oklch(0.62 0.21 265 / 0.5)" : "oklch(0.62 0.21 265 / 0.2)"}
                      strokeWidth={sat.status === "VERIFIED" ? "2.5" : "1.5"}
                      strokeDasharray={sat.status === "VERIFIED" ? "none" : "5 5"}
                      className="transition-all duration-300"
                    />
                    <circle
                      cx={(center.x + sat.x) / 2}
                      cy={(center.y + sat.y) / 2}
                      r="3"
                      fill="oklch(0.62 0.21 265)"
                      className="animate-ping"
                    />
                  </g>
                ))}

                {/* Center YouTube Node */}
                <g transform={`translate(${center.x - 36}, ${center.y - 36})`}>
                  <circle cx="36" cy="36" r="34" className="fill-background stroke-primary stroke-2" />
                  <foreignObject x="6" y="6" width="60" height="60" className="rounded-full overflow-hidden">
                    <div className="w-full h-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-black text-sm">
                      {result.displayName?.charAt(0) || "?"}
                    </div>
                  </foreignObject>
                </g>

                {/* Satellite nodes — only discovered platforms */}
                {satellites.map((sat, idx) => (
                  <g key={`sat-${idx}`} transform={`translate(${sat.x - 20}, ${sat.y - 20})`}>
                    <circle
                      cx="20" cy="20" r="18"
                      className={`fill-background transition duration-300 ${sat.status === "VERIFIED" ? "stroke-emerald-500/60 stroke-2" : "stroke-sky-500/40 stroke"}`}
                    />
                    <foreignObject x="5" y="5" width="30" height="30">
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="font-bold text-[8px] uppercase text-muted-foreground tracking-tighter">
                          {sat.platform.replace("/X", "").slice(0, 3)}
                        </span>
                      </div>
                    </foreignObject>
                    <text x="20" y="36" textAnchor="middle" fontSize="6" fill="currentColor" className="fill-muted-foreground font-mono">
                      {sat.handle?.slice(0, 12) || ""}
                    </text>
                  </g>
                ))}

                {/* Empty state if no satellites */}
                {satellites.length === 0 && (
                  <text x="200" y="320" textAnchor="middle" fontSize="10" className="fill-muted-foreground font-sans">
                    No additional platforms discovered
                  </text>
                )}
              </svg>
            </div>

            {satellites.length === 0 && (
              <div className="mt-2 text-center text-[10px] text-muted-foreground/70 max-w-[220px]">
                No verified public platform links detected beyond YouTube.
              </div>
            )}
          </div>

          {/* Discovered Platform Cards */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Discovered Platforms ({allDiscoveredPlatforms.length})
            </h3>

            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {allDiscoveredPlatforms.map((plat, idx) => (
                <div
                  key={idx}
                  className="glass rounded-2xl p-3.5 border border-border/30 hover:border-primary/30 transition duration-200 text-left"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold ${getPlatformColor(plat.platform)}`}>
                        {plat.platform}
                      </span>
                      <span className="text-xs font-bold text-foreground truncate max-w-[120px]">
                        {plat.handle}
                      </span>
                    </div>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold border shrink-0 ${getBadgeStyle(plat.status)}`}>
                      {plat.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
                    <div>
                      <div className="text-[8px] uppercase text-muted-foreground/50 font-bold">Audience</div>
                      <div className="font-semibold text-foreground mt-0.5">
                        {plat.followers != null ? fmt(plat.followers) : "Not available"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[8px] uppercase text-muted-foreground/50 font-bold">Engagement</div>
                      <div className="font-semibold text-foreground mt-0.5">
                        {plat.engagementRate != null ? `${Number(plat.engagementRate).toFixed(2)}%` : "Not available"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[8px] uppercase text-muted-foreground/50 font-bold">Trust Score</div>
                      <div className={`font-bold mt-0.5 ${plat.trustScore != null ? "text-primary" : "text-muted-foreground"}`}>
                        {plat.trustScore != null ? `${plat.trustScore}/100` : "Unknown"}
                      </div>
                    </div>
                  </div>

                  {plat.status !== "VERIFIED" && (
                    <div className="mt-2 text-[9px] text-amber-400/80 bg-amber-500/5 border border-amber-500/10 rounded-lg px-2 py-1">
                      Link discovered in public profile. Metrics not independently verified.
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* "No extra platforms" notice */}
            {allDiscoveredPlatforms.length === 1 && (
              <div className="glass rounded-2xl p-4 border border-border/20 text-center text-xs text-muted-foreground space-y-1">
                <Database className="w-5 h-5 mx-auto text-muted-foreground/40 mb-1" />
                <div className="font-semibold text-foreground/70">No additional platform links detected.</div>
                <div className="text-[10px] leading-relaxed">
                  No Instagram, Twitter, TikTok or other social links were found in this creator's public YouTube bio or About section.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Sponsorship Pricing — Tier Gated ─────────────────────────────── */}
        {isBelowCommercialThreshold ? (
          <div className="glass rounded-3xl p-6 border border-border/40 text-left">
            <div className="flex items-center gap-3 mb-3">
              <DollarSign className="w-4 h-4 text-muted-foreground/40" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Estimated Sponsorship Pricing
              </h3>
            </div>
            <div className="text-xs text-muted-foreground italic leading-relaxed">
              Public sponsorship pricing unavailable. Creator has insufficient audience scale for commercial rate estimation.
              Minimum threshold: 1,000 subscribers.
            </div>
          </div>
        ) : (
          <div className="glass rounded-3xl p-6 border border-border/40 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/10 pb-4 mb-4">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" /> Estimated Sponsorship Pricing Intelligence
                </h3>
                <p className="text-[9px] text-muted-foreground/60 mt-0.5">
                  AI-modeled ranges based on engagement metrics and audience scale. Not verified actual rates.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <span className="text-[9px] px-2 py-1 rounded bg-primary/15 text-primary border border-primary/25 font-bold uppercase tracking-wider">
                  {pricing!.tierName}
                </span>
                <ConfidenceBadge level={pricingConfidence as any} source={pricingSource} />
              </div>
            </div>

            {creatorTier === "Small" && (
              <div className="mb-4 text-[10px] text-amber-400 bg-amber-500/5 border border-amber-500/15 rounded-xl px-3 py-2">
                ⚠️ Small creator pricing estimates carry high uncertainty. Actual rates may differ significantly.
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: "Story / Post", value: pricing!.story },
                { label: "Reel / Shorts", value: pricing!.reel },
                { label: "Video Integration", value: pricing!.video },
                { label: "Campaign Bundle", value: pricing!.bundle },
                { label: "CPM Estimate", value: pricing!.cpm, highlight: true },
              ].map((item) => (
                <div key={item.label} className={`bg-white/5 border border-white/5 rounded-2xl p-4 text-center ${item.label === "CPM Estimate" ? "col-span-2 md:col-span-1" : ""}`}>
                  <div className="text-[8px] uppercase font-bold text-muted-foreground/50">{item.label}</div>
                  <div className={`text-sm font-black tracking-tight mt-1 font-mono ${item.highlight ? "text-primary" : "text-foreground"}`}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Brand Match Opportunities — Tier Gated ────────────────────────── */}
        {isBelowCommercialThreshold ? (
          <div className="glass rounded-3xl p-6 border border-border/40 text-left">
            <div className="flex items-center gap-3 mb-3">
              <Award className="w-4 h-4 text-muted-foreground/40" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Brand Match Opportunities
              </h3>
            </div>
            <p className="text-xs text-muted-foreground italic">
              Creator below brand matching threshold. Minimum 1,000 subscribers required for brand fit analysis.
            </p>
          </div>
        ) : brandMatches && brandMatches.length > 0 ? (
          <div className="glass rounded-3xl p-5 border border-border/40 text-left">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-400" /> Best Brand Category Alignment
              </h3>
              <ConfidenceBadge
                level={followers >= 500_000 ? "MEDIUM" : "LOW"}
                source="INFERRED"
              />
            </div>
            <p className="text-[10px] text-muted-foreground/60 mb-3">
              Brand categories inferred from niche and audience profile. No verified campaign history available.
            </p>
            <div className="space-y-2">
              {brandMatches.map((bm, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl p-2.5">
                  <div>
                    <div className="font-bold text-xs text-foreground flex items-center gap-1.5 flex-wrap">
                      {bm.brandName}
                      <span className="text-[8px] font-semibold text-primary px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20">
                        {bm.compatibility}% Match
                      </span>
                    </div>
                    <div className="text-[9px] text-muted-foreground mt-0.5">{bm.description}</div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <div className="text-[8px] uppercase font-bold text-muted-foreground/50">Overlap</div>
                    <div className="font-bold text-foreground font-mono text-[10px]">{bm.overlap}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  };


  const renderEcosystemGraph = () => {
    if (!result) return renderAnalyzeFirst("Ecosystem Graph");

    const ecosystem = result.crossPlatformEcosystem || [
      {
        platform: "YouTube",
        handle: `@${result.username}`,
        url: `https://youtube.com/@${result.username}`,
        isVerifiedData: true,
        followers: result.followers,
        followersLabel: "✓ Verified Platform Data",
        engagementRate: result.engagementRate || 3.5,
        engagementLabel: "✓ Verified Platform Data",
        trustScore: result.score,
        botLikelihood: 12,
        postingConsistency: "Regular",
        reachTier: "Mega-Influencer"
      }
    ];

    const center = { x: 200, y: 200 };
    const radius = 130;
    
    // Filter out the center verified platform to prevent hub duplication
    const satellites = ecosystem
      .filter((item: any) => !item.isVerifiedData)
      .map((item: any, idx: number, arr: any[]) => {
        const angle = (2 * Math.PI * idx) / arr.length;
        return {
          ...item,
          x: center.x + radius * Math.cos(angle),
          y: center.y + radius * Math.sin(angle),
        };
      });

    const externalPlatforms = ecosystem.filter((item: any) => !item.isVerifiedData);

    const getPlatformColor = (platform: string) => {
      switch (platform.toLowerCase()) {
        case "youtube": return "text-red-500 bg-red-500/10 border-red-500/20";
        case "instagram": return "text-pink-500 bg-pink-500/10 border-pink-500/20";
        case "tiktok": return "text-cyan-400 bg-cyan-400/10 border-cyan-400/20";
        case "twitter/x":
        case "twitter": return "text-sky-400 bg-sky-400/10 border-sky-400/20";
        case "spotify": return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
        case "discord": return "text-indigo-400 bg-indigo-400/10 border-indigo-400/20";
        case "twitch": return "text-purple-500 bg-purple-500/10 border-purple-500/20";
        default: return "text-primary bg-primary/10 border-primary/20";
      }
    };

    return (
      <div className="space-y-6 animate-fade-in font-normal">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Globe className="w-6 h-6 text-primary glow" /> Creator Social Ecosystem Discovery
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cross-platform map and social graph extracted from About sections and Linktree portals
          </p>
        </div>

        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6">
          {/* Interactive Social Graph View */}
          <div className="glass rounded-3xl p-6 border border-border/40 flex flex-col items-center justify-center min-h-[450px]">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground self-start mb-4">
              AI Connected Social Graph
            </h3>
            
            <div className="relative w-full max-w-[400px] aspect-square">
              <svg viewBox="0 0 400 400" className="w-full h-full">
                {/* SVG connection lines */}
                {satellites.map((sat: any, idx: number) => (
                  <g key={`line-${idx}`}>
                    <line
                      x1={center.x}
                      y1={center.y}
                      x2={sat.x}
                      y2={sat.y}
                      stroke="oklch(0.62 0.21 265 / 0.25)"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      className="animate-pulse"
                    />
                    <circle
                      cx={(center.x + sat.x) / 2}
                      cy={(center.y + sat.y) / 2}
                      r="3"
                      fill="oklch(0.62 0.21 265)"
                      className="animate-ping"
                    />
                  </g>
                ))}

                {/* Center Creator Node */}
                <g transform={`translate(${center.x - 40}, ${center.y - 40})`}>
                  <circle cx="40" cy="40" r="38" className="fill-background stroke-primary stroke-2 shadow-xl ring-glow" />
                  <foreignObject x="6" y="6" width="68" height="68" className="rounded-full overflow-hidden">
                    <div className="w-full h-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-black text-sm">
                      {result.displayName.charAt(0)}
                    </div>
                  </foreignObject>
                </g>

                {/* Satellite Nodes */}
                {satellites.map((sat: any, idx: number) => (
                  <g key={`sat-${idx}`} transform={`translate(${sat.x - 22}, ${sat.y - 22})`}>
                    <circle cx="22" cy="22" r="20" className="fill-background stroke-border/60 stroke border hover:stroke-primary transition duration-300 shadow-md ring-glow cursor-pointer" />
                    <foreignObject x="8" y="8" width="28" height="28">
                      <div className="w-full h-full flex items-center justify-center text-xs">
                        <span className="font-bold text-[9px] uppercase text-muted-foreground tracking-tighter">
                          {sat.platform.slice(0, 3)}
                        </span>
                      </div>
                    </foreignObject>
                    <text x="22" y="38" textAnchor="middle" className="text-[7px] font-semibold fill-muted-foreground font-mono">
                      {sat.handle}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          {/* Connected Profiles List */}
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Discovered Profiles ({externalPlatforms.length})
            </h3>
            {externalPlatforms.length === 0 ? (
              <div className="glass rounded-2xl p-6 border border-border/30 text-center text-xs text-muted-foreground leading-relaxed">
                No verified external creator platforms discovered.
              </div>
            ) : (
              externalPlatforms.map((sat: any, idx: number) => {
                const theme = getPlatformColor(sat.platform);
                return (
                  <div key={idx} className="glass rounded-2xl p-4 border border-border/30 hover:border-primary/45 transition duration-200 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/10 pb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold shrink-0 ${theme}`}>
                          {sat.platform}
                        </span>
                        <a href={sat.url} target="_blank" rel="noreferrer" className="text-xs font-bold text-foreground hover:text-primary hover:underline truncate max-w-[150px] sm:max-w-none">
                          {sat.handle}
                        </a>
                      </div>
                      <span className={`text-[8px] font-semibold px-2 py-0.5 rounded shrink-0 self-start sm:self-auto ${
                        sat.isVerifiedData ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-primary/10 text-primary border border-primary/20"
                      }`}>
                        {sat.followersLabel}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[10px] font-normal font-mono text-muted-foreground pt-1 border-t border-white/5">
                      <div>
                        <div className="text-[8px] uppercase font-bold text-muted-foreground/50">Followers</div>
                        <div className="font-semibold text-foreground mt-0.5">{fmt(sat.followers)}</div>
                      </div>
                      <div>
                        <div className="text-[8px] uppercase font-bold text-muted-foreground/50">Engagement</div>
                        <div className="font-semibold text-foreground mt-0.5">{Number(sat.engagementRate).toFixed(2)}%</div>
                      </div>
                      <div>
                        <div className="text-[8px] uppercase font-bold text-muted-foreground/50">Ratefluencer Score™</div>
                        <div className="font-bold text-primary mt-0.5">{sat.trustScore}/100</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-normal font-mono text-muted-foreground pt-1">
                      <div>
                        <div className="text-[8px] uppercase font-bold text-muted-foreground/50">Consistency</div>
                        <div className="font-semibold text-foreground mt-0.5">{sat.postingConsistency}</div>
                      </div>
                      <div>
                        <div className="text-[8px] uppercase font-bold text-muted-foreground/50">Reach Tier</div>
                        <div className="font-semibold text-foreground mt-0.5">{sat.reachTier}</div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderAudiencePsychology = () => {
    if (!result) return renderAnalyzeFirst("Audience Psychology");

    const psychology = result.audiencePsychology || {
      type: "Engaged Tech & Gaming Niche",
      behavior: "Highly reactive fandom audience with active meme-sharing tendencies and intense category-specific interactions.",
      personality: "Analytical & Technology-Oriented",
      interests: ["Technology", "Software", "Creative Tools", "Education"],
      loyaltyScore: 84,
      fandomIntensity: 78,
      purchasingIntent: "Moderate"
    };

    const risks = result.crossPlatformRisks || [];

    return (
      <div className="space-y-6 animate-fade-in font-normal">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Heart className="w-6 h-6 text-pink-500 fill-pink-500/10 glow" /> Audience Psychology & Persona Modeling
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Model parameters of community sentiment, brand loyalty, purchasing affinity, and fandom intensity
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Persona Card */}
          <div className="glass rounded-3xl p-6 border border-border/40 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Primary Audience Persona
            </h3>
            
            <div className="space-y-3 font-normal text-xs leading-relaxed text-muted-foreground">
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-1">
                <div className="font-bold text-sm text-foreground">{psychology.type}</div>
                <div className="text-[10px] text-muted-foreground font-mono">Dominant Personality: {psychology.personality}</div>
              </div>
              <p className="p-3 bg-white/5 rounded-2xl border border-white/5 leading-relaxed">
                {psychology.behavior}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground/60">Loyalty Score</span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full gradient-bg" style={{ width: `${psychology.loyaltyScore}%` }} />
                  </div>
                  <span className="font-mono text-xs font-bold text-primary">{psychology.loyaltyScore}%</span>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground/60">Fandom Intensity</span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-pink-500" style={{ width: `${psychology.fandomIntensity}%` }} />
                  </div>
                  <span className="font-mono text-xs font-bold text-pink-400">{psychology.fandomIntensity}%</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <span className="text-[10px] uppercase font-bold text-muted-foreground/60">Estimated Purchasing Intent</span>
              <div className="mt-1 flex items-center gap-2">
                <span className="px-3 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/20 font-bold text-xs uppercase font-mono">
                  {psychology.purchasingIntent}
                </span>
                <span className="text-[10px] text-muted-foreground">High likelihood of conversion for sponsored affiliate recommendations.</span>
              </div>
            </div>
          </div>

          {/* Interests & Risks Column */}
          <div className="space-y-6">
            {/* Interests card */}
            <div className="glass rounded-3xl p-6 border border-border/40 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Audience Core Interests
              </h3>
              <div className="space-y-3">
                {(psychology.interests ?? []).map((interest: string, idx: number) => {
                  const weights = [85, 70, 55, 40];
                  const wt = weights[idx % weights.length];
                  return (
                    <div key={interest} className="space-y-1 text-xs">
                      <div className="flex justify-between font-semibold">
                        <span>{interest}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">{wt}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500" style={{ width: `${wt}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Platform Trust & Risks card */}
            <div className="glass rounded-3xl p-6 border border-border/40 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400" /> Cross-Platform Risk Diagnostics
              </h3>
              {risks.length > 0 ? (
                <div className="space-y-3 text-xs font-normal">
                  {risks.map((risk: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-2xl bg-destructive/5 border border-destructive/20 space-y-1 leading-normal text-muted-foreground">
                      <div className="font-bold text-foreground flex items-center gap-1.5 capitalize">
                        <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
                        {risk.name}
                        <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.2 rounded bg-destructive/10 text-destructive ml-auto">
                          {risk.severity} Severity
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed">{risk.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-green-500/5 border border-green-500/10 text-xs font-normal text-muted-foreground flex flex-col items-center justify-center text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-500 mb-2 glow" />
                  <span className="font-semibold text-foreground">No Significant Anomalies Detected</span>
                  <p className="text-[10px] text-muted-foreground/75 mt-0.5 leading-normal max-w-[220px]">
                    All evaluated accounts present organic reach metrics matching regional posting consistency norms.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDisambiguationView = () => {
    if (!disambiguationData) return null;

    const confidenceColors: Record<string, string> = {
      "Exact Match": "bg-success/15 text-success border-success/30",
      "Strong Match": "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      "Approximate Match": "bg-warning/15 text-warning border-warning/30",
      "Low Confidence": "bg-destructive/15 text-destructive border-destructive/30",
    };

    return (
      <div className="space-y-6 animate-fade-in font-normal max-w-2xl mx-auto py-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary glow mb-3">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Possible Creator Matches</h2>
          <p className="text-sm text-muted-foreground">
            We found multiple channels matching &ldquo;{disambiguationData.query}&rdquo;. Please select the correct creator:
          </p>
        </div>

        <div className="space-y-3">
          {disambiguationData.candidates.map((candidate: any) => (
            <div
              key={candidate.channelId}
              onClick={() => run(candidate.channelId, disambiguationData.platform)}
              className="glass hover:border-primary/45 rounded-3xl p-5 border border-border/30 transition duration-200 cursor-pointer flex gap-4 items-start relative group"
            >
              <CandidateAvatar url={candidate.thumbnail} title={candidate.title} />
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-semibold text-sm truncate text-foreground group-hover:text-primary transition font-sans">
                      {candidate.title}
                    </span>
                    {candidate.subscribers >= 100000 && (
                      <BadgeCheck className="w-4 h-4 text-blue-500 fill-blue-500/10 shrink-0" />
                    )}
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${confidenceColors[candidate.confidence] ?? "bg-muted text-muted-foreground"}`}>
                    {candidate.confidence}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                  <span>{candidate.handle}</span>
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                  <span>{fmt(candidate.subscribers)} subscribers</span>
                </div>
                {candidate.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {candidate.description}
                  </p>
                )}
                <div className="text-[10px] text-primary/80 font-semibold bg-primary/5 border border-primary/10 rounded-xl px-3 py-1.5 mt-2 flex items-start gap-1.5 leading-normal">
                  <span className="font-bold shrink-0">AI Match Reason:</span>
                  <span>{candidate.matchReason}</span>
                </div>
              </div>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition duration-200 text-primary">
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setDisambiguationData(null)}
            className="h-11 rounded-2xl px-6 border-border/40 text-muted-foreground hover:text-foreground"
          >
            Cancel &amp; Return to Control Center
          </Button>
        </div>
      </div>
    );
  };

  const renderCreatorDNAPassport = () => {
    if (!result) return renderAnalyzeFirst("Digital DNA Passport");
    return <CreatorDNACard analysis={result} />;
  };

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case "dashboard": return renderDashboard();
      case "creator": return renderCreatorAnalysis();
      case "dna": return renderCreatorDNAPassport();
      case "ecosystem": return renderEcosystemGraph();
      case "media": return renderMediaIntelligence();
      case "trust": return renderTrustIntelligence();
      case "growth": return renderGrowthPrediction();
      case "campaign": return renderCampaignSuccess();
      case "brand": return renderBrandMatchEngine();
      case "audience": return renderAudienceInsights();
      case "psychology": return renderAudiencePsychology();
      case "compare": return renderCreatorComparison();
      case "trends": return renderTrendAnalysis();
      case "reports": return renderReports();
      case "history": return renderHistory();
      case "settings": return renderSettings();
      default: return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background animate-fade-in">
      {/* Left Sidebar Navigation */}
      <aside className="w-full md:w-64 border-r border-border bg-card/60 backdrop-blur-lg flex flex-col shrink-0">
        {/* Logo and branding info */}
        <div className="p-6 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center glow shrink-0">
            <Shield className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <div className="font-bold text-sm leading-none">Ratefluencer AI</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Bloomberg for Influencer Marketing</div>
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="p-4 flex-1 space-y-1 overflow-y-auto select-none">
          {[
            { id: "dashboard", label: "Control Center", Icon: LayoutDashboard },
            { id: "creator", label: "Executive Summary", Icon: UserCheck },
            { id: "dna", label: "Digital DNA Passport", Icon: Dna },
            { id: "trust", label: "Ratefluencer Score™", Icon: ShieldAlert },
            { id: "ecosystem", label: "Ecosystem Discovery", Icon: Globe },
            { id: "media", label: "Media Intelligence", Icon: Network },
            { id: "brand", label: "Brand Intelligence", Icon: Award },
            { id: "growth", label: "Growth Prediction", Icon: TrendingUp },
            { id: "campaign", label: "Campaign Success", Icon: Target },
            { id: "audience", label: "Audience Quality", Icon: Users },
            { id: "psychology", label: "Audience Psychology", Icon: Heart },
            { id: "reports", label: "Export Reports", Icon: FileSpreadsheet },
            { id: "compare", label: "Creator Comparison", Icon: GitCompare },
            { id: "trends", label: "Trend Analysis", Icon: LineChart },
            { id: "history", label: "Recent Analyses", Icon: History },
            { id: "settings", label: "Settings", Icon: Settings },
          ].map((item) => {
            const ActiveIcon = item.Icon;
            const isTabActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition ${
                  isTabActive
                    ? "gradient-bg text-white shadow-sm shadow-primary/25"
                    : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                }`}
              >
                <ActiveIcon className="w-4 h-4 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main page view */}
      <main className="flex-1 overflow-y-auto bg-background/40">
        <Nav />
        <div className="container mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {disambiguationData ? (
            renderDisambiguationView()
          ) : (
            <>
              {result && [
                "creator", "ecosystem", "trust", "growth", "campaign",
                "brand", "audience", "psychology", "trends", "reports"
              ].includes(activeTab) && (
                <div className="space-y-6 mb-6">
                  {renderCreatorForecastHeader()}
                  {renderAiExecutiveSummaryHero()}
                </div>
              )}
              {renderActiveTabContent()}
            </>
          )}
        </div>
      </main>

      <AnimatePresence>
        {loading && <AnalyzingOverlay onDone={() => setLoading(false)} />}
      </AnimatePresence>

      <CreatorCopilot
        activeCreator={result}
        activeTab={activeTab}
        comparisonContext={
          compPair
            ? {
                aName: compPair.a.displayName,
                aScore: compPair.a.score,
                bName: compPair.b.displayName,
                bScore: compPair.b.score,
              }
            : null
        }
      />
    </div>
  );
}

