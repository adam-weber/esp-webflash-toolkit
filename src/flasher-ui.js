/**
 * UI Management for ESP32 Web Flasher
 * Handles status updates, progress, logging, and visual feedback
 */

export class FlasherUI {
    constructor() {
        this.statusBox = document.getElementById('status-box');
        this.progressContainer = document.getElementById('progress-container');
        this.progressFill = document.getElementById('progress-fill');
        this.progressPercent = document.getElementById('progress-percent');
        this.progressTime = document.getElementById('progress-time');
        this.serialMonitor = document.getElementById('serial-monitor');
        this.chipInfo = document.getElementById('chip-info');
        this.flashStartTime = null;
        this.lastDisplayedTime = null;
        this.lastUpdateTime = null;
        this.lastDisplayedPercent = 0;
        this.targetPercent = 0;
        this.animationFrame = null;
    }

    updateStatus(state, text, subtext) {
        this.statusBox.className = 'status-box ' + state;
        this.statusBox.innerHTML = `
            <div class="status-text">${text}</div>
            <div class="status-subtext">${subtext}</div>
        `;
    }

    updateProgress(percent, written, total) {
        // Set target percentage for smooth animation
        this.targetPercent = percent;

        // Start animation if not already running
        if (!this.animationFrame) {
            this.animateProgress();
        }

        if (this.flashStartTime && percent > 0 && percent < 100) {
            const now = Date.now();
            const elapsed = (now - this.flashStartTime) / 1000;
            const totalTime = (elapsed / percent) * 100;
            const calculated = Math.max(0, Math.round(totalTime - elapsed));

            // Update time display
            if (this.lastUpdateTime === null) {
                // First update
                this.lastDisplayedTime = calculated;
                this.lastUpdateTime = now;
                this.progressTime.textContent = `~${this.lastDisplayedTime}s remaining`;
            } else {
                const timeSinceLastUpdate = now - this.lastUpdateTime;

                // Update display every 100ms to keep smooth
                if (timeSinceLastUpdate >= 100) {
                    // If calculated time is much less, speed up countdown
                    if (calculated < this.lastDisplayedTime - 5) {
                        // Fast catch-up: decrease by 2-3 seconds
                        const gap = this.lastDisplayedTime - calculated;
                        const decrement = Math.min(Math.ceil(gap / 5), 3);
                        this.lastDisplayedTime = Math.max(calculated, this.lastDisplayedTime - decrement);
                    } else {
                        // Normal countdown based on actual time elapsed
                        const secondsPassed = timeSinceLastUpdate / 1000;
                        this.lastDisplayedTime = Math.max(calculated, this.lastDisplayedTime - secondsPassed);
                    }

                    this.lastUpdateTime = now;
                    this.progressTime.textContent = `~${Math.round(this.lastDisplayedTime)}s remaining`;
                }
            }
        } else if (percent >= 100) {
            // Rapidly count down to 0 if we still have time showing
            if (this.lastDisplayedTime && this.lastDisplayedTime > 0) {
                this.countdownToZero();
            } else {
                this.progressTime.textContent = 'Complete';
                this.lastDisplayedTime = null;
            }
        }
    }

    countdownToZero() {
        if (this.lastDisplayedTime > 0) {
            this.lastDisplayedTime = Math.max(0, this.lastDisplayedTime - 1);
            this.progressTime.textContent = `~${this.lastDisplayedTime}s remaining`;
            setTimeout(() => this.countdownToZero(), 50); // Count down every 50ms
        } else {
            this.progressTime.textContent = 'Complete';
        }
    }

    animateProgress() {
        // Smoothly interpolate towards target percentage
        const diff = this.targetPercent - this.lastDisplayedPercent;

        if (Math.abs(diff) > 0.1) {
            // Move 10% of the way to target each frame (adjust for smoothness)
            this.lastDisplayedPercent += diff * 0.1;

            this.progressFill.style.width = this.lastDisplayedPercent + '%';
            this.progressPercent.textContent = Math.round(this.lastDisplayedPercent) + '%';

            this.animationFrame = requestAnimationFrame(() => this.animateProgress());
        } else {
            // Snap to target when close enough
            this.lastDisplayedPercent = this.targetPercent;
            this.progressFill.style.width = this.targetPercent + '%';
            this.progressPercent.textContent = Math.round(this.targetPercent) + '%';
            this.animationFrame = null;
        }
    }

    showProgress() {
        this.flashStartTime = Date.now();
        this.lastDisplayedTime = null;
        this.lastUpdateTime = null;
        this.lastDisplayedPercent = 0;
        this.targetPercent = 0;
        this.progressContainer.classList.add('active');
    }

    hideProgress() {
        this.progressContainer.classList.remove('active');
        this.flashStartTime = null;
        this.lastDisplayedTime = null;
        this.lastUpdateTime = null;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        this.lastDisplayedPercent = 0;
        this.targetPercent = 0;
    }

    log(message, type = 'info') {
        const line = document.createElement('div');
        line.className = 'serial-line ' + type;
        line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        this.serialMonitor.appendChild(line);
        this.serialMonitor.scrollTop = this.serialMonitor.scrollHeight;
    }

    clearLog() {
        this.serialMonitor.innerHTML = '<div class="serial-line info">Monitor cleared</div>';
    }

    updateChipInfo(chipType, macAddr) {
        document.getElementById('chip-type').textContent = chipType;
        document.getElementById('chip-mac').textContent = macAddr;
        this.chipInfo.classList.add('active');
    }

    showProjectDetails(project) {
        const hardware = project.hardware.map(h => `<li>${h}</li>`).join('');
        const software = project.software.map(s => `<li>${s}</li>`).join('');

        const docLink = project.documentation
            ? `<a href="${project.documentation.url}" target="_blank" class="doc-link">
                 <span>${project.documentation.label}</span>
                 <span class="external-icon">↗</span>
               </a>`
            : '';

        document.getElementById('project-details').innerHTML = `
            <p style="margin-bottom: 24px;">${project.description}</p>

            ${docLink}

            <div class="section section-bg" style="margin-top: 32px;">
                <h3>Hardware</h3>
                <ul class="requirement-list">
                    ${hardware}
                </ul>
            </div>

            <div class="section section-bg">
                <h3>Steps</h3>
                <ul class="instruction-list">
                    <li data-step="1">Configure WiFi, MQTT, and TCP settings in the center panel</li>
                    <li data-step="2">Connect your ESP32 device via USB</li>
                    <li data-step="3">Click "Connect Device" and select the serial port</li>
                    <li data-step="4">Click "Flash Firmware" to begin</li>
                    <li data-step="5">Wait for flashing to complete (do not disconnect)</li>
                </ul>
            </div>
        `;
    }
}
