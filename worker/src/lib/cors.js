/**
 * CORS utilities for the worker
 */

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'X-Content-Type-Options': 'nosniff',
};

/** Handle OPTIONS preflight */
export function handlePreflight() {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/** Add CORS headers to a Response */
export function withCors(response) {
    const headers = new Headers(response.headers);
    for (const [k, v] of Object.entries(CORS_HEADERS)) {
        headers.set(k, v);
    }
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}

/** JSON response with CORS */
export function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...CORS_HEADERS,
        },
    });
}

/** Error response with CORS */
export function errorResponse(message, status = 400) {
    return jsonResponse({ error: message }, status);
}
