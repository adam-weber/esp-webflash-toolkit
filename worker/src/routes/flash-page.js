/**
 * Flash page handler — serves HTML flash pages
 *
 * GET /:user/:repo[/:tag]
 */

import { withCors } from '../lib/cors.js';
import { renderFlashPage } from '../lib/page-template.js';
import { handleResolve } from './resolve.js';

/**
 * Serve a flash page for a user/repo (with optional tag).
 * @param {Request} request
 * @param {Object} env
 * @param {string} user
 * @param {string} repo
 * @param {string} [tag]
 * @returns {Promise<Response>}
 */
export async function handleRepoFlashPage(request, env, user, repo, tag) {
    // Use the resolve handler to get config
    const resolveResponse = await handleResolve(request, env, user, repo, tag);

    if (resolveResponse.status !== 200) {
        return resolveResponse;
    }

    const config = await resolveResponse.json();
    return serveFlashPage(config);
}

/**
 * Render config as an HTML flash page.
 * __COMPONENT_JS__ is injected at build time by esbuild define.
 */
function serveFlashPage(config) {
    const componentJs = typeof __COMPONENT_JS__ !== 'undefined' ? __COMPONENT_JS__ : '/* component not available */';
    const html = renderFlashPage(config, componentJs);

    return withCors(new Response(html, {
        headers: {
            'Content-Type': 'text/html;charset=UTF-8',
            'Cache-Control': 'public, max-age=300',
            'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; connect-src https: blob:; style-src 'self' 'unsafe-inline'; img-src https: data:; frame-ancestors 'none'",
        },
    }));
}
