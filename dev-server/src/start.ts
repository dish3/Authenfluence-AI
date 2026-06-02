import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Proxy middleware to fetch external avatars (avoids client-side blocking on some hosts)
const avatarProxyMiddleware = createMiddleware().server(async ({ request, next }) => {
  try {
    const url = new URL(request.url);
    if (url.pathname === '/avatar-proxy') {
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': '*',
          }
        });
      }

      const q = url.searchParams.get('u');
      if (!q) return new Response('Missing url', { status: 400 });
      try {
        const remote = decodeURIComponent(q);
        const res = await fetch(remote, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          }
        });
        if (!res.ok) {
          console.error(`[AvatarProxy] Upstream fetch failed for ${remote}. Status: ${res.status}`);
          return new Response(`Upstream fetch failed: ${res.status}`, { status: 502 });
        }
        const contentType = res.headers.get('content-type') || 'image/*';
        const body = await res.arrayBuffer();
        return new Response(body, { 
          status: 200, 
          headers: { 
            'content-type': contentType,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': '*',
          } 
        });
      } catch (e) {
        return new Response('Proxy error', { status: 502 });
      }
    }
  } catch (e) {
    // ignore and continue to next
  }
  return next();
});

export const startInstance = createStart(() => ({
  requestMiddleware: [avatarProxyMiddleware, errorMiddleware],
}));
