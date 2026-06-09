import { useEffect, useState, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallStatus = "installed" | "available" | "ios-manual" | "unsupported";

function detectStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !(window as any).MSStream;
}

// Module-level cache so the captured event survives across mounts.
let cachedPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<(e: BeforeInstallPromptEvent | null) => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    cachedPrompt = e as BeforeInstallPromptEvent;
    listeners.forEach((fn) => fn(cachedPrompt));
  });
  window.addEventListener("appinstalled", () => {
    cachedPrompt = null;
    listeners.forEach((fn) => fn(null));
  });
}

export function useInstallStatus() {
  const [standalone, setStandalone] = useState(detectStandalone);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(cachedPrompt);

  useEffect(() => {
    const onChange = (e: BeforeInstallPromptEvent | null) => setDeferred(e);
    listeners.add(onChange);

    const mq = window.matchMedia("(display-mode: standalone)");
    const onMQ = () => setStandalone(detectStandalone());
    mq.addEventListener?.("change", onMQ);

    return () => {
      listeners.delete(onChange);
      mq.removeEventListener?.("change", onMQ);
    };
  }, []);

  const status: InstallStatus = standalone
    ? "installed"
    : deferred
    ? "available"
    : isIOS()
    ? "ios-manual"
    : "unsupported";

  const promptInstall = useCallback(async () => {
    if (!deferred) return "dismissed" as const;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      cachedPrompt = null;
      listeners.forEach((fn) => fn(null));
    }
    return choice.outcome;
  }, [deferred]);

  return { status, standalone, canInstall: !!deferred, promptInstall, isIOS: isIOS() };
}
