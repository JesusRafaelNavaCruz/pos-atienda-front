// src/pages/pos/PosPage.tsx
// Terminal de ventas completa con:
//   - Búsqueda y escaneo de productos
//   - Integración con báscula (productos por peso)
//   - Carrito con descuentos por ítem
//   - Cobro en efectivo y tarjeta
//   - Impresión de ticket

import { useState, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/badge";
import { Feature } from "@/components/layout/Guards";
import { useCartStore } from "@/store/cart.store";
import { useAuthStore } from "@/store/auth.store";
import { useBarcodeScan } from "@/hooks/useBarcodeScan";
import { useScale } from "@/hooks/useScale";
import { useThermalPrinter } from "@/hooks/useThermalPrinter";
import { productsApi, salesApi } from "@/api";
import { getProductByBarcode } from "@/lib/db";
import { formatCurrency, cn } from "@/lib/utils";
import type { CartItem, PaymentMethod } from "@/types";

// ─── Componente de ítem del carrito ──────────────────────────────────────────

function CartItemRow({
  item,
  onQtyChange,
  onRemove,
}: {
  item: CartItem;
  onQtyChange: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 py-2 border-b last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.product.name}</p>
        <p className="text-xs text-muted-foreground">
          {formatCurrency(item.unit_price)} c/u
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="size-7"
          onClick={() => onQtyChange(item.product.id, item.quantity - 1)}
        >
          <Minus className="size-3" />
        </Button>
        <span className="w-10 text-center text-sm font-mono">
          {item.quantity}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="size-7"
          onClick={() => onQtyChange(item.product.id, item.quantity + 1)}
        >
          <Plus className="size-3" />
        </Button>
      </div>
      <span className="w-24 text-right text-sm font-semibold">
        {formatCurrency(item.subtotal)}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="size-7 text-destructive hover:text-destructive"
        onClick={() => onRemove(item.product.id)}
      >
        <Trash2 className="size-3" />
      </Button>
    </div>
  );
}

// ─── Panel de cobro ──────────────────────────────────────────────────────────

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
          className="gap-2"
        >
          <Banknote className="size-4" />
          Efectivo
        </Button>
        <Feature
          flag="card_payments"
          fallback={
            <Button variant="outline" disabled className="gap-2 opacity-50">
              <CreditCard className="size-4" />
              Tarjeta
            </Button>
          }
        >
          <Button
            variant={method === "card" ? "default" : "outline"}
            onClick={() => setMethod("card")}
            className="gap-2"
          >
            <CreditCard className="size-4" />
            Tarjeta
          </Button>
        </Feature>
      </div>

      {/* Monto recibido (solo efectivo) */}
      {method === "cash" && (
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">
            Recibido
          </label>
          <Input
            type="number"
            placeholder={formatCurrency(total)}
            value={received}
            onChange={(e) => setReceived(e.target.value)}
            className="text-lg font-mono text-right"
          />
          {change > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cambio:</span>
              <span className="font-bold text-green-600">
                {formatCurrency(change)}
              </span>
            </div>
          )}
        </div>
      )}

      <Button
        className="w-full h-12 text-base gap-2"
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

// ─── Página principal del POS ─────────────────────────────────────────────────

export default function PosPage() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const cart = useCartStore();
  const scale = useScale();
  const printer = useThermalPrinter();

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<
    (typeof import("@/types").Product)[] | []
  >([]);
  const [searching, setSearching] = useState(false);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Buscar producto por texto
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
        const { data } = await productsApi.list({ search: value, limit: 8 });
        setResults(data);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  // Agregar producto al carrito
  const addProduct = useCallback(
    async (product: (typeof results)[number]) => {
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

  // Manejar escaneo de código de barras
  useBarcodeScan({
    onScan: async (code) => {
      // Primero intentar desde caché offline
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

  // Crear venta
  const saleMutation = useMutation({
    mutationFn: async ({
      method,
      amount,
    }: {
      method: PaymentMethod;
      amount: number;
    }) => {
      const sale = await salesApi.create({
        branch_id: user!.branch?.id ?? "",
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
      // Imprimir ticket si la impresora está conectada
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

  return (
    <div className="h-full flex pos-no-select">
      {/* Panel izquierdo: búsqueda + resultados */}
      <div className="w-80 border-r flex flex-col bg-muted/20">
        <div className="p-3 border-b space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar producto o escanear..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>

          {/* Báscula */}
          <Feature flag="scale">
            <div
              className={cn(
                "flex items-center justify-between px-3 py-2 rounded-md text-sm",
                scale.isConnected
                  ? "bg-green-50 text-green-700"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <div className="flex items-center gap-2">
                <Scale className="size-4" />
                {scale.isConnected ? (
                  <span className="font-mono font-bold">
                    {(scale.weight ?? 0).toFixed(3)} kg
                  </span>
                ) : (
                  <span>Báscula desconectada</span>
                )}
              </div>
              {!scale.isConnected && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={scale.connect}
                >
                  Conectar
                </Button>
              )}
            </div>
          </Feature>
        </div>

        {/* Resultados de búsqueda */}
        <div className="flex-1 overflow-y-auto">
          {searching && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Buscando...
            </div>
          )}
          {results.map((product) => (
            <button
              key={product.id}
              onClick={() => addProduct(product)}
              className="w-full flex items-center gap-3 p-3 border-b hover:bg-background transition-colors text-left"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{product.name}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {product.barcode ?? product.sku ?? "—"}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold">
                  {formatCurrency(product.price)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Stock: {product.stock} {product.unit}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Panel central: carrito */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-3 border-b flex items-center justify-between">
          <h2 className="font-semibold">Carrito</h2>
          {!isEmpty && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={cart.clearCart}
            >
              <Trash2 className="size-4" />
              Vaciar
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
              <Search className="size-12 opacity-20" />
              <p className="text-sm">Escanea o busca un producto</p>
            </div>
          ) : (
            cart.items.map((item) => (
              <CartItemRow
                key={item.product.id}
                item={item}
                onQtyChange={cart.updateQuantity}
                onRemove={cart.removeItem}
              />
            ))
          )}
        </div>

        {/* Totales */}
        {!isEmpty && (
          <div className="border-t p-3 space-y-1 bg-muted/20">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(cart.subtotal)}</span>
            </div>
            {cart.discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Descuento</span>
                <span>-{formatCurrency(cart.discount)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{formatCurrency(cart.total)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Panel derecho: cobro + hardware */}
      <div className="w-72 border-l flex flex-col">
        <div className="p-3 border-b flex items-center justify-between">
          <h2 className="font-semibold">Cobro</h2>
          {/* Impresora */}
          <Feature flag="thermal_printer">
            <Button
              variant="ghost"
              size="sm"
              onClick={
                printer.isConnected ? printer.disconnect : printer.connect
              }
              className={cn(
                printer.isConnected
                  ? "text-green-600"
                  : "text-muted-foreground",
              )}
            >
              <Printer className="size-4" />
            </Button>
          </Feature>
        </div>

        <div className="flex-1 p-3">
          {isEmpty ? (
            <p className="text-sm text-muted-foreground text-center mt-8">
              Agrega productos al carrito para cobrar
            </p>
          ) : (
            <PaymentPanel
              total={cart.total}
              onConfirm={(method, amount) =>
                saleMutation.mutate({ method, amount })
              }
              isLoading={saleMutation.isPending}
            />
          )}
        </div>

        {/* Items count badge */}
        {!isEmpty && (
          <div className="p-3 border-t">
            <p className="text-xs text-center text-muted-foreground">
              {cart.items.length} artículo(s) ·{" "}
              {cart.items.reduce((s, i) => s + i.quantity, 0)} unidades
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
