/**
 * Native runtime helpers — safe to call on web (all guarded by Capacitor.isNativePlatform()).
 * Import from anywhere: `import { initNative, hapticTap, shareContent } from "@/lib/native"`.
 */
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { Keyboard } from "@capacitor/keyboard";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Network } from "@capacitor/network";
import { Share } from "@capacitor/share";
import { Preferences } from "@capacitor/preferences";

export const isNative = () => Capacitor.isNativePlatform();
export const platform = () => Capacitor.getPlatform(); // 'ios' | 'android' | 'web'

/** Call once at app boot (e.g. in main.tsx). */
export async function initNative(onBack?: () => void) {
  if (!isNative()) return;

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    if (platform() === "android") {
      await StatusBar.setBackgroundColor({ color: "#0F172A" });
    }
  } catch (e) { console.warn("StatusBar init:", e); }

  try { await SplashScreen.hide({ fadeOutDuration: 300 }); } catch {}

  try {
    Keyboard.addListener("keyboardWillShow", () => {
      document.body.classList.add("kb-open");
    });
    Keyboard.addListener("keyboardWillHide", () => {
      document.body.classList.remove("kb-open");
    });
  } catch {}

  // Hardware back button (Android): let router handle, otherwise minimize.
  try {
    CapApp.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        if (onBack) onBack();
        else window.history.back();
      } else {
        CapApp.exitApp();
      }
    });
  } catch {}
}

export async function hapticTap(style: "light" | "medium" | "heavy" = "light") {
  if (!isNative()) return;
  const map = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
  try { await Haptics.impact({ style: map[style] }); } catch {}
}

export async function shareContent(opts: { title?: string; text?: string; url?: string }) {
  if (isNative()) {
    try { await Share.share(opts); return true; } catch { return false; }
  }
  if (navigator.share) {
    try { await navigator.share(opts); return true; } catch { return false; }
  }
  return false;
}

export async function getNetworkStatus() {
  if (isNative()) return Network.getStatus();
  return { connected: navigator.onLine, connectionType: navigator.onLine ? "wifi" : "none" };
}

export const nativeStorage = {
  async get(key: string) {
    if (isNative()) return (await Preferences.get({ key })).value;
    return localStorage.getItem(key);
  },
  async set(key: string, value: string) {
    if (isNative()) return Preferences.set({ key, value });
    localStorage.setItem(key, value);
  },
  async remove(key: string) {
    if (isNative()) return Preferences.remove({ key });
    localStorage.removeItem(key);
  },
};
