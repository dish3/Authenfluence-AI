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

export function extractHandleFromUrl(urlStr: string, platform: string): string | null {
  try {
    // Standardize URL
    let cleanUrl = urlStr.trim().split("?")[0].replace(/\/+$/, "");
    
    // Remove protocol and www.
    cleanUrl = cleanUrl.replace(/^(https?:\/\/)?(www\.)?/, "");
    
    // Split into parts
    const parts = cleanUrl.split("/");
    if (parts.length < 2) return null;
    
    let handleCandidate = "";
    const domain = parts[0].toLowerCase();
    
    if (domain.includes("instagram.com")) {
      handleCandidate = parts[1];
    } else if (domain.includes("twitter.com") || domain.includes("x.com")) {
      handleCandidate = parts[1];
    } else if (domain.includes("tiktok.com")) {
      handleCandidate = parts[1];
      if (handleCandidate.startsWith("@")) {
        handleCandidate = handleCandidate.slice(1);
      }
    } else if (domain.includes("spotify.com")) {
      if (parts[1] === "artist" || parts[1] === "user") {
        handleCandidate = parts[2] || "";
      } else {
        handleCandidate = parts[1];
      }
    } else if (domain.includes("discord.gg") || domain.includes("discord.com")) {
      if (parts[1] === "invite") {
        handleCandidate = parts[2] || "";
      } else {
        handleCandidate = parts[1];
      }
    } else if (domain.includes("twitch.tv")) {
      handleCandidate = parts[1];
    } else if (domain.includes("linkedin.com")) {
      if (parts[1] === "in" || parts[1] === "company" || parts[1] === "school") {
        handleCandidate = parts[2] || "";
      } else {
        handleCandidate = parts[1];
      }
    } else if (domain.includes("facebook.com")) {
      handleCandidate = parts[1];
    } else if (domain.includes("linktr.ee")) {
      handleCandidate = parts[1];
    } else {
      handleCandidate = parts[1] || "";
    }
    
    handleCandidate = handleCandidate.trim();
    if (!handleCandidate) return null;
    
    const lower = handleCandidate.toLowerCase();
    
    const IGNORED_HANDLES = new Set([
      "p", "reels", "stories", "explore", "developer", "about", "legal", "terms", "privacy", "jobs", "directory", 
      "blog", "press", "careers", "home", "index", "search", "settings", "profile", "post", "video", "status", 
      "groups", "pages", "sharer", "share", "people", "events", "login", "recover", "help", "policies", 
      "channel", "c", "user", "watch", "playlist", "results", "feed", "hashtag", "in", "company", "posts", 
      "learning", "artist", "track", "album", "show", "episode", "tag", "embed", "music", "trending", 
      "foryou", "discover", "privacy-policy", "support", "faq", "contact", "tos", "personalization",
      "r.php", "invite"
    ]);
    
    if (IGNORED_HANDLES.has(lower)) return null;
    if (!/^[a-zA-Z0-9_.-]+$/.test(handleCandidate)) return null;
    
    return handleCandidate;
  } catch {
    return null;
  }
}

async function fetchYouTubePageHTML(channelId: string, handle: string): Promise<string> {
  const cleanHandle = handle.replace(/^@/, "");
  const urls: string[] = [];
  
  if (cleanHandle) {
    urls.push(`https://www.youtube.com/@${cleanHandle}`);
    urls.push(`https://www.youtube.com/@${cleanHandle}/about`);
  }
  if (channelId) {
    urls.push(`https://www.youtube.com/channel/${channelId}`);
    urls.push(`https://www.youtube.com/channel/${channelId}/about`);
  }
  
  console.log(`[YouTube Scraper] Fetching channel HTML from candidates:`, urls);
  
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
  ];
  
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": userAgents[Math.floor(Math.random() * userAgents.length)],
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9"
        }
      });
      if (res.ok) {
        const html = await res.text();
        if (html && (html.includes("ytInitialData") || html.includes("instagram.com") || html.includes("twitter.com"))) {
          console.log(`[YouTube Scraper] Successfully fetched HTML from ${url} (length: ${html.length})`);
          return html;
        }
      }
    } catch (err) {
      console.warn(`[YouTube Scraper] Failed to fetch HTML from ${url}:`, err);
    }
  }
  
  return "";
}

export function extractSocialLinks(text: string): DiscoveredSocial[] {
  const discovered: DiscoveredSocial[] = [];
  
  // Replace backslash escaped slashes to handle JSON-encoded URLs in HTML script blocks
  const unescaped = text.replace(/\\\/|\\/g, "/");
  
  const urlRegex = /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|tiktok\.com|twitter\.com|x\.com|spotify\.com|discord\.gg|discord\.com|twitch\.tv|linktr\.ee|facebook\.com|linkedin\.com)\/[a-zA-Z0-9_\-\.\/@?=&%#]+/gi;
  
  const matches = unescaped.match(urlRegex) || [];
  
  const platforms = [
    { name: "Instagram", domain: "instagram.com" },
    { name: "TikTok", domain: "tiktok.com" },
    { name: "Twitter/X", domain: "twitter.com" },
    { name: "Twitter/X", domain: "x.com" },
    { name: "Spotify", domain: "spotify.com" },
    { name: "Discord", domain: "discord.gg" },
    { name: "Discord", domain: "discord.com" },
    { name: "Twitch", domain: "twitch.tv" },
    { name: "Linktree", domain: "linktr.ee" },
    { name: "Facebook", domain: "facebook.com" },
    { name: "LinkedIn", domain: "linkedin.com" }
  ];

  for (const match of matches) {
    const lowerMatch = match.toLowerCase();
    const platformInfo = platforms.find(p => lowerMatch.includes(p.domain));
    if (!platformInfo) continue;
    
    let fullUrl = match;
    if (!/^https?:\/\//i.test(fullUrl)) {
      fullUrl = `https://${fullUrl}`;
    }
    
    const handle = extractHandleFromUrl(fullUrl, platformInfo.name);
    if (!handle) continue;
    
    const cleanUrl = fullUrl.split("?")[0].replace(/\/+$/, "");
    
    const hasDup = discovered.some(d => 
      d.platform === platformInfo.name && 
      d.handle.toLowerCase() === `@${handle.toLowerCase()}`
    );
    
    if (!hasDup) {
      discovered.push({
        platform: platformInfo.name,
        url: cleanUrl,
        handle: `@${handle}`
      });
    }
  }

  return discovered;
}

export async function crawlLinktree(linktreeUrl: string): Promise<DiscoveredSocial[]> {
  try {
    const formattedUrl = linktreeUrl.startsWith("http") ? linktreeUrl : `https://${linktreeUrl}`;
    console.log(`[Linktree Crawler] Crawling Linktree: ${formattedUrl}`);
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

export async function discoverEcosystemLinks(
  channelId: string,
  handle: string,
  description: string
): Promise<DiscoveredSocial[]> {
  console.log(`[Ecosystem Discovery] Running for channelId: ${channelId}, handle: ${handle}`);
  
  const pageHtml = await fetchYouTubePageHTML(channelId, handle);
  const htmlLinks = pageHtml ? extractSocialLinks(pageHtml) : [];
  const descLinks = extractSocialLinks(description);
  
  const directLinks = [...htmlLinks];
  for (const item of descLinks) {
    if (!directLinks.some(d => d.platform === item.platform && d.handle.toLowerCase() === item.handle.toLowerCase())) {
      directLinks.push(item);
    }
  }
  
  console.log(`[Ecosystem Discovery] Discovered direct links:`, directLinks);
  
  const linktreeUrls: string[] = [];
  for (const item of directLinks) {
    if (item.platform === "Linktree") {
      linktreeUrls.push(item.url);
    }
  }
  
  const linktreeRegex = /(?:https?:\/\/)?(?:www\.)?linktr\.ee\/[a-zA-Z0-9_-]+/gi;
  const matches = [
    ...(description.match(linktreeRegex) || []),
    ...(pageHtml ? (pageHtml.match(linktreeRegex) || []) : [])
  ];
  
  for (const m of matches) {
    let url = m;
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    const cleanUrl = url.split("?")[0].replace(/\/+$/, "");
    if (!linktreeUrls.includes(cleanUrl)) {
      linktreeUrls.push(cleanUrl);
    }
  }
  
  if (linktreeUrls.length > 0) {
    console.log(`[Ecosystem Discovery] Discovered Linktree links to crawl:`, linktreeUrls);
    const crawledResults = await Promise.all(
      linktreeUrls.map(url => crawlLinktree(url))
    );
    
    for (const list of crawledResults) {
      for (const item of list) {
        if (!directLinks.some(d => d.platform === item.platform && d.handle.toLowerCase() === item.handle.toLowerCase())) {
          directLinks.push(item);
        }
      }
    }
  }
  
  const finalSocials = directLinks.filter(d => d.platform !== "Linktree");
  console.log(`[Ecosystem Discovery] Final discovered socials for ${handle}:`, finalSocials);
  return finalSocials;
}


