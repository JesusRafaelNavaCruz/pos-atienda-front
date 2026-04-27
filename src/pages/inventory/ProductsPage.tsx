// src/pages/inventory/ProductsPage.tsx
import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Upload, AlertTriangle, Package, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Can, Feature } from '@/components/layout/Guards'
import { productsApi } from '@/api'
import { formatCurrency, cn } from '@/lib/utils'
import { DataTable } from '@/components/shared/Datatable'
import type { Product } from '@/types'

const UNIT_LABELS: Record<string, string> = {
  pza: 'pieza', kg: 'kg', g: 'g', lt: 'litro',
  ml: 'ml', caja: 'caja', paq: 'paquete', rollo: 'rollo', par: 'par',
}

function StockBadge({ product }: { product: Product }) {
  const isLow = product.stock <= product.min_stock
  return (
    <Badge className={cn(
      'text-xs px-2.5 py-1',
      isLow
        ? 'bg-red-500/20 text-red-700 border-red-500/30'
        : 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30'
    )}>
      {isLow && <AlertTriangle className="size-3 mr-1" />}
      {product.stock} {UNIT_LABELS[product.unit] ?? product.unit}
    </Badge>
  )
}

export default function ProductsPage() {
  const qc = useQueryClient()
  const [search, setSearch]   = useState('')
  const [page, setPage]       = useState(1)
  const [lowStock, setLowStock] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['products', { search, page, lowStock }],
    queryFn:  () => productsApi.list({ search, page, limit: 20, low_stock: lowStock || undefined }),
  })

  const importMutation = useMutation({
    mutationFn: (file: File) => productsApi.importCsv(file),
    onSuccess: (result) => {
      toast.success(result.message)
      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} filas con errores`)
      }
      qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: () => toast.error('Error al importar CSV'),
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) importMutation.mutate(file)
    e.target.value = ''
  }

  const columns = [
    {
      key: 'name',
      header: 'Producto',
      cell: (row: Product) => (
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center">
            <Package className="size-5 text-indigo-600" />
          </div>
          <span className="font-semibold text-slate-900">{row.name}</span>
        </div>
      ),
    },
    {
      key: 'barcode',
      header: 'Código',
      cell: (row: Product) => (
        <span className="font-mono text-xs text-slate-500">{row.barcode ?? '—'}</span>
      ),
    },
    {
      key: 'category',
      header: 'Categoría',
      cell: (row: Product) => (
        row.category ? (
          <Badge className="text-xs border-indigo-200 text-indigo-700 bg-indigo-50">
            {row.category.name}
          </Badge>
        ) : (
          <span className="text-slate-400">—</span>
        )
      ),
    },
    {
      key: 'price',
      header: 'Precio',
      cell: (row: Product) => (
        <span className="font-bold text-indigo-600">{formatCurrency(row.price)}</span>
      ),
      className: 'text-right',
    },
    {
      key: 'cost',
      header: 'Costo',
      cell: (row: Product) => (
        <span className="text-slate-600">{formatCurrency(row.cost)}</span>
      ),
      className: 'text-right',
    },
    {
      key: 'stock',
      header: 'Stock',
      cell: (row: Product) => <StockBadge product={row} />,
      className: 'text-center',
    },
    {
      key: 'status',
      header: 'Estado',
      cell: (row: Product) => (
        <Badge className={cn(
          'text-xs px-2.5 py-1',
          row.is_active
            ? 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30'
            : 'bg-slate-500/20 text-slate-700 border-slate-500/30'
        )}>
          {row.is_active ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Inventario</h1>
          <p className="text-sm text-slate-600 mt-1">
            {data?.meta.total ?? 0} productos registrados
          </p>
        </div>
        <div className="flex gap-2">
          <Feature flag="csv_import">
            <Button
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={importMutation.isPending}
              className="bg-blue-600 hover:bg-blue-500 text-white gap-2"
            >
              {importMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Importar CSV
            </Button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
          </Feature>
          <Can resource="products" action="create">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2">
              <Plus className="size-4" />
              Nuevo producto
            </Button>
          </Can>
        </div>
      </div>

      {/* Filtros */}
      <div className="backdrop-blur-xl bg-white/80 border border-white/50 rounded-xl p-4 shadow-lg">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              placeholder="Buscar por nombre o código..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-9 bg-slate-50 border-slate-200 focus:bg-white"
            />
          </div>
          <Button
            variant={lowStock ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setLowStock(!lowStock); setPage(1) }}
            className={cn(
              'gap-2',
              lowStock
                ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
                : 'border-slate-200 hover:bg-slate-50'
            )}
          >
            <AlertTriangle className="size-4" />
            Stock bajo
          </Button>
        </div>
      </div>

      {/* Tabla */}
      <DataTable
        columns={columns}
        data={data?.data}
        meta={data?.meta}
        isLoading={isLoading}
        page={page}
        onPageChange={setPage}
        emptyMessage="No hay productos que mostrar"
      />
    </div>
  )
}
