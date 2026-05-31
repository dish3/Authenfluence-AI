// YouTube Data API v3 helpers. Server-only.
import type { RawChannelSignals } from "./scoring";

const BASE = "https://www.googleapis.com/youtube/v3";

async function yt<T>(path: string, params: Record<string, string>, key: string): Promise<T> {
  const url = new URL(`${BASE}/${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set("key", key);
  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`YouTube ${path} ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

interface ChannelMeta {
  channelId: string;
  title: string;
  handle: string;
  uploadsPlaylistId: string;
  subscribers: number;
  totalVideos: number;
  totalViews: number;
  thumbnail?: string;
  description?: string;
}

export function normalizeHandle(input: string): string {
  let clean = input.trim();
  
  // 1. Remove query parameters
  clean = clean.split("?")[0];
  
  // 2. Remove trailing slashes
  clean = clean.replace(/\/+$/, "");
  
  // 3. Remove protocols and YouTube domains
  clean = clean.replace(/^(https?:\/\/)?(www\.)?youtube\.com\/(c\/|user\/|channel\/)?(@)?/, "");
  
  // 4. Remove leading @
  clean = clean.replace(/^@/, "");
  
  // 5. Clean extra spaces
  clean = clean.trim();
  
  return clean;
}

export async function resolveChannel(query: string, apiKey: string): Promise<ChannelMeta> {
  const cleanQuery = query.trim();
  let item: any = null;
  let resolvedHandle = cleanQuery;

  if (/^UC[a-zA-Z0-9_-]{22}$/.test(cleanQuery)) {
    // Direct Channel ID lookup
    const byId = await yt<any>(
      "channels",
      { part: "snippet,statistics,contentDetails", id: cleanQuery },
      apiKey
    ).catch(() => null);
    item = byId?.items?.[0];
  } else {
    // Handle lookup (ensure it starts with @)
    const handleOnly = normalizeHandle(cleanQuery);
    const handle = `@${handleOnly}`;
    resolvedHandle = handle;
    
    console.log("NORMALIZED HANDLE:", handleOnly);

    const byHandle = await yt<any>(
      "channels",
      { part: "snippet,statistics,contentDetails", forHandle: handle },
      apiKey
    ).catch(() => null);
    
    console.log("EXACT LOOKUP RESPONSE:", byHandle);
    item = byHandle?.items?.[0];
  }

  if (!item) throw new Error("No matching creator/channel found.");

  console.log(item.statistics);

  const uploadsPlaylistId = item.contentDetails.relatedPlaylists.uploads;
  let totalVideos = Number(item.statistics.videoCount || 0);

  if (uploadsPlaylistId) {
    try {
      const playlistRes = await yt<any>(
        "playlistItems",
        {
          part: "id",
          playlistId: uploadsPlaylistId,
          maxResults: "1",
          fields: "pageInfo",
        },
        apiKey
      );
      if (playlistRes?.pageInfo?.totalResults) {
        totalVideos = Number(playlistRes.pageInfo.totalResults);
      }
    } catch (e) {
      console.warn("[YouTube API] Failed to fetch uploads playlist totalResults, falling back to statistics.videoCount:", e);
    }
  }

  return {
    channelId: item.id,
    title: item.snippet.title,
    handle: item.snippet.customUrl || resolvedHandle,
    uploadsPlaylistId,
    subscribers: Number(item.statistics.subscriberCount || 0),
    totalVideos,
    totalViews: Number(item.statistics.viewCount || 0),
    thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
    description: item.snippet.description || "",
  };
}

export async function getChannelSignals(
  meta: ChannelMeta,
  apiKey: string
): Promise<RawChannelSignals> {
  const playlist = await yt<any>(
    "playlistItems",
    { part: "contentDetails", playlistId: meta.uploadsPlaylistId, maxResults: "15" },
    apiKey
  );
  const videoIds: string[] = (playlist.items || []).map(
    (i: any) => i.contentDetails.videoId
  );
  if (!videoIds.length) {
    return {
      subscribers: meta.subscribers,
      totalVideos: meta.totalVideos,
      totalViews: meta.totalViews,
      recentVideos: [],
    };
  }
  const videos = await yt<any>(
    "videos",
    { part: "statistics,snippet", id: videoIds.join(",") },
    apiKey
  );
  const recentVideos = (videos.items || []).map((v: any) => ({
    videoId: v.id,
    publishedAt: v.snippet.publishedAt,
    views: Number(v.statistics.viewCount || 0),
    likes: Number(v.statistics.likeCount || 0),
    comments: Number(v.statistics.commentCount || 0),
    categoryId: v.snippet.categoryId as string | undefined,
  }));
  return {
    subscribers: meta.subscribers,
    totalVideos: meta.totalVideos,
    totalViews: meta.totalViews,
    recentVideos,
  };
}

export async function getRecentComments(
  videoIds: string[],
  apiKey: string,
  maxPerVideo = 20
): Promise<string[]> {
  // Sample top 3 videos to stay under quota, fetching in parallel for speed
  const targets = videoIds.slice(0, 3);
  const fetches = targets.map((id) =>
    yt<any>(
      "commentThreads",
      {
        part: "snippet",
        videoId: id,
        maxResults: String(maxPerVideo),
        order: "relevance",
        textFormat: "plainText",
      },
      apiKey
    ).catch(() => null)
  );

  const results = await Promise.all(fetches);
  const all: string[] = [];
  
  for (const res of results) {
    if (res && res.items) {
      for (const it of res.items) {
        const txt = it.snippet?.topLevelComment?.snippet?.textDisplay as string;
        if (txt) all.push(txt);
      }
    }
  }
  return all;
}

export type { ChannelMeta };

// Levenshtein distance calculation to check string similarity
function getLevenshteinDistance(a: string, b: string): number {
  const tmp: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    tmp[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    tmp[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1, // deletion
        tmp[i][j - 1] + 1, // insertion
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1) // substitution
      );
    }
  }
  return tmp[a.length][b.length];
}

function getSimilarity(a: string, b: string): number {
  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return 1.0;
  const dist = getLevenshteinDistance(a, b);
  return (maxLength - dist) / maxLength;
}

export function validateCreatorSimilarity(query: string, handle: string, title: string): boolean {
  const cleanStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9_\-\.]/g, "");
  const q = cleanStr(query);
  const h = cleanStr(handle);
  const t = cleanStr(title);

  // 1. Exact match
  if (q === h || q === t) return true;

  // 2. Prefix/suffix or substring match (min length 3 to prevent broad single-char matches)
  if (q.length >= 3) {
    if (h.includes(q) || q.includes(h) || t.includes(q) || q.includes(t)) return true;
  }

  // 3. Levenshtein similarity threshold of 55%
  if (getSimilarity(q, h) >= 0.55 || getSimilarity(q, t) >= 0.55) return true;

  return false;
}

export async function searchChannelCandidates(
  query: string,
  apiKey: string
): Promise<Array<{ channelId: string; title: string; handle: string; description: string; thumbnail: string; subscribers: number }>> {
  const cleanQuery = query.trim();
  console.log(`[YouTube API] Searching candidates for: "${cleanQuery}"`);
  
  try {
    const search = await yt<any>(
      "search",
      { part: "snippet", type: "channel", q: cleanQuery, maxResults: "5" },
      apiKey
    );
    
    const items = search.items || [];
    const channelIds = items.map((i: any) => i.id?.channelId).filter(Boolean);
    
    if (channelIds.length === 0) {
      return [];
    }
    
    const ch = await yt<any>(
      "channels",
      { part: "snippet,statistics", id: channelIds.join(",") },
      apiKey
    );
    
    const details = ch.items || [];
    return details.map((item: any) => ({
      channelId: item.id,
      title: item.snippet.title,
      handle: item.snippet.customUrl || `@${item.snippet.title.toLowerCase().replace(/\s/g, "")}`,
      description: item.snippet.description || "",
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || "",
      subscribers: Number(item.statistics.subscriberCount || 0)
    }));
  } catch (e) {
    console.error("[YouTube API] searchChannelCandidates error:", e);
    return [];
  }
}

export interface DiscoveredSocial {
  platform: string;
  url: string;
  handle: string;
}

export function extractSocialLinks(text: string): DiscoveredSocial[] {
  const discovered: DiscoveredSocial[] = [];
  
  const extractHandle = (url: string, platform: string) => {
    try {
      const cleanUrl = url.split("?")[0].replace(/\/+$/, "");
      const parts = cleanUrl.split("/");
      let h = parts[parts.length - 1];
      if (h.startsWith("@")) h = h.slice(1);
      return h;
    } catch {
      return "profile";
    }
  };

  const platforms = [
    { name: "Instagram", regex: /(https?:\/\/)?(www\.)?instagram\.com\/([a-zA-Z0-9_.-]+)/gi },
    { name: "Twitter/X", regex: /(https?:\/\/)?(www\.)?(twitter|x)\.com\/([a-zA-Z0-9_.-]+)/gi },
    { name: "TikTok", regex: /(https?:\/\/)?(www\.)?tiktok\.com\/@([a-zA-Z0-9_.-]+)/gi },
    { name: "Spotify", regex: /(https?:\/\/)?(www\.)?(open\.)?spotify\.com\/(artist|user)\/([a-zA-Z0-9_-]+)/gi },
    { name: "Discord", regex: /(https?:\/\/)?(www\.)?(discord\.gg|discord\.com\/invite)\/([a-zA-Z0-9_-]+)/gi },
    { name: "Twitch", regex: /(https?:\/\/)?(www\.)?twitch\.tv\/([a-zA-Z0-9_.-]+)/gi },
    { name: "LinkedIn", regex: /(https?:\/\/)?(www\.)?linkedin\.com\/(in|company)\/([a-zA-Z0-9_.-]+)/gi },
    { name: "Facebook", regex: /(https?:\/\/)?(www\.)?facebook\.com\/([a-zA-Z0-9_.-]+)/gi },
  ];

  for (const p of platforms) {
    const matches = [...text.matchAll(p.regex)];
    for (const match of matches) {
      const url = match[0];
      const handle = extractHandle(url, p.name);
      if (handle && handle !== "channel" && handle !== "c" && handle !== "user") {
        if (!discovered.some(d => d.url === url || (d.platform === p.name && d.handle === `@${handle}`))) {
          discovered.push({ platform: p.name, url, handle: `@${handle}` });
        }
      }
    }
  }

  return discovered;
}

export async function crawlLinktree(linktreeUrl: string): Promise<DiscoveredSocial[]> {
  try {
    const formattedUrl = linktreeUrl.startsWith("http") ? linktreeUrl : `https://${linktreeUrl}`;
    const res = await fetch(formattedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });
    if (!res.ok) return [];
    const html = await res.text();
    return extractSocialLinks(html);
  } catch (e) {
    console.warn("[Linktree Crawler] Failed to crawl Linktree:", e);
    return [];
  }
}

export async function discoverEcosystemLinks(description: string): Promise<DiscoveredSocial[]> {
  const directLinks = extractSocialLinks(description);
  
  // Find Linktree or similar links in description
  const linktreeRegex = /(https?:\/\/)?(www\.)?linktr\.ee\/([a-zA-Z0-9_-]+)/gi;
  const linktreeMatches = [...description.matchAll(linktreeRegex)];
  
  if (linktreeMatches.length > 0) {
    const crawledResults = await Promise.all(
      linktreeMatches.map(m => crawlLinktree(m[0]))
    );
    
    // Combine and deduplicate
    const combined = [...directLinks];
    for (const list of crawledResults) {
      for (const item of list) {
        if (!combined.some(d => d.platform === item.platform && d.handle === item.handle)) {
          combined.push(item);
        }
      }
    }
    return combined;
  }
  
  return directLinks;
}


