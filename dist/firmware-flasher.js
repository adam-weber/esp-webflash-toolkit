/**
 * Firmware Flasher for ESP32 Web Flasher
 * Handles firmware download, NVS generation, and flashing
 */

export class FirmwareFlasher {
    constructor(ui, configManager) {
        this.ui = ui;
        this.configManager = configManager;
    }

    async flash(project, espStub, options = {}) {
        try {
            this.ui.log('Starting flash process...', 'info');
            this.ui.showProgress();

            let firmwareData;

            // Check if using custom firmware file
            if (options.customFirmware) {
                this.ui.updateStatus('flashing', 'Using custom firmware...', `File: ${options.customFirmware.name}`);
                this.ui.log('Using custom firmware file: ' + options.customFirmware.name, 'warning');
                firmwareData = await options.customFirmware.arrayBuffer();
                this.ui.log(`Loaded ${(firmwareData.byteLength / 1024).toFixed(1)} KB from custom file`, 'success');
            } else {
                // Download firmware from release
                this.ui.updateStatus('flashing', 'Downloading firmware...', 'Please wait');
                this.ui.log('Firmware URL: ' + project.firmwareUrl, 'info');
                const response = await fetch(project.firmwareUrl);

                if (!response.ok) {
                    throw new Error(`Failed to download firmware: ${response.status} ${response.statusText}`);
                }

                firmwareData = await response.arrayBuffer();
                this.ui.log(`Downloaded ${(firmwareData.byteLength / 1024).toFixed(1)} KB`, 'success');
            }

            // Convert firmware to binary string
            const firmwareBytes = new Uint8Array(firmwareData);
            let firmwareBinary = '';
            for (let i = 0; i < firmwareBytes.length; i++) {
                firmwareBinary += String.fromCharCode(firmwareBytes[i]);
            }

            // Prepare file array for flashing
            const fileArray = [{ data: firmwareBinary, address: 0x0 }];

            // Generate NVS partition if project has config sections
            if (project.configSections && project.nvsPartition) {
                await this.generateAndAddNVS(project, fileArray);
            }

            this.ui.updateStatus('flashing', 'Writing to flash...', 'Do not disconnect');

            await espStub.writeFlash({
                fileArray: fileArray,
                flashSize: 'keep',
                compress: true,
                reportProgress: (idx, written, total) => {
                    const percent = Math.round((written / total) * 100);
                    this.ui.updateProgress(percent, written, total);
                }
            });

            this.ui.updateStatus('success', 'Flash complete!', 'Device ready to use');
            this.ui.log('Flash completed successfully', 'success');

            return true;

        } catch (error) {
            this.handleFlashError(error, project);
            throw error;
        }
    }

    async generateAndAddNVS(project, fileArray) {
        this.ui.updateStatus('flashing', 'Generating NVS config...', 'Please wait');
        this.ui.log('Generating NVS partition from configuration...', 'info');

        try {
            const config = this.configManager.getConfig();

            // Build NVS data from config using nvsKey mappings
            const nvsData = {};
            const namespace = project.nvsPartition.namespace || 'config';
            nvsData[namespace] = {};

            project.configSections.forEach(section => {
                section.fields.forEach(field => {
                    if (field.nvsKey) {
                        const value = config[section.id]?.[field.id];
                        if (value !== undefined && value !== '') {
                            nvsData[namespace][field.nvsKey] = value;
                        }
                    }
                });
            });

            // Log what we're about to write
            const nvsKeys = Object.keys(nvsData[namespace]);
            this.ui.log(`NVS data to write: ${nvsKeys.join(', ')}`, 'info');
            nvsKeys.forEach(key => {
                const value = nvsData[namespace][key];
                this.ui.log(`  ${key} = ${value}`, 'info');
            });

            // Generate NVS partition binary
            const generator = new NVSGenerator();
            const partitionSize = parseInt(project.nvsPartition.size, 16);
            const nvsBytes = generator.generate(nvsData, partitionSize);

            // Convert NVS bytes to binary string
            let nvsBinary = '';
            for (let i = 0; i < nvsBytes.length; i++) {
                nvsBinary += String.fromCharCode(nvsBytes[i]);
            }

            // Add NVS partition to file array
            const nvsOffset = parseInt(project.nvsPartition.offset, 16);
            fileArray.push({ data: nvsBinary, address: nvsOffset });

            this.ui.log(`Generated NVS partition: ${nvsBytes.length} bytes at 0x${nvsOffset.toString(16)}`, 'success');
            this.ui.log(`NVS contains ${nvsKeys.length} config values`, 'info');

        } catch (nvsError) {
            this.ui.log(`Warning: NVS generation failed: ${nvsError.message}`, 'warning');
            this.ui.log('Continuing with firmware flash only (config will use defaults)', 'warning');
        }
    }

    handleFlashError(error, project) {
        this.ui.log('Flash error: ' + error.message, 'error');

        // Provide detailed, user-friendly error messages
        let errorTitle = 'Flash failed';
        let errorDetails = '';

        // Extract GitHub repo from firmware URL for links
        const urlMatch = project.firmwareUrl.match(/github\.com\/([^\/]+\/[^\/]+)/);
        const repoPath = urlMatch ? urlMatch[1] : 'repository';
        const releasesUrl = urlMatch ? `https://github.com/${repoPath}/releases` : '#';

        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            errorTitle = 'Cannot download firmware';
            errorDetails = `No release found. <a href="${releasesUrl}" target="_blank" style="color: #2196f3; text-decoration: underline;">Check releases</a> or verify internet connection.`;
        } else if (error.message.includes('404') || error.message.includes('Not Found')) {
            errorTitle = 'Firmware not found';
            errorDetails = `File not available at <a href="${project.firmwareUrl}" target="_blank" style="color: #2196f3; text-decoration: underline;">this URL</a>. <a href="${releasesUrl}" target="_blank" style="color: #2196f3; text-decoration: underline;">View releases</a>.`;
        } else if (error.message.includes('CORS')) {
            errorTitle = 'Download blocked';
            errorDetails = 'Browser blocked download due to CORS policy. Firmware must be on GitHub releases.';
        } else if (error.message.includes('writeFlash') || error.message.includes('flash')) {
            errorTitle = 'Flashing failed';
            errorDetails = `${error.message}. Try reconnecting, holding BOOT button, or different USB cable.`;
        } else if (error.message.includes('disconnect')) {
            errorTitle = 'Device disconnected';
            errorDetails = 'Device unplugged during flash. Check USB cable and try again.';
        } else if (error.message.includes('NVS')) {
            errorTitle = 'Configuration error';
            errorDetails = `NVS generation failed: ${error.message}. Check your configuration values.`;
        } else {
            errorTitle = 'Flash failed';
            errorDetails = `${error.message}. Try reconnecting and flashing again.`;
        }

        this.ui.updateStatus('error', errorTitle, errorDetails);
    }
}
