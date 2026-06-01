import { Activity, Instagram, Twitter, Youtube, Globe, BadgeCheck } from "lucide-react";

interface CrossPlatformCardProps {
  primaryPlatform?: string;
  strongestPlatform?: string;
  confidence?: "high" | "medium" | "low";
  loading?: boolean;
}

export function CrossPlatformCard({
  primaryPlatform = "Unknown",
  strongestPlatform = "Unknown",
  confidence = "low",
  loading = false
}: CrossPlatformCardProps) {
  const getConfidenceColor = (conf: string) => {
    switch (conf) {
      case "high": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "medium": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      default: return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    }
  };

  const getPlatformIcon = (plat: string) => {
    const p = plat.toLowerCase();
    if (p.includes("youtube")) return <Youtube className="w-3.5 h-3.5 text-red-500" />;
    if (p.includes("instagram")) return <Instagram className="w-3.5 h-3.5 text-pink-500" />;
    if (p.includes("twitter") || p.includes("x")) return <Twitter className="w-3.5 h-3.5 text-sky-400" />;
    return <Globe className="w-3.5 h-3.5 text-purple-400" />;
  };

  if (loading) {
    return (
      <div className="glass rounded-3xl p-5 border border-white/5 animate-pulse min-h-[190px] flex flex-col justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-white/5" />
          <div className="space-y-2">
            <div className="h-3 w-28 bg-white/5 rounded" />
            <div className="h-2 w-16 bg-white/5 rounded" />
          </div>
        </div>
        <div className="space-y-3 mt-4">
          <div className="h-3 w-3/4 bg-white/5 rounded" />
          <div className="h-3 w-1/2 bg-white/5 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-3xl p-5 border border-white/5 shadow-lg relative overflow-hidden transition-all duration-300 hover:border-white/10 hover:scale-[1.01] min-h-[190px] flex flex-col justify-between group">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400 border border-sky-500/20">
            <Activity className="w-4 h-4" />
          </div>
          <div className="text-left">
            <h4 className="text-xs font-bold text-foreground">Cross-Platform Hub</h4>
            <p className="text-[10px] text-muted-foreground">Ecosystem Distribution</p>
          </div>
        </div>
        <span className={`text-[8px] px-2 py-0.5 rounded-full border uppercase font-mono font-bold ${getConfidenceColor(confidence)}`}>
          Confidence Level: {confidence}
        </span>
      </div>

      {/* Main Content */}
      <div className="space-y-3 mt-4 text-left flex-1 font-sans">
        {/* Primary Platform Info */}
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white/5 border border-white/5">
          <div className="flex items-center gap-2">
            {getPlatformIcon(primaryPlatform)}
            <span className="text-[10px] text-muted-foreground">Primary Platform</span>
          </div>
          <span className="text-[10px] font-bold text-foreground">{primaryPlatform}</span>
        </div>

        {/* Strongest Engagement Info */}
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white/5 border border-white/5">
          <div className="flex items-center gap-2">
            {getPlatformIcon(strongestPlatform)}
            <span className="text-[10px] text-muted-foreground">Strongest Engagement</span>
          </div>
          <span className="text-[10px] font-bold text-foreground flex items-center gap-1">
            {strongestPlatform}
            <BadgeCheck className="w-3.5 h-3.5 text-blue-500 fill-blue-500/10" />
          </span>
        </div>
      </div>

      {/* Decorative Glow */}
      <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl group-hover:bg-sky-500/10 transition-all pointer-events-none" />
    </div>
  );
}
