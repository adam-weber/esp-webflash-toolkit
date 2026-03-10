/**
 * Shadow DOM CSS for <esp-flasher> component.
 * Uses CSS custom properties for theming.
 */

export const componentStyles = `
    :host {
        --c-accent: #6366f1;
        --c-accent-hover: #4f46e5;
        --c-accent-subtle: rgba(99, 102, 241, 0.08);
        --c-bg: #fafafa;
        --c-surface: #ffffff;
        --c-text: #09090b;
        --c-text-2: #71717a;
        --c-text-3: #a1a1aa;
        --c-border: #e4e4e7;
        --c-border-light: #f4f4f5;
        --c-success: #22c55e;
        --c-success-subtle: rgba(34, 197, 94, 0.08);
        --c-error: #ef4444;
        --c-error-subtle: rgba(239, 68, 68, 0.08);
        --c-warning: #f59e0b;
        --c-warning-subtle: rgba(245, 158, 11, 0.08);
        display: block;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        -webkit-font-smoothing: antialiased;
    }

    *, *::before, *::after { box-sizing: border-box; }

    /* Card */
    .flasher-card {
        background: var(--c-surface);
        border: 1px solid var(--c-border);
        border-radius: 12px;
        padding: 24px;
        max-width: 400px;
        margin: 0 auto;
        text-align: left;
    }

    /* Compact button */
    .flasher-compact-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 9px 16px;
        background: var(--c-accent);
        color: #fff;
        border: none;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
        font-family: inherit;
        letter-spacing: -0.01em;
    }

    .flasher-compact-btn:hover {
        background: var(--c-accent-hover);
        box-shadow: 0 2px 8px rgba(99, 102, 241, 0.25);
    }

    .flasher-compact-btn:active {
        transform: scale(0.98);
    }

    .flasher-compact-btn svg {
        width: 14px;
        height: 14px;
        fill: currentColor;
    }

    /* Modal */
    .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 24px;
        animation: overlay-in 0.15s ease;
    }

    @keyframes overlay-in {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    .modal-content {
        background: var(--c-surface);
        border: 1px solid var(--c-border);
        border-radius: 12px;
        padding: 24px;
        max-width: 400px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        position: relative;
        box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.25);
        animation: modal-in 0.2s ease;
    }

    @keyframes modal-in {
        from { opacity: 0; transform: translateY(8px) scale(0.98); }
        to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .modal-content .flasher-card {
        background: none;
        border: none;
        border-radius: 0;
        padding: 0;
        max-width: none;
        margin: 0;
        box-shadow: none;
        text-align: left;
    }

    .modal-close {
        position: absolute;
        top: 16px;
        right: 16px;
        background: none;
        border: 1px solid var(--c-border);
        border-radius: 6px;
        width: 28px;
        height: 28px;
        font-size: 16px;
        line-height: 1;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--c-text-3);
        transition: all 0.1s;
    }

    .modal-close:hover {
        background: var(--c-bg);
        color: var(--c-text);
    }

    /* Typography */
    h2 {
        font-size: 16px;
        font-weight: 600;
        letter-spacing: -0.02em;
        margin: 0 0 4px 0;
        color: var(--c-text);
    }

    .subtitle {
        color: var(--c-text-2);
        font-size: 13px;
        margin-bottom: 20px;
    }

    .chip-badge {
        display: inline-block;
        background: var(--c-bg);
        color: var(--c-text-2);
        padding: 1px 6px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 500;
        font-family: 'JetBrains Mono', 'SF Mono', ui-monospace, monospace;
        letter-spacing: 0.02em;
        margin-left: 4px;
        border: 1px solid var(--c-border);
    }

    .branding-logo {
        display: block;
        max-height: 28px;
        max-width: 140px;
        margin-bottom: 16px;
    }

    /* Status */
    .status-box {
        background: var(--c-bg);
        border: 1px solid var(--c-border-light);
        border-radius: 8px;
        padding: 14px;
        margin-bottom: 12px;
        text-align: center;
        transition: background 0.3s ease, border-color 0.3s ease;
    }

    .status-box.connected {
        background: var(--c-accent-subtle);
        border-color: rgba(99, 102, 241, 0.15);
    }
    .status-box.flashing {
        background: var(--c-warning-subtle);
        border-color: rgba(245, 158, 11, 0.15);
    }
    .status-box.success {
        background: var(--c-success-subtle);
        border-color: rgba(34, 197, 94, 0.15);
    }
    .status-box.error {
        background: var(--c-error-subtle);
        border-color: rgba(239, 68, 68, 0.15);
    }

    .status-text {
        font-size: 14px;
        font-weight: 600;
        color: var(--c-text);
        margin-bottom: 1px;
    }

    .status-subtext {
        font-size: 12px;
        color: var(--c-text-2);
    }

    .stage-label {
        font-size: 10px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--c-text-3);
        margin-bottom: 4px;
    }

    /* Buttons */
    .btn {
        width: 100%;
        padding: 10px;
        border: none;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
        margin-bottom: 8px;
        font-family: inherit;
    }

    .btn-primary {
        background: var(--c-accent);
        color: #fff;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }

    .btn-primary:hover:not(:disabled) {
        background: var(--c-accent-hover);
        box-shadow: 0 1px 3px rgba(99, 102, 241, 0.3);
    }

    .btn-primary:active:not(:disabled) {
        transform: scale(0.98);
    }

    .btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }

    /* Progress */
    .progress-bar {
        width: 100%;
        height: 2px;
        background: var(--c-border);
        border-radius: 2px;
        overflow: hidden;
        margin: 10px 0;
    }

    .progress-fill {
        height: 100%;
        background: var(--c-accent);
        width: 0%;
        border-radius: 2px;
        transition: width 0.3s ease;
        background-image: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.2) 50%,
            transparent 100%
        );
        background-size: 200% 100%;
        animation: shimmer 1.5s ease-in-out infinite;
    }

    @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }

    /* Form */
    .config-section {
        margin-bottom: 16px;
    }

    .config-section h3 {
        font-size: 11px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--c-text-3);
        margin: 0 0 8px 0;
    }

    .form-group {
        margin-bottom: 10px;
    }

    .form-group label {
        display: block;
        font-size: 13px;
        font-weight: 500;
        color: var(--c-text);
        margin-bottom: 4px;
    }

    .form-group input, .form-group select {
        width: 100%;
        padding: 7px 10px;
        border: 1px solid var(--c-border);
        border-radius: 6px;
        font-size: 13px;
        background: var(--c-surface);
        color: var(--c-text);
        font-family: inherit;
        transition: border-color 0.15s, box-shadow 0.15s;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }

    .form-group input:focus, .form-group select:focus {
        outline: none;
        border-color: var(--c-accent);
        box-shadow: 0 0 0 3px var(--c-accent-subtle), 0 1px 2px rgba(0, 0, 0, 0.04);
    }

    .form-group input::placeholder {
        color: var(--c-text-3);
    }

    .form-group select {
        cursor: pointer;
    }

    /* Variant selector */
    .variant-selector {
        margin-bottom: 12px;
    }

    .variant-selector select {
        width: 100%;
        padding: 7px 10px;
        border: 1px solid var(--c-border);
        border-radius: 6px;
        font-size: 13px;
        background: var(--c-surface);
        color: var(--c-text);
        font-family: inherit;
        cursor: pointer;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }

    .variant-description {
        font-size: 12px;
        color: var(--c-text-3);
        margin-top: 4px;
    }

    /* Recovery / PostFlash */
    .recovery-steps, .post-flash-steps {
        text-align: left;
        font-size: 13px;
        color: var(--c-text);
        margin: 8px 0 0;
        padding-left: 18px;
    }

    .recovery-steps li, .post-flash-steps li {
        margin-bottom: 3px;
        line-height: 1.5;
    }

    .post-flash-link {
        display: inline-block;
        color: var(--c-accent);
        text-decoration: none;
        font-weight: 500;
        font-size: 13px;
        margin-top: 8px;
    }

    .post-flash-link:hover { text-decoration: underline; }

    /* Log */
    .log {
        background: #18181b;
        color: #d4d4d8;
        border: 1px solid #27272a;
        border-radius: 8px;
        padding: 12px;
        font-family: 'JetBrains Mono', 'SF Mono', ui-monospace, monospace;
        font-size: 11px;
        line-height: 1.5;
        height: 120px;
        overflow-y: auto;
        margin-top: 12px;
    }

    .log::-webkit-scrollbar { width: 6px; }
    .log::-webkit-scrollbar-track { background: transparent; }
    .log::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 3px; }
    .log::-webkit-scrollbar-thumb:hover { background: #52525b; }

    .log-line { margin-bottom: 1px; }
    .log-line.info { color: #79c0ff; }
    .log-line.success { color: #7ee787; }
    .log-line.error { color: #ff7b72; }
    .log-line.warning { color: #d29922; }
    .log-line.debug { color: #484f58; }

    /* Mobile block */
    .mobile-block {
        text-align: center;
        padding: 32px 16px;
    }

    .mobile-block h2 {
        font-size: 16px;
        font-weight: 600;
        margin: 0 0 8px;
    }

    .mobile-block p {
        color: var(--c-text-2);
        font-size: 13px;
        line-height: 1.5;
        margin-bottom: 20px;
    }

    .unsupported-block {
        text-align: center;
        padding: 32px 16px;
    }

    .unsupported-block h2 {
        font-size: 16px;
        font-weight: 600;
        margin: 0 0 8px;
    }

    .unsupported-block p {
        color: var(--c-text-2);
        font-size: 13px;
    }

    .footer {
        text-align: center;
        margin-top: 16px;
        padding-top: 12px;
        border-top: 1px solid var(--c-border-light);
        font-size: 11px;
        color: var(--c-text-3);
    }

    .footer a {
        color: var(--c-text-2);
        text-decoration: none;
    }

    .footer a:hover {
        color: var(--c-text);
        text-decoration: underline;
    }
`;
