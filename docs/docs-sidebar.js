/**
 * Reusable Documentation Sidebar Navigation
 * Automatically highlights the active page and provides story-flow navigation
 */

// Define the documentation flow as a story
const DOC_FLOW = [
    // Overview
    { href: 'index.html', title: 'Home', section: 'Overview' },
    { href: 'index.html#why', title: 'Use Cases', section: 'Overview' },
    { href: 'index.html#demos', title: 'Demos', section: 'Overview' },

    // Usage - The story of how to use the toolkit
    { href: 'index.html#quickstart', title: 'Quickstart', section: 'Usage' },
    { href: 'examples.html', title: 'Code Examples', section: 'Usage' },
    { href: 'firmware-router.html', title: 'Firmware Router', section: 'Usage' },
    { href: 'web-flasher-scaffold.html', title: 'Web Flasher Scaffold', section: 'Usage' },
    { href: 'flash-to-device.html', title: 'Flash to Device', section: 'Usage' },
    { href: 'read-from-firmware.html', title: 'Read from Firmware', section: 'Usage' },
    { href: 'javascript-api.html', title: 'JavaScript API', section: 'Usage' },

    // Advanced Topics - Practical limitations and technical notes
    { href: 'edge-cases.html', title: 'Edge Cases', section: 'Advanced Topics' },

    // Resources
    { href: 'index.html#links', title: 'Links', section: 'Resources' }
];

/**
 * Get the current page info from DOC_FLOW
 */
function getCurrentPageInfo() {
    const currentPath = window.location.pathname.split('/').pop();
    const currentHash = window.location.hash;
    const currentFullPath = currentHash ? `${currentPath}${currentHash}` : currentPath;

    // Find exact match first
    let currentIndex = DOC_FLOW.findIndex(page => {
        if (page.href.includes('#')) {
            return page.href === currentFullPath || page.href === `${currentPath}${currentHash}`;
        }
        return page.href === currentPath;
    });

    // If no exact match and we're on index.html with no hash, default to first item
    if (currentIndex === -1 && currentPath === 'index.html' && !currentHash) {
        currentIndex = 0;
    }

    return {
        current: DOC_FLOW[currentIndex],
        currentIndex: currentIndex,
        next: currentIndex >= 0 && currentIndex < DOC_FLOW.length - 1 ? DOC_FLOW[currentIndex + 1] : null,
        prev: currentIndex > 0 ? DOC_FLOW[currentIndex - 1] : null
    };
}

/**
 * Render the sidebar navigation
 */
function renderSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    const { currentIndex } = getCurrentPageInfo();
    const currentPath = window.location.pathname.split('/').pop();
    const currentHash = window.location.hash;

    // Group pages by section
    const sections = {};
    DOC_FLOW.forEach((page, index) => {
        if (!sections[page.section]) {
            sections[page.section] = [];
        }
        sections[page.section].push({ ...page, index });
    });

    // Build HTML
    let html = '';
    for (const [sectionName, pages] of Object.entries(sections)) {
        html += `<div class="sidebar-section">${sectionName}</div>\n`;

        pages.forEach(page => {
            // Determine if this page is active
            let isActive = false;
            if (page.href.includes('#')) {
                const pageFullPath = page.href;
                const currentFullPath = currentHash ? `${currentPath}${currentHash}` : currentPath;
                isActive = pageFullPath === currentFullPath || pageFullPath === `${currentPath}${currentHash}`;
            } else {
                isActive = page.href === currentPath;
            }

            const activeClass = isActive ? ' active' : '';
            html += `        <a href="${page.href}" class="sidebar-link${activeClass}">${page.title}</a>\n`;

            // For JavaScript API page, add nested sub-items
            if (page.href === 'javascript-api.html' && currentPath === 'javascript-api.html') {
                html += `
                    <a href="#installation" class="page-subnav-link">Installation</a>
                    <a href="#nvsgenerator" class="page-subnav-link">NVSGenerator</a>
                    <a href="#detectnvspartition" class="page-subnav-link">detectNVSPartition</a>
                    <a href="#deviceconnection" class="page-subnav-link">DeviceConnection</a>
                    <a href="#configmanager" class="page-subnav-link">ConfigManager</a>
                    <a href="#firmwareflasher" class="page-subnav-link">FirmwareFlasher</a>
                    <a href="#flasherui" class="page-subnav-link">FlasherUI</a>
                    <a href="#flasherapp" class="page-subnav-link">FlasherApp</a>
                    <a href="#verification" class="page-subnav-link">Output Verification</a>
                `;
            }
        });
        html += '\n';
    }

    // Set the main navigation
    sidebar.innerHTML = html;
}

/**
 * Render the "Next Section" navigation at the bottom of the page
 */
function renderNextSection() {
    const container = document.querySelector('.container');
    if (!container) return;

    const { next, current } = getCurrentPageInfo();

    // Remove existing next-section if present
    const existing = document.querySelector('.next-section');
    if (existing) existing.remove();

    if (next) {
        const nextSection = document.createElement('div');
        nextSection.className = 'next-section';
        nextSection.innerHTML = `
            <div class="next-section-label">Next in the story</div>
            <a href="${next.href}" class="next-section-link">
                <div class="next-section-title">${next.title}</div>
                <div class="next-section-arrow">→</div>
            </a>
        `;
        container.appendChild(nextSection);
    }
}

/**
 * Initialize sidebar navigation and next section
 */
function initDocsNavigation() {
    renderSidebar();
    renderNextSection();
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDocsNavigation);
} else {
    initDocsNavigation();
}
