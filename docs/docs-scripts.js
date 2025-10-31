// Docs-specific JavaScript - extracted from docs.html

function wrapCodeBlocks(container) {
    const codeBlocks = container.querySelectorAll('pre[class*="language-"], pre:has(code[class*="language-"])');

    codeBlocks.forEach((pre) => {
        // Skip if already wrapped
        if (pre.parentElement.classList.contains('code-block-wrapper') || pre.closest('.code-block-wrapper')) {
            return;
        }

        // Detect language from class name (check pre first, then code element inside)
        let classMatch = pre.className.match(/language-(\w+)/);
        if (!classMatch) {
            const codeElement = pre.querySelector('code[class*="language-"]');
            if (codeElement) {
                classMatch = codeElement.className.match(/language-(\w+)/);
            }
        }
        const language = classMatch ? classMatch[1] : 'code';

        // Check if this block should be collapsed by default
        const defaultCollapsed = pre.hasAttribute('data-collapsed');

        // Add line-numbers class to pre element
        pre.classList.add('line-numbers');

        // Create wrapper structure
        const wrapper = document.createElement('div');
        wrapper.className = 'code-block-wrapper';
        if (defaultCollapsed) {
            wrapper.classList.add('collapsed');
        }

        // Create header
        const header = document.createElement('div');
        header.className = 'code-block-header';

        // Create toggle with chevron SVG
        const toggle = document.createElement('div');
        toggle.className = 'code-block-toggle';
        toggle.innerHTML = `
            <svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2.5 4.5L6 8L9.5 4.5" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;

        // Create label
        const label = document.createElement('div');
        label.className = 'code-block-label';
        label.textContent = language;

        // Create copy button
        const copyButton = document.createElement('button');
        copyButton.className = 'code-block-copy';
        copyButton.setAttribute('aria-label', 'Copy code');
        copyButton.innerHTML = `
            <svg class="copy-icon" width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="4" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.5"/>
                <path d="M2 9V3C2 2.44772 2.44772 2 3 2H9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <svg class="check-icon" width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2.5 7.5L5.5 10.5L11.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;

        // Create content wrapper
        const content = document.createElement('div');
        content.className = 'code-block-content';

        // Build structure
        header.appendChild(toggle);
        header.appendChild(label);
        header.appendChild(copyButton);
        wrapper.appendChild(header);
        wrapper.appendChild(content);

        // Insert wrapper before pre and move pre into wrapper
        pre.parentNode.insertBefore(wrapper, pre);
        content.appendChild(pre);

        // Add click handler to toggle (left side of header)
        const toggleArea = document.createElement('div');
        toggleArea.style.cssText = 'display: flex; align-items: center; flex: 1; cursor: pointer;';
        toggleArea.appendChild(toggle);
        toggleArea.appendChild(label);
        header.insertBefore(toggleArea, copyButton);

        toggleArea.addEventListener('click', () => {
            wrapper.classList.toggle('collapsed');
        });

        // Add copy button handler
        copyButton.addEventListener('click', async (e) => {
            e.stopPropagation();
            const codeElement = pre.querySelector('code') || pre;
            const textToCopy = codeElement.textContent;

            try {
                await navigator.clipboard.writeText(textToCopy);
                copyButton.classList.add('copied');
                setTimeout(() => {
                    copyButton.classList.remove('copied');
                }, 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
            }
        });

        // Handle sticky header border radius
        const checkHeaderState = () => {
            const wrapperRect = wrapper.getBoundingClientRect();
            const headerRect = header.getBoundingClientRect();
            const contentRect = content.getBoundingClientRect();

            // Check if sticky (header is at the sticky position)
            const isStuck = headerRect.top <= 68 && wrapperRect.top < 68;

            // Check if near bottom
            const distanceFromBottom = contentRect.bottom - headerRect.bottom;
            const isNearBottom = distanceFromBottom <= 16;

            if (isStuck) {
                header.classList.add('is-sticky');
            } else {
                header.classList.remove('is-sticky');
            }

            if (isNearBottom) {
                header.classList.add('near-bottom');
            } else {
                header.classList.remove('near-bottom');
            }
        };

        // Check on scroll with throttling
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    checkHeaderState();
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });

        // Initial check
        checkHeaderState();
    });
}

// Dark mode functionality
function initDarkMode() {
    const savedMode = localStorage.getItem('darkMode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedMode === 'dark' || (!savedMode && prefersDark)) {
        document.documentElement.classList.add('dark-mode');
        document.body.classList.add('dark-mode');
    }
}

function toggleDarkMode() {
    document.documentElement.classList.toggle('dark-mode');
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark ? 'dark' : 'light');
}

document.addEventListener('DOMContentLoaded', () => {
    // Initialize dark mode
    initDarkMode();

    // Wait for navbar to load, then attach toggle handler
    setTimeout(() => {
        const darkModeToggle = document.getElementById('dark-mode-toggle');
        if (darkModeToggle) {
            darkModeToggle.addEventListener('click', toggleDarkMode);
        }
    }, 100);

    // Wrap all initially visible code blocks
    wrapCodeBlocks(document);
    if (typeof Prism !== 'undefined') {
        Prism.highlightAll();
    }
});

function showTab(tabName) {
    // Hide all tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.style.display = 'none';
    });

    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.background = 'transparent';
        btn.style.border = '1px solid transparent';
        btn.style.color = 'var(--text-secondary)';
        btn.style.boxShadow = 'none';
    });

    // Show selected tab
    const selectedTab = document.getElementById('tab-' + tabName);
    selectedTab.style.display = 'block';

    // Mark button as active
    event.target.classList.add('active');
    event.target.style.background = 'rgba(0,122,255,0.08)';
    event.target.style.border = '1px solid rgba(0,122,255,0.2)';
    event.target.style.color = '#007AFF';
    event.target.style.boxShadow = '0 1px 3px rgba(0,122,255,0.1), inset 0 1px 0 rgba(255,255,255,0.3)';

    // Wrap code blocks in the newly shown tab
    wrapCodeBlocks(selectedTab);

    // Re-highlight syntax
    if (typeof Prism !== 'undefined') {
        Prism.highlightAll();
    }
}

// Hex Visualizer Interactive Component
const hexExamples = {
    'page-header': {
        title: 'Page Header (32 bytes)',
        bytes: [
            0xFE, 0xFF, 0xFF, 0xFF,  // State (0xFFFFFFFE = active)
            0x00, 0x00, 0x00, 0x00,  // Sequence number
            0x01, 0x00, 0x00, 0x00,  // Version (0x01)
            0xFF, 0xFF, 0xFF, 0xFF,  // Reserved
            0xFF, 0xFF, 0xFF, 0xFF,  // Reserved
            0xFF, 0xFF, 0xFF, 0xFF,  // Reserved
            0xFF, 0xFF, 0xFF, 0xFF,  // Reserved
            0x7E, 0x3A, 0x91, 0xC2   // CRC32
        ],
        fields: [
            { range: [0, 3], type: 'field-state', name: 'State', value: '0xFFFFFFFE', desc: 'Page active state. 0xFFFFFFFE indicates this page is currently active and accepting writes.' },
            { range: [4, 7], type: 'field-seq', name: 'Sequence', value: '0x00000000', desc: 'Sequence number for wear leveling. Increments with each page rotation cycle.' },
            { range: [8, 11], type: 'field-version', name: 'Version', value: '0x00000001', desc: 'NVS format version. Version 1 is the current ESP-IDF standard.' },
            { range: [12, 27], type: 'field-reserved', name: 'Reserved', value: '0xFF...', desc: 'Reserved bytes. Always 0xFF in V1 format for future compatibility.' },
            { range: [28, 31], type: 'field-crc', name: 'CRC32', value: '0xC2913A7E', desc: 'CRC32 checksum of bytes 0-27. Validates page header integrity.' }
        ]
    },
    'u16-entry': {
        title: 'U16 Entry (port=1883)',
        bytes: [
            0x01,                    // Namespace index (config)
            0x02,                    // Type (U16)
            0x01,                    // Span (1 entry)
            0xFF,                    // Reserved
            0x70, 0x6F, 0x72, 0x74,  // "port"
            0x00, 0xFF, 0xFF, 0xFF,  // null terminator + padding
            0xFF, 0xFF, 0xFF, 0xFF,  // padding
            0xFF, 0xFF, 0xFF, 0xFF,  // padding
            0x5B, 0x07,              // 1883 (0x075B little-endian)
            0xFF, 0xFF,              // unused
            0xFF, 0xFF, 0xFF, 0xFF,  // unused
            0xFF, 0xFF, 0xFF, 0xFF   // unused
        ],
        fields: [
            { range: [0, 0], type: 'field-namespace', name: 'NS Index', value: '0x01', desc: 'Namespace index. 0x01 refers to "config" namespace defined earlier in partition.' },
            { range: [1, 1], type: 'field-type', name: 'Type', value: '0x02 (U16)', desc: 'Entry type 0x02 indicates unsigned 16-bit integer value.' },
            { range: [2, 2], type: 'field-span', name: 'Span', value: '1', desc: 'Number of entries this item occupies. Single entry for U16.' },
            { range: [3, 3], type: 'field-reserved', name: 'Reserved', value: '0xFF', desc: 'Reserved byte. Always 0xFF in current format.' },
            { range: [4, 19], type: 'field-key', name: 'Key', value: '"port"', desc: 'Null-terminated ASCII key name. Remaining bytes padded with 0xFF.' },
            { range: [20, 21], type: 'field-data', name: 'Value', value: '1883', desc: 'Little-endian U16: 0x075B = 1883. MQTT standard port.' },
            { range: [22, 31], type: 'field-reserved', name: 'Unused', value: '0xFF...', desc: 'Unused data bytes. Filled with 0xFF.' }
        ]
    },
    'string-entry': {
        title: 'String Entry (ssid="HomeWiFi")',
        bytes: [
            0x01,                    // Namespace index
            0x21,                    // Type (STR)
            0x01,                    // Span
            0xFF,                    // Reserved
            0x73, 0x73, 0x69, 0x64,  // "ssid"
            0x00, 0xFF, 0xFF, 0xFF,  // null + padding
            0xFF, 0xFF, 0xFF, 0xFF,  // padding
            0xFF, 0xFF, 0xFF, 0xFF,  // padding
            0x09, 0x00, 0x00, 0x00,  // Length: 9 bytes
            0x48, 0x6F, 0x6D, 0x65,  // "Home"
            0x57, 0x69, 0x46, 0x69   // "WiFi"
        ],
        fields: [
            { range: [0, 0], type: 'field-namespace', name: 'NS Index', value: '0x01', desc: 'Namespace index referencing "config" namespace.' },
            { range: [1, 1], type: 'field-type', name: 'Type', value: '0x21 (STR)', desc: 'Entry type 0x21 indicates null-terminated string value.' },
            { range: [2, 2], type: 'field-span', name: 'Span', value: '1', desc: 'Span of 1. String fits in single entry (≤8 bytes).' },
            { range: [3, 3], type: 'field-reserved', name: 'Reserved', value: '0xFF', desc: 'Reserved byte.' },
            { range: [4, 19], type: 'field-key', name: 'Key', value: '"ssid"', desc: 'Key name "ssid" with null terminator and 0xFF padding.' },
            { range: [20, 23], type: 'field-data', name: 'Length', value: '9', desc: 'String length in bytes (including null terminator).' },
            { range: [24, 31], type: 'field-data', name: 'Data', value: '"HomeWiFi"', desc: 'String data: "HomeWiFi" (8 visible chars + null = 9 bytes).' }
        ]
    },
    'namespace': {
        title: 'Namespace Entry (define "config")',
        bytes: [
            0x01,                    // Namespace index (self-reference)
            0x00,                    // Type (namespace)
            0x01,                    // Span
            0xFF,                    // Reserved
            0x63, 0x6F, 0x6E, 0x66,  // "conf"
            0x69, 0x67, 0x00, 0xFF,  // "ig" + null + padding
            0xFF, 0xFF, 0xFF, 0xFF,  // padding
            0xFF, 0xFF, 0xFF, 0xFF,  // padding
            0xFF, 0xFF, 0xFF, 0xFF,  // unused
            0xFF, 0xFF, 0xFF, 0xFF,  // unused
            0xFF, 0xFF, 0xFF, 0xFF,  // unused
            0xFF, 0xFF, 0xFF, 0xFF   // unused
        ],
        fields: [
            { range: [0, 0], type: 'field-namespace', name: 'NS Index', value: '0x01', desc: 'Namespace index. Namespaces assign themselves an index (0x01 in this case).' },
            { range: [1, 1], type: 'field-type', name: 'Type', value: '0x00 (NS)', desc: 'Type 0x00 defines a new namespace. Not a data entry.' },
            { range: [2, 2], type: 'field-span', name: 'Span', value: '1', desc: 'Namespace definitions occupy one entry.' },
            { range: [3, 3], type: 'field-reserved', name: 'Reserved', value: '0xFF', desc: 'Reserved byte.' },
            { range: [4, 19], type: 'field-key', name: 'NS Name', value: '"config"', desc: 'Namespace name "config". All subsequent entries with ns_index=0x01 belong to this namespace.' },
            { range: [20, 31], type: 'field-reserved', name: 'Unused', value: '0xFF...', desc: 'Unused bytes. Namespace entries don\'t store data values.' }
        ]
    }
};

function initHexVisualizer() {
    const container = document.getElementById('hex-bytes-container');
    const infoPanel = document.getElementById('hex-info-panel');
    const tabs = document.querySelectorAll('.hex-tab');

    let currentExample = 'page-header';
    let activeByteIndex = null;

    function renderHexBytes(exampleKey) {
        const example = hexExamples[exampleKey];
        container.innerHTML = '';

        example.bytes.forEach((byte, index) => {
            const byteEl = document.createElement('div');
            byteEl.className = 'hex-byte';
            byteEl.textContent = byte.toString(16).toUpperCase().padStart(2, '0');
            byteEl.dataset.index = index;

            // Find which field this byte belongs to
            const field = example.fields.find(f => index >= f.range[0] && index <= f.range[1]);
            if (field) {
                byteEl.classList.add(field.type);
            }

            byteEl.addEventListener('mouseenter', () => showByteInfo(index, exampleKey));
            byteEl.addEventListener('mouseleave', () => hideByteInfo());
            byteEl.addEventListener('click', () => toggleByteActive(index));

            container.appendChild(byteEl);
        });
    }

    function showByteInfo(index, exampleKey) {
        const example = hexExamples[exampleKey];
        const field = example.fields.find(f => index >= f.range[0] && index <= f.range[1]);

        if (!field) return;

        // Highlight all bytes in this field
        document.querySelectorAll('.hex-byte').forEach((el, i) => {
            if (i >= field.range[0] && i <= field.range[1]) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        });

        // Show info panel
        const rangeStart = '0x' + field.range[0].toString(16).toUpperCase().padStart(2, '0');
        const rangeEnd = '0x' + field.range[1].toString(16).toUpperCase().padStart(2, '0');
        const rangeStr = field.range[0] === field.range[1] ? rangeStart : `${rangeStart}-${rangeEnd}`;

        const bytes = example.bytes.slice(field.range[0], field.range[1] + 1);
        const hexStr = bytes.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');

        infoPanel.innerHTML = `
            <div class="hex-info-content">
                <div class="hex-info-field">Field</div>
                <div class="hex-info-value">${field.name}</div>

                <div class="hex-info-field">Byte Range</div>
                <div class="hex-info-range">${rangeStr}</div>

                <div class="hex-info-field">Value</div>
                <div class="hex-info-value">${field.value}</div>

                <div class="hex-info-desc">${field.desc}</div>

                <div class="hex-info-bytes">
                    <div class="hex-info-bytes-label">Raw Hex</div>
                    <div class="hex-info-bytes-value">${hexStr}</div>
                </div>
            </div>
        `;
    }

    function hideByteInfo() {
        if (activeByteIndex === null) {
            document.querySelectorAll('.hex-byte').forEach(el => el.classList.remove('active'));
            infoPanel.innerHTML = `
                <div class="hex-info-empty">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="16" cy="16" r="14"/>
                        <path d="M16 12v8M16 22v2"/>
                    </svg>
                    <p>Hover over bytes to see details</p>
                </div>
            `;
        }
    }

    function toggleByteActive(index) {
        if (activeByteIndex === index) {
            activeByteIndex = null;
            hideByteInfo();
        } else {
            activeByteIndex = index;
        }
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const exampleKey = tab.dataset.example;
            currentExample = exampleKey;
            activeByteIndex = null;
            renderHexBytes(exampleKey);
            hideByteInfo();
        });
    });

    // Initial render
    renderHexBytes(currentExample);
}

// Initialize hex visualizer when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('hex-bytes-container')) {
        initHexVisualizer();
    }
});

// Installation tab switcher
function showInstallTab(tab) {
    // Hide all install panes
    document.querySelectorAll('.install-pane').forEach(pane => {
        pane.style.display = 'none';
    });

    // Remove active from all buttons
    document.querySelectorAll('.install-tab-btn').forEach(btn => {
        btn.style.background = 'transparent';
        btn.style.border = '1px solid var(--border-color)';
        btn.style.color = 'var(--text-secondary)';
    });

    // Show selected pane
    document.getElementById('install-' + tab).style.display = 'block';

    // Mark button as active
    event.target.style.background = 'rgba(0,122,255,0.1)';
    event.target.style.border = '1px solid rgba(0,122,255,0.3)';
    event.target.style.color = '#007AFF';

    // Re-highlight syntax
    if (typeof Prism !== 'undefined') {
        Prism.highlightAll();
    }
}
