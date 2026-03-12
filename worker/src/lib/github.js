/**
 * GitHub API utilities — config fetching, releases, chip detection
 */

const GITHUB_API = 'https://api.github.com';
const RAW_BASE = 'https://raw.githubusercontent.com';

/**
 * Fetch flash-config.json from a GitHub repo.
 * If a tag is specified, tries that ref first. Otherwise tries main, then master.
 * @param {string} user
 * @param {string} repo
 * @param {string} [token] - GitHub token for higher rate limits
 * @param {string} [tag] - Git ref (tag/branch) to try first
 * @returns {Promise<Object|null>}
 */
export async function fetchConfig(user, repo, token, tag) {
    const branches = tag ? [tag] : ['main', 'master'];
    for (const branch of branches) {
        const url = `${RAW_BASE}/${user}/${repo}/${branch}/flash-config.json`;
        const res = await ghFetch(url, token);
        if (res.ok) {
            try {
                return await res.json();
            } catch {
                continue;
            }
        }
    }
    return null;
}

/**
 * Get the latest release info from GitHub.
 * @param {string} user
 * @param {string} repo
 * @param {string} [token]
 * @returns {Promise<Object|null>}
 */
export async function getLatestRelease(user, repo, token) {
    const url = `${GITHUB_API}/repos/${user}/${repo}/releases/latest`;
    const res = await ghFetch(url, token);
    if (!res.ok) return null;
    return res.json();
}

/**
 * Get a specific release by tag.
 * @param {string} user
 * @param {string} repo
 * @param {string} tag
 * @param {string} [token]
 * @returns {Promise<Object|null>}
 */
export async function getRelease(user, repo, tag, token) {
    const url = `${GITHUB_API}/repos/${user}/${repo}/releases/tags/${tag}`;
    const res = await ghFetch(url, token);
    if (!res.ok) return null;
    return res.json();
}

/**
 * Detect the chip type from a firmware binary URL.
 * ESP binaries: magic 0xE9 at byte 0, chip_id as uint16 LE at byte 12.
 * Uses Range request to fetch only the header.
 * @param {string} url - Firmware binary URL
 * @param {string} [token]
 * @returns {Promise<number|null>} chip ID or null
 */
export async function detectChipId(url, token) {
    try {
        const res = await ghFetch(url, token, {
            headers: { Range: 'bytes=0-23' },
        });
        if (!res.ok) return null;

        const buf = await res.arrayBuffer();
        const view = new DataView(buf);

        // Check magic byte
        if (view.getUint8(0) !== 0xE9) return null;

        // Chip ID at byte 12 (uint16 LE)
        return view.getUint16(12, true);
    } catch {
        return null;
    }
}

/**
 * Build config from GitHub releases (fallback when no flash-config.json).
 * Finds .bin assets, detects chips, creates a v2 config.
 * @param {string} user
 * @param {string} repo
 * @param {string} [tag] - Release tag, or omit for latest
 * @param {string} [token]
 * @returns {Promise<Object|null>}
 */
export async function buildConfigFromReleases(user, repo, tag, token) {
    const release = tag
        ? await getRelease(user, repo, tag, token)
        : await getLatestRelease(user, repo, token);

    if (!release) return null;

    const binAssets = (release.assets || []).filter(a =>
        a.name.endsWith('.bin') && !a.name.includes('bootloader') && !a.name.includes('partition')
    );

    if (binAssets.length === 0) return null;

    // Detect chips in parallel
    const CHIP_MAP = {
        0x0000: 'esp32', 0x0002: 'esp32s2', 0x0005: 'esp32c3',
        0x0009: 'esp32s3', 0x000C: 'esp32c2', 0x000D: 'esp32h2', 0x0012: 'esp32c6',
    };

    const variants = await Promise.all(binAssets.map(async (asset) => {
        const chipId = await detectChipId(asset.browser_download_url, token);
        const chip = chipId !== null ? (CHIP_MAP[chipId] || 'esp32') : 'esp32';
        const name = asset.name.replace(/\.bin$/, '').replace(/[-_]/g, ' ');

        return {
            id: asset.name.replace(/\.bin$/, ''),
            name,
            firmware: asset.name,
            chip,
        };
    }));

    return {
        version: 2,
        name: repo,
        repo: `${user}/${repo}`,
        release: release.tag_name,
        variants,
    };
}

/** Fetch with optional GitHub token */
async function ghFetch(url, token, opts = {}) {
    const headers = {
        'User-Agent': 'esp-webflash-worker',
        Accept: 'application/vnd.github.v3+json',
        ...opts.headers,
    };
    if (token) headers.Authorization = `token ${token}`;
    return fetch(url, { ...opts, headers });
}
