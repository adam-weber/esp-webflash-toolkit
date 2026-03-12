import { ESPFlasher } from "../../core/index.js";
import { groupFieldsBySection } from "../../core/config-store.js";
import { FlasherUI } from "./ui.js";
class FlasherApp {
  /**
   * @param {Object<string, ProjectConfig>} projects - Project configurations
   */
  constructor(projects) {
    this.projects = projects;
    const projectKeys = Object.keys(projects);
    this.selectedProject = projectKeys.length > 0 ? projects[projectKeys[0]] : null;
    this.btnConnect = document.getElementById("btn-connect");
    this.btnFlash = document.getElementById("btn-flash");
    this.btnWriteConfig = document.getElementById("btn-write-config");
    this.btnClearMonitor = document.getElementById("btn-clear-monitor");
    this.flasher = null;
    this.ui = null;
    this.config = this.loadConfig();
    this.init();
  }
  /**
   * Initialize the application
   */
  init() {
    if (!("serial" in navigator)) {
      document.getElementById("browser-check").style.display = "block";
      this.log("Web Serial API not available", "error");
      return;
    }
    if (!this.selectedProject) {
      this.log("ERROR: No projects found", "error");
      return;
    }
    this.initFlasher();
    this.attachEventListeners();
    this.loadProjectUI();
    this.log("Flasher ready", "success");
    this.attemptAutoReconnect();
  }
  /**
   * Initialize the core flasher from project config
   */
  initFlasher() {
    const project = this.selectedProject;
    const nvsOffset = project.nvsOffset ?? (project.nvsPartition ? parseInt(project.nvsPartition.offset, 16) : 36864);
    const nvsSize = project.nvsSize ?? (project.nvsPartition ? parseInt(project.nvsPartition.size, 16) : 24576);
    const nvsNamespace = project.nvsPartition?.namespace || "config";
    const flasherOptions = {
      chip: project.chip,
      firmwareUrl: project.firmwareUrl,
      firmwareOffset: project.firmwareOffset ?? 65536,
      nvsOffset,
      nvsSize,
      nvsNamespace
    };
    if (project.fields) {
      flasherOptions.fields = project.fields;
    } else if (project.configSections) {
      flasherOptions.configSections = project.configSections;
    }
    this.flasher = new ESPFlasher(flasherOptions);
    const elements = {
      statusBox: document.getElementById("status-box"),
      progressContainer: document.getElementById("progress-container"),
      progressFill: document.getElementById("progress-fill"),
      progressPercent: document.getElementById("progress-percent"),
      progressTime: document.getElementById("progress-time"),
      logContainer: document.getElementById("serial-monitor"),
      chipType: document.getElementById("chip-type"),
      chipMac: document.getElementById("chip-mac"),
      configContainer: document.getElementById("config-container"),
      connectBtn: this.btnConnect,
      flashBtn: this.btnFlash
    };
    this.ui = new FlasherUI(this.flasher, elements);
    this.flasher.addEventListener("chip-mismatch", async (e) => {
      const { expected, detected, proceed, cancel } = e.detail;
      const result = await this.showChipMismatchDialog(expected, detected);
      if (result === "cancel") {
        cancel();
      } else {
        if (result === "always") {
          this.saveChipOverride(detected, expected);
        }
        proceed();
      }
    });
    this.loadSavedConfigIntoFlasher();
  }
  /**
   * Load saved config from localStorage into flasher
   */
  loadSavedConfigIntoFlasher() {
    const schema = this.flasher.getSchema();
    if (!schema || schema.length === 0) return;
    const savedConfig = {};
    for (const field of schema) {
      if (this.config[field.key] !== void 0) {
        savedConfig[field.key] = this.config[field.key];
      }
    }
    if (Object.keys(savedConfig).length > 0) {
      this.flasher.setConfig(savedConfig, { validate: false });
    }
  }
  /**
   * Attempt to reconnect to previously used device
   */
  async attemptAutoReconnect() {
    try {
      const ports = await navigator.serial.getPorts();
      if (ports.length > 0) {
        const lastIndex = localStorage.getItem("lastSerialDeviceIndex");
        const portIndex = lastIndex ? parseInt(lastIndex) : 0;
        const port = ports[portIndex] || ports[0];
        this.log("Attempting to reconnect to previous device...", "info");
        try {
          const device = this.flasher.getDevice();
          await device.connect(this.selectedProject.chip, { port });
          this.log("Auto-reconnected", "success");
          this.btnFlash.disabled = false;
          this.btnFlash.style.display = "block";
          this.btnWriteConfig.disabled = false;
          this.btnConnect.style.display = "none";
        } catch (e) {
          console.log("Auto-reconnect failed:", e.message);
          this.btnConnect.disabled = false;
          this.btnConnect.textContent = "Connect Device";
        }
      }
    } catch (e) {
      console.log("Auto-reconnect not available:", e.message);
    }
  }
  /**
   * Load project UI
   */
  loadProjectUI() {
    const project = this.selectedProject;
    this.log("Loading project: " + project.name, "info");
    this.updateHeader(project);
    this.showProjectDetails(project);
    document.getElementById("project-details").classList.add("active");
    this.renderConfigFields(project);
    this.btnConnect.disabled = false;
    this.btnConnect.textContent = "Connect Device";
    this.btnWriteConfig.title = "Connect device first";
    this.updateStatus("waiting", "Configure Settings", "Fill in configuration, then connect your device");
    this.log("UI loaded. Connect button enabled.", "success");
  }
  /**
   * Update page header with project info
   */
  updateHeader(project) {
    const title = document.getElementById("app-header-title");
    if (title && project.name) {
      title.textContent = project.name;
      document.title = project.name + " - ESP32 Web Flasher";
    }
    const nav = document.getElementById("app-header-nav");
    if (nav) {
      const links = project.navbarLinks || project.headerLinks || [];
      if (links.length > 0) {
        nav.textContent = "";
        for (const link of links) {
          if (!link.url || !/^https?:\/\//i.test(link.url)) continue;
          const a = document.createElement("a");
          a.href = link.url;
          a.target = "_blank";
          a.className = "app-header-link";
          a.textContent = link.label;
          nav.appendChild(a);
        }
      }
    }
  }
  /**
   * Show project details in the left panel
   */
  showProjectDetails(project) {
    const container = document.getElementById("project-details");
    container.textContent = "";
    const desc = document.createElement("p");
    desc.style.marginBottom = "24px";
    desc.textContent = project.description;
    container.appendChild(desc);
    if (project.documentation && /^https?:\/\//i.test(project.documentation.url || "")) {
      const docLink = document.createElement("a");
      docLink.href = project.documentation.url;
      docLink.target = "_blank";
      docLink.className = "doc-link";
      const linkLabel = document.createElement("span");
      linkLabel.textContent = project.documentation.label;
      const linkIcon = document.createElement("span");
      linkIcon.className = "external-icon";
      linkIcon.textContent = "\u2197";
      docLink.appendChild(linkLabel);
      docLink.appendChild(linkIcon);
      container.appendChild(docLink);
    }
    const hwSection = document.createElement("div");
    hwSection.className = "section section-bg";
    hwSection.style.marginTop = "32px";
    const hwTitle = document.createElement("h3");
    hwTitle.textContent = "Hardware";
    hwSection.appendChild(hwTitle);
    const hwList = document.createElement("ul");
    hwList.className = "requirement-list";
    for (const h of project.hardware) {
      const li = document.createElement("li");
      li.textContent = h;
      hwList.appendChild(li);
    }
    hwSection.appendChild(hwList);
    container.appendChild(hwSection);
    const hasConfig = project.fields?.length > 0 || project.configSections?.length > 0;
    const stepsData = [
      hasConfig ? "Configure settings in the center panel" : "No configuration needed",
      "Connect your ESP32 device via USB",
      'Click "Connect Device" and select the serial port',
      'Click "Flash Firmware" to begin',
      "Wait for flashing to complete (do not disconnect)"
    ];
    const stepsSection = document.createElement("div");
    stepsSection.className = "section section-bg";
    const stepsTitle = document.createElement("h3");
    stepsTitle.textContent = "Steps";
    stepsSection.appendChild(stepsTitle);
    const stepsList = document.createElement("ul");
    stepsList.className = "instruction-list";
    stepsData.forEach((text, i) => {
      const li = document.createElement("li");
      li.dataset.step = String(i + 1);
      li.textContent = text;
      stepsList.appendChild(li);
    });
    stepsSection.appendChild(stepsList);
    container.appendChild(stepsSection);
  }
  /**
   * Render config form fields
   * Supports both new 'fields' format and legacy 'configSections' format
   */
  renderConfigFields(project) {
    const container = document.getElementById("config-container");
    const schema = this.flasher.getSchema();
    if (!schema || schema.length === 0) {
      container.innerHTML = '<div style="padding: 20px 0; text-align: center; color: #999; font-size: 13px;">No configuration needed</div>';
      return;
    }
    container.textContent = "";
    const sections = groupFieldsBySection(schema);
    for (const section of sections) {
      const group = document.createElement("div");
      group.className = "config-group";
      if (section.title && section.title !== "default") {
        const h3 = document.createElement("h3");
        h3.textContent = section.title;
        group.appendChild(h3);
      }
      for (const field of section.fields) {
        const savedValue = this.config[field.key] || field.default || "";
        const formGroup = document.createElement("div");
        formGroup.className = "form-group";
        const label = document.createElement("label");
        label.htmlFor = `config-${field.key}`;
        label.textContent = field.label + " ";
        const marker = document.createElement("span");
        if (field.required) {
          marker.style.color = "#ff3b30";
          marker.textContent = "*";
        } else {
          marker.style.cssText = "color: #86868b; font-weight: 400;";
          marker.textContent = "(optional)";
        }
        label.appendChild(marker);
        formGroup.appendChild(label);
        const input = document.createElement("input");
        input.type = field.type || "text";
        input.id = `config-${field.key}`;
        if (field.placeholder) input.placeholder = field.placeholder;
        input.value = savedValue;
        if (field.required) input.required = true;
        if (field.pattern) input.pattern = field.pattern;
        input.dataset.key = field.key;
        formGroup.appendChild(input);
        if (field.help) {
          const help = document.createElement("span");
          help.className = "help-text";
          help.textContent = field.help;
          formGroup.appendChild(help);
        }
        group.appendChild(formGroup);
      }
      container.appendChild(group);
    }
    container.querySelectorAll("[data-key]").forEach((input) => {
      input.addEventListener("input", () => {
        const key = input.dataset.key;
        this.config[key] = input.value;
        this.saveConfig();
        this.flasher.setConfig({ [key]: input.value });
      });
    });
  }
  /**
   * Attach event listeners
   */
  attachEventListeners() {
    this.btnConnect.addEventListener("click", () => this.handleConnect());
    this.btnFlash.addEventListener("click", () => this.handleFlash());
    this.btnWriteConfig.addEventListener("click", () => this.handleWriteConfig());
    this.btnClearMonitor?.addEventListener("click", () => this.clearLog());
    this.attachDevOptionsListeners();
    const troubleToggle = document.getElementById("troubleshooting-toggle");
    troubleToggle?.addEventListener("click", () => this.toggleTroubleshooting());
    this.attachAboutPanelListeners();
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeDevPanel();
        this.closeAboutPanel();
      }
    });
  }
  /**
   * Attach developer options panel listeners
   */
  attachDevOptionsListeners() {
    const toggle = document.getElementById("dev-mode-toggle");
    const close = document.getElementById("dev-options-close");
    const backdrop = document.getElementById("dev-panel-backdrop");
    toggle?.addEventListener("click", () => this.toggleDevPanel());
    close?.addEventListener("click", () => this.closeDevPanel());
    backdrop?.addEventListener("click", () => this.closeDevPanel());
    document.querySelectorAll(".dev-tab").forEach((tab) => {
      tab.addEventListener("click", () => this.handleDevTabClick(tab));
    });
    document.querySelectorAll('input[name="firmware-source"]').forEach((radio) => {
      radio.addEventListener("change", (e) => this.handleFirmwareSourceChange(e));
    });
    const customFile = document.getElementById("dev-custom-file");
    customFile?.addEventListener("change", (e) => this.handleCustomFileUpload(e));
    const exportBtn = document.getElementById("btn-export-log");
    exportBtn?.addEventListener("click", () => this.exportLog());
  }
  /**
   * Attach about panel listeners
   */
  attachAboutPanelListeners() {
    const aboutLink = document.getElementById("about-link");
    const aboutClose = document.getElementById("about-close");
    const aboutBackdrop = document.getElementById("about-backdrop");
    aboutLink?.addEventListener("click", (e) => {
      e.preventDefault();
      this.openAboutPanel();
    });
    aboutClose?.addEventListener("click", () => this.closeAboutPanel());
    aboutBackdrop?.addEventListener("click", () => this.closeAboutPanel());
  }
  /**
   * Handle connect button click
   */
  async handleConnect() {
    if (!this.selectedProject) return;
    try {
      const skipChipCheck = document.getElementById("dev-skip-chip-check")?.checked || false;
      await this.flasher.connect({ skipChipCheck });
      this.btnConnect.style.display = "none";
      this.btnFlash.style.display = "block";
      this.btnFlash.disabled = false;
      this.btnWriteConfig.disabled = false;
      this.btnWriteConfig.title = "Write configuration to device NVS partition";
    } catch (e) {
      console.error("Connection failed:", e);
    }
  }
  /**
   * Handle flash button click
   */
  async handleFlash() {
    if (!this.selectedProject) return;
    try {
      this.btnFlash.disabled = true;
      const firmwareSource = document.querySelector('input[name="firmware-source"]:checked')?.value || "release";
      const options = {};
      if (firmwareSource === "custom") {
        const fileInput = document.getElementById("dev-custom-file");
        if (fileInput.files.length > 0) {
          options.customFirmware = fileInput.files[0];
        } else {
          this.log("No custom firmware file selected", "error");
          this.updateStatus("error", "No file selected", "Please select a .bin file in Developer Options");
          this.btnFlash.disabled = false;
          return;
        }
      }
      await this.flasher.flash(options);
      this.btnFlash.style.display = "none";
      this.btnFlash.textContent = "Flash Complete";
    } catch (e) {
      this.btnFlash.disabled = false;
      this.btnFlash.textContent = "Retry Flash";
    }
  }
  /**
   * Handle write config button click
   */
  async handleWriteConfig() {
    if (!this.selectedProject) return;
    if (!this.flasher.isConnected()) {
      this.log("Please connect to device first", "warning");
      this.updateStatus("waiting", "Not connected", 'Click "Connect Device" first');
      return;
    }
    if (!this.selectedProject.nvsPartition) {
      this.log("This project does not have NVS configuration", "warning");
      return;
    }
    try {
      this.btnWriteConfig.disabled = true;
      this.btnWriteConfig.textContent = "Writing...";
      await this.flasher.flashConfig();
      this.updateStatus("success", "Configuration written!", "Config updated on device");
      this.btnWriteConfig.style.display = "none";
    } catch (e) {
      this.log(`Failed to write configuration: ${e.message}`, "error");
      this.updateStatus("error", "Write failed", e.message);
      this.btnWriteConfig.disabled = false;
      this.btnWriteConfig.textContent = "Write Config";
    }
  }
  /**
   * Show chip mismatch dialog
   * @returns {Promise<'cancel'|'once'|'always'>}
   */
  showChipMismatchDialog(expected, detected) {
    return new Promise((resolve) => {
      const statusBox = document.getElementById("status-box");
      const originalHTML = statusBox.innerHTML;
      statusBox.className = "status-box waiting";
      statusBox.textContent = "";
      const title = document.createElement("div");
      title.className = "status-text";
      title.textContent = "Chip Mismatch";
      statusBox.appendChild(title);
      const sub = document.createElement("div");
      sub.className = "status-subtext";
      sub.style.marginBottom = "12px";
      sub.textContent = `Expected ${expected}, found ${detected}`;
      statusBox.appendChild(sub);
      const btnRow = document.createElement("div");
      btnRow.style.cssText = "display: flex; gap: 8px;";
      const btnStyle = "flex: 1; font-size: 13px; padding: 8px 12px;";
      const cancelBtn = document.createElement("button");
      cancelBtn.className = "btn btn-primary";
      cancelBtn.style.cssText = btnStyle;
      cancelBtn.textContent = "Cancel";
      const onceBtn = document.createElement("button");
      onceBtn.className = "btn btn-secondary";
      onceBtn.style.cssText = btnStyle;
      onceBtn.textContent = "Continue";
      const alwaysBtn = document.createElement("button");
      alwaysBtn.className = "btn btn-secondary";
      alwaysBtn.style.cssText = btnStyle;
      alwaysBtn.textContent = "Always Allow";
      btnRow.append(cancelBtn, onceBtn, alwaysBtn);
      statusBox.appendChild(btnRow);
      const restore = () => {
        statusBox.innerHTML = originalHTML;
      };
      cancelBtn.addEventListener("click", () => {
        restore();
        resolve("cancel");
      });
      onceBtn.addEventListener("click", () => {
        restore();
        resolve("once");
      });
      alwaysBtn.addEventListener("click", () => {
        restore();
        resolve("always");
      });
    });
  }
  /**
   * Chip override persistence
   */
  getChipOverrides() {
    const stored = localStorage.getItem("chip-overrides");
    return stored ? JSON.parse(stored) : {};
  }
  saveChipOverride(detected, expected) {
    const overrides = this.getChipOverrides();
    overrides[detected] = expected;
    localStorage.setItem("chip-overrides", JSON.stringify(overrides));
  }
  /**
   * Config persistence
   */
  loadConfig() {
    const stored = localStorage.getItem("esp-flasher-config");
    return stored ? JSON.parse(stored) : {};
  }
  saveConfig() {
    localStorage.setItem("esp-flasher-config", JSON.stringify(this.config));
  }
  /**
   * Logging helpers (delegate to flasher events or direct DOM)
   */
  log(message, level = "info") {
    if (this.flasher) {
      this.flasher.dispatchEvent(new CustomEvent("log", {
        detail: { message, level }
      }));
    } else {
      const monitor = document.getElementById("serial-monitor");
      if (monitor) {
        const line = document.createElement("div");
        line.className = `serial-line ${level}`;
        line.textContent = `[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] ${message}`;
        monitor.appendChild(line);
        monitor.scrollTop = monitor.scrollHeight;
      }
    }
  }
  updateStatus(state, text, subtext) {
    const statusBox = document.getElementById("status-box");
    if (statusBox) {
      statusBox.className = `status-box ${state}`;
      statusBox.textContent = "";
      const textEl = document.createElement("div");
      textEl.className = "status-text";
      textEl.textContent = text;
      statusBox.appendChild(textEl);
      const subEl = document.createElement("div");
      subEl.className = "status-subtext";
      subEl.textContent = subtext;
      statusBox.appendChild(subEl);
    }
  }
  clearLog() {
    const monitor = document.getElementById("serial-monitor");
    if (monitor) {
      monitor.innerHTML = '<div class="serial-line info">Monitor cleared</div>';
    }
  }
  /**
   * Developer panel methods
   */
  toggleDevPanel() {
    const panel = document.getElementById("dev-options-panel");
    const backdrop = document.getElementById("dev-panel-backdrop");
    const toggle = document.getElementById("dev-mode-toggle");
    panel?.classList.toggle("active");
    backdrop?.classList.toggle("active");
    toggle?.classList.toggle("active");
    document.body.classList.toggle("dev-panel-open");
  }
  closeDevPanel() {
    const panel = document.getElementById("dev-options-panel");
    const backdrop = document.getElementById("dev-panel-backdrop");
    const toggle = document.getElementById("dev-mode-toggle");
    panel?.classList.remove("active");
    backdrop?.classList.remove("active");
    toggle?.classList.remove("active");
    document.body.classList.remove("dev-panel-open");
  }
  handleDevTabClick(tab) {
    const tabName = tab.dataset.tab;
    document.querySelectorAll(".dev-tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    document.querySelectorAll(".dev-tab-content").forEach((c) => c.classList.remove("active"));
    document.querySelector(`.dev-tab-content[data-tab="${tabName}"]`)?.classList.add("active");
  }
  handleFirmwareSourceChange(e) {
    const isRelease = e.target.value === "release";
    document.getElementById("release-options").style.display = isRelease ? "block" : "none";
    document.getElementById("custom-options").style.display = isRelease ? "none" : "block";
  }
  handleCustomFileUpload(e) {
    const file = e.target.files[0];
    const info = document.getElementById("custom-file-info");
    if (file) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(2);
      info.textContent = `${file.name} (${sizeMB} MB)`;
    } else {
      info.textContent = "";
    }
  }
  exportLog() {
    const lines = document.getElementById("serial-monitor")?.querySelectorAll(".serial-line");
    const text = Array.from(lines || []).map((l) => l.textContent).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flasher-log-${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    this.log("Log exported successfully", "success");
  }
  toggleTroubleshooting() {
    const toggle = document.getElementById("troubleshooting-toggle");
    const content = document.getElementById("troubleshooting-content");
    toggle?.classList.toggle("collapsed");
    content?.classList.toggle("active");
  }
  openAboutPanel() {
    document.getElementById("about-panel")?.classList.add("active");
    document.getElementById("about-backdrop")?.classList.add("active");
    document.body.classList.add("dev-panel-open");
  }
  closeAboutPanel() {
    document.getElementById("about-panel")?.classList.remove("active");
    document.getElementById("about-backdrop")?.classList.remove("active");
    document.body.classList.remove("dev-panel-open");
  }
}
export {
  FlasherApp
};
//# sourceMappingURL=app.js.map
