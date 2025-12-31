import { ESPFlasher } from "../../core/flasher.js";
import { FlasherUI } from "./ui.js";
function createFlasher(options) {
  const { elements, storageKey, ...flasherOptions } = options;
  const flasher = new ESPFlasher(flasherOptions);
  const ui = new FlasherUI(flasher, elements);
  if (storageKey) {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        flasher.setConfig(JSON.parse(saved));
      } catch (e) {
        console.warn("Failed to load saved config:", e);
      }
    }
    flasher.addEventListener("change", () => {
      localStorage.setItem(storageKey, JSON.stringify(flasher.getConfig()));
    });
  }
  if (elements.connectBtn) {
    elements.connectBtn.addEventListener("click", async () => {
      elements.connectBtn.disabled = true;
      try {
        await flasher.connect();
      } catch (e) {
        elements.connectBtn.disabled = false;
      }
    });
  }
  if (elements.flashBtn) {
    elements.flashBtn.addEventListener("click", async () => {
      elements.flashBtn.disabled = true;
      try {
        await flasher.flash();
      } catch (e) {
        elements.flashBtn.disabled = false;
      }
    });
  }
  return { flasher, ui };
}
import { FlasherUI as FlasherUI2 } from "./ui.js";
import { FlasherApp } from "./app.js";
export {
  FlasherApp,
  FlasherUI2 as FlasherUI,
  createFlasher
};
//# sourceMappingURL=index.js.map
