/**
 * Lightweight MCP server — Streamable HTTP transport.
 * Implements JSON-RPC 2.0 over HTTP POST for tool discovery and invocation.
 * No SDK dependencies — just the protocol.
 */

const PROTOCOL_VERSION = '2025-03-26';

const SERVER_INFO = {
    name: 'esp-webflash-mcp',
    version: '1.0.0',
};

/**
 * Handle an MCP request.
 * @param {Request} request
 * @param {Object} env - Worker env bindings
 * @param {Object} tools - Map of tool name → { definition, handler }
 * @returns {Promise<Response>}
 */
export async function handleMCP(request, env, tools) {
    const method = request.method;

    // CORS preflight
    if (method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // GET — SSE stream (not needed for stateless server, return 405)
    if (method === 'GET') {
        return jsonRpcError(null, -32600, 'GET not supported — use POST', 405);
    }

    // DELETE — session termination (no-op for stateless)
    if (method === 'DELETE') {
        return new Response(null, { status: 200, headers: corsHeaders() });
    }

    if (method !== 'POST') {
        return jsonRpcError(null, -32600, 'Method not allowed', 405);
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return jsonRpcError(null, -32700, 'Parse error');
    }

    // Handle batch requests
    if (Array.isArray(body)) {
        const results = await Promise.all(body.map(msg => dispatch(msg, env, tools)));
        const responses = results.filter(r => r !== null);
        if (responses.length === 0) {
            return new Response(null, { status: 202, headers: corsHeaders() });
        }
        return new Response(JSON.stringify(responses), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders() },
        });
    }

    // Single message
    const result = await dispatch(body, env, tools);
    if (result === null) {
        // Notification — no response expected
        return new Response(null, { status: 202, headers: corsHeaders() });
    }

    return new Response(JSON.stringify(result), {
        headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(),
        },
    });
}

/**
 * Dispatch a single JSON-RPC message.
 * @returns {Object|null} JSON-RPC response or null for notifications
 */
async function dispatch(msg, env, tools) {
    if (!msg || typeof msg !== 'object' || msg.jsonrpc !== '2.0') {
        return { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid request' } };
    }

    const { id, method, params } = msg;

    // Notifications (no id) — don't respond
    if (id === undefined) {
        return null;
    }

    switch (method) {
        case 'initialize':
            return {
                jsonrpc: '2.0',
                id,
                result: {
                    protocolVersion: PROTOCOL_VERSION,
                    capabilities: {
                        tools: { listChanged: false },
                    },
                    serverInfo: SERVER_INFO,
                    instructions: 'ESP WebFlash Toolkit MCP server. Create hosted flash pages for ESP32 firmware, validate configs, and resolve GitHub repos.',
                },
            };

        case 'tools/list':
            return {
                jsonrpc: '2.0',
                id,
                result: {
                    tools: Object.values(tools).map(t => t.definition),
                },
            };

        case 'tools/call': {
            const toolName = params?.name;
            const args = params?.arguments || {};

            if (!toolName || !tools[toolName]) {
                return {
                    jsonrpc: '2.0',
                    id,
                    error: { code: -32602, message: `Unknown tool: ${toolName}` },
                };
            }

            try {
                const result = await tools[toolName].handler(args, env);
                return {
                    jsonrpc: '2.0',
                    id,
                    result,
                };
            } catch (err) {
                return {
                    jsonrpc: '2.0',
                    id,
                    result: {
                        content: [{ type: 'text', text: `Error: ${err.message}` }],
                        isError: true,
                    },
                };
            }
        }

        case 'ping':
            return { jsonrpc: '2.0', id, result: {} };

        default:
            return {
                jsonrpc: '2.0',
                id,
                error: { code: -32601, message: `Method not found: ${method}` },
            };
    }
}

function jsonRpcError(id, code, message, httpStatus = 200) {
    return new Response(
        JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }),
        {
            status: httpStatus,
            headers: { 'Content-Type': 'application/json', ...corsHeaders() },
        }
    );
}

function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Mcp-Session-Id, MCP-Protocol-Version',
        'Access-Control-Max-Age': '86400',
    };
}
