// src/pages/pos/PosPage.tsx
// Terminal de ventas completa con:
//   - Búsqueda y escaneo de productos
//   - Grid de productos
//   - Sidebar del carrito con descuentos
//   - Cobro en efectivo y tarjeta
//   - Impresión de ticket

import { useState, useRef, useCallback, type ElementType } from "react";
import { useNavigate } from "react-router-dom";
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
  AlertTriangle,
  PackagePlus,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Feature } from "@/components/layout/Guards";
import { useCartStore } from "@/store/cart.store";
import { useAuthStore } from "@/store/auth.store";
import { useHasPermission } from "@/hooks/useAuth";
import { useBarcodeScan } from "@/hooks/useBarcodeScan";
import { useScale } from "@/hooks/useScale";
import { useThermalPrinter } from "@/hooks/useThermalPrinter";
import { productsApi, salesApi } from "@/api";
import { getProductByBarcode } from "@/lib/db";
import { formatCurrency, cn } from "@/lib/utils";
import type { CartItem, PaymentMethod, Product } from "@/types";
import ProductForm from "@/components/forms/ProductForm";

// ─── Toolbar: estado de un periférico (báscula, impresora) ──────────────────

function PeripheralPill({
  icon: Icon,
  label,
  connected,
  connecting,
  detail,
  onClick,
}: {
  icon: ElementType;
  label: string;
  connected: boolean;
  connecting?: boolean;
  detail?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={connecting}
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-60",
        connected
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100",
      )}
      title={connected ? `${label}: conectada (clic para desconectar)` : `${label}: desconectada (clic para conectar)`}
    >
      <Icon className="size-4" />
      <span className="hidden sm:inline">{label}</span>
      <span className={cn("size-1.5 rounded-full", connected ? "bg-emerald-500" : "bg-slate-300")} />
      <span className="font-mono">
        {connecting ? "Conectando…" : connected ? (detail ?? "Conectada") : "Desconectada"}
      </span>
    </button>
  );
}

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
      className="bg-white border border-slate-200 rounded-xl p-3 hover:border-indigo-300 hover:shadow-md transition-all text-left group"
    >
      <div className="mb-2 h-24 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
        <ShoppingCart className="text-slate-300 size-8" />
      </div>
      <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-indigo-600">{product.name}</p>
      <p className="text-xs text-slate-400 mb-2 truncate">
        {product.sku || product.barcode || "—"}
      </p>
      <div className="flex justify-between items-center">
        <span className="text-base font-bold text-indigo-600">{formatCurrency(product.price)}</span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
          {product.stock} {product.unit}
        </span>
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
    <div className="flex items-start gap-2 py-3 border-b border-slate-100 last:border-0 group">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{item.product.name}</p>
        <p className="text-xs text-slate-500">{formatCurrency(item.unit_price)} c/u</p>
      </div>
      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-6 text-slate-500 hover:text-slate-900 hover:bg-slate-200"
          onClick={() => onQtyChange(item.product.id, item.quantity - 1)}
        >
          <Minus className="size-3" />
        </Button>
        <span className="w-6 text-center text-xs font-mono text-slate-900 font-bold">
          {item.quantity}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 text-slate-500 hover:text-slate-900 hover:bg-slate-200"
          onClick={() => onQtyChange(item.product.id, item.quantity + 1)}
        >
          <Plus className="size-3" />
        </Button>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-emerald-600">{formatCurrency(item.subtotal)}</p>
        <Button
          variant="ghost"
          size="icon"
          className="size-5 text-red-400 hover:text-red-600 hover:bg-red-50"
          onClick={() => onRemove(item.product.id)}
        >
          <Trash2 className="size-3" />
        </Button>
      </div>
    </div>
  );
}

// ─── Acciones de cobro: Cobrar (efectivo) / Cobrar con tarjeta / Vaciar ──────

function CartFooterActions({
  total,
  isProcessing,
  onCash,
  onCard,
  onClear,
}: {
  total: number;
  isProcessing: boolean;
  onCash: (amountReceived: number) => void;
  onCard: () => void;
  onClear: () => void;
}) {
  const [cashOpen, setCashOpen] = useState(false);
  const [received, setReceived] = useState("");

  const receivedNum = parseFloat(received) || 0;
  const change = Math.max(0, receivedNum - total);

  if (cashOpen) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-slate-500">Recibido</label>
          <button
            type="button"
            className="text-xs text-slate-400 hover:text-slate-700"
            onClick={() => { setCashOpen(false); setReceived(""); }}
          >
            Cancelar
          </button>
        </div>
        <Input
          type="number"
          autoFocus
          placeholder={formatCurrency(total)}
          value={received}
          onChange={(e) => setReceived(e.target.value)}
          className="text-lg font-mono text-right bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
        />
        {receivedNum > 0 && (
          <div className="flex justify-between text-sm bg-emerald-50 rounded-lg p-2 border border-emerald-200">
            <span className="text-emerald-700">Cambio:</span>
            <span className="font-bold text-emerald-600">{formatCurrency(change)}</span>
          </div>
        )}
        <Button
          className="w-full h-12 text-base gap-2 bg-indigo-600 hover:bg-indigo-500 active:scale-[.98] transition-all"
          onClick={() => onCash(receivedNum)}
          disabled={isProcessing || receivedNum < total}
        >
          {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Confirmar cobro {formatCurrency(total)}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        className="w-full h-12 text-base gap-2 bg-indigo-600 hover:bg-indigo-500 active:scale-[.98] transition-all"
        onClick={() => setCashOpen(true)}
        disabled={isProcessing}
      >
        <Banknote className="size-4" />
        Cobrar {formatCurrency(total)}
      </Button>

      <Feature
        flag="card_payments"
        fallback={
          <Button variant="outline" disabled className="w-full gap-2 opacity-50 bg-sky-50 border-sky-100 text-sky-400">
            <CreditCard className="size-4" />
            Cobrar con tarjeta
          </Button>
        }
      >
        <Button
          variant="outline"
          className="w-full gap-2 bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100 hover:text-sky-800"
          onClick={onCard}
          disabled={isProcessing}
        >
          {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
          Cobrar con tarjeta
        </Button>
      </Feature>

      <Button
        variant="outline"
        className="w-full bg-red-50 border-red-200 text-red-600 hover:bg-red-100 hover:text-red-700"
        onClick={onClear}
        disabled={isProcessing}
      >
        <Trash2 className="size-4 mr-2" />
        Vaciar carrito
      </Button>
    </div>
  );
}

// ─── Main POS Page ───────────────────────────────────────────────────────────

export default function PosPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const cart = useCartStore();
  const scale = useScale();
  const printer = useThermalPrinter();

  const canCreateProducts = useHasPermission("products", "create");

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);

  // Código escaneado que no corresponde a ningún producto registrado
  const [notFoundBarcode, setNotFoundBarcode] = useState<string | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);

  const { data: defaultProducts, isLoading: loadingProducts } = useQuery<
    Awaited<ReturnType<typeof productsApi.list>>
  >({
    queryKey: ["pos-products"],
    queryFn: () => productsApi.list({ limit: 40, is_active: true }),
    staleTime: 1000 * 60 * 5,
  });

  const { data: lowStockProducts } = useQuery({
    queryKey: ["pos-low-stock"],
    queryFn: productsApi.getLowStock,
    staleTime: 1000 * 60 * 2,
  });
  const lowStockCount = lowStockProducts?.length ?? 0;

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
          if (canCreateProducts) {
            setNotFoundBarcode(code);
          } else {
            toast.error(`Producto no encontrado: ${code}`);
          }
          return;
        }
      }
      cart.addItem(product);
      toast.success(`${product.name} agregado`);
    },
  });

  const createProductMutation = useMutation({
    mutationFn: productsApi.create,
    onSuccess: (product) => {
      toast.success(`${product.name} registrado y agregado al carrito`);
      qc.invalidateQueries({ queryKey: ["pos-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      cart.addItem(product);
      setRegisterOpen(false);
      setNotFoundBarcode(null);
    },
    onError: () => toast.error("No se pudo registrar el producto"),
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
      qc.invalidateQueries({ queryKey: ["pos-low-stock"] });
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
      {/* Toolbar: búsqueda + periféricos + alerta de stock bajo */}
      <div className="bg-white border-b p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-64 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar producto o escanear código..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 h-10"
              autoFocus
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Feature flag="scale">
              <PeripheralPill
                icon={Scale}
                label="Báscula"
                connected={scale.isConnected}
                connecting={scale.isConnecting}
                detail={scale.isConnected ? `${(scale.weight ?? 0).toFixed(3)} kg` : undefined}
                onClick={scale.isConnected ? scale.disconnect : scale.connect}
              />
            </Feature>

            <Feature flag="thermal_printer">
              <PeripheralPill
                icon={Printer}
                label="Impresora"
                connected={printer.isConnected}
                connecting={printer.isConnecting}
                onClick={printer.isConnected ? printer.disconnect : printer.connect}
              />
            </Feature>

            {lowStockCount > 0 && (
              <button
                type="button"
                onClick={() => navigate("/app/inventory/products")}
                className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
                title="Ver productos con stock bajo"
              >
                <AlertTriangle className="size-4" />
                {lowStockCount} con stock bajo
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-y-auto lg:overflow-hidden">
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pb-4 lg:overflow-y-auto">
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
        <div className="w-full lg:w-80 lg:shrink-0 bg-white border border-slate-200 rounded-2xl shadow-lg flex flex-col lg:overflow-hidden">
          {/* Encabezado */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="text-slate-900 size-5" />
              <h2 className="font-bold text-slate-900">Carrito</h2>
              {!isEmpty && (
                <Badge className="bg-indigo-600 text-white">
                  {cart.items.length}
                </Badge>
              )}
            </div>
            {!isEmpty && (
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                onClick={cart.clearCart}
                title="Vaciar carrito"
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>

          {isEmpty ? (
            <div className="flex items-center justify-center py-12 lg:flex-1 text-slate-400">
              <p className="text-sm text-center">El carrito está vacío</p>
            </div>
          ) : (
            <>
              {/* Items del carrito */}
              <div className="p-4 space-y-1 lg:flex-1 lg:overflow-y-auto">
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
              <div className="p-4 border-t border-slate-100 space-y-2">
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Subtotal</span>
                  <span>{formatCurrency(cart.subtotal)}</span>
                </div>
                {cart.discount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Descuento</span>
                    <span>-{formatCurrency(cart.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg text-slate-900 pt-2 border-t border-slate-100">
                  <span>Total</span>
                  <span className="text-indigo-600">{formatCurrency(cart.total)}</span>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="p-4 border-t border-slate-100">
                <CartFooterActions
                  total={cart.total}
                  isProcessing={saleMutation.isPending}
                  onCash={(amount) => saleMutation.mutate({ method: "cash", amount })}
                  onCard={() => saleMutation.mutate({ method: "card", amount: cart.total })}
                  onClear={cart.clearCart}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Código escaneado sin producto: ofrecer registrarlo */}
      <Dialog
        open={!!notFoundBarcode && !registerOpen}
        onOpenChange={(o) => { if (!o) setNotFoundBarcode(null); }}
      >
        <DialogContent className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 max-w-md w-full space-y-6">
          <DialogHeader>
            <DialogTitle>Producto no encontrado</DialogTitle>
            <DialogDescription className="text-sm font-normal text-gray-500 leading-relaxed">
              No hay ningún producto con el código{" "}
              <span className="font-mono font-semibold text-gray-700">{notFoundBarcode}</span>.
              ¿Quieres registrarlo ahora para poder venderlo?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 w-full">
            <button
              type="button"
              className="flex-1 py-3 px-4 bg-white border border-gray-200 text-sm font-bold text-gray-700 rounded-xl transition-all hover:bg-gray-50 active:bg-gray-100 outline-none"
              onClick={() => setNotFoundBarcode(null)}
            >
              Ahora no
            </button>
            <button
              type="button"
              className="flex-1 py-3 px-4 bg-blue-600 text-sm font-bold text-white rounded-xl transition-all shadow-md shadow-blue-600/10 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 active:scale-[0.98] outline-none flex items-center justify-center gap-2"
              onClick={() => setRegisterOpen(true)}
            >
              <PackagePlus className="size-4" />
              Registrarlo ahora
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Registro rápido del producto escaneado */}
      <Dialog
        open={registerOpen}
        onOpenChange={(o) => { if (!o) { setRegisterOpen(false); setNotFoundBarcode(null); } }}
      >
        <DialogContent className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 max-w-xl w-full space-y-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 tracking-tight">Nuevo producto</DialogTitle>
          </DialogHeader>
          <ProductForm
            defaultValues={{ barcode: notFoundBarcode ?? "" }}
            onSubmit={(data) => createProductMutation.mutate(data)}
            isLoading={createProductMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
