// src/hooks/useOfflineSync.ts
// Detecta el estado de conexión y sincroniza ventas pendientes
// almacenadas en IndexedDB cuando regresa la red.

import { useState, useEffect, useCallback } from "react";
import {
  getPendingSales,
  markSaleSynced,
  markSaleError,
  cacheProducts,
} from "@/lib/db";
import { salesApi, productsApi } from "@/api";
import { toast } from "sonner";

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const setOnline = () => setIsOnline(true);
    const setOffline = () => setIsOnline(false);
    window.addEventListener("online", setOnline);
    window.addEventListener("offline", setOffline);
    return () => {
      window.removeEventListener("online", setOnline);
      window.removeEventListener("offline", setOffline);
    };
  }, []);

  return isOnline;
}

export function useOfflineSync() {
  const isOnline = useOnlineStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Contar ventas pendientes
  const refreshCount = useCallback(async () => {
    const pending = await getPendingSales();
    setPendingCount(pending.filter((s) => !s.synced).length);
  }, []);

  // Sincronizar ventas pendientes
  const syncPendingSales = useCallback(async () => {
    if (!isOnline || isSyncing) return;
    const pending = await getPendingSales();
    if (pending.length === 0) return;

    setIsSyncing(true);
    let synced = 0;
    let failed = 0;

    for (const sale of pending) {
      try {
        await salesApi.create({
          branch_id: sale.branch_id,
          customer_id: sale.customer_id ?? undefined,
          items: sale.items.map((i) => ({
            product_id: i.product.id,
            quantity: i.quantity,
            unit_price: i.unit_price,
            discount: i.discount,
          })),
          payments: [
            {
              method: "cash",
              amount: sale.items.reduce((s, i) => s + i.subtotal, 0),
            },
          ],
          discount: sale.discount,
          notes: sale.notes ?? undefined,
        });
        await markSaleSynced(sale.id!);
        synced++;
      } catch (err: unknown) {
        await markSaleError(
          sale.id!,
          err instanceof Error ? err.message : "Error desconocido",
        );
        failed++;
      }
    }

    setIsSyncing(false);
    await refreshCount();

    if (synced > 0)
      toast.success(`${synced} venta(s) sincronizada(s) correctamente`);
    if (failed > 0)
      toast.error(`${failed} venta(s) no se pudieron sincronizar`);
  }, [isOnline, isSyncing, refreshCount]);

  // Sincronizar catálogo de productos para modo offline
  const syncProductCatalog = useCallback(async () => {
    if (!isOnline) return;
    try {
      const { data } = await productsApi.list({ limit: 500, is_active: true });
      await cacheProducts(data);
    } catch {
      // Silencioso — el catálogo anterior sigue disponible
    }
  }, [isOnline]);

  // Cuando regresa la red, sincronizar automáticamente
  useEffect(() => {
    if (isOnline) {
      syncPendingSales();
    }
  }, [isOnline, syncPendingSales]);

  useEffect(() => {
    refreshCount();
  }, []);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    syncPendingSales,
    syncProductCatalog,
  };
}
