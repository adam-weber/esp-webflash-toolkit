const FieldPresets = {
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
function groupFieldsBySection(fields) {
  if (!fields) return [];
  const groups = /* @__PURE__ */ new Map();
  for (const field of fields) {
    const section = field.section || "default";
    if (!groups.has(section)) groups.set(section, []);
    groups.get(section).push(field);
  }
  return Array.from(groups.entries()).map(([title, fields2]) => ({ title, fields: fields2 }));
}
class ConfigStore extends EventTarget {
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
}
export {
  ConfigStore,
  FieldPresets,
  expandFieldPresets,
  flattenConfigSections,
  groupFieldsBySection
};
//# sourceMappingURL=config-store.js.map
