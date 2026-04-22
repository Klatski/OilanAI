import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/index.css";
import { registerSW } from "virtual:pwa-register";

// Register the service worker so the whole app shell works offline
// even on a hard refresh. We do this manually (instead of injectRegister:"auto")
// so we can react to the "cached for offline use" event and surface it to the UI.
if (import.meta.env.PROD) {
  registerSW({
    immediate: true,
    onOfflineReady() {
      window.dispatchEvent(new CustomEvent("oilanai:offline-ready"));
    },
    onNeedRefresh() {
      // autoUpdate will refresh the SW in the background; nothing to show.
    },
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
