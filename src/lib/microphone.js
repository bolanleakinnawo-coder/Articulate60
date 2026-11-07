// Microphone access for group practice.
//
// We ask for the microphone at the moment a member joins a call (like Zoom),
// and explain how to turn it back on when the phone or browser has blocked it.

const AUDIO = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

// "granted" | "denied" | "prompt" | "unknown" (Safari and older browsers
// can't tell us before asking).
export async function micPermissionState() {
  try {
    if (!navigator.permissions?.query) return "unknown";
    const status = await navigator.permissions.query({ name: "microphone" });
    return status.state || "unknown";
  } catch {
    return "unknown";
  }
}

// Asks for the microphone. Returns { stream } or { error } where error is
// "blocked" | "not-found" | "in-use" | "insecure" | "unsupported" | "failed".
export async function requestMic() {
  if (typeof window !== "undefined" && window.isSecureContext === false) {
    return { error: "insecure" };
  }
  if (!navigator.mediaDevices?.getUserMedia) return { error: "unsupported" };
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: AUDIO,
      video: false,
    });
    return { stream };
  } catch (err) {
    switch (err?.name) {
      case "NotAllowedError":
      case "PermissionDeniedError":
      case "SecurityError":
        return { error: "blocked" };
      case "NotFoundError":
      case "DevicesNotFoundError":
      case "OverconstrainedError":
        return { error: "not-found" };
      case "NotReadableError":
      case "TrackStartError":
      case "AbortError":
        return { error: "in-use" };
      default:
        return { error: "failed" };
    }
  }
}

// Which device/browser the member is on, so we show the right steps.
export function detectDevice() {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent || "";
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (/Macintosh/.test(ua) &&
      typeof navigator !== "undefined" &&
      navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  const standalone =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)").matches ||
      window.navigator.standalone === true);
  let browser = "other";
  if (/CriOS|Chrome|Chromium/i.test(ua) && !/Edg|OPR|SamsungBrowser/i.test(ua))
    browser = "chrome";
  if (/Edg/i.test(ua)) browser = "edge";
  if (/SamsungBrowser/i.test(ua)) browser = "samsung";
  if (/FxiOS|Firefox/i.test(ua)) browser = "firefox";
  if (/Safari/i.test(ua) && !/CriOS|FxiOS|Chrome|Chromium|Edg|OPR/i.test(ua))
    browser = "safari";
  return { iOS, android, standalone, browser };
}

const BROWSER_NAMES = {
  chrome: "Chrome",
  edge: "Edge",
  samsung: "Samsung Internet",
  firefox: "Firefox",
  safari: "Safari",
};

// Step-by-step help for turning the microphone back on.
export function micHelp(error) {
  const { iOS, android, standalone, browser } = detectDevice();
  const name = BROWSER_NAMES[browser] || "your browser";

  if (error === "not-found") {
    return {
      title: "We couldn't find a microphone",
      text: "Plug in headphones with a mic or connect a microphone, then try again.",
      steps: [],
    };
  }
  if (error === "in-use") {
    return {
      title: "Your microphone is busy",
      text: "Another app is using it. Close other call or recording apps (WhatsApp, Zoom, voice notes), then try again.",
      steps: [],
    };
  }
  if (error === "insecure" || error === "unsupported") {
    return {
      title: "This browser can't use the microphone",
      text: "Open Loquiex in an up-to-date Chrome or Safari, then join again.",
      steps: [],
    };
  }

  // Blocked by the member, the browser or the phone.
  if (iOS) {
    const steps =
      browser === "safari" || standalone
        ? [
            "Tap aA (or the page icon) on the left of the address bar, then Website Settings.",
            "Set Microphone to Allow.",
            "If you don't see it: open the Settings app, tap Apps, then Safari, then Microphone, and choose Allow or Ask.",
            "Come back here and tap Try again.",
          ]
        : [
            `Open the Settings app on your iPhone and find ${name}.`,
            "Turn Microphone on.",
            `Come back to ${name}, reload this page if needed, and tap Try again.`,
          ];
    return {
      title: "Your microphone is blocked",
      text: "Your iPhone is stopping Loquiex from using the microphone, so others can't hear you.",
      steps,
    };
  }
  if (android) {
    return {
      title: "Your microphone is blocked",
      text: "Your phone or browser is stopping Loquiex from using the microphone, so others can't hear you.",
      steps: [
        "Tap the icon on the left of the address bar, then Permissions (or Site settings).",
        "Set Microphone to Allow.",
        `If it's still blocked: open your phone's Settings, tap Apps, then ${name}, then Permissions, and allow Microphone.`,
        "Come back here and tap Try again.",
      ],
    };
  }
  return {
    title: "Your microphone is blocked",
    text: `${name === "your browser" ? "Your browser" : name} is stopping Loquiex from using the microphone, so others can't hear you.`,
    steps: [
      "Click the icon on the left of the address bar (a lock or sliders).",
      "Set Microphone to Allow.",
      "On a Mac, also check System Settings, then Privacy & Security, then Microphone, and turn your browser on.",
      "Tap Try again. If nothing changes, reload the page.",
    ],
  };
}
