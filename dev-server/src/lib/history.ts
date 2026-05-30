import type { InfluencerAnalysis } from "./mock-data";

const KEY = "authenfluence:history";

export interface HistoryEntry {
  username: string;
  displayName: string;
  score: number;
  platform: string;
  timestamp: number;
  category?: string;
}

export function getHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function addHistory(a: InfluencerAnalysis) {
  if (typeof window === "undefined") return;
  const list = getHistory().filter((h) => h.username !== a.username);
  list.unshift({
    username: a.username,
    displayName: a.displayName,
    score: a.score,
    platform: a.platform,
    timestamp: Date.now(),
    category: a.creatorCategories?.[0]?.type,
  });
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 8)));
}
