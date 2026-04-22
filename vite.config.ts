import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// PWA / offline strategy:
//   - precache: app shell (HTML, JS, CSS, fonts, icons) so the whole SPA
//     works after a single online visit, even on F5 without internet.
//   - runtime cache: Google Fonts (stale-while-revalidate).
//   - API calls to /api/chat are NEVER cached — when offline the client
//     falls back to the local Socratic simulator automatically.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "OilanAI — Архитектор Смыслов",
        short_name: "OilanAI",
        description:
          "Сократовский ИИ-наставник. Учись думать, а не просто получать ответы.",
        lang: "ru",
        dir: "ltr",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#0d1117",
        theme_color: "#0d1117",
        icons: [
          {
            src: "/favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "/favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Precache only woff2 (modern browsers) + the essential Latin/Cyrillic
        // subsets we actually use in a Russian UI. This keeps the precache lean.
        globPatterns: [
          "**/*.{js,css,html,svg,png,ico}",
          "**/inter-latin-*.woff2",
          "**/inter-cyrillic-*.woff2",
        ],
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api\//],
      },
      devOptions: {
        // Disable the SW in dev — Vite HMR + SW don't play well.
        enabled: false,
      },
    }),
  ],
  server: {
    port: 5173,
    open: true,
  },
});
