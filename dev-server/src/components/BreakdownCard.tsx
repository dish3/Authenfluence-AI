import { motion } from "framer-motion";
import { Heart, Users, MessageSquare, Calendar, Sparkles, type LucideIcon } from "lucide-react";
import type { InfluencerBreakdown, CreatorCategory } from "@/lib/mock-data";

interface BreakdownItem {
  key: keyof InfluencerBreakdown;
  label: string;
  weight: number;
  Icon: LucideIcon;
  insight: (v: number, categories?: CreatorCategory[]) => string;
}

const ITEMS: BreakdownItem[] = [
  {
    key: "engagement",
    label: "Engagement Score",
    weight: 30,
    Icon: Heart,
    insight: (v, cats) => {
      const topCat = cats?.[0]?.type?.toLowerCase() ?? "";
      const isMusicOrCeleb = ["music", "celebrity", "entertainment"].includes(topCat);
      if (v >= 70) return "Engagement distributes organically relative to creator tier benchmark.";
      if (v >= 45) return isMusicOrCeleb
        ? "Some engagement clustering — normal for this creator type."
        : "Some engagement clustering detected — worth monitoring.";
      return "Engagement patterns fall below tier benchmark — may indicate inflated audience.";
    },
  },
  {
    key: "followerQuality",
    label: "Audience Quality Score",
    weight: 25,
    Icon: Users,
    insight: (v) => {
      if (v >= 70) return "Audience interaction patterns suggest a genuine, engaged subscriber base.";
      if (v >= 45) return "Mixed audience quality indicators — some inactive or low-engagement accounts likely.";
      return "Audience engagement is significantly below tier expectations — possible inflated subscriber count.";
    },
  },
  {
    key: "commentAuthenticity",
    label: "Authenticity Score",
    weight: 20,
    Icon: MessageSquare,
    insight: (v, cats) => {
      const topCat = cats?.[0]?.type?.toLowerCase() ?? "";
      const isFandom = ["music", "celebrity", "entertainment", "gaming", "comedy"].includes(topCat);
      if (v >= 70) return isFandom
        ? "Comments show genuine fan engagement — fandom patterns accounted for."
        : "Comments are conversational, varied, and contextually relevant.";
      if (v >= 45) return "Some templated or repetitive comment patterns detected — borderline range.";
      return "Elevated proportion of comments showing automated or coordinated patterns.";
    },
  },
  {
    key: "postingConsistency",
    label: "Posting Consistency",
    weight: 15,
    Icon: Calendar,
    insight: (v) => {
      if (v >= 70) return "Steady, predictable publishing cadence relative to creator type norms.";
      if (v >= 45) return "Some irregular gaps in posting cadence — within acceptable range.";
      return "Highly erratic posting behavior — burst-and-drop pattern detected.";
    },
  },
  {
    key: "contextualSignals",
    label: "Brand Safety Score",
    weight: 10,
    Icon: Sparkles,
    insight: (v) => {
      if (v >= 70) return "High alignment with real-time temporal markers and creator safety benchmarks.";
      if (v >= 45) return "Standard contextual alignment — mild variance in safety and upload patterns.";
      return "Unusual variance detected relative to safety and benchmark category context.";
    },
  },
];

function color(v: number) {
  if (v >= 70) return "var(--color-success)";
  if (v >= 45) return "var(--color-warning)";
  return "var(--color-destructive)";
}

interface BreakdownCardProps {
  breakdown: InfluencerBreakdown;
  creatorCategories?: CreatorCategory[];
}

export function BreakdownCard({ breakdown, creatorCategories }: BreakdownCardProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {ITEMS.map((it, i) => {
        const v = breakdown[it.key] ?? 80;
        const c = color(v);
        return (
          <motion.div
            key={it.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
            whileHover={{ y: -2 }}
            className="glass rounded-2xl p-4 hover:border-primary/30 transition"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <it.Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-medium leading-tight">{it.label}</div>
                  <div className="text-[11px] text-muted-foreground">Weight {it.weight}%</div>
                </div>
              </div>
              <div className="text-xl font-semibold tabular-nums" style={{ color: c }}>{v}</div>
            </div>
            <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${v}%` }}
                transition={{ duration: 1.1, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ background: c, boxShadow: `0 0 12px ${c}` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2.5">{it.insight(v, creatorCategories)}</p>
          </motion.div>
        );
      })}
    </div>
  );
}
