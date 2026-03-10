function normalizeConfig(json) {
  if (json.version === 2) {
    return json;
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
function validateConfig(config) {
  const errors = [];
  if (!config.name) {
    errors.push('Missing "name" field');
  }
  if (!config.variants || config.variants.length === 0) {
    errors.push("At least one variant is required");
  } else {
    for (let i = 0; i < config.variants.length; i++) {
      const v = config.variants[i];
      if (!v.firmware) {
        errors.push(`Variant ${i} ("${v.name || v.id || i}") missing "firmware" field`);
      }
    }
  }
  if (config.branding) {
    if (config.branding.primaryColor && !/^#[0-9a-fA-F]{6}$/.test(config.branding.primaryColor)) {
      errors.push('branding.primaryColor must be a 6-digit hex color (e.g., "#0071e3")');
    }
    if (config.branding.theme && !["light", "dark"].includes(config.branding.theme)) {
      errors.push('branding.theme must be "light" or "dark"');
    }
  }
  return { valid: errors.length === 0, errors };
}
export {
  normalizeConfig,
  resolveVariantFirmwareUrl,
  validateConfig
};
//# sourceMappingURL=config-schema.js.map
