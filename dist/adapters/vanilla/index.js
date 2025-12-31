import { ESPFlasher } from "../../core/flasher.js";
import { FlasherUI } from "./ui.js";
function createFlasher(options) {
  const { elements, storageKey, ...flasherOptions } = options;
  const buttonListeners = [];
  const flasher = new ESPFlasher(flasherOptions);
  const ui = new FlasherUI(flasher, elements);
  let changeHandler = null;
  if (storageKey) {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        flasher.setConfig(JSON.parse(saved), { validate: false });
      } catch (e) {
        console.warn("Failed to load saved config:", e);
      }
    }
    changeHandler = () => {
      localStorage.setItem(storageKey, JSON.stringify(flasher.getConfig()));
    };
    flasher.addEventListener("change", changeHandler);
  }
  if (elements.connectBtn) {
    const connectHandler = async () => {
      elements.connectBtn.disabled = true;
      try {
        await flasher.connect();
      } catch (e) {
        elements.connectBtn.disabled = false;
      }
    };
    elements.connectBtn.addEventListener("click", connectHandler);
    buttonListeners.push({ element: elements.connectBtn, event: "click", handler: connectHandler });
  }
  if (elements.flashBtn) {
    const flashHandler = async () => {
      elements.flashBtn.disabled = true;
      try {
        await flasher.flash();
      } catch (e) {
        elements.flashBtn.disabled = false;
      }
    };
    elements.flashBtn.addEventListener("click", flashHandler);
    buttonListeners.push({ element: elements.flashBtn, event: "click", handler: flashHandler });
  }
  if (elements.retryBtn) {
    const retryHandler = async () => {
      elements.retryBtn.disabled = true;
      try {
        await flasher.retry();
      } catch (e) {
        elements.retryBtn.disabled = false;
      }
    };
    elements.retryBtn.addEventListener("click", retryHandler);
    buttonListeners.push({ element: elements.retryBtn, event: "click", handler: retryHandler });
  }
  function dispose() {
    for (const { element, event, handler } of buttonListeners) {
      element.removeEventListener(event, handler);
    }
    if (changeHandler) {
      flasher.removeEventListener("change", changeHandler);
    }
    ui.dispose();
    flasher.dispose();
  }
  return { flasher, ui, dispose };
}
import { FlasherUI as FlasherUI2 } from "./ui.js";
import { FlasherApp } from "./app.js";
export {
  FlasherApp,
  FlasherUI2 as FlasherUI,
  createFlasher
};
//# sourceMappingURL=index.js.map
