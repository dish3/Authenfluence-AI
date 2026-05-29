import { motion } from "framer-motion";
import { AlertTriangle, AlertOctagon, Info } from "lucide-react";
import type { FraudSignal } from "@/lib/mock-data";

const tone = {
  high: { ring: "border-destructive/40 bg-destructive/10", icon: "text-destructive", Icon: AlertOctagon, label: "High" },
  medium: { ring: "border-warning/40 bg-warning/10", icon: "text-warning", Icon: AlertTriangle, label: "Medium" },
  low: { ring: "border-border bg-muted/30", icon: "text-muted-foreground", Icon: Info, label: "Low" },
};

export function FraudSignalCard({ signal, i }: { signal: FraudSignal; i: number }) {
  const t = tone[signal.severity];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.06 }}
      className={`rounded-2xl border p-4 ${t.ring}`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl border ${t.ring} flex items-center justify-center shrink-0`}>
          <t.Icon className={`w-5 h-5 ${t.icon}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm">{signal.title}</h4>
            <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${t.icon} border ${t.ring}`}>
              {t.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{signal.description}</p>
        </div>
      </div>
    </motion.div>
  );
}
