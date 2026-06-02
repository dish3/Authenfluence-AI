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

export interface SocialProfile {
  platform: string;
  url: string;
  handle: string;
  isVerified: boolean;
}

// ─── URL Decode / Normalise Helper ────────────────────────────────────────────
function decodeHtmlLinks(raw: string): string {
  try {
    // Decode HTML entities and percent-encoded sequences
    return decodeURIComponent(
      raw
        .replace(/&amp;/g, "&")
        .replace(/\\\//g, "/")
        .replace(/\\u003d/gi, "=")
        .replace(/\\u0026/gi, "&")
    );
  } catch {
    return raw;
  }
}

// Extract the real destination URL from YouTube's redirect wrapper
// e.g. https://www.youtube.com/redirect?q=https%3A%2F%2Fwww.instagram.com%2Fmrbeast
function extractRedirectTarget(href: string): string {
  try {
    const decoded = decodeHtmlLinks(href);
    // YouTube redirect pattern
    const redirectMatch = decoded.match(/[?&]q=([^&\s"']+)/);
    if (redirectMatch) {
      return decodeURIComponent(redirectMatch[1]);
    }
    return decoded;
  } catch {
    return href;
  }
}

// ─── Platform Classifier ──────────────────────────────────────────────────────
function classifyPlatform(url: string): { platform: string; handle: string } | null {
  const u = url.toLowerCase().replace(/\/$/, "");

  const patterns: Array<{ regex: RegExp; platform: string; handleGroup: number }> = [
    { regex: /instagram\.com\/([^/?#\s]+)/, platform: "Instagram", handleGroup: 1 },
    { regex: /(?:twitter|x)\.com\/([^/?#\s]+)/, platform: "Twitter/X", handleGroup: 1 },
    { regex: /facebook\.com\/([^/?#\s]+)/, platform: "Facebook", handleGroup: 1 },
    { regex: /tiktok\.com\/@?([^/?#\s]+)/, platform: "TikTok", handleGroup: 1 },
    { regex: /linkedin\.com\/(?:in|company)\/([^/?#\s]+)/, platform: "LinkedIn", handleGroup: 1 },
    { regex: /discord\.(?:gg|com\/invite)\/([^/?#\s]+)/, platform: "Discord", handleGroup: 1 },
    { regex: /t\.me\/([^/?#\s]+)/, platform: "Telegram", handleGroup: 1 },
    { regex: /twitch\.tv\/([^/?#\s]+)/, platform: "Twitch", handleGroup: 1 },
    { regex: /linktr\.ee\/([^/?#\s]+)/, platform: "Linktree", handleGroup: 1 },
    { regex: /patreon\.com\/([^/?#\s]+)/, platform: "Patreon", handleGroup: 1 },
    { regex: /snapchat\.com\/add\/([^/?#\s]+)/, platform: "Snapchat", handleGroup: 1 },
    { regex: /youtube\.com\/@?([^/?#\s]+)/, platform: "YouTube", handleGroup: 1 },
  ];

  for (const p of patterns) {
    const m = u.match(p.regex);
    if (m) {
      let handle = m[p.handleGroup] ?? "";
      // Strip junk suffixes (tracking params etc.)
      handle = handle.split("?")[0].split("#")[0];
      // Skip generic / noise handles
      if (["www", "watch", "shorts", "channel", "user", "c"].includes(handle)) continue;
      console.log(`[Platform Classified] ${p.platform}: ${url} (handle: @${handle})`);
      return { platform: p.platform, handle: `@${handle}` };
    }
  }
  return null;
}

// ─── Linktree Crawler ─────────────────────────────────────────────────────────
async function crawlLinktree(linktreeUrl: string): Promise<SocialProfile[]> {
  const profiles: SocialProfile[] = [];
  try {
    const res = await fetch(linktreeUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return profiles;
    const html = await res.text();

    // Linktree embeds link data in window.__LTDATA__ or as <a href> tags
    // Strategy 1: Extract from JSON blob
    const jsonMatch = html.match(/__LTDATA__\s*=\s*(\{.+?\})\s*;/s) ||
      html.match(/"url"\s*:\s*"(https?:\/\/[^"]+)"/g);

    // Strategy 2: Extract all href links from the page
    const hrefRegex = /href="(https?:\/\/[^"]+)"/g;
    let match: RegExpExecArray | null;
    const seen = new Set<string>();

    while ((match = hrefRegex.exec(html)) !== null) {
      const target = extractRedirectTarget(match[1]);
      if (seen.has(target)) continue;
      seen.add(target);
      const classified = classifyPlatform(target);
      if (classified && classified.platform !== "Linktree") {
        profiles.push({
          platform: classified.platform,
          url: target,
          handle: classified.handle,
          isVerified: true,
        });
      }
    }
  } catch (err) {
    console.warn("[Linktree Crawl] Failed:", linktreeUrl, err);
  }
  return profiles;
}

// ─── YouTube About Page Fetcher ────────────────────────────────────────────────
async function fetchYouTubePageHTML(handle: string, channelId?: string): Promise<string> {
  const cleanHandle = handle.replace(/^@/, "");

  // Priority order: /about pages first to guarantee full external-link payload
  const candidates: string[] = [];
  if (cleanHandle) {
    candidates.push(`https://www.youtube.com/@${cleanHandle}/about`);
    candidates.push(`https://www.youtube.com/@${cleanHandle}`);
  }
  if (channelId) {
    candidates.push(`https://www.youtube.com/channel/${channelId}/about`);
    candidates.push(`https://www.youtube.com/channel/${channelId}`);
  }

  for (const url of candidates) {
    console.log(`[About Page Fetch Started] ${url}`);
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        signal: AbortSignal.timeout(12000),
      });

      if (!res.ok) {
        console.warn(`[About Page Fetch] ${url} → HTTP ${res.status}`);
        continue;
      }

      const html = await res.text();
      console.log(`[About Metadata Loaded] ${res.status} (length: ${html.length})`);

      // Only return if the page has meaningful content
      if (html.length > 10000) {
        return html;
      }
    } catch (err) {
      console.warn(`[About Page Fetch] ${url} → Error:`, err);
    }
  }

  return "";
}

// ─── Social Link Extractor ────────────────────────────────────────────────────
export async function extractSocialLinks(
  handle: string,
  channelId?: string,
  youtubeUrl?: string
): Promise<SocialProfile[]> {
  const html = await fetchYouTubePageHTML(handle, channelId);

  if (!html) {
    console.log("[External Links Found] 0 matches (no HTML fetched)");
    return [];
  }

  const rawLinks: string[] = [];
  const seen = new Set<string>();

  // ── Strategy 1: ytInitialData JSON blob — most reliable ──────────────────
  // YouTube embeds all channel metadata, including aboutChannelRenderer links,
  // inside window["ytInitialData"] as a JSON string in a <script> tag.
  const ytDataMatch = html.match(/var ytInitialData\s*=\s*(\{.+?\});\s*(?:\/\/|<\/script>)/s) ||
    html.match(/window\["ytInitialData"\]\s*=\s*(\{.+?\});\s*(?:\/\/|<\/script>)/s);

  if (ytDataMatch) {
    const jsonStr = ytDataMatch[1];

    // Extract all "url" values inside channelExternalLinkViewModel / primaryLink / secondaryLink blocks
    const urlMatches = jsonStr.match(/"url"\s*:\s*"(https?:[^"]+)"/g) || [];
    for (const m of urlMatches) {
      const raw = m.replace(/^"url"\s*:\s*"/, "").replace(/"$/, "");
      const decoded = decodeHtmlLinks(raw);
      const target = extractRedirectTarget(decoded);
      if (!seen.has(target)) {
        seen.add(target);
        rawLinks.push(target);
      }
    }

    // Also extract from redirect q= params embedded in JSON
    const qParamMatches = jsonStr.match(/[?&]q=(https?[^"&\\]+)/g) || [];
    for (const m of qParamMatches) {
      const raw = m.replace(/^[?&]q=/, "");
      const decoded = decodeURIComponent(raw.replace(/\\u0026/gi, "&"));
      if (!seen.has(decoded)) {
        seen.add(decoded);
        rawLinks.push(decoded);
      }
    }
  }

  // ── Strategy 2: HTML href scan — catches anything ytInitialData missed ────
  const hrefRegex = /href="(https?:\/\/[^"]+)"/gi;
  let hrefMatch: RegExpExecArray | null;
  while ((hrefMatch = hrefRegex.exec(html)) !== null) {
    const target = extractRedirectTarget(hrefMatch[1]);
    if (!seen.has(target)) {
      seen.add(target);
      rawLinks.push(target);
    }
  }

  // ── Strategy 3: Plain text URL scan in description sections ──────────────
  const descUrlRegex = /https?:\/\/[^\s"'<>\\]+/gi;
  let descMatch: RegExpExecArray | null;
  while ((descMatch = descUrlRegex.exec(html)) !== null) {
    const raw = decodeHtmlLinks(descMatch[0]);
    if (!seen.has(raw)) {
      seen.add(raw);
      rawLinks.push(raw);
    }
  }

  console.log(`[External Links Found] ${rawLinks.length} matches`);

  // ── Classify each link into a social profile ─────────────────────────────
  const profileMap = new Map<string, SocialProfile>();
  const linktreeUrls: string[] = [];

  // Always include YouTube itself
  const ytHandle = `@${handle.replace(/^@/, "")}`;
  const ytUrl = youtubeUrl || `https://www.youtube.com/${ytHandle}`;
  profileMap.set("YouTube", {
    platform: "YouTube",
    url: ytUrl,
    handle: ytHandle,
    isVerified: true,
  });

  for (const link of rawLinks) {
    // Skip YouTube-internal URLs (navigation, images, etc.)
    if (link.includes("youtube.com") || link.includes("youtu.be") ||
        link.includes("google.com") || link.includes("gstatic.com") ||
        link.includes("googlevideo.com") || link.includes("ytimg.com") ||
        link.includes("googleapis.com")) {
      continue;
    }

    // Check for Linktree (crawl separately)
    if (link.includes("linktr.ee")) {
      linktreeUrls.push(link);
      continue;
    }

    const classified = classifyPlatform(link);
    if (classified && !profileMap.has(classified.platform)) {
      profileMap.set(classified.platform, {
        platform: classified.platform,
        url: link,
        handle: classified.handle,
        isVerified: true,
      });
    }
  }

  // ── Crawl Linktree pages for additional links ─────────────────────────────
  for (const ltUrl of linktreeUrls.slice(0, 2)) {
    // First add Linktree itself
    const ltClassified = classifyPlatform(ltUrl);
    if (ltClassified && !profileMap.has("Linktree")) {
      profileMap.set("Linktree", {
        platform: "Linktree",
        url: ltUrl,
        handle: ltClassified.handle,
        isVerified: true,
      });
    }
    // Then crawl for embedded links
    const ltProfiles = await crawlLinktree(ltUrl);
    for (const p of ltProfiles) {
      if (!profileMap.has(p.platform)) {
        profileMap.set(p.platform, p);
      }
    }
  }

  const finalSocials = Array.from(profileMap.values());

  // Preferred display order
  const order = ["YouTube", "Instagram", "Twitter/X", "TikTok", "Facebook", "LinkedIn", "Discord", "Telegram", "Twitch", "Linktree", "Patreon", "Snapchat", "Website"];
  finalSocials.sort((a, b) => {
    const ai = order.indexOf(a.platform);
    const bi = order.indexOf(b.platform);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  console.log(`[Verified Socials Generated] ${JSON.stringify(finalSocials.map(s => `${s.platform}: ${s.handle}`))}`);

  return finalSocials;
}

// ─── YouTube Data API helpers below ────────────────────────────────────────────

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
