import { groupFieldsBySection } from "../../core/config-store.js";
const DEFAULT_BINDINGS = {
  "status": "handleStatus",
  "progress": "handleProgress",
  "log": "handleLog",
  "connected": "handleConnected",
  "disconnected": "handleDisconnected",
  "error": "handleError",
  "error-classified": "handleErrorClassified",
  "chip-mismatch": "handleChipMismatch",
  "complete": "handleComplete",
  "schema-changed": "handleSchemaChanged",
  "state-change": "handleStateChange"
};
class FlasherUI {
  /**
   * @param {ESPFlasher} flasher - Core flasher instance
   * @param {UIElements} elements - DOM element references
   * @param {Object} [options] - Configuration options
   * @param {Object} [options.bindings] - Custom event bindings (event -> handler name)
   * @param {boolean} [options.groupBySection] - Group config fields by section (default: true)
   */
  constructor(flasher, elements = {}, options = {}) {
    this.flasher = flasher;
    this.elements = elements;
    this.options = {
      groupBySection: options.groupBySection !== false,
      bindings: { ...DEFAULT_BINDINGS, ...options.bindings }
    };
    this.postFlash = null;
    this.flashStartTime = null;
    this.lastDisplayedPercent = 0;
    this.targetPercent = 0;
    this.animationFrame = null;
    this._boundHandlers = [];
    this._inputHandlers = [];
    this._bindEvents();
  }
  /**
   * Bind to core flasher events with cleanup tracking
   * @private
   */
  _bindEvents() {
    for (const [event, handlerName] of Object.entries(this.options.bindings)) {
      if (typeof this[handlerName] === "function") {
        const handler = (e) => this[handlerName](e.detail);
        this.flasher.addEventListener(event, handler);
        this._boundHandlers.push({ event, handler });
      }
    }
  }
  /**
   * Clean up all event listeners
   * Call this when disposing of the UI instance
   */
  dispose() {
    for (const { event, handler } of this._boundHandlers) {
      this.flasher.removeEventListener(event, handler);
    }
    this._boundHandlers = [];
    for (const { element, event, handler } of this._inputHandlers) {
      element.removeEventListener(event, handler);
    }
    this._inputHandlers = [];
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }
  /**
   * Handle schema changes - renders config form
   * @private
   */
  handleSchemaChanged({ schema }) {
    this.renderConfigForm(schema);
  }
  /**
   * Handle state machine state changes — show stage label
   */
  handleStateChange({ label }) {
    if (this.elements.stageLabel) {
      this.elements.stageLabel.textContent = label;
    }
  }
  /**
   * Handle status updates
   */
  handleStatus({ state, message }) {
    if (!this.elements.statusBox) return;
    const stateClasses = {
      connecting: "waiting",
      connected: "connected",
      downloading: "flashing",
      generating: "flashing",
      flashing: "flashing",
      complete: "success",
      error: "error"
    };
    this.elements.statusBox.className = `status-box ${stateClasses[state] || state}`;
    this.elements.statusBox.textContent = "";
    const statusText = document.createElement("div");
    statusText.className = "status-text";
    statusText.textContent = message;
    const statusSub = document.createElement("div");
    statusSub.className = "status-subtext";
    this.elements.statusBox.appendChild(statusText);
    this.elements.statusBox.appendChild(statusSub);
  }
  /**
   * Handle progress updates
   */
  handleProgress({ percent, written, total }) {
    this.targetPercent = percent;
    if (!this.animationFrame) {
      this.animateProgress();
    }
    if (this.elements.progressContainer) {
      this.elements.progressContainer.classList.add("active");
    }
    if (this.flashStartTime && percent > 0 && percent < 100 && this.elements.progressTime) {
      const elapsed = (Date.now() - this.flashStartTime) / 1e3;
      const remaining = Math.max(0, Math.round(elapsed / percent * (100 - percent)));
      this.elements.progressTime.textContent = `~${remaining}s remaining`;
    }
  }
  /**
   * Animate progress bar smoothly
   * @private
   */
  animateProgress() {
    const diff = this.targetPercent - this.lastDisplayedPercent;
    if (Math.abs(diff) > 0.1) {
      this.lastDisplayedPercent += diff * 0.1;
      if (this.elements.progressFill) {
        this.elements.progressFill.style.width = `${this.lastDisplayedPercent}%`;
      }
      if (this.elements.progressPercent) {
        this.elements.progressPercent.textContent = `${Math.round(this.lastDisplayedPercent)}%`;
      }
      this.animationFrame = requestAnimationFrame(() => this.animateProgress());
    } else {
      this.lastDisplayedPercent = this.targetPercent;
      if (this.elements.progressFill) {
        this.elements.progressFill.style.width = `${this.targetPercent}%`;
      }
      if (this.elements.progressPercent) {
        this.elements.progressPercent.textContent = `${Math.round(this.targetPercent)}%`;
      }
      this.animationFrame = null;
    }
  }
  /**
   * Handle log messages
   */
  handleLog({ message, level }) {
    if (!this.elements.logContainer) return;
    const line = document.createElement("div");
    line.className = `serial-line ${level}`;
    line.textContent = `[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] ${message}`;
    this.elements.logContainer.appendChild(line);
    this.elements.logContainer.scrollTop = this.elements.logContainer.scrollHeight;
  }
  /**
   * Handle successful connection
   */
  handleConnected({ chipType, macAddr }) {
    if (this.elements.chipType) {
      this.elements.chipType.textContent = chipType;
    }
    if (this.elements.chipMac) {
      this.elements.chipMac.textContent = macAddr || "-";
    }
    if (this.elements.connectBtn) {
      this.elements.connectBtn.style.display = "none";
    }
    if (this.elements.flashBtn) {
      this.elements.flashBtn.style.display = "block";
      this.elements.flashBtn.disabled = false;
    }
    this.flashStartTime = Date.now();
  }
  /**
   * Handle disconnection
   */
  handleDisconnected() {
    if (this.elements.connectBtn) {
      this.elements.connectBtn.style.display = "block";
      this.elements.connectBtn.disabled = false;
    }
    if (this.elements.flashBtn) {
      this.elements.flashBtn.style.display = "none";
    }
  }
  /**
   * Handle errors with optional recovery steps
   */
  handleError({ message }) {
    if (!this.elements.statusBox) return;
    this.elements.statusBox.className = "status-box error";
    this.elements.statusBox.textContent = "";
    const errText = document.createElement("div");
    errText.className = "status-text";
    errText.textContent = "Error";
    const errSub = document.createElement("div");
    errSub.className = "status-subtext";
    errSub.textContent = message;
    this.elements.statusBox.appendChild(errText);
    this.elements.statusBox.appendChild(errSub);
  }
  /**
   * Handle classified errors with recovery steps
   * @param {{type: string, title: string, steps: string[]}} classified
   */
  handleErrorClassified(classified) {
    if (!this.elements.statusBox) return;
    this.elements.statusBox.className = "status-box error";
    this.elements.statusBox.textContent = "";
    const titleEl = document.createElement("div");
    titleEl.className = "status-text";
    titleEl.textContent = classified.title;
    this.elements.statusBox.appendChild(titleEl);
    const ol = document.createElement("ol");
    ol.className = "recovery-steps";
    for (const step of classified.steps) {
      const li = document.createElement("li");
      li.textContent = step;
      ol.appendChild(li);
    }
    this.elements.statusBox.appendChild(ol);
  }
  /**
   * Handle chip mismatch - show dialog
   */
  async handleChipMismatch({ expected, detected, proceed, cancel }) {
    const shouldProceed = confirm(
      `Chip mismatch detected!

Expected: ${expected}
Detected: ${detected}

Do you want to continue anyway?`
    );
    if (shouldProceed) {
      proceed();
    } else {
      cancel();
    }
  }
  /**
   * Handle flash complete, optionally showing postFlash instructions
   * @param {Object} [detail]
   */
  handleComplete(detail) {
    if (this.elements.progressTime) {
      this.elements.progressTime.textContent = "Complete";
    }
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    if (this.postFlash && this.elements.statusBox) {
      const pf = this.postFlash;
      this.elements.statusBox.className = "status-box success";
      this.elements.statusBox.textContent = "";
      const pfTitle = document.createElement("div");
      pfTitle.className = "status-text";
      pfTitle.textContent = pf.title || "Flash Complete!";
      this.elements.statusBox.appendChild(pfTitle);
      if (pf.steps && pf.steps.length > 0) {
        const ol = document.createElement("ol");
        ol.className = "post-flash-steps";
        for (const s of pf.steps) {
          const li = document.createElement("li");
          li.textContent = s;
          ol.appendChild(li);
        }
        this.elements.statusBox.appendChild(ol);
      }
      if (pf.link) {
        const a = document.createElement("a");
        a.href = pf.link.url;
        a.target = "_blank";
        a.rel = "noopener";
        a.className = "post-flash-link";
        a.textContent = pf.link.label;
        this.elements.statusBox.appendChild(a);
      }
    }
  }
  /**
   * Set postFlash instructions to show on completion
   * @param {Object} postFlash
   */
  setPostFlash(postFlash) {
    this.postFlash = postFlash;
  }
  /**
   * Render config form from schema
   * @param {Array} schema - Field definitions
   */
  renderConfigForm(schema) {
    if (!this.elements.configContainer || !schema) return;
    for (const { element, event, handler } of this._inputHandlers) {
      element.removeEventListener(event, handler);
    }
    this._inputHandlers = [];
    this.elements.configContainer.innerHTML = "";
    if (this.options.groupBySection) {
      const sections = groupFieldsBySection(schema);
      for (const section of sections) {
        const sectionEl = document.createElement("div");
        sectionEl.className = "config-section";
        if (section.title && section.title !== "default") {
          const header = document.createElement("h3");
          header.className = "config-section-title";
          header.textContent = section.title;
          sectionEl.appendChild(header);
        }
        for (const field of section.fields) {
          sectionEl.appendChild(this._createFieldElement(field));
        }
        this.elements.configContainer.appendChild(sectionEl);
      }
    } else {
      for (const field of schema) {
        this.elements.configContainer.appendChild(this._createFieldElement(field));
      }
    }
  }
  /**
   * Create a form field element
   * @private
   */
  _createFieldElement(field) {
    const group = document.createElement("div");
    group.className = "form-group";
    const label = document.createElement("label");
    label.htmlFor = `config-${field.key}`;
    label.textContent = field.label + " ";
    const marker = document.createElement("span");
    marker.className = field.required ? "required-marker" : "optional-marker";
    marker.textContent = field.required ? "*" : "(optional)";
    label.appendChild(marker);
    group.appendChild(label);
    const input = document.createElement("input");
    input.type = field.type || "text";
    input.id = `config-${field.key}`;
    input.dataset.key = field.key;
    if (field.placeholder) input.placeholder = field.placeholder;
    if (field.default) input.value = field.default;
    if (field.required) input.required = true;
    if (field.pattern) input.pattern = field.pattern;
    group.appendChild(input);
    if (field.help) {
      const help = document.createElement("span");
      help.className = "help-text";
      help.textContent = field.help;
      group.appendChild(help);
    }
    const handler = () => {
      input.classList.remove("error");
      const errorEl = group.querySelector(".field-error");
      if (errorEl) errorEl.remove();
      this.flasher.setConfig({ [field.key]: input.value });
    };
    input.addEventListener("input", handler);
    this._inputHandlers.push({ element: input, event: "input", handler });
    return group;
  }
  /**
   * Clear the log
   */
  clearLog() {
    if (this.elements.logContainer) {
      this.elements.logContainer.innerHTML = '<div class="serial-line info">Log cleared</div>';
    }
  }
  /**
   * Show progress bar
   */
  showProgress() {
    this.flashStartTime = Date.now();
    this.lastDisplayedPercent = 0;
    this.targetPercent = 0;
    if (this.elements.progressContainer) {
      this.elements.progressContainer.classList.add("active");
    }
    if (this.elements.progressFill) {
      this.elements.progressFill.style.width = "0%";
    }
    if (this.elements.progressPercent) {
      this.elements.progressPercent.textContent = "0%";
    }
  }
  /**
   * Hide progress bar
   */
  hideProgress() {
    if (this.elements.progressContainer) {
      this.elements.progressContainer.classList.remove("active");
    }
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }
}
export {
  FlasherUI
};
//# sourceMappingURL=ui.js.map
