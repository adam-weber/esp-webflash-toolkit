var ESPFlasherComponent = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/bundle-component.js
  var bundle_component_exports = {};
  __export(bundle_component_exports, {
    ESPFlasherElement: () => ESPFlasherElement
  });

  // src/components/styles.js
  var componentStyles = `
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

    .help-text {
        display: block;
        font-size: 11px;
        color: var(--c-text-3);
        margin-top: 3px;
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

  // src/core/config-store.js
  var FieldPresets = {
    wifi: [
      { key: "wifi_ssid", label: "WiFi SSID", type: "text", required: true },
      { key: "wifi_pass", label: "WiFi Password", type: "password", required: true }
    ],
    mqtt: [
      { key: "mqtt_host", label: "MQTT Host", type: "text" },
      { key: "mqtt_user", label: "MQTT Username", type: "text" },
      { key: "mqtt_pass", label: "MQTT Password", type: "password" }
    ],
    device_name: [
      { key: "device_name", label: "Device Name", type: "text" }
    ]
  };
  function expandFieldPresets(fields) {
    if (!fields) return [];
    return fields.flatMap(
      (f) => typeof f === "string" && FieldPresets[f] ? FieldPresets[f] : [f]
    );
  }
  function flattenConfigSections(sections) {
    if (!sections) return [];
    return sections.flatMap(
      (section) => (section.fields || []).map((f) => ({
        key: f.nvsKey || f.key || f.id,
        label: f.label,
        type: f.type || "text",
        placeholder: f.placeholder,
        required: f.required || false,
        default: f.default,
        pattern: f.pattern,
        help: f.help,
        section: section.title || section.id
      }))
    );
  }
  var ConfigStore = class extends EventTarget {
    constructor(initialConfig = {}) {
      super();
      this.data = { ...initialConfig };
      this.schema = null;
    }
    /**
     * Set field schema
     * @param {Field[]} fields
     */
    setSchema(fields) {
      this.schema = fields;
      for (const f of fields) {
        if (f.default !== void 0 && this.data[f.key] === void 0) {
          this.data[f.key] = f.default;
        }
      }
      this.dispatchEvent(new CustomEvent("schema-changed", { detail: { schema: fields } }));
    }
    /** @returns {Field[]|null} */
    getSchema() {
      return this.schema;
    }
    /** Set a value */
    set(key, value) {
      this.data[key] = value;
      this.dispatchEvent(new CustomEvent("change", { detail: { key, value } }));
    }
    /** Get a value */
    get(key) {
      return this.data[key];
    }
    /** Get all values */
    getAll() {
      return { ...this.data };
    }
    /** Set multiple values */
    setAll(values) {
      Object.assign(this.data, values);
      this.dispatchEvent(new CustomEvent("change", { detail: { values } }));
    }
    /**
     * Validate required fields
     * @returns {{valid: boolean, missing: string[]}}
     */
    validate() {
      if (!this.schema) return { valid: true, missing: [] };
      const missing = this.schema.filter((f) => f.required && !this.data[f.key]).map((f) => f.key);
      return { valid: missing.length === 0, missing };
    }
    /**
     * Get data formatted for NVS (non-empty string values only)
     * @returns {Object<string, string>}
     */
    toNVS() {
      const result = {};
      for (const [k, v] of Object.entries(this.data)) {
        if (v !== void 0 && v !== null && v !== "") {
          result[k] = String(v);
        }
      }
      return result;
    }
    /** Serialize for storage */
    serialize() {
      return JSON.stringify(this.data);
    }
    /** Load from storage */
    load(data) {
      this.data = typeof data === "string" ? JSON.parse(data) : { ...data };
    }
  };

  // src/components/renderer.js
  function renderStatusBox() {
    const container = document.createElement("div");
    container.className = "status-box";
    const stageLabel = document.createElement("div");
    stageLabel.className = "stage-label";
    const statusText = document.createElement("div");
    statusText.className = "status-text";
    statusText.textContent = "Ready to connect";
    const statusSubtext = document.createElement("div");
    statusSubtext.className = "status-subtext";
    statusSubtext.textContent = "Click Connect to begin";
    container.append(stageLabel, statusText, statusSubtext);
    return { container, stageLabel, statusText, statusSubtext };
  }
  function renderProgressBar() {
    const container = document.createElement("div");
    container.className = "progress-bar";
    container.style.display = "none";
    const fill = document.createElement("div");
    fill.className = "progress-fill";
    container.appendChild(fill);
    return { container, fill };
  }
  function renderConfigForm(fields) {
    const container = document.createElement("div");
    const inputs = /* @__PURE__ */ new Map();
    if (!fields || fields.length === 0) return { container, inputs };
    const expanded = expandFieldPresets(fields);
    if (expanded.length === 0) return { container, inputs };
    const section = document.createElement("div");
    section.className = "config-section";
    const heading = document.createElement("h3");
    heading.textContent = "Configuration";
    section.appendChild(heading);
    for (const field of expanded) {
      const group = document.createElement("div");
      group.className = "form-group";
      const label = document.createElement("label");
      label.textContent = field.label || field.key;
      group.appendChild(label);
      const input = document.createElement("input");
      input.type = field.type || "text";
      input.placeholder = field.placeholder || "";
      if (field.default) input.value = field.default;
      if (field.required) input.required = true;
      if (field.pattern) input.pattern = field.pattern;
      input.dataset.nvsKey = field.key;
      group.appendChild(input);
      if (field.help) {
        const help = document.createElement("span");
        help.className = "help-text";
        help.textContent = field.help;
        group.appendChild(help);
      }
      section.appendChild(group);
      inputs.set(field.key, input);
    }
    container.appendChild(section);
    return { container, inputs };
  }
  function renderVariantSelector(variants) {
    const container = document.createElement("div");
    container.className = "variant-selector";
    const label = document.createElement("label");
    label.textContent = "Firmware Variant";
    label.style.cssText = "display: block; font-size: 14px; margin-bottom: 4px;";
    container.appendChild(label);
    const select = document.createElement("select");
    for (let i = 0; i < variants.length; i++) {
      const option = document.createElement("option");
      option.value = i;
      option.textContent = variants[i].name || variants[i].id || `Variant ${i + 1}`;
      select.appendChild(option);
    }
    container.appendChild(select);
    const description = document.createElement("div");
    description.className = "variant-description";
    if (variants[0].description) {
      description.textContent = variants[0].description;
    }
    container.appendChild(description);
    return { container, select, description };
  }
  function renderPostFlash(postFlash) {
    const frag = document.createElement("div");
    const title = document.createElement("div");
    title.className = "status-text";
    title.textContent = postFlash.title || "Flash Complete!";
    frag.appendChild(title);
    if (postFlash.steps && postFlash.steps.length > 0) {
      const ol = document.createElement("ol");
      ol.className = "post-flash-steps";
      for (const step of postFlash.steps) {
        const li = document.createElement("li");
        li.textContent = step;
        ol.appendChild(li);
      }
      frag.appendChild(ol);
    }
    if (postFlash.link) {
      const a = document.createElement("a");
      a.className = "post-flash-link";
      a.href = postFlash.link.url;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = postFlash.link.label;
      frag.appendChild(a);
    }
    return frag;
  }
  function renderErrorRecovery(classified) {
    const frag = document.createElement("div");
    const title = document.createElement("div");
    title.className = "status-text";
    title.textContent = classified.title;
    frag.appendChild(title);
    const ol = document.createElement("ol");
    ol.className = "recovery-steps";
    for (const step of classified.steps) {
      const li = document.createElement("li");
      li.textContent = step;
      ol.appendChild(li);
    }
    frag.appendChild(ol);
    return frag;
  }
  function renderBrowserWarning(info) {
    const container = document.createElement("div");
    container.className = "unsupported-block";
    const h2 = document.createElement("h2");
    h2.textContent = "Browser Not Supported";
    container.appendChild(h2);
    const p = document.createElement("p");
    p.textContent = info.reason;
    container.appendChild(p);
    return container;
  }
  function renderMobileBlock() {
    const container = document.createElement("div");
    container.className = "mobile-block";
    const h2 = document.createElement("h2");
    h2.textContent = "Desktop Required";
    container.appendChild(h2);
    const p = document.createElement("p");
    p.textContent = "Flashing firmware requires a USB connection and a desktop browser with Web Serial support (Chrome, Edge, or Opera).";
    container.appendChild(p);
    const copyBtn = document.createElement("button");
    copyBtn.className = "btn btn-primary";
    copyBtn.textContent = "Copy Link";
    container.appendChild(copyBtn);
    const shareBtn = document.createElement("button");
    shareBtn.className = "btn";
    shareBtn.style.background = "var(--c-bg)";
    shareBtn.style.color = "var(--c-text)";
    shareBtn.style.border = "1px solid var(--c-border)";
    shareBtn.textContent = "Share Link";
    container.appendChild(shareBtn);
    return { container, copyBtn, shareBtn };
  }
  function renderLog() {
    const container = document.createElement("div");
    container.className = "log";
    return container;
  }
  function renderModal(content) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    const modal = document.createElement("div");
    modal.className = "modal-content";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    const closeBtn = document.createElement("button");
    closeBtn.className = "modal-close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.innerHTML = "&times;";
    modal.appendChild(closeBtn);
    modal.appendChild(content);
    overlay.appendChild(modal);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });
    return { overlay, closeBtn };
  }

  // src/core/device-connection.js
  var DeviceConnection = class extends EventTarget {
    constructor() {
      super();
      this.transport = null;
      this.espStub = null;
      this.isConnected = false;
      this.abortController = null;
    }
    /**
     * Emit a typed event
     * @private
     */
    emit(type, detail) {
      this.dispatchEvent(new CustomEvent(type, { detail }));
    }
    /**
     * Connect to an ESP device
     * @param {string} expectedChip - Expected chip type (e.g., 'esp32s3')
     * @param {ConnectionOptions} [options] - Connection options
     * @returns {Promise<{chipType: string, macAddr: string}>}
     */
    async connect(expectedChip, options = {}) {
      if (this.transport || this.isConnected) {
        this.emit("log", { message: "Cleaning up previous connection...", level: "warning" });
        await this.disconnect();
      }
      this.abortController = new AbortController();
      const signal = this.abortController.signal;
      const timeout = options.timeout || 15e3;
      const baudrate = options.baudrate || 115200;
      try {
        let port = options.port;
        if (!port) {
          this.emit("status", { state: "connecting", message: "Select your device" });
          this.emit("log", { message: "Requesting serial port...", level: "info" });
          port = await navigator.serial.requestPort();
        }
        if (signal.aborted) {
          throw new Error("Connection cancelled");
        }
        this.emit("status", { state: "connecting", message: "Opening port..." });
        this.emit("log", { message: "Opening serial port...", level: "info" });
        const { Transport, ESPLoader } = await import("https://unpkg.com/esptool-js@0.4.5/bundle.js");
        if (signal.aborted) {
          throw new Error("Connection cancelled");
        }
        this.transport = new Transport(port, true);
        this.emit("status", { state: "connecting", message: "Detecting chip..." });
        this.emit("log", { message: "Initializing esptool...", level: "info" });
        this.espStub = new ESPLoader({
          transport: this.transport,
          baudrate,
          terminal: {
            clean: () => {
            },
            writeLine: (data) => this.emit("log", { message: data, level: "debug" }),
            write: (data) => this.emit("log", { message: data, level: "debug" })
          }
        });
        let timeoutId;
        const chipType = await Promise.race([
          this.espStub.main(),
          new Promise((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error("Connection timeout - device not responding")), timeout);
          }),
          new Promise(
            (_, reject) => signal.addEventListener("abort", () => reject(new Error("Connection cancelled")))
          )
        ]).finally(() => clearTimeout(timeoutId));
        this.emit("log", { message: `Chip detected: ${chipType}`, level: "info" });
        let macAddr = null;
        if (this.espStub.chip?.macAddr) {
          macAddr = this.espStub.chip.macAddr();
          this.emit("log", { message: `MAC Address: ${macAddr}`, level: "info" });
        }
        if (expectedChip && chipType && !options.skipChipCheck) {
          const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
          const expected = normalize(expectedChip);
          const detected = normalize(chipType.split(" ")[0]);
          const isMatch = expected === detected;
          if (!isMatch) {
            const shouldProceed = await this.handleChipMismatch(expected, detected);
            if (!shouldProceed) {
              await this.disconnect();
              throw new Error(`Chip mismatch: expected ${expected}, detected ${detected}`);
            }
            this.emit("log", { message: `Proceeding with ${chipType} (user override)`, level: "warning" });
          }
        }
        this.isConnected = true;
        this.emit("status", { state: "connected", message: `Connected to ${chipType}` });
        this.emit("log", { message: `Connected to ${chipType}`, level: "success" });
        this.emit("connected", { chipType, macAddr });
        return { chipType, macAddr };
      } catch (error) {
        await this.disconnect();
        this.emit("error", { error, message: error.message });
        this.emit("log", { message: `Connection failed: ${error.message}`, level: "error" });
        throw error;
      }
    }
    /**
     * Handle chip mismatch - emits event and waits for resolution
     * @private
     * @returns {Promise<boolean>} - true to proceed, false to cancel
     */
    handleChipMismatch(expected, detected) {
      return new Promise((resolve) => {
        let settled = false;
        const settle = (value) => {
          if (settled) return;
          settled = true;
          clearTimeout(autoCancel);
          resolve(value);
        };
        this.emit("chip-mismatch", {
          expected,
          detected,
          proceed: () => settle(true),
          cancel: () => settle(false)
        });
        const autoCancel = setTimeout(() => settle(false), 3e4);
      });
    }
    /**
     * Cancel an in-progress connection
     */
    cancel() {
      if (this.abortController) {
        this.abortController.abort();
      }
    }
    /**
     * Disconnect from device
     */
    async disconnect() {
      if (this.transport) {
        try {
          await this.transport.disconnect();
          this.emit("log", { message: "Disconnected", level: "info" });
        } catch (e) {
        }
      }
      this.transport = null;
      this.espStub = null;
      this.isConnected = false;
      this.emit("disconnected", {});
    }
    /**
     * Get the ESPLoader stub for direct operations
     * @returns {ESPLoader|null}
     */
    getStub() {
      return this.espStub;
    }
    /**
     * Check if connected
     * @returns {boolean}
     */
    getIsConnected() {
      return this.isConnected;
    }
    /**
     * Read flash memory from device
     * @param {number} offset - Flash offset to read from
     * @param {number} size - Number of bytes to read
     * @returns {Promise<Uint8Array>}
     */
    async readFlash(offset, size) {
      if (!this.espStub) {
        throw new Error("Device not connected");
      }
      this.emit("log", { message: `Reading ${size} bytes from 0x${offset.toString(16)}...`, level: "info" });
      const data = await this.espStub.readFlash(offset, size);
      this.emit("log", { message: `Read ${data.length} bytes`, level: "success" });
      return new Uint8Array(data);
    }
    /**
     * Write to flash memory
     * @param {Array<{data: Uint8Array|string, address: number}>} files - Files to flash
     * @param {Function} [onProgress] - Progress callback (percent, written, total)
     */
    async writeFlash(files, onProgress) {
      if (!this.espStub) {
        throw new Error("Device not connected");
      }
      const fileArray = files.map((f) => ({
        data: f.data instanceof Uint8Array ? Array.from(f.data).map((b) => String.fromCharCode(b)).join("") : f.data,
        address: f.address
      }));
      await this.espStub.writeFlash({
        fileArray,
        flashSize: "keep",
        compress: true,
        reportProgress: (idx, written, total) => {
          const percent = Math.round(written / total * 100);
          this.emit("progress", { percent, written, total });
          if (onProgress) onProgress(percent, written, total);
        }
      });
    }
    /**
     * Hard reset the device
     */
    async hardReset() {
      if (this.espStub) {
        await this.espStub.hardReset();
        this.emit("log", { message: "Device reset", level: "info" });
      }
    }
  };

  // src/core/nvs-generator.js
  var NVSGenerator = class {
    constructor() {
      this.PAGE_SIZE = 4096;
      this.ENTRY_SIZE = 32;
      this.ENTRIES_PER_PAGE = 126;
      this.TYPE_U8 = 1;
      this.TYPE_I8 = 17;
      this.TYPE_U16 = 2;
      this.TYPE_I16 = 18;
      this.TYPE_U32 = 4;
      this.TYPE_I32 = 20;
      this.TYPE_STR = 33;
      this.TYPE_BLOB = 65;
      this.PAGE_STATE_ACTIVE = 4294967294;
      this.PAGE_STATE_FULL = 4294967292;
      this.PAGE_STATE_EMPTY = 4294967295;
    }
    /**
     * Generate NVS partition binary from key-value pairs
     * @param {Object} data - Key-value pairs organized by namespace
     * @param {number} partitionSize - Size of partition in bytes (default: 0x6000 = 24KB)
     * @returns {Uint8Array} - Binary data ready to flash
     */
    generate(data, partitionSize = 24576) {
      const numPages = Math.floor(partitionSize / this.PAGE_SIZE);
      const binary = new Uint8Array(partitionSize);
      binary.fill(255);
      let pageIndex = 0;
      let entryIndex = 1;
      let namespaceIndex = 0;
      const namespaceMap = {};
      for (const namespace of Object.keys(data)) {
        if (Object.keys(data[namespace]).length > 0) {
          namespaceMap[namespace] = ++namespaceIndex;
        }
      }
      for (const [namespace, entries] of Object.entries(data)) {
        if (Object.keys(entries).length > 0) {
          const nsIndex = namespaceMap[namespace];
          this.writeEntry(binary, pageIndex, entryIndex++, {
            namespace: 0,
            // Namespace entries use index 0
            type: 1,
            // Namespace type (ESP-IDF uses 0x01)
            span: 1,
            key: namespace,
            data: new Uint8Array([nsIndex])
            // Store the index in data
          });
          for (const [key, value] of Object.entries(entries)) {
            const entry = this.createEntry(nsIndex, key, value);
            this.writeEntry(binary, pageIndex, entryIndex, entry);
            entryIndex += entry.span;
            if (entryIndex >= this.ENTRIES_PER_PAGE) {
              this.finalizePage(binary, pageIndex, entryIndex);
              pageIndex++;
              entryIndex = 1;
              if (pageIndex >= numPages) {
                throw new Error("NVS partition size too small for data");
              }
            }
          }
        }
      }
      if (entryIndex > 0) {
        this.finalizePage(binary, pageIndex, entryIndex);
      }
      return binary;
    }
    /**
     * Create an NVS entry from a key-value pair
     */
    createEntry(namespaceIndex, key, value) {
      let type, data;
      if (typeof value === "string") {
        type = this.TYPE_STR;
        const encoder = new TextEncoder();
        const strBytes = encoder.encode(value);
        data = new Uint8Array(strBytes.length + 1);
        data.set(strBytes);
        data[strBytes.length] = 0;
      } else if (typeof value === "number") {
        if (!Number.isInteger(value)) {
          throw new Error("Float values not supported yet");
        }
        if (value < 0) {
          if (value >= -128) {
            type = this.TYPE_I8;
            data = new Uint8Array(1);
            new DataView(data.buffer).setInt8(0, value);
          } else if (value >= -32768) {
            type = this.TYPE_I16;
            data = new Uint8Array(2);
            new DataView(data.buffer).setInt16(0, value, true);
          } else {
            type = this.TYPE_I32;
            data = new Uint8Array(4);
            new DataView(data.buffer).setInt32(0, value, true);
          }
        } else {
          if (value <= 255) {
            type = this.TYPE_U8;
            data = new Uint8Array([value]);
          } else if (value <= 65535) {
            type = this.TYPE_U16;
            data = new Uint8Array(2);
            new DataView(data.buffer).setUint16(0, value, true);
          } else {
            type = this.TYPE_U32;
            data = new Uint8Array(4);
            new DataView(data.buffer).setUint32(0, value, true);
          }
        }
      } else {
        throw new Error(`Unsupported value type for key ${key}: ${typeof value}`);
      }
      let span = 1;
      if (type === this.TYPE_STR || type === this.TYPE_BLOB) {
        span = 1 + Math.ceil(data.length / this.ENTRY_SIZE);
      } else {
        span = 1;
      }
      return {
        namespace: namespaceIndex,
        // Use sequential index
        type,
        span,
        key,
        data
      };
    }
    /**
     * Write an entry to the binary at the specified page and entry index
     */
    writeEntry(binary, pageIndex, entryIndex, entry) {
      const offset = pageIndex * this.PAGE_SIZE + 32 + entryIndex * this.ENTRY_SIZE;
      const view = new DataView(binary.buffer);
      binary[offset + 0] = entry.namespace;
      binary[offset + 1] = entry.type;
      binary[offset + 2] = entry.span;
      binary[offset + 3] = 255;
      const keyBytes = new TextEncoder().encode(entry.key.substring(0, 15));
      binary.set(keyBytes, offset + 8);
      for (let i = keyBytes.length; i < 16; i++) {
        binary[offset + 8 + i] = 0;
      }
      if (entry.type === this.TYPE_STR || entry.type === this.TYPE_BLOB) {
        view.setUint16(offset + 24, entry.data.length, true);
        let dataOffset = 0;
        for (let i = 1; i < entry.span; i++) {
          const nextEntryOffset = offset + i * this.ENTRY_SIZE;
          const chunk = entry.data.slice(dataOffset, dataOffset + this.ENTRY_SIZE);
          binary.set(chunk, nextEntryOffset);
          dataOffset += this.ENTRY_SIZE;
        }
      } else {
        binary.set(entry.data, offset + 24);
      }
      const crcData = new Uint8Array(28);
      crcData[0] = binary[offset + 0];
      crcData[1] = binary[offset + 1];
      crcData[2] = binary[offset + 2];
      crcData[3] = binary[offset + 3];
      crcData.set(binary.slice(offset + 8, offset + 24), 4);
      crcData.set(binary.slice(offset + 24, offset + 32), 20);
      const crc = this.calculateCRC32(crcData);
      view.setUint32(offset + 4, crc, true);
    }
    /**
     * Finalize a page by writing the page header and entry state bitmap.
     * The bitmap is 32 bytes (at entry slot 0, after the 32-byte page header).
     * Each entry uses 2 bits: 0b11 = Empty, 0b10 = Written, 0b00 = Erased.
     * Bitmap is stored LSB first.
     */
    finalizePage(binary, pageIndex, numEntries) {
      const offset = pageIndex * this.PAGE_SIZE;
      const view = new DataView(binary.buffer);
      view.setUint32(offset + 0, this.PAGE_STATE_ACTIVE, true);
      view.setUint32(offset + 4, pageIndex, true);
      view.setUint32(offset + 8, 4294967295, true);
      const bitmapOffset = offset + 32;
      for (let i = 0; i < 32; i++) {
        binary[bitmapOffset + i] = 255;
      }
      for (let e = 0; e < numEntries; e++) {
        const byteIdx = Math.floor(e / 4);
        const bitPos = e % 4 * 2;
        binary[bitmapOffset + byteIdx] &= ~(3 << bitPos);
        binary[bitmapOffset + byteIdx] |= 2 << bitPos;
      }
      const headerCRC = this.calculateCRC32(binary.slice(offset, offset + 28));
      view.setUint32(offset + 28, headerCRC, true);
    }
    /**
     * Calculate CRC32 checksum
     * This is a simplified implementation - ESP-IDF uses proper CRC32
     */
    calculateCRC32(data) {
      let crc = 4294967295;
      for (let i = 0; i < data.length; i++) {
        crc ^= data[i];
        for (let j = 0; j < 8; j++) {
          crc = crc >>> 1 ^ 3988292384 & -(crc & 1);
        }
      }
      return ~crc >>> 0;
    }
  };
  function generateNVSFromConfig(config, namespace = "config", partitionSize = 24576) {
    const generator = new NVSGenerator();
    const nvsData = {};
    nvsData[namespace] = {};
    for (const [section, fields] of Object.entries(config)) {
      for (const [field, value] of Object.entries(fields)) {
        const key = `${section}_${field}`;
        nvsData[namespace][key] = value;
      }
    }
    return generator.generate(nvsData, partitionSize);
  }
  NVSGenerator.prototype.parse = function(binary) {
    const data = {};
    const namespaces = {};
    const view = new DataView(binary.buffer, binary.byteOffset, binary.byteLength);
    const numPages = Math.floor(binary.length / this.PAGE_SIZE);
    for (let pageIdx = 0; pageIdx < numPages; pageIdx++) {
      const pageOffset = pageIdx * this.PAGE_SIZE;
      const pageState = view.getUint32(pageOffset, true);
      if (pageState === this.PAGE_STATE_EMPTY || pageState === 0) {
        continue;
      }
      for (let entryIdx = 1; entryIdx < this.ENTRIES_PER_PAGE; ) {
        const entryOffset = pageOffset + 32 + entryIdx * this.ENTRY_SIZE;
        const namespace = view.getUint8(entryOffset);
        if (namespace === 255) {
          entryIdx++;
          continue;
        }
        const type = view.getUint8(entryOffset + 1);
        const span = view.getUint8(entryOffset + 2);
        const keyBytes = new Uint8Array(binary.buffer, binary.byteOffset + entryOffset + 8, 16);
        const keyEnd = keyBytes.indexOf(0);
        const key = new TextDecoder().decode(keyBytes.slice(0, keyEnd > 0 ? keyEnd : 16));
        if (type === 1 && namespace === 0) {
          const nsIndex = view.getUint8(entryOffset + 24);
          namespaces[nsIndex] = key;
          if (!data[key]) {
            data[key] = {};
          }
          entryIdx += span;
          continue;
        }
        const namespaceName = namespaces[namespace] || `ns_${namespace}`;
        if (!data[namespaceName]) {
          data[namespaceName] = {};
        }
        let value;
        if (type === this.TYPE_U8) {
          value = view.getUint8(entryOffset + 24);
        } else if (type === this.TYPE_I8) {
          value = view.getInt8(entryOffset + 24);
        } else if (type === this.TYPE_U16) {
          value = view.getUint16(entryOffset + 24, true);
        } else if (type === this.TYPE_I16) {
          value = view.getInt16(entryOffset + 24, true);
        } else if (type === this.TYPE_U32) {
          value = view.getUint32(entryOffset + 24, true);
        } else if (type === this.TYPE_I32) {
          value = view.getInt32(entryOffset + 24, true);
        } else if (type === this.TYPE_STR) {
          const strLen = view.getUint16(entryOffset + 24, true);
          const totalBytes = new Uint8Array(strLen);
          let bytesRead = 0;
          for (let s = 1; s < span; s++) {
            const spanOffset = entryOffset + s * this.ENTRY_SIZE;
            const chunkSize = Math.min(strLen - bytesRead, this.ENTRY_SIZE);
            totalBytes.set(
              new Uint8Array(binary.buffer, binary.byteOffset + spanOffset, chunkSize),
              bytesRead
            );
            bytesRead += chunkSize;
          }
          const nullIndex = totalBytes.indexOf(0);
          const actualLen = nullIndex >= 0 ? nullIndex : strLen;
          value = new TextDecoder().decode(totalBytes.slice(0, actualLen));
        } else if (type === this.TYPE_BLOB) {
          const blobLen = view.getUint16(entryOffset + 24, true);
          const blobData = new Uint8Array(blobLen);
          let bytesRead = 0;
          for (let s = 1; s < span; s++) {
            const spanOffset = entryOffset + s * this.ENTRY_SIZE;
            const chunkSize = Math.min(blobLen - bytesRead, this.ENTRY_SIZE);
            blobData.set(
              new Uint8Array(binary.buffer, binary.byteOffset + spanOffset, chunkSize),
              bytesRead
            );
            bytesRead += chunkSize;
          }
          value = blobData;
        } else {
          entryIdx++;
          continue;
        }
        data[namespaceName][key] = value;
        entryIdx += span;
      }
    }
    return data;
  };
  function parseNVSConfig(binary, namespace = "config") {
    const generator = new NVSGenerator();
    const parsed = generator.parse(binary);
    return parsed[namespace] || {};
  }
  if (typeof window !== "undefined") {
    window.NVSGenerator = NVSGenerator;
    window.generateNVSFromConfig = generateNVSFromConfig;
    window.parseNVSConfig = parseNVSConfig;
  }

  // src/core/firmware-flasher.js
  var FirmwareFlasher = class extends EventTarget {
    constructor() {
      super();
    }
    /**
     * Emit a typed event
     * @private
     */
    emit(type, detail) {
      this.dispatchEvent(new CustomEvent(type, { detail }));
    }
    /**
     * Flash firmware to device
     * @param {DeviceConnection} device - Connected device
     * @param {string} firmwareUrl - URL to download firmware from
     * @param {FlashOptions} [options] - Flash options
     */
    async flash(device, firmwareUrl, options = {}) {
      const {
        customFirmware,
        nvsData,
        nvsNamespace = "config",
        nvsOffset = 36864,
        nvsSize = 24576,
        firmwareOffset = 65536
      } = options;
      try {
        this.emit("status", { state: "downloading", message: "Preparing firmware..." });
        this.emit("log", { message: "Starting flash process...", level: "info" });
        let firmwareData;
        if (customFirmware) {
          this.emit("log", { message: `Using custom firmware: ${customFirmware.name || "blob"}`, level: "info" });
          firmwareData = await customFirmware.arrayBuffer();
        } else {
          this.emit("log", { message: `Downloading from: ${firmwareUrl}`, level: "info" });
          this.emit("status", { state: "downloading", message: "Downloading firmware..." });
          let response;
          try {
            response = await fetch(firmwareUrl);
            if (!response.ok) {
              throw new Error(`${response.status}`);
            }
          } catch (e) {
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(firmwareUrl)}`;
            this.emit("log", { message: "Using CORS proxy...", level: "info" });
            response = await fetch(proxyUrl);
            if (!response.ok) {
              throw new Error(`Download failed: ${response.status} ${response.statusText}`);
            }
          }
          firmwareData = await response.arrayBuffer();
        }
        const firmwareBytes = new Uint8Array(firmwareData);
        this.emit("log", { message: `Firmware size: ${(firmwareBytes.length / 1024).toFixed(1)} KB`, level: "success" });
        const files = [];
        if (nvsData && Object.keys(nvsData).length > 0) {
          this.emit("status", { state: "generating", message: "Generating NVS partition..." });
          this.emit("log", { message: "Generating NVS partition...", level: "info" });
          const nvsBytes = this.generateNVS(nvsData, nvsNamespace, nvsSize);
          files.push({
            data: nvsBytes,
            address: nvsOffset
          });
          this.emit("log", {
            message: `NVS: ${nvsBytes.length} bytes at 0x${nvsOffset.toString(16)}`,
            level: "info"
          });
        }
        files.push({
          data: firmwareBytes,
          address: firmwareOffset
        });
        this.emit("log", {
          message: `Firmware: ${firmwareBytes.length} bytes at 0x${firmwareOffset.toString(16)}`,
          level: "info"
        });
        this.emit("status", { state: "flashing", message: "Writing to flash..." });
        this.emit("log", { message: "Writing to flash...", level: "info" });
        await device.writeFlash(files, (percent, written, total) => {
          this.emit("progress", { percent, written, total });
        });
        this.emit("status", { state: "complete", message: "Flash complete!" });
        this.emit("log", { message: "Flash completed successfully", level: "success" });
        this.emit("complete", {});
        return true;
      } catch (error) {
        this.emit("error", { error, message: error.message });
        this.emit("log", { message: `Flash failed: ${error.message}`, level: "error" });
        throw error;
      }
    }
    /**
     * Generate NVS partition binary
     * @param {Object} data - Key-value pairs
     * @param {string} namespace - NVS namespace
     * @param {number} size - Partition size
     * @returns {Uint8Array}
     */
    generateNVS(data, namespace = "config", size = 24576) {
      const generator = new NVSGenerator();
      const nvsData = { [namespace]: data };
      return generator.generate(nvsData, size);
    }
    /**
     * Flash only NVS configuration (without firmware)
     * @param {DeviceConnection} device - Connected device
     * @param {Object} nvsData - Key-value pairs
     * @param {Object} [options] - Options
     */
    async flashNVS(device, nvsData, options = {}) {
      const {
        nvsNamespace = "config",
        nvsOffset = 36864,
        nvsSize = 24576
      } = options;
      try {
        this.emit("status", { state: "generating", message: "Generating NVS..." });
        this.emit("log", { message: "Generating NVS partition...", level: "info" });
        const nvsBytes = this.generateNVS(nvsData, nvsNamespace, nvsSize);
        const keys = Object.keys(nvsData);
        this.emit("log", { message: `NVS keys: ${keys.join(", ")}`, level: "info" });
        this.emit("status", { state: "flashing", message: "Writing config..." });
        this.emit("log", { message: `Writing ${nvsBytes.length} bytes to 0x${nvsOffset.toString(16)}...`, level: "info" });
        await device.writeFlash([{ data: nvsBytes, address: nvsOffset }], (percent) => {
          this.emit("progress", { percent });
        });
        this.emit("status", { state: "complete", message: "Config written!" });
        this.emit("log", { message: `Wrote ${keys.length} config values`, level: "success" });
        this.emit("complete", {});
        return true;
      } catch (error) {
        this.emit("error", { error, message: error.message });
        this.emit("log", { message: `Config write failed: ${error.message}`, level: "error" });
        throw error;
      }
    }
  };

  // src/core/flash-states.js
  var FlashStates = {
    IDLE: "idle",
    READY: "ready",
    CONNECTING: "connecting",
    CONNECTED: "connected",
    DOWNLOADING: "downloading",
    GENERATING: "generating",
    WRITING: "writing",
    VERIFYING: "verifying",
    COMPLETE: "complete",
    ERROR: "error"
  };
  var FlashStateLabels = {
    [FlashStates.IDLE]: "Idle",
    [FlashStates.READY]: "Ready",
    [FlashStates.CONNECTING]: "Connecting...",
    [FlashStates.CONNECTED]: "Connected",
    [FlashStates.DOWNLOADING]: "Downloading firmware...",
    [FlashStates.GENERATING]: "Generating config...",
    [FlashStates.WRITING]: "Writing to device...",
    [FlashStates.VERIFYING]: "Verifying...",
    [FlashStates.COMPLETE]: "Complete",
    [FlashStates.ERROR]: "Error"
  };
  var VALID_TRANSITIONS = {
    [FlashStates.IDLE]: [FlashStates.READY, FlashStates.CONNECTING, FlashStates.ERROR],
    [FlashStates.READY]: [FlashStates.CONNECTING, FlashStates.ERROR],
    [FlashStates.CONNECTING]: [FlashStates.CONNECTED, FlashStates.ERROR, FlashStates.IDLE],
    [FlashStates.CONNECTED]: [FlashStates.DOWNLOADING, FlashStates.GENERATING, FlashStates.WRITING, FlashStates.ERROR, FlashStates.IDLE],
    [FlashStates.DOWNLOADING]: [FlashStates.GENERATING, FlashStates.WRITING, FlashStates.ERROR],
    [FlashStates.GENERATING]: [FlashStates.WRITING, FlashStates.ERROR],
    [FlashStates.WRITING]: [FlashStates.VERIFYING, FlashStates.COMPLETE, FlashStates.ERROR],
    [FlashStates.VERIFYING]: [FlashStates.COMPLETE, FlashStates.ERROR],
    [FlashStates.COMPLETE]: [FlashStates.IDLE, FlashStates.READY, FlashStates.CONNECTING],
    [FlashStates.ERROR]: [FlashStates.IDLE, FlashStates.READY, FlashStates.CONNECTING]
  };
  var FlashStateMachine = class extends EventTarget {
    constructor() {
      super();
      this._state = FlashStates.IDLE;
    }
    /** @returns {string} Current state */
    get state() {
      return this._state;
    }
    /** @returns {string} Human-readable label for current state */
    get label() {
      return FlashStateLabels[this._state] || this._state;
    }
    /**
     * Transition to a new state.
     * @param {string} newState - Target state from FlashStates
     * @returns {boolean} Whether the transition was valid
     */
    transition(newState) {
      const valid = VALID_TRANSITIONS[this._state];
      if (!valid || !valid.includes(newState)) {
        return false;
      }
      const from = this._state;
      this._state = newState;
      this.dispatchEvent(new CustomEvent("state-change", {
        detail: {
          from,
          to: newState,
          label: FlashStateLabels[newState] || newState
        }
      }));
      return true;
    }
    /**
     * Force transition (skips validation). Use for error recovery.
     * @param {string} newState
     */
    force(newState) {
      const from = this._state;
      this._state = newState;
      this.dispatchEvent(new CustomEvent("state-change", {
        detail: {
          from,
          to: newState,
          label: FlashStateLabels[newState] || newState
        }
      }));
    }
    /**
     * Reset to IDLE state.
     */
    reset() {
      this.force(FlashStates.IDLE);
    }
  };

  // src/core/error-catalog.js
  var BOOT_INSTRUCTIONS = {
    esp32: "Hold the BOOT button while connecting, or press BOOT then EN/RST.",
    esp32s2: "Hold BOOT, press RST, then release BOOT to enter download mode.",
    esp32s3: "Hold BOOT, press RST, then release BOOT. Some boards auto-enter download mode.",
    esp32c3: "Hold BOOT while connecting. The USB-JTAG interface may auto-detect.",
    esp32c6: "Hold BOOT while connecting. Check your board's documentation.",
    esp32h2: "Hold BOOT while connecting.",
    esp8266: "Hold GPIO0/FLASH low, press RST, then release GPIO0."
  };
  var ERROR_PATTERNS = [
    {
      type: "connection_timeout",
      patterns: [/timeout/i, /not responding/i, /timed out/i],
      title: "Connection Timed Out",
      steps: [
        "Make sure the device is connected via USB",
        "Put the device in download mode: {bootInstruction}",
        "Try a different USB cable (some cables are charge-only)",
        "Close any other serial monitors (Arduino IDE, PlatformIO, etc.)"
      ]
    },
    {
      type: "port_in_use",
      patterns: [/port.*in use/i, /failed to open/i, /access denied/i, /busy/i, /port.*locked/i],
      title: "Port In Use",
      steps: [
        "Close any serial monitors or terminal programs using this port",
        "Close Arduino IDE, PlatformIO, or any other tools that may be connected",
        "Unplug and replug the USB cable",
        "Try restarting your browser"
      ]
    },
    {
      type: "download_failed",
      patterns: [/download failed/i, /fetch.*failed/i, /network error/i, /cors/i, /404/i],
      title: "Firmware Download Failed",
      steps: [
        "Check your internet connection",
        "Verify the firmware URL is correct and accessible",
        "The firmware server may be temporarily unavailable \u2014 try again in a moment",
        "If the URL is private, make sure the release is public"
      ]
    },
    {
      type: "write_failed",
      patterns: [/write.*fail/i, /flash.*fail/i, /erase.*fail/i],
      title: "Flash Write Failed",
      steps: [
        "Put the device in download mode and try again: {bootInstruction}",
        "Try a different USB cable or port",
        "Power cycle the device and reconnect",
        "The device flash memory may be damaged or write-protected"
      ]
    },
    {
      type: "disconnected_during_flash",
      patterns: [/disconnect/i, /lost/i, /break/i, /detach/i, /removed/i],
      title: "Device Disconnected",
      steps: [
        "Do not unplug the device during flashing",
        "Use a reliable USB cable and avoid loose connections",
        "Try a USB port directly on your computer (not a hub)",
        "Reconnect and try again"
      ]
    },
    {
      type: "chip_mismatch",
      patterns: [/chip mismatch/i, /unexpected chip/i],
      title: "Wrong Chip Detected",
      steps: [
        "The connected device is a different chip than expected",
        "Make sure you are flashing the correct firmware for your hardware",
        "If this is correct, you may proceed \u2014 but the firmware may not work"
      ]
    },
    {
      type: "no_port_selected",
      patterns: [/no port/i, /user cancelled/i, /no device/i, /requestport/i],
      title: "No Device Selected",
      steps: [
        "Click Connect and select your device from the browser popup",
        "Make sure the device is plugged in before clicking Connect",
        "If the device doesn't appear, try a different USB cable or port"
      ]
    }
  ];
  function classifyError(error, context = {}) {
    const message = typeof error === "string" ? error : error?.message || String(error);
    const chip = (context.chip || "").toLowerCase().replace(/-/g, "");
    for (const pattern of ERROR_PATTERNS) {
      const matched = pattern.patterns.some((p) => p.test(message));
      if (matched) {
        const bootInstruction = BOOT_INSTRUCTIONS[chip] || BOOT_INSTRUCTIONS.esp32;
        const steps = pattern.steps.map((s) => s.replace("{bootInstruction}", bootInstruction));
        const chipSpecific = pattern.steps.some((s) => s.includes("{bootInstruction}"));
        return {
          type: pattern.type,
          title: pattern.title,
          steps,
          chipSpecific
        };
      }
    }
    return {
      type: "unknown",
      title: "Something Went Wrong",
      steps: [
        "Try disconnecting and reconnecting the device",
        "Refresh the page and try again",
        "Make sure no other programs are using the serial port"
      ],
      chipSpecific: false
    };
  }
  function isBrowserSupported() {
    if (typeof navigator === "undefined") {
      return { supported: false, reason: "Not running in a browser" };
    }
    if (!navigator.serial) {
      const ua = navigator.userAgent || "";
      if (/Firefox/i.test(ua)) {
        return { supported: false, reason: "Firefox does not support Web Serial. Please use Chrome, Edge, or Opera." };
      }
      if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
        return { supported: false, reason: "Safari does not support Web Serial. Please use Chrome, Edge, or Opera." };
      }
      return { supported: false, reason: "Your browser does not support Web Serial. Please use Chrome, Edge, or Opera." };
    }
    return { supported: true, reason: null };
  }
  function isMobile() {
    if (typeof navigator === "undefined") return false;
    return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  // src/core/flasher.js
  var ESPFlasher = class extends EventTarget {
    /**
     * @param {FlasherOptions} options
     */
    constructor(options = {}) {
      super();
      this.options = {
        chip: options.chip || null,
        firmwareUrl: options.firmwareUrl || null,
        firmwareOffset: options.firmwareOffset ?? 65536,
        nvsOffset: options.nvsOffset ?? 36864,
        nvsSize: options.nvsSize ?? 24576,
        nvsNamespace: options.nvsNamespace || "config"
      };
      this.device = new DeviceConnection();
      this.firmware = new FirmwareFlasher();
      this.config = new ConfigStore();
      this.stateMachine = new FlashStateMachine();
      this._forward(this.stateMachine, ["state-change"]);
      if (options.fields) {
        this.config.setSchema(expandFieldPresets(options.fields));
      } else if (options.configSections) {
        this.config.setSchema(flattenConfigSections(options.configSections));
      }
      this._forward(this.device, ["log", "status", "progress", "error", "connected", "disconnected", "chip-mismatch"]);
      this._forward(this.firmware, ["log", "status", "progress", "error", "complete"]);
      this._forward(this.config, ["change", "schema-changed"]);
    }
    /** Forward events from source to this */
    _forward(source, events) {
      for (const event of events) {
        source.addEventListener(
          event,
          (e) => this.dispatchEvent(new CustomEvent(event, { detail: e.detail }))
        );
      }
    }
    // --- Config ---
    setConfig(values) {
      this.config.setAll(values);
    }
    getConfig() {
      return this.config.getAll();
    }
    getSchema() {
      return this.config.getSchema();
    }
    /**
     * Set the active firmware variant (v2 config).
     * Updates chip, firmware URL, offsets, and fields.
     * @param {Object} variant - Variant object from v2 config
     * @param {Object} [resolvedUrl] - Pre-resolved firmware URL
     */
    setVariant(variant, resolvedUrl) {
      if (variant.chip) {
        this.options.chip = variant.chip;
      }
      if (resolvedUrl || variant.firmware) {
        this.options.firmwareUrl = resolvedUrl || variant.firmware;
      }
      if (variant.offset !== void 0) {
        this.options.firmwareOffset = typeof variant.offset === "string" ? parseInt(variant.offset, 16) : variant.offset;
      }
      if (variant.nvsOffset !== void 0) {
        this.options.nvsOffset = typeof variant.nvsOffset === "string" ? parseInt(variant.nvsOffset, 16) : variant.nvsOffset;
      }
      if (variant.fields) {
        this.config.setSchema(expandFieldPresets(variant.fields));
      }
    }
    // --- Connection ---
    async connect() {
      this.stateMachine.transition(FlashStates.CONNECTING);
      try {
        const result = await this.device.connect(this.options.chip, {
          baudrate: 115200,
          timeout: 15e3
        });
        this.stateMachine.transition(FlashStates.CONNECTED);
        return result;
      } catch (error) {
        this.stateMachine.transition(FlashStates.ERROR);
        const classified = classifyError(error, { chip: this.options.chip });
        this.dispatchEvent(new CustomEvent("error-classified", { detail: classified }));
        throw error;
      }
    }
    async disconnect() {
      return this.device.disconnect();
    }
    isConnected() {
      return this.device.getIsConnected();
    }
    getDevice() {
      return this.device;
    }
    // --- Flashing ---
    /**
     * Flash firmware and config
     * @param {Object} [opts] - Override options
     */
    async flash(opts = {}) {
      const url = opts.firmwareUrl || this.options.firmwareUrl;
      if (!url && !opts.customFirmware) {
        throw new Error("No firmware URL specified");
      }
      if (!this.device.getIsConnected()) {
        throw new Error("Not connected");
      }
      this.stateMachine.transition(FlashStates.DOWNLOADING);
      const nvsData = this.config.toNVS();
      const hasConfig = Object.keys(nvsData).length > 0;
      try {
        const result = await this.firmware.flash(this.device, url, {
          customFirmware: opts.customFirmware,
          nvsData: hasConfig ? nvsData : null,
          nvsNamespace: this.options.nvsNamespace,
          nvsOffset: this.options.nvsOffset,
          nvsSize: this.options.nvsSize,
          firmwareOffset: opts.firmwareOffset ?? this.options.firmwareOffset
        });
        this.stateMachine.transition(FlashStates.COMPLETE);
        return result;
      } catch (error) {
        this.stateMachine.transition(FlashStates.ERROR);
        const classified = classifyError(error, { chip: this.options.chip });
        this.dispatchEvent(new CustomEvent("error-classified", { detail: classified }));
        throw error;
      }
    }
    /** Flash only NVS config (no firmware) */
    async flashConfig() {
      if (!this.device.getIsConnected()) {
        throw new Error("Not connected");
      }
      const nvsData = this.config.toNVS();
      if (Object.keys(nvsData).length === 0) {
        throw new Error("No config to flash");
      }
      return this.firmware.flashNVS(this.device, nvsData, {
        nvsNamespace: this.options.nvsNamespace,
        nvsOffset: this.options.nvsOffset,
        nvsSize: this.options.nvsSize
      });
    }
    /** Hard reset device */
    async reset() {
      return this.device.hardReset();
    }
    /** Clean up */
    dispose() {
      if (this.device.getIsConnected()) {
        this.device.disconnect().catch(() => {
        });
      }
    }
  };

  // src/core/config-schema.js
  function normalizeConfig(json) {
    if (json.version === 2) {
      return { ...json, variants: json.variants.map((v) => ({ ...v })) };
    }
    return {
      version: 2,
      name: json.name || "ESP Project",
      repo: json.repo || null,
      release: json.release || "latest",
      branding: json.branding || null,
      variants: [{
        id: "default",
        name: "Default",
        firmware: json.firmware || json.bin,
        chip: json.chip || "esp32",
        offset: json.offset,
        nvsOffset: json.nvsOffset,
        fields: json.fields
      }],
      postFlash: json.postFlash || null
    };
  }
  function resolveVariantFirmwareUrl(variant, config) {
    const firmware = variant.firmware;
    if (!firmware) return null;
    if (firmware.startsWith("http://") || firmware.startsWith("https://")) {
      return firmware;
    }
    if (config.repo) {
      const release = config.release || "latest";
      if (release === "latest") {
        return `https://github.com/${config.repo}/releases/latest/download/${firmware}`;
      }
      return `https://github.com/${config.repo}/releases/download/${release}/${firmware}`;
    }
    return firmware;
  }
  function chipIdToName(chipId) {
    const map = {
      0: "esp32",
      2: "esp32s2",
      5: "esp32c3",
      9: "esp32s3",
      12: "esp32c2",
      13: "esp32h2",
      18: "esp32c6"
    };
    return map[chipId] || null;
  }

  // src/components/esp-flasher.js
  var ESPFlasherElement = class extends HTMLElement {
    static get observedAttributes() {
      return ["config", "firmware", "chip", "fields", "mode", "theme", "config-data", "preview", "repo"];
    }
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._flasher = null;
      this._v2Config = null;
      this._activeVariant = null;
      this._refs = {};
      this._initialized = false;
      this._darkMediaQuery = null;
    }
    /** Expose internal ESPFlasher for programmatic access */
    get flasher() {
      return this._flasher;
    }
    connectedCallback() {
      if (this._initialized) return;
      this._initialized = true;
      this._render();
    }
    disconnectedCallback() {
      if (this._flasher) {
        this._flasher.dispose();
        this._flasher = null;
      }
      if (this._darkMediaQuery) {
        this._darkMediaQuery.removeEventListener("change", this._onMediaChange);
        this._darkMediaQuery = null;
      }
      document.body.style.overflow = "";
    }
    attributeChangedCallback(name, oldVal, newVal) {
      if (!this._initialized) return;
      if (oldVal === newVal) return;
      if (name === "theme") {
        this._applyTheme(newVal);
      } else if (name === "config") {
        this._fetchAndApplyConfig(newVal);
      } else if (name === "config-data") {
        try {
          const json = JSON.parse(newVal);
          this._applyConfig(json);
        } catch (e) {
          console.error("<esp-flasher> invalid config-data JSON:", e);
        }
      } else if (name === "repo") {
        this._buildFromRepo(newVal);
      } else {
        this._buildFromAttributes();
      }
    }
    async _render() {
      const style = document.createElement("style");
      style.textContent = componentStyles;
      this.shadowRoot.appendChild(style);
      const theme = this.getAttribute("theme");
      if (theme) this._applyTheme(theme);
      const isPreview = this.hasAttribute("preview");
      const browserInfo = isBrowserSupported();
      const mobile = isMobile();
      if (mobile && !isPreview) {
        const { container, copyBtn, shareBtn } = renderMobileBlock();
        this.shadowRoot.appendChild(container);
        const pageUrl = window.location.href;
        copyBtn.onclick = () => {
          navigator.clipboard.writeText(pageUrl).then(() => {
            copyBtn.textContent = "Copied!";
            setTimeout(() => {
              copyBtn.textContent = "Copy Link";
            }, 2e3);
          });
        };
        shareBtn.onclick = () => {
          if (navigator.share) {
            navigator.share({ title: "ESP Web Flasher", url: pageUrl });
          } else {
            navigator.clipboard.writeText(pageUrl);
            shareBtn.textContent = "Copied!";
            setTimeout(() => {
              shareBtn.textContent = "Share Link";
            }, 2e3);
          }
        };
        return;
      }
      if (!browserInfo.supported && !isPreview) {
        this.shadowRoot.appendChild(renderBrowserWarning(browserInfo));
        return;
      }
      const configUrl = this.getAttribute("config");
      const configData = this.getAttribute("config-data");
      const repo = this.getAttribute("repo");
      if (configUrl) {
        await this._fetchAndApplyConfig(configUrl);
      } else if (configData) {
        try {
          this._applyConfig(JSON.parse(configData));
        } catch (e) {
          console.error("<esp-flasher> invalid config-data JSON:", e);
        }
      } else if (repo) {
        await this._buildFromRepo(repo);
      } else {
        this._buildFromAttributes();
      }
    }
    async _fetchAndApplyConfig(url) {
      try {
        let response;
        try {
          response = await fetch(url);
          if (!response.ok) throw new Error(`${response.status}`);
        } catch (e) {
          const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
          response = await fetch(proxyUrl);
          if (!response.ok) throw new Error(`Failed to load config: ${response.status}`);
        }
        const json = await response.json();
        this._applyConfig(json);
      } catch (e) {
        console.error("<esp-flasher> failed to load config:", e);
        this._renderError(`Failed to load config: ${e.message}`);
      }
    }
    async _buildFromRepo(repo) {
      for (const branch of ["main", "master"]) {
        try {
          const url = `https://raw.githubusercontent.com/${repo}/${branch}/flash-config.json`;
          let res = await fetch(url);
          if (!res.ok) {
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
            res = await fetch(proxyUrl);
          }
          if (res.ok) {
            const json = await res.json();
            if (!json.repo) json.repo = repo;
            this._applyConfig(json);
            return;
          }
        } catch (e) {
        }
      }
      try {
        const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`);
        if (!res.ok) throw new Error("No releases found");
        const release = await res.json();
        const binAssets = release.assets.filter((a) => a.name.endsWith(".bin"));
        if (binAssets.length === 0) throw new Error("No .bin files in latest release");
        let chip = "esp32";
        try {
          chip = await this._detectChip(binAssets[0].browser_download_url);
        } catch (e) {
        }
        const fieldsAttr = this.getAttribute("fields");
        const fields = fieldsAttr ? fieldsAttr.split(",").map((f) => f.trim()) : [];
        const config = {
          version: 2,
          name: release.name || repo.split("/")[1] || "ESP Firmware",
          repo,
          variants: binAssets.map((asset) => ({
            id: asset.name.replace(/\.bin$/, ""),
            name: asset.name.replace(/\.bin$/, "").replace(/[-_]/g, " "),
            firmware: asset.browser_download_url,
            chip,
            fields
          }))
        };
        this._applyConfig(config);
      } catch (e) {
        this._renderError(`Could not load from ${repo}: ${e.message}`);
      }
    }
    async _detectChip(url) {
      try {
        const res = await fetch(url, { headers: { Range: "bytes=0-23" } });
        if (res.status !== 206) return "esp32";
        const buf = await res.arrayBuffer();
        const bytes = new Uint8Array(buf);
        if (bytes[0] !== 233) return "esp32";
        const chipId = bytes[12] | bytes[13] << 8;
        return chipIdToName(chipId) || "esp32";
      } catch (e) {
        return "esp32";
      }
    }
    _applyConfig(json) {
      this._v2Config = normalizeConfig(json);
      const variant = this._v2Config.variants[0];
      this._activeVariant = variant;
      if (this._v2Config.branding) {
        this._applyBranding(this._v2Config.branding);
      }
      this._initFlasher(variant);
    }
    _buildFromAttributes() {
      const firmware = this.getAttribute("firmware");
      const chip = this.getAttribute("chip") || "esp32";
      const fieldsAttr = this.getAttribute("fields");
      const fields = fieldsAttr ? fieldsAttr.split(",").map((f) => f.trim()) : [];
      this._v2Config = {
        version: 2,
        name: "ESP Firmware",
        variants: [{
          id: "default",
          name: "Default",
          firmware,
          chip,
          fields
        }]
      };
      this._activeVariant = this._v2Config.variants[0];
      this._initFlasher(this._activeVariant);
    }
    _applyTheme(theme) {
      if (this._darkMediaQuery) {
        this._darkMediaQuery.removeEventListener("change", this._onMediaChange);
        this._darkMediaQuery = null;
      }
      if (theme === "auto") {
        this._darkMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        this._onMediaChange = (e) => {
          if (e.matches) this._setDarkVars();
          else this._setLightVars();
        };
        this._darkMediaQuery.addEventListener("change", this._onMediaChange);
        if (this._darkMediaQuery.matches) this._setDarkVars();
        else this._setLightVars();
      } else if (theme === "dark") {
        this._setDarkVars();
      } else {
        this._setLightVars();
      }
    }
    _setDarkVars() {
      this.style.setProperty("--c-bg", "#18181b");
      this.style.setProperty("--c-surface", "#09090b");
      this.style.setProperty("--c-text", "#fafafa");
      this.style.setProperty("--c-text-2", "#a1a1aa");
      this.style.setProperty("--c-text-3", "#71717a");
      this.style.setProperty("--c-border", "#27272a");
      this.style.setProperty("--c-border-light", "#1f1f23");
    }
    _setLightVars() {
      this.style.removeProperty("--c-bg");
      this.style.removeProperty("--c-surface");
      this.style.removeProperty("--c-text");
      this.style.removeProperty("--c-text-2");
      this.style.removeProperty("--c-text-3");
      this.style.removeProperty("--c-border");
      this.style.removeProperty("--c-border-light");
    }
    _applyBranding(branding) {
      if (branding.primaryColor) {
        this.style.setProperty("--c-accent", branding.primaryColor);
        const hex = branding.primaryColor.replace("#", "");
        const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - 20);
        const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - 20);
        const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - 20);
        this.style.setProperty(
          "--c-accent-hover",
          `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
        );
      }
      if (branding.theme && !this.hasAttribute("theme")) {
        this._applyTheme(branding.theme);
      }
    }
    _initFlasher(variant) {
      if (this._flasher) {
        this._flasher.dispose();
      }
      const resolvedUrl = resolveVariantFirmwareUrl(variant, this._v2Config);
      const fields = variant.fields || [];
      this._flasher = new ESPFlasher({
        chip: variant.chip || "esp32",
        firmwareUrl: resolvedUrl,
        firmwareOffset: variant.offset ? typeof variant.offset === "string" ? parseInt(variant.offset, 16) : variant.offset : 65536,
        nvsOffset: variant.nvsOffset ? typeof variant.nvsOffset === "string" ? parseInt(variant.nvsOffset, 16) : variant.nvsOffset : 36864,
        fields
      });
      const mode = this.getAttribute("mode");
      if (mode === "full") {
        this._renderFull();
      } else {
        this._renderCompact();
      }
    }
    _renderCompact() {
      this._clearContent();
      const btn = document.createElement("button");
      btn.className = "flasher-compact-btn";
      btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg> Flash Firmware`;
      btn.onclick = () => this._openModal();
      this.shadowRoot.appendChild(btn);
    }
    _renderFull() {
      this._clearContent();
      const content = this._buildFlashUI();
      this.shadowRoot.appendChild(content);
    }
    _openModal() {
      const content = this._buildFlashUI();
      const { overlay, closeBtn } = renderModal(content);
      document.body.style.overflow = "hidden";
      const closeModal = () => {
        overlay.remove();
        document.body.style.overflow = "";
        document.removeEventListener("keydown", escHandler);
      };
      const escHandler = (e) => {
        if (e.key === "Escape") closeModal();
      };
      document.addEventListener("keydown", escHandler);
      closeBtn.onclick = closeModal;
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeModal();
      });
      this.shadowRoot.appendChild(overlay);
    }
    _buildFlashUI() {
      const wrapper = document.createElement("div");
      wrapper.className = "flasher-card";
      if (this._v2Config?.branding?.logo) {
        const logo = document.createElement("img");
        logo.className = "branding-logo";
        logo.src = this._v2Config.branding.logo;
        logo.alt = "Logo";
        wrapper.appendChild(logo);
      }
      const title = document.createElement("h2");
      title.textContent = this._v2Config?.name || "ESP Firmware";
      wrapper.appendChild(title);
      const chip = this._activeVariant?.chip || "esp32";
      const subtitle = document.createElement("div");
      subtitle.className = "subtitle";
      subtitle.textContent = "Flash firmware to your device ";
      const badge = document.createElement("span");
      badge.className = "chip-badge";
      badge.textContent = chip.toUpperCase();
      subtitle.appendChild(badge);
      wrapper.appendChild(subtitle);
      this._refs.subtitle = subtitle;
      if (this._v2Config && this._v2Config.variants.length > 1) {
        const vs = renderVariantSelector(this._v2Config.variants);
        wrapper.appendChild(vs.container);
        vs.select.onchange = () => {
          const idx = parseInt(vs.select.value);
          const variant = this._v2Config.variants[idx];
          this._activeVariant = variant;
          vs.description.textContent = variant.description || "";
          const newChip = variant.chip || this._v2Config.variants[0].chip || "esp32";
          this._refs.subtitle.textContent = "Flash firmware to your device ";
          const newBadge = document.createElement("span");
          newBadge.className = "chip-badge";
          newBadge.textContent = newChip.toUpperCase();
          this._refs.subtitle.appendChild(newBadge);
          const resolvedUrl = resolveVariantFirmwareUrl(variant, this._v2Config);
          this._flasher.setVariant(variant, resolvedUrl);
          this._rebuildConfigForm(wrapper, variant.fields || []);
        };
      }
      const fields = this._activeVariant?.fields || [];
      const { container: configContainer, inputs } = renderConfigForm(fields);
      wrapper.appendChild(configContainer);
      this._refs.configContainer = configContainer;
      this._refs.configInputs = inputs;
      for (const [key, input] of inputs) {
        input.addEventListener("input", () => {
          this._flasher.setConfig({ [key]: input.value });
        });
      }
      const status = renderStatusBox();
      wrapper.appendChild(status.container);
      this._refs.statusBox = status.container;
      this._refs.stageLabel = status.stageLabel;
      this._refs.statusText = status.statusText;
      this._refs.statusSubtext = status.statusSubtext;
      const progress = renderProgressBar();
      wrapper.appendChild(progress.container);
      this._refs.progressBar = progress.container;
      this._refs.progressFill = progress.fill;
      const connectBtn = document.createElement("button");
      connectBtn.className = "btn btn-primary";
      connectBtn.textContent = "Connect Device";
      wrapper.appendChild(connectBtn);
      this._refs.connectBtn = connectBtn;
      const flashBtn = document.createElement("button");
      flashBtn.className = "btn btn-primary";
      flashBtn.textContent = "Flash Firmware";
      flashBtn.disabled = true;
      flashBtn.style.display = "none";
      wrapper.appendChild(flashBtn);
      this._refs.flashBtn = flashBtn;
      const logEl = renderLog();
      wrapper.appendChild(logEl);
      this._refs.logContainer = logEl;
      const footer = document.createElement("div");
      footer.className = "footer";
      footer.innerHTML = 'Powered by <a href="https://github.com/adam-weber/esp-webflash-toolkit" target="_blank" rel="noopener">ESP WebFlash Toolkit</a>';
      wrapper.appendChild(footer);
      this._bindFlasherEvents();
      connectBtn.onclick = async () => {
        connectBtn.disabled = true;
        connectBtn.textContent = "Connecting...";
        try {
          await this._flasher.connect();
        } catch (e) {
          connectBtn.disabled = false;
          connectBtn.textContent = "Connect Device";
        }
      };
      flashBtn.onclick = async () => {
        flashBtn.disabled = true;
        try {
          const configValues = {};
          for (const [key, input] of this._refs.configInputs) {
            const val = input.value.trim();
            if (val) configValues[key] = val;
          }
          this._flasher.setConfig(configValues);
          await this._flasher.flash();
        } catch (e) {
          flashBtn.disabled = false;
        }
      };
      return wrapper;
    }
    _rebuildConfigForm(wrapper, fields) {
      if (this._refs.configContainer && this._refs.configContainer.parentNode) {
        const insertBefore = this._refs.configContainer.nextSibling;
        this._refs.configContainer.remove();
        const { container, inputs } = renderConfigForm(fields);
        wrapper.insertBefore(container, insertBefore);
        this._refs.configContainer = container;
        this._refs.configInputs = inputs;
        for (const [key, input] of inputs) {
          input.addEventListener("input", () => {
            this._flasher.setConfig({ [key]: input.value });
          });
        }
      }
    }
    _bindFlasherEvents() {
      const f = this._flasher;
      const r = this._refs;
      f.addEventListener("status", (e) => {
        const { state, message } = e.detail;
        const stateMap = { connecting: "", connected: "connected", downloading: "flashing", generating: "flashing", flashing: "flashing", complete: "success" };
        r.statusBox.className = `status-box ${stateMap[state] || state}`;
        r.statusText.textContent = message;
      });
      f.addEventListener("state-change", (e) => {
        r.stageLabel.textContent = e.detail.label;
      });
      f.addEventListener("progress", (e) => {
        const { percent } = e.detail;
        r.progressBar.style.display = "block";
        r.progressFill.style.width = `${percent}%`;
        r.statusBox.className = "status-box flashing";
        r.statusText.textContent = "Flashing...";
        r.statusSubtext.textContent = `${Math.round(percent)}%`;
      });
      f.addEventListener("log", (e) => {
        const { message, level } = e.detail;
        r.logContainer.style.display = "block";
        const line = document.createElement("div");
        line.className = `log-line ${level}`;
        line.textContent = `[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] ${message}`;
        r.logContainer.appendChild(line);
        r.logContainer.scrollTop = r.logContainer.scrollHeight;
      });
      f.addEventListener("connected", (e) => {
        const { chipType } = e.detail;
        r.statusBox.className = "status-box connected";
        r.statusText.textContent = "Connected";
        r.statusSubtext.textContent = chipType;
        r.flashBtn.disabled = false;
        r.flashBtn.style.display = "block";
        r.connectBtn.style.display = "none";
        this._reDispatch("esp-flasher:connected", e.detail);
      });
      f.addEventListener("error", (e) => {
        r.statusBox.className = "status-box error";
        r.statusText.textContent = "Error";
        r.statusSubtext.textContent = e.detail.message;
        this._reDispatch("esp-flasher:error", e.detail);
      });
      f.addEventListener("error-classified", (e) => {
        const classified = e.detail;
        r.statusBox.className = "status-box error";
        r.statusBox.innerHTML = "";
        r.statusBox.appendChild(renderErrorRecovery(classified));
      });
      f.addEventListener("complete", () => {
        const pf = this._v2Config?.postFlash;
        if (pf) {
          r.statusBox.className = "status-box success";
          r.statusBox.innerHTML = "";
          r.statusBox.appendChild(renderPostFlash(pf));
        } else {
          r.statusBox.className = "status-box success";
          r.statusText.textContent = "Flash Complete!";
          r.statusSubtext.textContent = "You can disconnect the device";
        }
        this._reDispatch("esp-flasher:complete", {});
      });
      f.addEventListener("chip-mismatch", (e) => {
        const { expected, detected, proceed, cancel } = e.detail;
        if (confirm(`Chip mismatch: expected ${expected}, found ${detected}. Continue anyway?`)) {
          proceed();
        } else {
          cancel();
        }
      });
    }
    _reDispatch(name, detail) {
      this.dispatchEvent(new CustomEvent(name, {
        detail,
        bubbles: true,
        composed: true
      }));
    }
    _clearContent() {
      const children = Array.from(this.shadowRoot.children);
      for (const child of children) {
        if (child.tagName !== "STYLE") {
          child.remove();
        }
      }
    }
    _renderError(message) {
      this._clearContent();
      const div = document.createElement("div");
      div.className = "unsupported-block";
      const h2 = document.createElement("h2");
      h2.textContent = "Error";
      const p = document.createElement("p");
      p.textContent = message;
      div.appendChild(h2);
      div.appendChild(p);
      this.shadowRoot.appendChild(div);
    }
  };

  // src/bundle-component.js
  if (!customElements.get("esp-flasher")) {
    customElements.define("esp-flasher", ESPFlasherElement);
  }
  return __toCommonJS(bundle_component_exports);
})();
//# sourceMappingURL=esp-flasher-component.js.map
