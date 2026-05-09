// src/pages/pos/PosPage.tsx
// Terminal de ventas completa con:
//   - Búsqueda y escaneo de productos
//   - Grid de productos
//   - Sidebar del carrito con descuentos
//   - Cobro en efectivo y tarjeta
//   - Impresión de ticket

import { useState, useRef, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Scale,
  Printer,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Banknote,
  Check,
  Loader2,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Feature } from "@/components/layout/Guards";
import { useCartStore } from "@/store/cart.store";
import { useAuthStore } from "@/store/auth.store";
import { useBarcodeScan } from "@/hooks/useBarcodeScan";
import { useScale } from "@/hooks/useScale";
import { useThermalPrinter } from "@/hooks/useThermalPrinter";
import { productsApi, salesApi } from "@/api";
import { getProductByBarcode } from "@/lib/db";
import { formatCurrency, cn } from "@/lib/utils";
import type { CartItem, PaymentMethod, Product } from "@/types";

// ─── Product card ────────────────────────────────────────────────────────────

function ProductCard({
  product,
  onAdd,
}: {
  product: Product;
  onAdd: (product: Product) => void;
}) {
  return (
    <button
      onClick={() => onAdd(product)}
      className="backdrop-blur-xl bg-white/80 border border-white/50 rounded-xl p-3 hover:shadow-lg hover:bg-white transition-all text-left group"
    >
      <div className="mb-2 h-24 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
        <ShoppingCart className="text-slate-300 size-8" />
      </div>
      <p className="text-sm font-semibold truncate group-hover:text-indigo-600">{product.name}</p>
      <p className="text-xs text-muted-foreground mb-1">
        {product.sku || product.barcode || "—"}
      </p>
      <div className="flex justify-between items-end">
        <span className="text-lg font-bold text-indigo-600">{formatCurrency(product.price)}</span>
        <Badge variant="secondary" className="text-xs">{product.stock} {product.unit}</Badge>
      </div>
    </button>
  );
}

// ─── Cart item in sidebar ────────────────────────────────────────────────────

function CartItemSidebar({
  item,
  onQtyChange,
  onRemove,
}: {
  item: CartItem;
  onQtyChange: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
}) {
  return (
    <div className="flex items-start gap-2 py-3 border-b border-white/10 last:border-0 group">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{item.product.name}</p>
        <p className="text-xs text-white/50">{formatCurrency(item.unit_price)} c/u</p>
      </div>
      <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-6 text-white/60 hover:text-white hover:bg-white/20"
          onClick={() => onQtyChange(item.product.id, item.quantity - 1)}
        >
          <Minus className="size-3" />
        </Button>
        <span className="w-6 text-center text-xs font-mono text-white font-bold">
          {item.quantity}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 text-white/60 hover:text-white hover:bg-white/20"
          onClick={() => onQtyChange(item.product.id, item.quantity + 1)}
        >
          <Plus className="size-3" />
        </Button>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-emerald-400">{formatCurrency(item.subtotal)}</p>
        <Button
          variant="ghost"
          size="icon"
          className="size-5 text-red-400 hover:text-red-300 hover:bg-red-500/20"
          onClick={() => onRemove(item.product.id)}
        >
          <Trash2 className="size-3" />
        </Button>
      </div>
    </div>
  );
}

// ─── Payment panel ───────────────────────────────────────────────────────────

function PaymentPanel({
  total,
  onConfirm,
  isLoading,
}: {
  total: number;
  onConfirm: (method: PaymentMethod, amount: number) => void;
  isLoading: boolean;
}) {
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [received, setReceived] = useState("");

  const receivedNum = parseFloat(received) || 0;
  const change = method === "cash" ? Math.max(0, receivedNum - total) : 0;

  return (
    <div className="space-y-4">
      {/* Método de pago */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={method === "cash" ? "default" : "outline"}
          onClick={() => setMethod("cash")}
          className={cn(
            "gap-2",
            method === "cash"
              ? "bg-emerald-600 hover:bg-emerald-500"
              : "bg-white/10 hover:bg-white/20 text-white border-white/20"
          )}
        >
          <Banknote className="size-4" />
          Efectivo
        </Button>
        <Feature
          flag="card_payments"
          fallback={
            <Button variant="outline" disabled className="gap-2 opacity-50 bg-white/5">
              <CreditCard className="size-4" />
              Tarjeta
            </Button>
          }
        >
          <Button
            variant={method === "card" ? "default" : "outline"}
            onClick={() => setMethod("card")}
            className={cn(
              "gap-2",
              method === "card"
                ? "bg-blue-600 hover:bg-blue-500"
                : "bg-white/10 hover:bg-white/20 text-white border-white/20"
            )}
          >
            <CreditCard className="size-4" />
            Tarjeta
          </Button>
        </Feature>
      </div>

      {/* Monto recibido (solo efectivo) */}
      {method === "cash" && (
        <div className="space-y-2">
          <label className="text-xs text-white/60 font-medium">Recibido</label>
          <Input
            type="number"
            placeholder={formatCurrency(total)}
            value={received}
            onChange={(e) => setReceived(e.target.value)}
            className="text-lg font-mono text-right bg-white/10 border-white/20 text-white placeholder:text-white/30"
          />
          {change > 0 && (
            <div className="flex justify-between text-sm bg-emerald-500/20 rounded-lg p-2 border border-emerald-500/30">
              <span className="text-emerald-300">Cambio:</span>
              <span className="font-bold text-emerald-400">{formatCurrency(change)}</span>
            </div>
          )}
        </div>
      )}

      <Button
        className="w-full h-12 text-base gap-2 bg-indigo-600 hover:bg-indigo-500 active:scale-[.98] transition-all"
        onClick={() =>
          onConfirm(method, method === "cash" ? receivedNum : total)
        }
        disabled={isLoading || (method === "cash" && receivedNum < total)}
      >
        {isLoading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Check className="size-4" />
        )}
        Cobrar {formatCurrency(total)}
      </Button>
    </div>
  );
}

// ─── Main POS Page ───────────────────────────────────────────────────────────

export default function PosPage() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const cart = useCartStore();
  const scale = useScale();
  const printer = useThermalPrinter();

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);

  const { data: defaultProducts, isLoading: loadingProducts } = useQuery<
    Awaited<ReturnType<typeof productsApi.list>>
  >({
    queryKey: ["pos-products"],
    queryFn: () => productsApi.list({ limit: 40, is_active: true }),
    staleTime: 1000 * 60 * 5,
  });

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback(async (value: string) => {
    setSearch(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!value.trim()) {
      setResults([]);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await productsApi.list({ search: value, limit: 12 });
        setResults(data);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  const addProduct = useCallback(
    async (product: Product) => {
      let qty = 1;
      if (product.sold_by_weight && scale.weight) {
        qty = scale.weight;
      }
      cart.addItem(product, qty);
      setSearch("");
      setResults([]);
    },
    [cart, scale.weight],
  );

  useBarcodeScan({
    onScan: async (code) => {
      let product = await getProductByBarcode(code);
      if (!product) {
        try {
          product = await productsApi.getByBarcode(code);
        } catch {
          toast.error(`Producto no encontrado: ${code}`);
          return;
        }
      }
      cart.addItem(product);
      toast.success(`${product.name} agregado`);
    },
  });

  const saleMutation = useMutation({
    mutationFn: async ({
      method,
      amount,
    }: {
      method: PaymentMethod;
      amount: number;
    }) => {
      const sale = await salesApi.create({
        branch_id: user?.branchId ?? "",
        items: cart.items.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          discount: i.discount,
        })),
        payments: [
          {
            method,
            amount,
            change_given:
              method === "cash" ? Math.max(0, amount - cart.total) : 0,
          },
        ],
        discount: cart.discount,
        notes: cart.notes || undefined,
      });
      return sale;
    },
    onSuccess: async (sale) => {
      toast.success(`Venta ${sale.folio} registrada`);
      if (printer.isConnected) {
        await printer.printSale(sale, user?.tenantId ?? "Mi Tienda");
        if (saleMutation.variables?.method === "cash") {
          await printer.openDrawer();
        }
      }
      cart.clearCart();
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? "Error al registrar la venta";
      toast.error(msg);
    },
  });

  const isEmpty = cart.items.length === 0;
  const noSearch = !search.trim();
  const displayedProducts = noSearch
    ? defaultProducts?.data ?? []
    : results;

  return (
    <div className="h-full flex flex-col bg-slate-50 pos-no-select">
      {/* Header con búsqueda */}
      <div className="bg-white border-b p-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto space-y-3">
          <div className="flex items-center gap-3">
            <ShoppingCart className="size-6 text-indigo-600" />
            <h1 className="text-2xl font-bold">POS Atienda</h1>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar producto o escanear..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9 h-10"
                autoFocus
              />
            </div>
            <Feature flag="scale">
              <div
                className={cn(
                  "flex items-center justify-between px-4 py-2 rounded-lg text-sm font-mono font-bold min-w-fit",
                  scale.isConnected
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-muted-foreground",
                )}
              >
                <Scale className="size-4 mr-2" />
                {scale.isConnected
                  ? `${(scale.weight ?? 0).toFixed(3)} kg`
                  : "Báscula desconectada"}
              </div>
            </Feature>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex gap-4 p-4">
        {/* Área central: grid de productos */}
        <div className="flex-1 flex flex-col min-w-0">
          {searching && (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
              <Loader2 className="animate-spin mr-2" />
              Buscando...
            </div>
          )}

          {!searching && !noSearch && displayedProducts.length === 0 && (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
              Sin resultados para "{search}"
            </div>
          )}

          {!searching && noSearch && loadingProducts && (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
              <Loader2 className="animate-spin mr-2" />
              Cargando productos disponibles...
            </div>
          )}

          {!searching && noSearch && !loadingProducts && displayedProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
              <Search className="size-16 opacity-20 mb-2" />
              <p>No hay productos disponibles aún</p>
            </div>
          )}

          {displayedProducts.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 overflow-y-auto pb-4">
              {displayedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAdd={addProduct}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar derecho: carrito */}
        <div className="w-80 backdrop-blur-xl bg-slate-900/80 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Encabezado */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="text-white size-5" />
              <h2 className="font-bold text-white">Carrito</h2>
            </div>
            {!isEmpty && (
              <Badge className="bg-indigo-600 text-white">
                {cart.items.length} artículos
              </Badge>
            )}
          </div>

          {isEmpty ? (
            <div className="flex-1 flex items-center justify-center text-white/50">
              <p className="text-sm text-center">El carrito está vacío</p>
            </div>
          ) : (
            <>
              {/* Items del carrito */}
              <div className="flex-1 overflow-y-auto p-4 space-y-1">
                {cart.items.map((item) => (
                  <CartItemSidebar
                    key={item.product.id}
                    item={item}
                    onQtyChange={cart.updateQuantity}
                    onRemove={cart.removeItem}
                  />
                ))}
              </div>

              {/* Totales */}
              <div className="p-4 border-t border-white/10 space-y-2">
                <div className="flex justify-between text-sm text-white/60">
                  <span>Subtotal</span>
                  <span>{formatCurrency(cart.subtotal)}</span>
                </div>
                {cart.discount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-400">
                    <span>Descuento</span>
                    <span>-{formatCurrency(cart.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg text-white pt-2 border-t border-white/10">
                  <span>Total</span>
                  <span className="text-indigo-400">{formatCurrency(cart.total)}</span>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="p-4 space-y-3 border-t border-white/10">
                <PaymentPanel
                  total={cart.total}
                  onConfirm={(method, amount) =>
                    saleMutation.mutate({ method, amount })
                  }
                  isLoading={saleMutation.isPending}
                />
                <Button
                  variant="outline"
                  className="w-full text-white border-white/20 hover:bg-white/10"
                  onClick={cart.clearCart}
                >
                  <Trash2 className="size-4 mr-2" />
                  Vaciar carrito
                </Button>

                {/* Impresora */}
                <Feature flag="thermal_printer">
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full text-sm",
                      printer.isConnected
                        ? "text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                        : "text-white/50 border-white/10 hover:bg-white/10"
                    )}
                    onClick={
                      printer.isConnected ? printer.disconnect : printer.connect
                    }
                  >
                    <Printer className="size-4 mr-2" />
                    {printer.isConnected ? "Impresora lista" : "Impresora desconectada"}
                  </Button>
                </Feature>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
