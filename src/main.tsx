import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initNative } from "./lib/native";

// Auto theme: follow system preference
const applyTheme = (dark: boolean) => {
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
};
const mq = window.matchMedia("(prefers-color-scheme: dark)");
applyTheme(mq.matches);
mq.addEventListener("change", (e) => applyTheme(e.matches));

// Initialize native (Capacitor) runtime — no-op on web
initNative().catch((e) => console.warn("native init failed", e));

createRoot(document.getElementById("root")!).render(<App />);
