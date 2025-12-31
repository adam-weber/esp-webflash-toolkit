class ConfigStore extends EventTarget {
  /**
   * @param {Object} [initialConfig] - Initial config values
   */
  constructor(initialConfig = {}) {
    super();
    this.config = { ...initialConfig };
    this.schema = null;
  }
  /**
   * Emit a typed event
   * @private
   */
  emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }
  /**
   * Set the config schema (field definitions)
   * @param {Array<FieldDefinition>} fields - Field definitions
   */
  setSchema(fields) {
    this.schema = fields;
    fields.forEach((field) => {
      if (field.default !== void 0 && this.config[field.key] === void 0) {
        this.config[field.key] = field.default;
      }
    });
    this.emit("schema-changed", { schema: this.schema });
  }
  /**
   * Get schema
   * @returns {Array<FieldDefinition>|null}
   */
  getSchema() {
    return this.schema;
  }
  /**
   * Set a config value
   * @param {string} key - Config key
   * @param {any} value - Config value
   */
  set(key, value) {
    const oldValue = this.config[key];
    this.config[key] = value;
    this.emit("change", { key, value, oldValue });
  }
  /**
   * Get a config value
   * @param {string} key - Config key
   * @returns {any}
   */
  get(key) {
    return this.config[key];
  }
  /**
   * Get all config values
   * @returns {Object}
   */
  getAll() {
    return { ...this.config };
  }
  /**
   * Set multiple values at once
   * @param {Object} values - Key-value pairs
   */
  setAll(values) {
    Object.entries(values).forEach(([key, value]) => {
      this.config[key] = value;
    });
    this.emit("change", { bulk: true, values });
  }
  /**
   * Clear all config
   */
  clear() {
    const oldConfig = { ...this.config };
    this.config = {};
    if (this.schema) {
      this.schema.forEach((field) => {
        if (field.default !== void 0) {
          this.config[field.key] = field.default;
        }
      });
    }
    this.emit("clear", { oldConfig });
  }
  /**
   * Check if config is valid (all required fields present)
   * @returns {{valid: boolean, missing: string[]}}
   */
  validate() {
    if (!this.schema) {
      return { valid: true, missing: [] };
    }
    const missing = this.schema.filter((field) => field.required && !this.config[field.key]).map((field) => field.key);
    return {
      valid: missing.length === 0,
      missing
    };
  }
  /**
   * Get config formatted for NVS generation
   * Only includes non-empty values
   * @returns {Object}
   */
  toNVS() {
    const nvsData = {};
    Object.entries(this.config).forEach(([key, value]) => {
      if (value !== void 0 && value !== null && value !== "") {
        nvsData[key] = String(value);
      }
    });
    return nvsData;
  }
  /**
   * Load config from serialized data (e.g., localStorage)
   * @param {string|Object} data - JSON string or object
   */
  load(data) {
    const parsed = typeof data === "string" ? JSON.parse(data) : data;
    this.config = { ...parsed };
    this.emit("load", { config: this.config });
  }
  /**
   * Serialize config for storage
   * @returns {string}
   */
  serialize() {
    return JSON.stringify(this.config);
  }
}
const FieldPresets = {
  wifi: [
    { key: "wifi_ssid", label: "WiFi SSID", type: "text", placeholder: "MyNetwork", required: true },
    { key: "wifi_pass", label: "WiFi Password", type: "password", required: true }
  ],
  mqtt: [
    { key: "mqtt_host", label: "MQTT Host", type: "text", placeholder: "mqtt.example.com" },
    { key: "mqtt_user", label: "MQTT Username", type: "text" },
    { key: "mqtt_pass", label: "MQTT Password", type: "password" }
  ],
  device_name: [
    { key: "device_name", label: "Device Name", type: "text", placeholder: "my-device-001" }
  ],
  api_key: [
    { key: "api_key", label: "API Key", type: "password" }
  ],
  server_url: [
    { key: "server_url", label: "Server URL", type: "text", placeholder: "https://api.example.com" }
  ]
};
function expandFieldPresets(fields) {
  const expanded = [];
  fields.forEach((field) => {
    if (typeof field === "string" && FieldPresets[field]) {
      expanded.push(...FieldPresets[field]);
    } else if (typeof field === "object") {
      expanded.push(field);
    }
  });
  return expanded;
}
export {
  ConfigStore,
  FieldPresets,
  expandFieldPresets
};
//# sourceMappingURL=config-store.js.map
