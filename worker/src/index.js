/**
 * ESP WebFlash Worker — Router
 *
 * Routes:
 *   OPTIONS *                          → CORS preflight
 *   POST /mcp                          → MCP server (JSON-RPC 2.0)
 *   GET /proxy/*                       → Proxy to GitHub (allowlist)
 *   GET /api/resolve/:u/:r[/:tag]      → Resolve config JSON
 *   GET /:user/:repo[/:tag]            → Flash page
 *   GET /                              → Redirect to docs
 */

import { handlePreflight, errorResponse } from './lib/cors.js';
import { handleProxy } from './routes/proxy.js';
import { handleResolve } from './routes/resolve.js';
import { handleRepoFlashPage } from './routes/flash-page.js';
import { handleMCP } from './mcp/server.js';
import { buildTools } from './mcp/tools.js';

const mcpTools = buildTools();

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const { pathname } = url;
        const method = request.method;

        // MCP endpoint
        if (pathname === '/mcp') {
            try {
                return await handleMCP(request, env, mcpTools);
            } catch (err) {
                console.error('MCP error:', err);
                return errorResponse('Internal server error', 500);
            }
        }

        // CORS preflight
        if (method === 'OPTIONS') {
            return handlePreflight();
        }

        try {
            // GET /proxy/*
            if (method === 'GET' && pathname.startsWith('/proxy/')) {
                return handleProxy(request, env);
            }

            // GET /api/resolve/:user/:repo[/:tag]
            if (method === 'GET' && pathname.startsWith('/api/resolve/')) {
                const parts = pathname.replace('/api/resolve/', '').split('/');
                if (parts.length < 2 || parts.length > 3) {
                    return errorResponse('Usage: /api/resolve/:user/:repo[/:tag]', 400);
                }
                const [user, repo, tag] = parts;
                return handleResolve(request, env, user, repo, tag);
            }

            // GET / — redirect to docs
            if (pathname === '/' || pathname === '') {
                return Response.redirect('https://github.com/adam-weber/esp-webflash-toolkit', 302);
            }

            // GET /favicon.ico
            if (pathname === '/favicon.ico') {
                return new Response(null, { status: 204 });
            }

            // GET /:user/:repo[/:tag] — flash page
            if (method === 'GET') {
                const parts = pathname.slice(1).split('/');
                if (parts.length >= 2 && parts.length <= 3) {
                    const [user, repo, tag] = parts;
                    if (!repo.includes('.') && !['api', 'proxy', 'mcp', '_'].includes(user)) {
                        return handleRepoFlashPage(request, env, user, repo, tag);
                    }
                }
            }

            return errorResponse('Not found', 404);
        } catch (err) {
            console.error('Unhandled error:', err);
            return errorResponse('Internal server error', 500);
        }
    },
};
