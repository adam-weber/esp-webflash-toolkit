const BOOT_INSTRUCTIONS = {
  esp32: "Hold the BOOT button while connecting, or press BOOT then EN/RST.",
  esp32s2: "Hold BOOT, press RST, then release BOOT to enter download mode.",
  esp32s3: "Hold BOOT, press RST, then release BOOT. Some boards auto-enter download mode.",
  esp32c3: "Hold BOOT while connecting. The USB-JTAG interface may auto-detect.",
  esp32c6: "Hold BOOT while connecting. Check your board's documentation.",
  esp32h2: "Hold BOOT while connecting.",
  esp8266: "Hold GPIO0/FLASH low, press RST, then release GPIO0."
};
const ERROR_PATTERNS = [
  {
    type: "connection_timeout",
    patterns: [/timeout/i, /not responding/i, /timed out/i],
    title: "Connection Timed Out",
    steps: [
      "Make sure the device is connected via USB",
      "Put the device in download mode: {bootInstruction}",
      "Try a different USB cable (some cables are charge-only)",
      "Close any other serial monitors (Arduino IDE, PlatformIO, etc.)"
    ]
  },
  {
    type: "port_in_use",
    patterns: [/port.*in use/i, /failed to open/i, /access denied/i, /busy/i, /port.*locked/i],
    title: "Port In Use",
    steps: [
      "Close any serial monitors or terminal programs using this port",
      "Close Arduino IDE, PlatformIO, or any other tools that may be connected",
      "Unplug and replug the USB cable",
      "Try restarting your browser"
    ]
  },
  {
    type: "download_failed",
    patterns: [/download failed/i, /fetch.*failed/i, /network error/i, /cors/i, /404/i],
    title: "Firmware Download Failed",
    steps: [
      "Check your internet connection",
      "Verify the firmware URL is correct and accessible",
      "The firmware server may be temporarily unavailable \u2014 try again in a moment",
      "If the URL is private, make sure the release is public"
    ]
  },
  {
    type: "write_failed",
    patterns: [/write.*fail/i, /flash.*fail/i, /erase.*fail/i],
    title: "Flash Write Failed",
    steps: [
      "Put the device in download mode and try again: {bootInstruction}",
      "Try a different USB cable or port",
      "Power cycle the device and reconnect",
      "The device flash memory may be damaged or write-protected"
    ]
  },
  {
    type: "disconnected_during_flash",
    patterns: [/disconnect/i, /lost/i, /break/i, /detach/i, /removed/i],
    title: "Device Disconnected",
    steps: [
      "Do not unplug the device during flashing",
      "Use a reliable USB cable and avoid loose connections",
      "Try a USB port directly on your computer (not a hub)",
      "Reconnect and try again"
    ]
  },
  {
    type: "chip_mismatch",
    patterns: [/chip mismatch/i, /unexpected chip/i],
    title: "Wrong Chip Detected",
    steps: [
      "The connected device is a different chip than expected",
      "Make sure you are flashing the correct firmware for your hardware",
      "If this is correct, you may proceed \u2014 but the firmware may not work"
    ]
  },
  {
    type: "no_port_selected",
    patterns: [/no port/i, /user cancelled/i, /no device/i, /requestport/i],
    title: "No Device Selected",
    steps: [
      "Click Connect and select your device from the browser popup",
      "Make sure the device is plugged in before clicking Connect",
      "If the device doesn't appear, try a different USB cable or port"
    ]
  }
];
function classifyError(error, context = {}) {
  const message = typeof error === "string" ? error : error?.message || String(error);
  const chip = (context.chip || "").toLowerCase().replace(/-/g, "");
  for (const pattern of ERROR_PATTERNS) {
    const matched = pattern.patterns.some((p) => p.test(message));
    if (matched) {
      const bootInstruction = BOOT_INSTRUCTIONS[chip] || BOOT_INSTRUCTIONS.esp32;
      const steps = pattern.steps.map((s) => s.replace("{bootInstruction}", bootInstruction));
      const chipSpecific = steps.some((s) => s !== pattern.steps[pattern.steps.indexOf(s)]);
      return {
        type: pattern.type,
        title: pattern.title,
        steps,
        chipSpecific
      };
    }
  }
  return {
    type: "unknown",
    title: "Something Went Wrong",
    steps: [
      "Try disconnecting and reconnecting the device",
      "Refresh the page and try again",
      "Make sure no other programs are using the serial port"
    ],
    chipSpecific: false
  };
}
function isBrowserSupported() {
  if (typeof navigator === "undefined") {
    return { supported: false, reason: "Not running in a browser" };
  }
  if (!navigator.serial) {
    const ua = navigator.userAgent || "";
    if (/Firefox/i.test(ua)) {
      return { supported: false, reason: "Firefox does not support Web Serial. Please use Chrome, Edge, or Opera." };
    }
    if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
      return { supported: false, reason: "Safari does not support Web Serial. Please use Chrome, Edge, or Opera." };
    }
    return { supported: false, reason: "Your browser does not support Web Serial. Please use Chrome, Edge, or Opera." };
  }
  return { supported: true, reason: null };
}
function isMobile() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}
export {
  classifyError,
  isBrowserSupported,
  isMobile
};
//# sourceMappingURL=error-catalog.js.map
