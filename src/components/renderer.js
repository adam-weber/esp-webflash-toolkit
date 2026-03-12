/**
 * Pure DOM rendering functions for <esp-flasher> component.
 * Returns element references directly instead of querying by ID.
 */

import { expandFieldPresets } from '../core/config-store.js';

/**
 * Render the status box area
 * @returns {{container: HTMLElement, stageLabel: HTMLElement, statusText: HTMLElement, statusSubtext: HTMLElement}}
 */
export function renderStatusBox() {
    const container = document.createElement('div');
    container.className = 'status-box';

    const stageLabel = document.createElement('div');
    stageLabel.className = 'stage-label';

    const statusText = document.createElement('div');
    statusText.className = 'status-text';
    statusText.textContent = 'Ready to connect';

    const statusSubtext = document.createElement('div');
    statusSubtext.className = 'status-subtext';
    statusSubtext.textContent = 'Click Connect to begin';

    container.append(stageLabel, statusText, statusSubtext);
    return { container, stageLabel, statusText, statusSubtext };
}

/**
 * Render the progress bar
 * @returns {{container: HTMLElement, fill: HTMLElement}}
 */
export function renderProgressBar() {
    const container = document.createElement('div');
    container.className = 'progress-bar';
    container.style.display = 'none';

    const fill = document.createElement('div');
    fill.className = 'progress-fill';

    container.appendChild(fill);
    return { container, fill };
}

/**
 * Render a config form from field definitions
 * @param {Array} fields - Field definitions (can include preset names)
 * @returns {{container: HTMLElement, inputs: Map<string, HTMLInputElement>}}
 */
export function renderConfigForm(fields) {
    const container = document.createElement('div');
    const inputs = new Map();

    if (!fields || fields.length === 0) return { container, inputs };

    const expanded = expandFieldPresets(fields);
    if (expanded.length === 0) return { container, inputs };

    const section = document.createElement('div');
    section.className = 'config-section';

    const heading = document.createElement('h3');
    heading.textContent = 'Configuration';
    section.appendChild(heading);

    for (const field of expanded) {
        const group = document.createElement('div');
        group.className = 'form-group';

        const label = document.createElement('label');
        label.textContent = field.label || field.key;
        group.appendChild(label);

        const input = document.createElement('input');
        input.type = field.type || 'text';
        input.placeholder = field.placeholder || '';
        if (field.default) input.value = field.default;
        if (field.required) input.required = true;
        if (field.pattern) input.pattern = field.pattern;
        input.dataset.nvsKey = field.key;

        group.appendChild(input);
        if (field.help) {
            const help = document.createElement('span');
            help.className = 'help-text';
            help.textContent = field.help;
            group.appendChild(help);
        }

        section.appendChild(group);
        inputs.set(field.key, input);
    }

    container.appendChild(section);
    return { container, inputs };
}

/**
 * Render variant selector dropdown
 * @param {Array} variants
 * @returns {{container: HTMLElement, select: HTMLSelectElement, description: HTMLElement}}
 */
export function renderVariantSelector(variants) {
    const container = document.createElement('div');
    container.className = 'variant-selector';

    const label = document.createElement('label');
    label.textContent = 'Firmware Variant';
    label.style.cssText = 'display: block; font-size: 14px; margin-bottom: 4px;';
    container.appendChild(label);

    const select = document.createElement('select');
    for (let i = 0; i < variants.length; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = variants[i].name || variants[i].id || `Variant ${i + 1}`;
        select.appendChild(option);
    }
    container.appendChild(select);

    const description = document.createElement('div');
    description.className = 'variant-description';
    if (variants[0].description) {
        description.textContent = variants[0].description;
    }
    container.appendChild(description);

    return { container, select, description };
}

/**
 * Render postFlash completion screen
 * @param {Object} postFlash
 * @returns {HTMLElement}
 */
export function renderPostFlash(postFlash) {
    const frag = document.createElement('div');

    const title = document.createElement('div');
    title.className = 'status-text';
    title.textContent = postFlash.title || 'Flash Complete!';
    frag.appendChild(title);

    if (postFlash.steps && postFlash.steps.length > 0) {
        const ol = document.createElement('ol');
        ol.className = 'post-flash-steps';
        for (const step of postFlash.steps) {
            const li = document.createElement('li');
            li.textContent = step;
            ol.appendChild(li);
        }
        frag.appendChild(ol);
    }

    if (postFlash.link) {
        const linkUrl = postFlash.link.url || '';
        // Only allow http/https URLs — block javascript:, data:, etc.
        if (/^https?:\/\//i.test(linkUrl)) {
            const a = document.createElement('a');
            a.className = 'post-flash-link';
            a.href = linkUrl;
            a.target = '_blank';
            a.rel = 'noopener';
            a.textContent = postFlash.link.label;
            frag.appendChild(a);
        }
    }

    return frag;
}

/**
 * Render error recovery steps
 * @param {{title: string, steps: string[]}} classified
 * @returns {HTMLElement}
 */
export function renderErrorRecovery(classified) {
    const frag = document.createElement('div');

    const title = document.createElement('div');
    title.className = 'status-text';
    title.textContent = classified.title;
    frag.appendChild(title);

    const ol = document.createElement('ol');
    ol.className = 'recovery-steps';
    for (const step of classified.steps) {
        const li = document.createElement('li');
        li.textContent = step;
        ol.appendChild(li);
    }
    frag.appendChild(ol);

    return frag;
}

/**
 * Render browser warning screen
 * @param {{supported: boolean, reason: string}} info
 * @returns {HTMLElement}
 */
export function renderBrowserWarning(info) {
    const container = document.createElement('div');
    container.className = 'unsupported-block';

    const h2 = document.createElement('h2');
    h2.textContent = 'Browser Not Supported';
    container.appendChild(h2);

    const p = document.createElement('p');
    p.textContent = info.reason;
    container.appendChild(p);

    return container;
}

/**
 * Render mobile block screen
 * @returns {{container: HTMLElement, copyBtn: HTMLButtonElement, shareBtn: HTMLButtonElement}}
 */
export function renderMobileBlock() {
    const container = document.createElement('div');
    container.className = 'mobile-block';

    const h2 = document.createElement('h2');
    h2.textContent = 'Desktop Required';
    container.appendChild(h2);

    const p = document.createElement('p');
    p.textContent = 'Flashing firmware requires a USB connection and a desktop browser with Web Serial support (Chrome, Edge, or Opera).';
    container.appendChild(p);

    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn btn-primary';
    copyBtn.textContent = 'Copy Link';
    container.appendChild(copyBtn);

    const shareBtn = document.createElement('button');
    shareBtn.className = 'btn';
    shareBtn.style.background = 'var(--c-bg)';
    shareBtn.style.color = 'var(--c-text)';
    shareBtn.style.border = '1px solid var(--c-border)';
    shareBtn.textContent = 'Share Link';
    container.appendChild(shareBtn);

    return { container, copyBtn, shareBtn };
}

/**
 * Render log container
 * @returns {HTMLElement}
 */
export function renderLog() {
    const container = document.createElement('div');
    container.className = 'log';
    return container;
}

/**
 * Render a modal overlay wrapping content
 * @param {HTMLElement} content
 * @returns {{overlay: HTMLElement, closeBtn: HTMLButtonElement}}
 */
export function renderModal(content) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal-content';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.innerHTML = '&times;';
    modal.appendChild(closeBtn);

    modal.appendChild(content);
    overlay.appendChild(modal);

    // Close on backdrop click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    });

    return { overlay, closeBtn };
}
