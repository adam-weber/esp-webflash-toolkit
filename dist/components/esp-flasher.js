import { componentStyles } from "./styles.js";
import {
  renderStatusBox,
  renderProgressBar,
  renderConfigForm,
  renderVariantSelector,
  renderPostFlash,
  renderErrorRecovery,
  renderBrowserWarning,
  renderMobileBlock,
  renderLog,
  renderModal
} from "./renderer.js";
import { ESPFlasher } from "../core/flasher.js";
import { normalizeConfig, resolveVariantFirmwareUrl, validateConfig } from "../core/config-schema.js";
import { expandFieldPresets } from "../core/config-store.js";
import { classifyError, isBrowserSupported, isMobile } from "../core/error-catalog.js";
class ESPFlasherElement extends HTMLElement {
  static get observedAttributes() {
    return ["config", "firmware", "chip", "fields", "mode", "theme", "config-data"];
  }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._flasher = null;
    this._v2Config = null;
    this._activeVariant = null;
    this._refs = {};
    this._initialized = false;
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
  }
  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._initialized) return;
    if (oldVal === newVal) return;
    if (name === "config") {
      this._fetchAndApplyConfig(newVal);
    } else if (name === "config-data") {
      try {
        const json = JSON.parse(newVal);
        this._applyConfig(json);
      } catch (e) {
        console.error("<esp-flasher> invalid config-data JSON:", e);
      }
    } else {
      this._buildFromAttributes();
    }
  }
  async _render() {
    const style = document.createElement("style");
    style.textContent = componentStyles;
    this.shadowRoot.appendChild(style);
    const browserInfo = isBrowserSupported();
    const mobile = isMobile();
    if (mobile) {
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
    if (!browserInfo.supported) {
      this.shadowRoot.appendChild(renderBrowserWarning(browserInfo));
      return;
    }
    const configUrl = this.getAttribute("config");
    const configData = this.getAttribute("config-data");
    if (configUrl) {
      await this._fetchAndApplyConfig(configUrl);
    } else if (configData) {
      try {
        this._applyConfig(JSON.parse(configData));
      } catch (e) {
        console.error("<esp-flasher> invalid config-data JSON:", e);
      }
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
  _applyBranding(branding) {
    if (branding.primaryColor) {
      this.style.setProperty("--esp-primary", branding.primaryColor);
      const hex = branding.primaryColor.replace("#", "");
      const r = Math.min(255, parseInt(hex.substr(0, 2), 16) + 10);
      const g = Math.min(255, parseInt(hex.substr(2, 2), 16) + 10);
      const b = Math.min(255, parseInt(hex.substr(4, 2), 16) + 10);
      this.style.setProperty(
        "--esp-primary-hover",
        `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
      );
    }
    if (branding.theme === "dark") {
      this.style.setProperty("--esp-bg", "#1d1d1f");
      this.style.setProperty("--esp-card-bg", "#2c2c2e");
      this.style.setProperty("--esp-text", "#f5f5f7");
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
    closeBtn.onclick = () => overlay.remove();
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
    subtitle.innerHTML = `Flash firmware to your device <span class="chip-badge">${chip.toUpperCase()}</span>`;
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
        this._refs.subtitle.innerHTML = `Flash firmware to your device <span class="chip-badge">${newChip.toUpperCase()}</span>`;
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
    div.innerHTML = `<h2>Error</h2><p>${message}</p>`;
    this.shadowRoot.appendChild(div);
  }
}
export {
  ESPFlasherElement
};
//# sourceMappingURL=esp-flasher.js.map
