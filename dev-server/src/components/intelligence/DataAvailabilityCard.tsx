import { Database, CheckCircle, HelpCircle, XCircle } from "lucide-react";

interface AvailabilityItem {
  category: string;
  status: "verified" | "estimated" | "unavailable";
  details: string;
}

interface DataAvailabilityCardProps {
  items?: AvailabilityItem[];
  loading?: boolean;
}

export function DataAvailabilityCard({ items = [], loading = false }: DataAvailabilityCardProps) {
  const getBadgeStyle = (status: string) => {
    switch (status) {
      case "verified": return "text-emerald-400 border-emerald-500/20 bg-emerald-500/5";
      case "estimated": return "text-amber-400 border-amber-500/20 bg-amber-500/5";
      default: return "text-rose-400 border-rose-500/20 bg-rose-500/5";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified": return <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />;
      case "estimated": return <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />;
      default: return <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />;
    }
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
        <div className="space-y-2 mt-4">
          <div className="h-3 w-full bg-white/5 rounded" />
          <div className="h-3 w-3/4 bg-white/5 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-3xl p-5 border border-white/5 shadow-lg relative overflow-hidden transition-all duration-300 hover:border-white/10 hover:scale-[1.01] min-h-[190px] flex flex-col justify-between group">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
          <Database className="w-4 h-4" />
        </div>
        <div className="text-left">
          <h4 className="text-xs font-bold text-foreground">Data Transparency Check</h4>
          <p className="text-[10px] text-muted-foreground">Audited Datasets & Verification</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-2 mt-4 text-left flex-1 font-sans">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-start justify-between gap-3 text-[10px] leading-relaxed">
            <div className="flex items-start gap-1.5 flex-1">
              {getStatusIcon(item.status)}
              <div>
                <span className="font-bold text-foreground block">{item.category}</span>
                <span className="text-[9px] text-muted-foreground leading-normal block mt-0.5">{item.details}</span>
              </div>
            </div>
            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border capitalize shrink-0 font-mono ${getBadgeStyle(item.status)}`}>
              {item.status}
            </span>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-[10px] text-muted-foreground italic">
            Dataset mapping records are currently unavailable.
          </div>
        )}
      </div>

      {/* Decorative Glow */}
      <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all pointer-events-none" />
    </div>
  );
}
