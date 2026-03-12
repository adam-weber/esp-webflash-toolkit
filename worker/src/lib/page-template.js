/**
 * HTML page template for flash pages.
 * Mirrors generate-page.js but runs at the edge.
 */

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Generate a self-contained flash page HTML.
 * @param {Object} config - Normalized v2 config
 * @param {string} componentJs - Inlined component bundle JS
 * @returns {string} HTML
 */
export function renderFlashPage(config, componentJs) {
    const title = config.name || 'ESP Firmware';
    // Escape for safe HTML embedding: </script> → <\/script>
    const configJson = JSON.stringify(config).replace(/<\//g, '<\\/');
    const safeComponentJs = componentJs.replace(/<\//g, '<\\/');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)} — Flash Firmware</title>
    <meta name="description" content="Flash ${escapeHtml(title)} firmware to your ESP device from the browser.">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            padding: 40px 20px;
            background: #f5f5f7;
            min-height: 100vh;
        }
        @media (max-width: 600px) {
            body { padding: 16px 8px; }
        }
    </style>
    <script>${safeComponentJs}</script>
</head>
<body>
    <esp-flasher mode="full"></esp-flasher>
    <script type="application/json" id="flash-config">${configJson}</script>
    <script>
        const c = JSON.parse(document.getElementById('flash-config').textContent);
        document.querySelector('esp-flasher').setAttribute('config-data', JSON.stringify(c));
    </script>
</body>
</html>`;
}
