// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import "@/index.css";

import App from "./App";

// ─── QueryClient ──────────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Reintentar solo 1 vez en fallo (no 3 como por defecto)
      retry: 1,
      // Datos considerados frescos por 1 minuto
      staleTime: 60_000,
      // Mantener en caché 5 minutos sin usar
      gcTime: 5 * 60_000,
      // No refrescar al volver a enfocar la ventana en producción
      refetchOnWindowFocus: import.meta.env.DEV,
    },
    mutations: {
      // No reintentar mutaciones fallidas
      retry: 0,
    },
  },
});

// ─── Render ───────────────────────────────────────────────────────────────────

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      {import.meta.env.DEV && (
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition="bottom-left"
        />
      )}
    </QueryClientProvider>
  </React.StrictMode>,
);
