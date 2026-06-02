import { AlertCircle, DollarSign, FlaskConical, ShieldCheck, TrendingUp } from "lucide-react";

interface BrandProfitabilityCardProps {
  score?: number;
  tier?: string;
  loading?: boolean;
  estimatedCpm?: string;
  roiClass?: string;
  conversionStrength?: string;
  partnershipSuitability?: string;
  purchasingPowerEstimate?: string;
  isSimulated?: boolean;
  isBelowCommercialThreshold?: boolean;
}

export function BrandProfitabilityCard({
  score = 50,
  tier = "Unknown Tier",
  loading = false,
  estimatedCpm,
  roiClass,
  conversionStrength,
  partnershipSuitability,
  purchasingPowerEstimate,
  isSimulated = false,
  isBelowCommercialThreshold = false,
}: BrandProfitabilityCardProps) {
  const scoreColor = score >= 75 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-rose-400";
  const strokeColor = score >= 75 ? "rgb(52, 211, 153)" : score >= 50 ? "rgb(251, 191, 36)" : "rgb(251, 113, 133)";
  const circumference = 2 * Math.PI * 26; // radius = 26
  const strokeDashoffset = circumference - (score / 100) * circumference;

  if (loading) {
    return (
      <div className="glass rounded-3xl p-5 border border-white/5 animate-pulse flex flex-col justify-between space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-white/5" />
          <div className="space-y-2">
            <div className="h-3 w-28 bg-white/5 rounded" />
            <div className="h-2 w-16 bg-white/5 rounded" />
          </div>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="w-16 h-16 rounded-full bg-white/5" />
          <div className="space-y-2 flex-1">
            <div className="h-3 w-full bg-white/5 rounded" />
            <div className="h-3 w-4/5 bg-white/5 rounded" />
          </div>
        </div>
        <div className="border-t border-white/5 pt-4 grid grid-cols-2 gap-3">
          <div className="h-8 bg-white/5 rounded" />
          <div className="h-8 bg-white/5 rounded" />
          <div className="h-8 bg-white/5 rounded" />
          <div className="h-8 bg-white/5 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-3xl p-5 border border-white/5 shadow-lg relative overflow-hidden transition-all duration-300 hover:border-white/10 hover:scale-[1.01] flex flex-col justify-between group">
      {/* Demo Mode Banner */}
      {isSimulated && (
        <div className="flex items-center gap-1.5 mb-3 px-2 py-1.5 rounded-xl bg-amber-500/8 border border-amber-500/20">
          <FlaskConical className="w-3 h-3 text-amber-400 shrink-0" />
          <span className="text-[8px] font-bold text-amber-400 uppercase tracking-wider">
            AI Simulated Intelligence — Not verified creator analytics
          </span>
        </div>
      )}

      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">Brand Profitability</h4>
            <p className="text-[10px] text-muted-foreground">ROI Valuation Index</p>
          </div>
        </div>
        <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 font-bold text-muted-foreground capitalize">
          {tier}
        </span>
      </div>

      {/* Main Content */}
      <div className="flex items-center gap-5 mt-4">
        {/* Radial Meter */}
        <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background track */}
            <circle
              cx="32"
              cy="32"
              r="26"
              className="stroke-white/5 fill-transparent"
              strokeWidth="5"
            />
            {/* Progress track */}
            <circle
              cx="32"
              cy="32"
              r="26"
              className="fill-transparent transition-all duration-1000 ease-out"
              strokeWidth="5"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              stroke={strokeColor}
            />
          </svg>
          <span className={`absolute text-sm font-black tracking-tight ${scoreColor}`}>
            {score}
          </span>
        </div>

        {/* Text descriptions */}
        <div className="space-y-1.5 flex-1 text-left">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-foreground">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Monetization Potential: <strong className={scoreColor}>{score >= 70 ? "High" : score >= 50 ? "Moderate" : "Low"}</strong></span>
          </div>
          <div className="flex items-start gap-1 text-[10px] text-muted-foreground leading-relaxed">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/70 shrink-0 mt-0.5" />
            <span>Partnership risk profiles match brand safety guidelines. Suitable for promotional campaigns.</span>
          </div>
        </div>
      </div>

      {/* Sponsorship Details Grid — tier gated */}
      {isBelowCommercialThreshold ? (
        <div className="mt-4 pt-4 border-t border-white/5">
          <div className="flex items-center gap-2 text-amber-400/80 text-[10px] font-semibold">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Creator below commercial analysis threshold.</span>
          </div>
          <p className="text-[9px] text-muted-foreground mt-1.5 leading-relaxed">
            Sponsorship pricing, CPM estimates, and conversion data unavailable for creators below 1,000 subscribers.
          </p>
        </div>
      ) : (
        <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-3 text-left">
          {estimatedCpm && (
            <div>
              <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider">Est. CPM</span>
              <span className="text-xs font-semibold text-foreground/90">{estimatedCpm}</span>
            </div>
          )}
          {roiClass && (
            <div>
              <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider">ROI Class</span>
              <span className="text-xs font-semibold text-emerald-400">{roiClass}</span>
            </div>
          )}
          {conversionStrength && (
            <div>
              <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider">Conversion Strength</span>
              <span className="text-xs font-semibold text-foreground/90">{conversionStrength}</span>
            </div>
          )}
          {purchasingPowerEstimate && (
            <div>
              <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider">Purchasing Power</span>
              <span className="text-xs font-semibold text-foreground/90">{purchasingPowerEstimate}</span>
            </div>
          )}
          {partnershipSuitability && (
            <div className="col-span-2">
              <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider">Partnership Suitability</span>
              <span className="text-xs font-semibold text-foreground/90">{partnershipSuitability}</span>
            </div>
          )}
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-3 pt-2 text-center border-t border-white/5">
        <span className="text-[9px] text-muted-foreground/60 italic font-mono block">
          AI-estimated sponsorship intelligence
        </span>
      </div>
      
      {/* Decorative Glow */}
      <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all pointer-events-none" />
    </div>
  );
}
