/**
 * Caching utilities — KV + Cache API
 */

/**
 * Get from KV with optional Cache API layer.
 * @param {KVNamespace} kv
 * @param {string} key
 * @param {Request} request - Used as Cache API key
 * @param {number} [edgeTtl] - Cache API TTL in seconds
 * @returns {Promise<string|null>}
 */
export async function cachedGet(kv, key, request, edgeTtl = 300) {
    // Try Cache API first
    const cache = caches.default;
    const cacheKey = new Request(request.url, { method: 'GET' });
    const cached = await cache.match(cacheKey);
    if (cached) return cached.text();

    // Fall back to KV
    const value = await kv.get(key);
    if (value && edgeTtl > 0) {
        // Store in Cache API for edge caching
        const cacheResponse = new Response(value, {
            headers: { 'Cache-Control': `public, max-age=${edgeTtl}` },
        });
        await cache.put(cacheKey, cacheResponse);
    }
    return value;
}

/**
 * Put to KV with TTL.
 * @param {KVNamespace} kv
 * @param {string} key
 * @param {string} value
 * @param {number} [ttl] - TTL in seconds (0 = no expiry)
 */
export async function kvPut(kv, key, value, ttl = 0) {
    const opts = ttl > 0 ? { expirationTtl: ttl } : {};
    await kv.put(key, value, opts);
}
