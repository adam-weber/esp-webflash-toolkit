/**
 * CORS proxy — GET /proxy/*
 * Proxies requests to allowlisted GitHub domains.
 */

import { withCors, errorResponse } from '../lib/cors.js';

const ALLOWED_HOSTS = new Set([
    'raw.githubusercontent.com',
    'api.github.com',
    'github.com',
    'objects.githubusercontent.com',
]);

// github.com proxy is restricted to release download paths only
// to prevent serving arbitrary HTML from our origin (XSS)
const GITHUB_COM_PATH_RE = /^\/[^/]+\/[^/]+\/releases\/download\//;

/**
 * @param {Request} request
 * @param {Object} env
 * @returns {Promise<Response>}
 */
export async function handleProxy(request, env) {
    const url = new URL(request.url);

    // Extract target URL from /proxy/<url>
    const targetPath = url.pathname.replace(/^\/proxy\//, '');
    if (!targetPath) {
        return errorResponse('Missing target URL', 400);
    }

    // Reconstruct full URL, preserving query string from original request
    let targetUrl;
    try {
        // Enforce HTTPS only — reject http:// to prevent downgrade attacks
        if (targetPath.startsWith('http://')) {
            return errorResponse('Only HTTPS targets are allowed', 403);
        }
        targetUrl = new URL(targetPath.startsWith('https://') ? targetPath : `https://${targetPath}`);
        // Append the worker request's query string to the target
        // (browser sends ?key=val as part of the worker URL, not the path)
        if (url.search) {
            const targetParams = new URLSearchParams(targetUrl.search);
            const incomingParams = new URLSearchParams(url.search);
            for (const [k, v] of incomingParams) {
                targetParams.set(k, v);
            }
            targetUrl.search = targetParams.toString();
        }
    } catch {
        return errorResponse('Invalid target URL', 400);
    }

    // Allowlist check
    if (!ALLOWED_HOSTS.has(targetUrl.hostname)) {
        return errorResponse('Host not allowed', 403);
    }

    // Restrict github.com to release downloads only (prevents serving HTML as XSS)
    if (targetUrl.hostname === 'github.com' && !GITHUB_COM_PATH_RE.test(targetUrl.pathname)) {
        return errorResponse('Only release download paths are allowed for github.com', 403);
    }

    // Forward the request
    const headers = new Headers();
    headers.set('User-Agent', 'esp-webflash-worker');

    // Pass through range headers for chip detection
    const range = request.headers.get('Range');
    if (range) headers.set('Range', range);

    // Add GitHub token if available (for API requests)
    if (env.GITHUB_TOKEN && targetUrl.hostname === 'api.github.com') {
        headers.set('Authorization', `token ${env.GITHUB_TOKEN}`);
    }

    // Accept header for API vs raw content
    if (targetUrl.hostname === 'api.github.com') {
        headers.set('Accept', 'application/vnd.github.v3+json');
    }

    try {
        const response = await fetch(targetUrl.toString(), { headers });

        // Determine cache duration
        const isApi = targetUrl.hostname === 'api.github.com';
        const cacheTtl = isApi ? 300 : 3600; // 5 min for API, 1 hr for binaries

        const responseHeaders = {
            'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
            'Cache-Control': `public, max-age=${cacheTtl}`,
        };

        // Forward Content-Length so browsers can show download progress
        const contentLength = response.headers.get('Content-Length');
        if (contentLength) responseHeaders['Content-Length'] = contentLength;

        // Forward Content-Range for partial responses
        const contentRange = response.headers.get('Content-Range');
        if (contentRange) responseHeaders['Content-Range'] = contentRange;

        const proxied = new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
        });

        return withCors(proxied);
    } catch (err) {
        return errorResponse('Proxy error', 502);
    }
}
