import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Search, Printer, Scale, Package, AlertCircle,
  CheckSquare, Square, Minus, Plus, X, Barcode,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { productsApi } from '@/api'
import { cn } from '@/lib/utils'
import type { BarcodeProduct } from '@/types'
import JsBarcode from 'jsbarcode'

const BULK_UNITS = new Set(['kg', 'g', 'lt', 'ml'])
const isBulk = (p: BarcodeProduct) => p.sold_by_weight || BULK_UNITS.has(p.unit)

// ── Barcode SVG renderer ───────────────────────────────────────────────────────
function BarcodeSvg({ value, height = 50 }: { value: string; height?: number }) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current) return
    try {
      JsBarcode(svgRef.current, value, {
        format: 'CODE128',
        width: 1.5,
        height,
        displayValue: true,
        fontSize: 10,
        margin: 5,
        lineColor: '#1e293b',
        background: '#ffffff',
      })
    } catch {
      // barcode value incompatible with CODE128
    }
  }, [value, height])

  return <svg ref={svgRef} className="w-full max-w-full" />
}

// ── Product selection card ─────────────────────────────────────────────────────
function ProductCard({
  product,
  selected,
  onToggle,
}: {
  product: BarcodeProduct
  selected: boolean
  onToggle: () => void
}) {
  const hasBarcode = !!product.barcode

  return (
    <div
      onClick={hasBarcode ? onToggle : undefined}
      className={cn(
        'relative rounded-xl border-2 p-4 transition-all select-none',
        hasBarcode ? 'cursor-pointer' : 'cursor-default opacity-55',
        selected
          ? 'border-indigo-500 bg-indigo-50 shadow-md shadow-indigo-100'
          : hasBarcode
          ? 'border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm'
          : 'border-slate-100 bg-slate-50',
      )}
    >
      {/* Selection indicator */}
      <div className="absolute top-3 right-3">
        {hasBarcode ? (
          selected ? (
            <CheckSquare className="size-5 text-indigo-600" />
          ) : (
            <Square className="size-5 text-slate-300" />
          )
        ) : (
          <AlertCircle className="size-4 text-slate-300" />
        )}
      </div>

      {/* Product header */}
      <div className="flex items-start gap-2 mb-3 pr-6">
        <div className="size-8 rounded-lg bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center shrink-0">
          {isBulk(product) ? (
            <Scale className="size-4 text-indigo-600" />
          ) : (
            <Package className="size-4 text-indigo-600" />
          )}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-slate-900 text-sm leading-tight line-clamp-2">
            {product.name}
          </p>
          <p className="font-mono text-xs text-slate-400 mt-0.5 truncate">
            {product.barcode ?? 'Sin código'}
          </p>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1 mb-3">
        {isBulk(product) && (
          <Badge className="text-xs bg-amber-50 text-amber-700 border-amber-200">
            <Scale className="size-3 mr-1" />
            A granel
          </Badge>
        )}
        {!hasBarcode && (
          <Badge className="text-xs bg-red-50 text-red-700 border-red-200">
            <AlertCircle className="size-3 mr-1" />
            Sin código
          </Badge>
        )}
      </div>

      {/* Barcode preview */}
      <div className="rounded-lg bg-white border border-slate-100 p-2 flex items-center justify-center min-h-16">
        {hasBarcode ? (
          <BarcodeSvg value={product.barcode!} height={45} />
        ) : (
          <p className="text-xs text-slate-400 text-center">
            Asigna un código en Inventario
          </p>
        )}
      </div>
    </div>
  )
}

// ── Print preview dialog ───────────────────────────────────────────────────────
function PrintDialog({
  open,
  onClose,
  products,
  copies,
  onCopiesChange,
  onPrint,
}: {
  open: boolean
  onClose: () => void
  products: BarcodeProduct[]
  copies: Record<string, number>
  onCopiesChange: (id: string, value: number) => void
  onPrint: () => void
}) {
  const totalLabels = products.reduce((sum, p) => sum + (copies[p.id] ?? 1), 0)

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 max-w-2xl w-full max-h-[80vh] flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">
            Vista previa de impresión
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-slate-500 -mt-2">
          Ajusta las copias por producto y confirma para imprimir.
        </p>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {products.map((product) => (
            <div
              key={product.id}
              className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-100"
            >
              {/* Barcode preview */}
              <div className="w-28 shrink-0 bg-white rounded-lg border border-slate-100 p-1">
                {product.barcode && <BarcodeSvg value={product.barcode} height={38} />}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 text-sm truncate">{product.name}</p>
                <p className="font-mono text-xs text-slate-400">{product.barcode}</p>
                {isBulk(product) && (
                  <Badge className="text-xs bg-amber-50 text-amber-700 border-amber-200 mt-1">
                    A granel
                  </Badge>
                )}
              </div>

              {/* Copies counter */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-slate-500 hidden sm:block">Copias</span>
                <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden">
                  <button
                    onClick={() => onCopiesChange(product.id, Math.max(1, (copies[product.id] ?? 1) - 1))}
                    className="px-2 py-1.5 hover:bg-slate-50 transition-colors"
                  >
                    <Minus className="size-3 text-slate-500" />
                  </button>
                  <span className="w-8 text-center font-semibold text-slate-900 text-sm py-1">
                    {copies[product.id] ?? 1}
                  </span>
                  <button
                    onClick={() => onCopiesChange(product.id, Math.min(99, (copies[product.id] ?? 1) + 1))}
                    className="px-2 py-1.5 hover:bg-slate-50 transition-colors"
                  >
                    <Plus className="size-3 text-slate-500" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <p className="text-sm text-slate-500">
            <span className="font-semibold text-slate-900">{totalLabels}</span>{' '}
            {totalLabels === 1 ? 'etiqueta' : 'etiquetas'} en total
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={onPrint}
              className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
            >
              <Printer className="size-4" />
              Imprimir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Print window generator ─────────────────────────────────────────────────────
function buildPrintHtml(products: BarcodeProduct[], copies: Record<string, number>): string {
  const escHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const labels = products
    .flatMap((product) => {
      const n = copies[product.id] ?? 1
      let svgHtml = ''
      if (product.barcode) {
        const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        try {
          JsBarcode(tempSvg as unknown as HTMLElement, product.barcode, {
            format: 'CODE128',
            width: 2,
            height: 60,
            displayValue: true,
            fontSize: 11,
            margin: 8,
            lineColor: '#000',
            background: '#fff',
          })
          svgHtml = tempSvg.outerHTML
        } catch {
          svgHtml = ''
        }
      }
      return Array.from(
        { length: n },
        () => `<div class="label">
          <div class="label-name">${escHtml(product.name)}</div>
          ${svgHtml || '<div class="no-code">Sin código de barras</div>'}
        </div>`,
      )
    })
    .join('')

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Etiquetas de códigos de barras</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: #fff; }
    .grid { display: flex; flex-wrap: wrap; gap: 10px; padding: 10px; }
    .label {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px;
      text-align: center;
      width: 200px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .label-name {
      font-size: 11px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 6px;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .no-code { font-size: 10px; color: #94a3b8; padding: 16px 0; }
    svg { width: 100%; height: auto; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="grid">${labels}</div>
  <script>window.onload = function () { setTimeout(function () { window.print(); }, 200); };</script>
</body>
</html>`
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function BarcodesPage() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [copies, setCopies] = useState<Record<string, number>>({})
  const [showBulkOnly, setShowBulkOnly] = useState(false)
  const [printOpen, setPrintOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['products-barcodes', { search }],
    queryFn: () => productsApi.getBarcodes({ search: search || undefined }),
  })

  // Sort: a granel first, then alphabetically
  const sorted = [...(data?.data ?? [])].sort((a, b) => {
    if (isBulk(a) !== isBulk(b)) return isBulk(a) ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  const products = showBulkOnly ? sorted.filter(isBulk) : sorted
  const selectableProducts = products.filter((p) => !!p.barcode)
  const selectedProducts = sorted.filter((p) => selected.has(p.id))
  const bulkCount = sorted.filter(isBulk).length

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const selectAll = () => setSelected(new Set(selectableProducts.map((p) => p.id)))
  const clearAll = () => setSelected(new Set())

  const setCopiesFor = (id: string, value: number) =>
    setCopies((prev) => ({ ...prev, [id]: value }))

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (!printWindow) {
      toast.error('El navegador bloqueó la ventana emergente. Permite las ventanas emergentes para imprimir.')
      return
    }
    printWindow.document.write(buildPrintHtml(selectedProducts, copies))
    printWindow.document.close()
    setPrintOpen(false)
  }

  return (
    <div className="p-6 space-y-6 pb-28">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Códigos de barras</h1>
          <p className="text-sm text-slate-600 mt-1">
            Selecciona los productos e imprime sus etiquetas
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="backdrop-blur-xl bg-white/80 border border-white/50 rounded-xl p-4 shadow-lg">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              placeholder="Buscar producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-200 focus:bg-white"
            />
          </div>
          <Button
            variant={showBulkOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowBulkOnly(!showBulkOnly)}
            className={cn(
              'gap-2',
              showBulkOnly
                ? 'bg-amber-500 hover:bg-amber-400 text-white'
                : 'border-slate-200 hover:bg-slate-50',
            )}
          >
            <Scale className="size-4" />
            A granel
            {bulkCount > 0 && (
              <span className={cn(
                'text-xs rounded-full px-1.5 py-0.5 font-semibold',
                showBulkOnly ? 'bg-amber-400/50' : 'bg-slate-100 text-slate-600'
              )}>
                {bulkCount}
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={selectAll}
            disabled={selectableProducts.length === 0}
            className="border-slate-200 text-slate-600"
          >
            Seleccionar todos
          </Button>
          {selected.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAll}
              className="border-slate-200 text-slate-600 gap-1"
            >
              <X className="size-3" />
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Product grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-52 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Barcode className="size-10 mb-3" />
          <p className="font-medium text-slate-600">Sin resultados</p>
          <p className="text-sm mt-1">Prueba con otro término de búsqueda</p>
        </div>
      ) : (
        <>
          {/* A granel section header (only when not filtered) */}
          {!showBulkOnly && sorted.some((p) => p.sold_by_weight) && (
            <div className="flex items-center gap-3">
              <Scale className="size-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-700">Productos a granel</span>
              <div className="flex-1 h-px bg-amber-100" />
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.map((product, idx) => {
              // Insert divider before first non-bulk product (only when unfiltered)
              const prevIsBulk = idx > 0 && products[idx - 1].sold_by_weight
              const isFirstNonBulk = !showBulkOnly && prevIsBulk && !product.sold_by_weight
              return (
                <div key={product.id} className={cn('contents')}>
                  {isFirstNonBulk && (
                    <div className="col-span-full flex items-center gap-3 mt-2">
                      <Package className="size-4 text-slate-400" />
                      <span className="text-sm font-semibold text-slate-500">Otros productos</span>
                      <div className="flex-1 h-px bg-slate-100" />
                    </div>
                  )}
                  <ProductCard
                    product={product}
                    selected={selected.has(product.id)}
                    onToggle={() => toggleSelect(product.id)}
                  />
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Sticky selection bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-4 bg-slate-900 text-white rounded-2xl px-5 py-3 shadow-2xl shadow-slate-900/30 whitespace-nowrap">
            <div className="flex items-center gap-2">
              <div className="size-6 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold shrink-0">
                {selected.size}
              </div>
              <span className="text-sm font-medium">
                {selected.size === 1 ? 'producto seleccionado' : 'productos seleccionados'}
              </span>
            </div>
            <div className="w-px h-5 bg-slate-700" />
            <Button
              onClick={clearAll}
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white hover:bg-slate-800 gap-1 px-2"
            >
              <X className="size-4" />
              Limpiar
            </Button>
            <Button
              onClick={() => setPrintOpen(true)}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
            >
              <Printer className="size-4" />
              Imprimir etiquetas
            </Button>
          </div>
        </div>
      )}

      {/* Print preview dialog */}
      <PrintDialog
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        products={selectedProducts}
        copies={copies}
        onCopiesChange={setCopiesFor}
        onPrint={handlePrint}
      />
    </div>
  )
}
