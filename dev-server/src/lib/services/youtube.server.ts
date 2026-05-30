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
    const handle = cleanQuery.startsWith("@") ? cleanQuery : `@${cleanQuery}`;
    resolvedHandle = handle;
    const byHandle = await yt<any>(
      "channels",
      { part: "snippet,statistics,contentDetails", forHandle: handle },
      apiKey
    ).catch(() => null);
    item = byHandle?.items?.[0];
  }

  // Fallback to search only if direct lookup by ID/handle fails
  if (!item) {
    console.warn(`Direct channel resolve failed for "${cleanQuery}". Trying search.list fallback...`);
    const search = await yt<any>(
      "search",
      { part: "snippet", type: "channel", q: cleanQuery, maxResults: "1" },
      apiKey
    );
    const channelId = search.items?.[0]?.id?.channelId;
    if (!channelId) throw new Error("No matching creator/channel found.");
    const ch = await yt<any>(
      "channels",
      { part: "snippet,statistics,contentDetails", id: channelId },
      apiKey
    );
    item = ch.items?.[0];

    // Enforce STRICT creator validation on search results to reject unrelated/fuzzy matches
    if (item) {
      const handle = item.snippet.customUrl || "";
      const title = item.snippet.title || "";
      if (!validateCreatorSimilarity(cleanQuery, handle, title)) {
        console.warn(`[STRICT RESOLVE] Creator similarity check failed for query "${cleanQuery}". Found "${title}" (${handle}).`);
        throw new Error("No matching creator/channel found.");
      }
    }
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
    thumbnail: item.snippet.thumbnails?.default?.url,
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
  const q = query.toLowerCase().replace(/[^a-z0-9]/g, "");
  const h = handle.toLowerCase().replace(/[^a-z0-9]/g, "");
  const t = title.toLowerCase().replace(/[^a-z0-9]/g, "");

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
