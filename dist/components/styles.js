const componentStyles = `
    :host {
        --esp-primary: #0071e3;
        --esp-primary-hover: #0077ed;
        --esp-bg: #f5f5f7;
        --esp-card-bg: #ffffff;
        --esp-text: #1d1d1f;
        --esp-text-secondary: #86868b;
        --esp-border: #d2d2d7;
        --esp-badge-bg: #e8e8ed;
        --esp-success: #34c759;
        --esp-error: #ff453a;
        --esp-warning: #ff9f0a;
        --esp-info: #4fc3f7;
        display: block;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    *, *::before, *::after { box-sizing: border-box; }

    .flasher-card {
        background: var(--esp-card-bg);
        border-radius: 16px;
        padding: 32px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        max-width: 480px;
    }

    .flasher-compact-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 12px 24px;
        background: var(--esp-primary);
        color: white;
        border: none;
        border-radius: 12px;
        font-size: 16px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s;
        font-family: inherit;
    }

    .flasher-compact-btn:hover {
        background: var(--esp-primary-hover);
    }

    .flasher-compact-btn svg {
        width: 18px;
        height: 18px;
        fill: currentColor;
    }

    /* Modal overlay */
    .modal-overlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 20px;
    }

    .modal-content {
        background: var(--esp-card-bg);
        border-radius: 16px;
        padding: 32px;
        max-width: 480px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        position: relative;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }

    .modal-close {
        position: absolute;
        top: 16px;
        right: 16px;
        background: var(--esp-badge-bg);
        border: none;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        font-size: 18px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--esp-text-secondary);
    }

    .modal-close:hover {
        background: var(--esp-border);
    }

    /* Remove double-boxing when card is inside modal */
    .modal-content .flasher-card {
        background: none;
        box-shadow: none;
        padding: 0;
        border-radius: 0;
        max-width: none;
    }

    h2 {
        font-size: 24px;
        font-weight: 600;
        margin: 0 0 8px 0;
        color: var(--esp-text);
    }

    .subtitle {
        color: var(--esp-text-secondary);
        font-size: 14px;
        margin-bottom: 24px;
    }

    .chip-badge {
        display: inline-block;
        background: var(--esp-badge-bg);
        color: var(--esp-text);
        padding: 3px 10px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 500;
        margin-left: 6px;
    }

    .branding-logo {
        display: block;
        max-height: 40px;
        max-width: 180px;
        margin-bottom: 12px;
    }

    /* Status */
    .status-box {
        background: var(--esp-bg);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 16px;
        text-align: center;
    }

    .status-box.connected { background: rgba(0, 113, 227, 0.08); }
    .status-box.flashing { background: rgba(255, 149, 0, 0.08); }
    .status-box.success { background: rgba(52, 199, 89, 0.08); }
    .status-box.error { background: rgba(255, 59, 48, 0.08); }

    .status-text {
        font-size: 16px;
        font-weight: 600;
        color: var(--esp-text);
        margin-bottom: 2px;
    }

    .status-subtext {
        font-size: 13px;
        color: var(--esp-text-secondary);
    }

    .stage-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--esp-text-secondary);
        margin-bottom: 4px;
    }

    /* Buttons */
    .btn {
        width: 100%;
        padding: 14px;
        border: none;
        border-radius: 12px;
        font-size: 16px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        margin-bottom: 10px;
        font-family: inherit;
    }

    .btn-primary {
        background: var(--esp-primary);
        color: white;
    }

    .btn-primary:hover:not(:disabled) {
        background: var(--esp-primary-hover);
    }

    .btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }

    /* Progress */
    .progress-bar {
        width: 100%;
        height: 4px;
        background: var(--esp-badge-bg);
        border-radius: 2px;
        overflow: hidden;
        margin: 12px 0;
    }

    .progress-fill {
        height: 100%;
        background: var(--esp-primary);
        width: 0%;
        transition: width 0.3s;
    }

    /* Form */
    .config-section {
        margin-bottom: 20px;
    }

    .config-section h3 {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--esp-text-secondary);
        margin: 0 0 10px 0;
    }

    .form-group {
        margin-bottom: 14px;
    }

    .form-group label {
        display: block;
        font-size: 14px;
        color: var(--esp-text);
        margin-bottom: 4px;
    }

    .form-group input, .form-group select {
        width: 100%;
        padding: 10px;
        border: 1px solid var(--esp-border);
        border-radius: 8px;
        font-size: 14px;
        background: var(--esp-card-bg);
        font-family: inherit;
    }

    .form-group input:focus, .form-group select:focus {
        outline: none;
        border-color: var(--esp-primary);
    }

    /* Variant selector */
    .variant-selector {
        margin-bottom: 16px;
    }

    .variant-selector select {
        width: 100%;
        padding: 10px;
        border: 1px solid var(--esp-border);
        border-radius: 8px;
        font-size: 14px;
        background: var(--esp-card-bg);
        font-family: inherit;
    }

    .variant-description {
        font-size: 12px;
        color: var(--esp-text-secondary);
        margin-top: 4px;
    }

    /* Recovery / PostFlash */
    .recovery-steps, .post-flash-steps {
        text-align: left;
        font-size: 13px;
        color: var(--esp-text);
        margin: 10px 0 0;
        padding-left: 18px;
    }

    .recovery-steps li, .post-flash-steps li {
        margin-bottom: 5px;
        line-height: 1.4;
    }

    .post-flash-link {
        display: inline-block;
        color: var(--esp-primary);
        text-decoration: none;
        font-weight: 500;
        margin-top: 8px;
    }

    /* Log */
    .log {
        background: #1d1d1f;
        color: #fff;
        border-radius: 8px;
        padding: 12px;
        font-family: 'SF Mono', Monaco, monospace;
        font-size: 11px;
        height: 120px;
        overflow-y: auto;
        margin-top: 16px;
    }

    .log-line { margin-bottom: 3px; }
    .log-line.info { color: var(--esp-info); }
    .log-line.success { color: var(--esp-success); }
    .log-line.error { color: var(--esp-error); }
    .log-line.warning { color: var(--esp-warning); }
    .log-line.debug { color: var(--esp-text-secondary); }

    /* Mobile block */
    .mobile-block {
        text-align: center;
        padding: 32px 16px;
    }

    .mobile-block h2 { font-size: 20px; margin: 0 0 10px; }
    .mobile-block p { color: var(--esp-text-secondary); font-size: 14px; margin-bottom: 20px; }

    .unsupported-block {
        text-align: center;
        padding: 32px 16px;
    }

    .unsupported-block h2 { font-size: 20px; margin: 0 0 10px; }
    .unsupported-block p { color: var(--esp-text-secondary); font-size: 14px; }

    .footer {
        text-align: center;
        margin-top: 16px;
        font-size: 12px;
        color: var(--esp-text-secondary);
    }

    .footer a {
        color: var(--esp-primary);
        text-decoration: none;
    }
`;
export {
  componentStyles
};
//# sourceMappingURL=styles.js.map
