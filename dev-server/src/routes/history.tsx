import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";
import { getHistory, type HistoryEntry } from "@/lib/history";
import { Clock, ArrowRight, Inbox } from "lucide-react";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [{ title: "Recent Analyses — Authenfluence AI" }],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const [items, setItems] = useState<HistoryEntry[]>([]);
  useEffect(() => setItems(getHistory()), []);

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="container mx-auto max-w-5xl px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Recent analyses</h1>
          <p className="text-muted-foreground mt-1.5">Locally stored on this device.</p>
        </div>

        {items.length === 0 ? (
          <div className="glass-strong rounded-3xl p-12 text-center">
            <Inbox className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No analyses yet.</p>
            <Link to="/analyze" className="inline-flex mt-4 items-center gap-1.5 text-primary text-sm">
              Run your first analysis <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {items.map((h) => (
              <Link
                key={h.username + h.timestamp}
                to="/analyze"
                search={{ u: h.username }}
                className="glass rounded-2xl p-4 hover:border-primary/40 transition group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{h.displayName}</div>
                    <div className="text-xs text-muted-foreground">@{h.username} · {h.platform}</div>
                  </div>
                  <div
                    className="text-2xl font-semibold tabular-nums"
                    style={{ color: h.score >= 70 ? "var(--color-success)" : h.score >= 50 ? "var(--color-warning)" : "var(--color-destructive)" }}
                  >
                    {h.score}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(h.timestamp).toLocaleString()}</span>
                  <span className="text-primary opacity-0 group-hover:opacity-100 transition inline-flex items-center gap-1">View <ArrowRight className="w-3 h-3" /></span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
