/**
 * Configuration Management for ESP32 Web Flasher
 * Handles loading, saving, and rendering configuration forms
 */

export class ConfigManager {
    constructor() {
        this.config = this.loadConfig();
    }

    loadConfig() {
        const saved = localStorage.getItem('active-wing-config');
        return saved ? JSON.parse(saved) : {};
    }

    saveConfig() {
        localStorage.setItem('active-wing-config', JSON.stringify(this.config));
    }

    clearConfig() {
        this.config = {};
        this.saveConfig();
        this.loadConfigValues();
    }

    loadConfigValues() {
        const inputs = document.querySelectorAll('[data-section][data-field]');
        inputs.forEach(input => {
            const section = input.dataset.section;
            const field = input.dataset.field;
            if (this.config[section] && this.config[section][field] !== undefined) {
                input.value = this.config[section][field];
            }
        });
    }

    attachConfigListeners() {
        const inputs = document.querySelectorAll('[data-section][data-field]');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                const section = input.dataset.section;
                const field = input.dataset.field;

                if (!this.config[section]) this.config[section] = {};
                this.config[section][field] = input.value;
                this.saveConfig();
            });
        });
    }

    renderConfigFields(project) {
        if (!project.configSections) {
            document.getElementById('config-container').innerHTML =
                '<div style="padding: 20px 0; text-align: center; color: #999; font-size: 13px;">No configuration needed</div>';
            return;
        }

        const container = document.getElementById('config-container');
        container.innerHTML = '';

        project.configSections.forEach(section => {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'config-group';

            let sectionHTML = `<h3>${section.title}</h3>`;
            if (section.description) {
                sectionHTML += `<p class="help-text" style="margin-bottom: 12px;">${section.description}</p>`;
            }

            section.fields.forEach(field => {
                const fieldId = `${section.id}-${field.id}`;
                sectionHTML += `
                    <div class="form-group">
                        <label for="${fieldId}">${field.label}${field.required ? ' <span style="color: #ff3b30;">*</span>' : ' <span style="color: #86868b; font-weight: 400;">(optional)</span>'}</label>
                        <input
                            type="${field.type || 'text'}"
                            id="${fieldId}"
                            placeholder="${field.placeholder || ''}"
                            ${field.default ? `value="${field.default}"` : ''}
                            ${field.required ? 'required' : ''}
                            aria-required="${field.required ? 'true' : 'false'}"
                            aria-describedby="${field.help ? fieldId + '-help' : ''}"
                            data-section="${section.id}"
                            data-field="${field.id}">
                        ${field.help ? `<span class="help-text" id="${fieldId}-help">${field.help}</span>` : ''}
                    </div>
                `;
            });

            sectionDiv.innerHTML = sectionHTML;
            container.appendChild(sectionDiv);
        });

        this.loadConfigValues();
        this.attachConfigListeners();
    }

    getConfig() {
        return this.config;
    }

    /**
     * Populate form fields from NVS data read from device
     * @param {Object} nvsData - Parsed NVS data (nvsKey -> value mapping)
     * @param {Object} project - Project configuration with field definitions
     */
    populateFromNVS(nvsData, project) {
        if (!project.configSections) return;

        // Clear current config
        this.config = {};

        // Map NVS keys back to form fields
        project.configSections.forEach(section => {
            section.fields.forEach(field => {
                const nvsKey = field.nvsKey || `${section.id}_${field.id}`;

                if (nvsData[nvsKey] !== undefined) {
                    // Store in config
                    if (!this.config[section.id]) {
                        this.config[section.id] = {};
                    }
                    this.config[section.id][field.id] = nvsData[nvsKey];

                    // Update form field
                    const fieldId = `${section.id}-${field.id}`;
                    const inputElement = document.getElementById(fieldId);
                    if (inputElement) {
                        inputElement.value = nvsData[nvsKey];
                    }
                }
            });
        });

        // Save to localStorage
        this.saveConfig();
    }
}
