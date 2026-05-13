import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Auto theme: follow system preference
const applyTheme = (dark: boolean) => {
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
};
const mq = window.matchMedia("(prefers-color-scheme: dark)");
applyTheme(mq.matches);
mq.addEventListener("change", (e) => applyTheme(e.matches));

createRoot(document.getElementById("root")!).render(<App />);
