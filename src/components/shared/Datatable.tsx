// src/components/shared/DataTable.tsx
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { PaginationMeta } from '@/types'

interface Column<T> {
  key: string
  header: string
  cell: (row: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[] | undefined
  meta: PaginationMeta | undefined
  isLoading: boolean
  page: number
  onPageChange: (page: number) => void
  emptyMessage?: string
  onRowClick?: (row: T) => void
}

export function DataTable<T>({
  columns, data, meta, isLoading, page, onPageChange, emptyMessage = 'Sin resultados', onRowClick,
}: DataTableProps<T>) {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-linear-to-r from-slate-50 to-slate-100 border-b border-slate-200">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn('p-4 font-semibold text-slate-700 text-left', col.className)}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className="p-4">
                      <Skeleton className="h-5 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : !data || data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="h-32 text-center text-slate-500 p-4">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={i}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'transition-colors hover:bg-indigo-50/30',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn('p-4', col.className)}>
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between px-2 py-3 bg-linear-to-r from-slate-50 to-slate-100/50 rounded-lg border border-slate-200">
          <p className="text-xs text-slate-600 font-medium">
            Mostrando{' '}
            <span className="font-bold text-slate-900">
              {(page - 1) * meta.limit + 1}–{Math.min(page * meta.limit, meta.total)}
            </span>{' '}
            de <span className="font-bold text-slate-900">{meta.total}</span>
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="border-slate-200 hover:bg-slate-100 gap-1"
            >
              <ChevronLeft className="size-4" /> Anterior
            </Button>
            <span className="text-sm text-slate-600 px-3 font-medium">
              <span className="font-bold text-slate-900">{page}</span> / {meta.totalPages}
            </span>
            <Button
              variant="outline" size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= meta.totalPages}
              className="border-slate-200 hover:bg-slate-100 gap-1"
            >
              Siguiente <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
