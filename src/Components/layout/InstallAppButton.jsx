import { useCallback, useEffect, useRef, useState } from "react";
import { Download, X } from "lucide-react";
import "./InstallAppButton.css";

const IOS_INSTALL_DISMISSED_KEY =
  "articulate60-ios-install-instructions-seen";

function isIosDevice() {
  if (typeof navigator === "undefined") return false;

  const platform = navigator.userAgentData?.platform || navigator.platform || "";
  return (
    /iPhone|iPad|iPod|iOS/i.test(`${navigator.userAgent} ${platform}`) ||
    (platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isStandalone() {
  return (
    (typeof window.matchMedia === "function" &&
      window.matchMedia("(display-mode: standalone)").matches) ||
    navigator.standalone === true
  );
}

function hasSeenIosInstructions() {
  try {
    return window.localStorage.getItem(IOS_INSTALL_DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}

export default function InstallAppButton() {
  const deferredPrompt = useRef(null);
  const triggerRef = useRef(null);
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const wasInstructionsOpen = useRef(false);
  const [iosDevice] = useState(isIosDevice);
  const [installed, setInstalled] = useState(isStandalone);
  const [nativePromptAvailable, setNativePromptAvailable] = useState(false);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [installPromptDismissed, setInstallPromptDismissed] = useState(
    hasSeenIosInstructions,
  );

  const dismissInstallPrompt = useCallback(() => {
    setInstallPromptDismissed(true);
    try {
      window.localStorage.setItem(IOS_INSTALL_DISMISSED_KEY, "true");
    } catch {
      // Keep dismissal for this session if browser storage is unavailable.
    }
  }, []);

  const closeIosInstructions = useCallback(() => {
    dismissInstallPrompt();
    setShowIosInstructions(false);
  }, [dismissInstallPrompt]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      deferredPrompt.current = event;
      setNativePromptAvailable(true);
    };

    const handleInstalled = () => {
      deferredPrompt.current = null;
      setNativePromptAvailable(false);
      setShowIosInstructions(false);
      setInstalled(true);
    };

    const standaloneMedia =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(display-mode: standalone)")
        : null;
    const handleDisplayModeChange = () => {
      if (isStandalone()) {
        setInstalled(true);
      }
    };
    const listenForDisplayModeChange = () => {
      if (!standaloneMedia) return;
      if (standaloneMedia.addEventListener) {
        standaloneMedia.addEventListener("change", handleDisplayModeChange);
      } else {
        standaloneMedia.addListener(handleDisplayModeChange);
      }
    };
    const stopListeningForDisplayModeChange = () => {
      if (!standaloneMedia) return;
      if (standaloneMedia.removeEventListener) {
        standaloneMedia.removeEventListener("change", handleDisplayModeChange);
      } else {
        standaloneMedia.removeListener(handleDisplayModeChange);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    listenForDisplayModeChange();

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleInstalled);
      stopListeningForDisplayModeChange();
    };
  }, []);

  useEffect(() => {
    if (!showIosInstructions) return undefined;

    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeIosInstructions();
        return;
      }

      if (event.key === "Tab") {
        const dialogButtons = dialogRef.current?.querySelectorAll("button");
        if (!dialogButtons?.length) return;

        const firstButton = dialogButtons[0];
        const lastButton = dialogButtons[dialogButtons.length - 1];
        if (event.shiftKey && document.activeElement === firstButton) {
          event.preventDefault();
          lastButton.focus();
        } else if (!event.shiftKey && document.activeElement === lastButton) {
          event.preventDefault();
          firstButton.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeIosInstructions, showIosInstructions]);

  useEffect(() => {
    if (showIosInstructions) {
      wasInstructionsOpen.current = true;
    } else if (wasInstructionsOpen.current) {
      triggerRef.current?.focus();
    }
  }, [showIosInstructions]);

  const openIosInstructions = () => {
    setShowIosInstructions(true);
  };

  const installApp = async () => {
    if (iosDevice) {
      openIosInstructions();
      return;
    }

    const promptEvent = deferredPrompt.current;
    if (!promptEvent) return;

    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      deferredPrompt.current = null;
      setNativePromptAvailable(false);

      if (choice.outcome === "accepted") {
        setInstalled(true);
      }
    } catch (error) {
      deferredPrompt.current = null;
      setNativePromptAvailable(false);
      console.error("The browser's app installation prompt failed:", error);
    }
  };

  if (
    installed ||
    installPromptDismissed ||
    (!iosDevice && !nativePromptAvailable)
  ) {
    return null;
  }

  return (
    <div className="install-app-root">
      <button
        ref={triggerRef}
        className="install-app-button"
        type="button"
        onClick={installApp}
        aria-haspopup={iosDevice ? "dialog" : undefined}
      >
        <Download size={17} />
        Install App
      </button>

      {showIosInstructions && (
        <div
          className="install-ios-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeIosInstructions();
            }
          }}
        >
          <section
            ref={dialogRef}
            className="install-ios-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-ios-title"
            aria-describedby="install-ios-description"
          >
            <div className="install-ios-dialog-header">
              <div>
                <p className="install-ios-eyebrow">Loquiex</p>
                <h2 id="install-ios-title">Install App</h2>
              </div>
              <button
                ref={closeButtonRef}
                className="install-ios-close"
                type="button"
                onClick={closeIosInstructions}
                aria-label="Close installation instructions"
              >
                <X size={20} />
              </button>
            </div>

            <p id="install-ios-description" className="install-ios-description">
              Install this app on your iPhone for quick access from your Home
              Screen.
            </p>

            <h3>How to install</h3>
            <ol className="install-ios-steps">
              <li>
                Open this website in <strong>Safari</strong>.
              </li>
              <li>
                Tap the <strong>Share</strong> button.
                <span className="install-ios-share-example">
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path d="M12 15V3m0 0L7.5 7.5M12 3l4.5 4.5M5 12v8h14v-8" />
                  </svg>
                  Safari Share
                </span>
              </li>
              <li>
                Select <strong>Add to Home Screen</strong>.
              </li>
              <li>
                Tap <strong>Add</strong>.
              </li>
            </ol>

            <button
              className="install-ios-done"
              type="button"
              onClick={closeIosInstructions}
            >
              Got it
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
