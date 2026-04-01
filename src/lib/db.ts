import Dexie, { type Table } from "dexie";
import type { Product, CartItem } from "../types";

export interface PendingSale {
  id?: number;
  localId: string;
  branch_id: string;
  customer_id: string | null;
  items: CartItem[];
  discount: number;
  notes: string | null;
  created_at: string;
  synced: boolean;
  sync_error: string | null;
}

export interface CachedProduct extends Product {
  cached_at: number; // timestamp para saber cuándo expirar
}

class PosDatabase extends Dexie {
  products!: Table<CachedProduct>;
  pending_sales!: Table<PendingSale>;

  constructor() {
    super("pos_db");

    this.version(1).stores({
      // Índices para búsqueda rápida en modo offline
      products: "id, barcode, name, tenant_id, category_id, is_active",
      pending_sales: "++id, localId, branch_id, synced, created_at",
    });
  }
}

export const db = new PosDatabase();

// Helpers de productos

const PRODUCTS_CACHE_TTL = 8 * 60 * 60 * 1000  // 8 horas

export async function cacheProducts(products: Product[]): Promise<void> {
  const now = Date.now()
  const toCache: CachedProduct[] = products.map((p) => ({ ...p, cached_at: now }))
  await db.products.bulkPut(toCache)
}

export async function getProductByBarcode(barcode: string): Promise<Product | undefined> {
  return db.products
    .where('barcode')
    .equals(barcode)
    .and((p) => p.is_active && Date.now() - p.cached_at < PRODUCTS_CACHE_TTL)
    .first()
}

export async function searchProductsOffline(query: string): Promise<Product[]> {
  const lower = query.toLowerCase()
  return db.products
    .filter(
      (p) =>
        p.is_active &&
        Date.now() - p.cached_at < PRODUCTS_CACHE_TTL &&
        (p.name.toLowerCase().includes(lower) || (p.barcode ?? '').includes(query)),
    )
    .limit(20)
    .toArray()
}

// Helpers de ventas pendientes

export async function savePendingSale(
  sale: Omit<PendingSale, 'id' | 'synced' | 'sync_error'>,
): Promise<number> {
  return db.pending_sales.add({ ...sale, synced: false, sync_error: null })
}

export async function getPendingSales(): Promise<PendingSale[]> {
  return db.pending_sales.where('synced').equals(0).toArray()
}

export async function markSaleSynced(id: number): Promise<void> {
  await db.pending_sales.update(id, { synced: true })
}

export async function markSaleError(id: number, error: string): Promise<void> {
  await db.pending_sales.update(id, { sync_error: error })
}
