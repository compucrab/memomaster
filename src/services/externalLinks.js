import { openUrl } from "@tauri-apps/plugin-opener";

function externalUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.href);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.origin !== window.location.origin ? url.href : null;
    }
    if (url.protocol === "mailto:" || url.protocol === "tel:") return url.href;
  } catch {
    // Ignore malformed or unsupported destinations.
  }
  return null;
}

function openExternal(value) {
  const url = externalUrl(value);
  if (!url) return false;
  void openUrl(url).catch(error => console.error("Could not open external link:", error));
  return true;
}

export function installExternalLinkHandling() {
  const handleLinkEvent = event => {
    if (event.defaultPrevented || (event.type === "click" && event.button !== 0) || (event.type === "auxclick" && event.button !== 1)) return;

    const anchor = event.composedPath().find(node => node instanceof HTMLAnchorElement);
    if (!anchor || anchor.hasAttribute("download")) return;

    if (openExternal(anchor.href)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };

  document.addEventListener("click", handleLinkEvent, true);
  document.addEventListener("auxclick", handleLinkEvent, true);

  const originalWindowOpen = window.open.bind(window);
  window.open = (url, ...args) => {
    if (openExternal(String(url ?? ""))) return null;
    return originalWindowOpen(url, ...args);
  };
}
