/**
 * Config resolver — GET /api/resolve/:user/:repo[/:tag]
 * Server-side GitHub config resolution with caching.
 */

import { jsonResponse, errorResponse } from '../lib/cors.js';
import { cachedGet, kvPut } from '../lib/cache.js';
import { fetchConfig, buildConfigFromReleases } from '../lib/github.js';
import { normalizeConfig } from '../../../src/core/config-schema.js';

/**
 * @param {Request} request
 * @param {Object} env
 * @param {string} user
 * @param {string} repo
 * @param {string} [tag]
 * @returns {Promise<Response>}
 */
export async function handleResolve(request, env, user, repo, tag) {
    // Validate input
    if (!/^[a-zA-Z0-9._-]+$/.test(user) || !/^[a-zA-Z0-9._-]+$/.test(repo)) {
        return errorResponse('Invalid user/repo format', 400);
    }
    if (tag && !/^[a-zA-Z0-9._-]+$/.test(tag)) {
        return errorResponse('Invalid tag format', 400);
    }

    const kvKey = tag ? `resolve:${user}/${repo}:${tag}` : `resolve:${user}/${repo}`;
    const isLatest = !tag;
    const kvTtl = isLatest ? 300 : 86400; // 5 min for latest, 24h for tagged

    // Try KV cache
    if (env.RESOLVED_CONFIGS) {
        const cached = await cachedGet(env.RESOLVED_CONFIGS, kvKey, request, kvTtl);
        if (cached) {
            return jsonResponse(JSON.parse(cached));
        }
    }

    const token = env.GITHUB_TOKEN || null;

    // Phase 1: Try flash-config.json (uses tag ref if specified)
    let config = await fetchConfig(user, repo, token, tag);
    if (config) {
        config = normalizeConfig(config);
        if (!config.repo) config.repo = `${user}/${repo}`;
    }

    // Phase 2: Fall back to releases
    if (!config) {
        config = await buildConfigFromReleases(user, repo, tag, token);
    }

    if (!config) {
        return errorResponse('Could not resolve config. No flash-config.json or release binaries found.', 404);
    }

    // Cache in KV
    const configStr = JSON.stringify(config);
    if (env.RESOLVED_CONFIGS) {
        await kvPut(env.RESOLVED_CONFIGS, kvKey, configStr, kvTtl);
    }

    return jsonResponse(config);
}
