// src/pages/inventory/ProductsPage.tsx
import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Upload, AlertTriangle, Package } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Can, Feature } from '@/components/layout/Guards'
import { productsApi } from '@/api'
import { formatCurrency } from '@/lib/utils'
import type { Product } from '@/types'

const UNIT_LABELS: Record<string, string> = {
  pza: 'pieza', kg: 'kg', g: 'g', lt: 'litro',
  ml: 'ml', caja: 'caja', paq: 'paquete', rollo: 'rollo', par: 'par',
}

function StockBadge({ product }: { product: Product }) {
  const isLow = product.stock <= product.min_stock
  return (
    <Badge variant={isLow ? 'warning' : 'secondary'} className="font-mono">
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

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventario</h1>
          <p className="text-sm text-muted-foreground">
            {data?.meta.total ?? 0} productos registrados
          </p>
        </div>
        <div className="flex gap-2">
          <Feature flag="csv_import">
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}
              disabled={importMutation.isPending}>
              <Upload className="size-4" />
              Importar CSV
            </Button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
          </Feature>
          <Can resource="products" action="create">
            <Button size="sm">
              <Plus className="size-4" />
              Nuevo producto
            </Button>
          </Can>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o código..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-9"
          />
        </div>
        <Button
          variant={lowStock ? 'default' : 'outline'}
          size="sm"
          onClick={() => { setLowStock(!lowStock); setPage(1) }}
        >
          <AlertTriangle className="size-4" />
          Stock bajo
        </Button>
      </div>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left p-3 font-medium text-muted-foreground">Producto</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Código</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Categoría</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Precio</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Costo</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Stock</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Estado</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? [...Array(8)].map((_, i) => (
                      <tr key={i} className="border-b">
                        {[...Array(7)].map((_, j) => (
                          <td key={j} className="p-3"><Skeleton className="h-5 w-full" /></td>
                        ))}
                      </tr>
                    ))
                  : (data?.data ?? []).map((product) => (
                      <tr key={product.id} className="border-b hover:bg-muted/20 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="size-8 rounded bg-muted flex items-center justify-center">
                              <Package className="size-4 text-muted-foreground" />
                            </div>
                            <span className="font-medium">{product.name}</span>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-xs text-muted-foreground">
                          {product.barcode ?? '—'}
                        </td>
                        <td className="p-3">
                          {product.category ? (
                            <Badge variant="outline" className="text-xs">
                              {product.category.name}
                            </Badge>
                          ) : '—'}
                        </td>
                        <td className="p-3 text-right font-semibold">
                          {formatCurrency(product.price)}
                        </td>
                        <td className="p-3 text-right text-muted-foreground">
                          {formatCurrency(product.cost)}
                        </td>
                        <td className="p-3 text-center">
                          <StockBadge product={product} />
                        </td>
                        <td className="p-3 text-center">
                          <Badge variant={product.is_active ? 'success' : 'secondary'}>
                            {product.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {data && data.meta.totalPages > 1 && (
            <div className="flex items-center justify-between p-3 border-t">
              <p className="text-xs text-muted-foreground">
                Página {data.meta.page} de {data.meta.totalPages} · {data.meta.total} productos
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                  Anterior
                </Button>
                <Button variant="outline" size="sm" disabled={page >= data.meta.totalPages} onClick={() => setPage(page + 1)}>
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
