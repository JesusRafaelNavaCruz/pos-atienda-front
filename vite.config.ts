import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png"],
      manifest: {
        name: "POS Abarrotes",
        short_name: "POS",
        description: "Sistema POS para tiendas de abarrotes",
        theme_color: "#18181b",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait-primary",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        // Cache first para assets estáticos
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            // Network first para el API — fallback a cache si offline
            urlPattern: /^https?:\/\/.*\/api\/v1\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
              networkTimeoutSeconds: 10,
            },
          },
          {
            // Cache first para catálogo de productos (se sincroniza al inicio del turno)
            urlPattern: /^https?:\/\/.*\/api\/v1\/products.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "products-cache",
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 8 },
            },
          },
        ],
      },
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/webhooks": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
