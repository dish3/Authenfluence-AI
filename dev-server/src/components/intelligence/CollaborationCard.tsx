import { Award, CheckCircle2, AlertCircle } from "lucide-react";

interface CollaborationCardProps {
  summaries?: string[];
  explanation?: string;
  loading?: boolean;
}

export function CollaborationCard({ summaries = [], explanation = "", loading = false }: CollaborationCardProps) {
  const defaultExplanation = explanation || "Audience interaction patterns appear stable. Brand suitability estimated from engagement alignment.";
  const isFallback = defaultExplanation.includes("temporarily unavailable");

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
        <div className="space-y-2 mt-4">
          <div className="h-2 w-full bg-white/5 rounded" />
          <div className="h-2 w-4/5 bg-white/5 rounded" />
          <div className="h-2 w-11/12 bg-white/5 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-3xl p-5 border border-white/5 shadow-lg relative overflow-hidden transition-all duration-300 hover:border-white/10 hover:scale-[1.01] min-h-[190px] flex flex-col justify-between group">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
          <Award className="w-4 h-4" />
        </div>
        <div className="text-left">
          <h4 className="text-xs font-bold text-foreground">Sponsorship Fit & Collab</h4>
          <p className="text-[10px] text-muted-foreground">AI Partnership Affinity</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-2.5 mt-4 text-left flex-1">
        {/* Bullet Summaries */}
        <div className="space-y-2">
          {summaries.map((summary, idx) => (
            <div key={idx} className="flex items-start gap-2 text-[10px] text-foreground/90 leading-relaxed font-sans">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
              <span>{summary}</span>
            </div>
          ))}
          {summaries.length === 0 && (
            <div className="text-[10px] text-muted-foreground italic">
              No recent sponsorship activity signals detected.
            </div>
          )}
        </div>

        {/* AI Explanation Box */}
        <div className={`p-2.5 rounded-2xl border text-[9px] leading-relaxed mt-2 ${
          isFallback 
            ? "bg-rose-500/5 border-rose-500/10 text-rose-300/90" 
            : "bg-white/5 border-white/5 text-muted-foreground"
        }`}>
          {isFallback ? (
            <div className="flex items-center gap-1.5 font-semibold">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>{defaultExplanation}</span>
            </div>
          ) : (
            <p className="font-normal font-sans italic">“ {defaultExplanation} ”</p>
          )}
        </div>
      </div>

      {/* Decorative Glow */}
      <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-all pointer-events-none" />
    </div>
  );
}
