import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { EventProvider } from "./context/EventContext";
import "./index.css";

// Capture the install prompt early — it can fire before React mounts. InstallPrompt reads this.
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  (window as unknown as { __bipEvent?: Event }).__bipEvent = e;
  window.dispatchEvent(new Event("bip-ready"));
});

// Register the service worker (installable PWA + offline shell). When a new version
// is deployed, activate it and reload once so the installed app never runs stale code.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener("statechange", () => {
          // A new worker took over a page that was already controlled → refresh to it.
          if (nw.state === "activated" && navigator.serviceWorker.controller) {
            window.location.reload();
          }
        });
      });
    } catch (err) {
      console.error("SW registration failed", err);
    }
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <EventProvider>
          <App />
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "hsl(240 20% 12%)",
                color: "#fff",
                border: "1px solid hsl(240 12% 22%)",
              },
            }}
          />
        </EventProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
