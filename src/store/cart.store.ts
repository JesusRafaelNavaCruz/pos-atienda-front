// src/store/cart.store.ts
import { create } from 'zustand'
import type { CartItem, Customer, Product } from '@/types'

// Resultado de intentar agregar/ajustar cantidad: permite que quien llame
// (POS) muestre una alerta cuando el stock disponible no alcanza. Aplica por
// igual a productos por pieza y a granel (kg/g/lt/ml) — estos últimos solo
// admiten cantidades fraccionarias, pero también tienen tope de stock.
export interface AddItemResult {
  requested: number
  added: number
  limitedByStock: boolean
  availableStock: number
}

export interface UpdateQuantityResult {
  ok: boolean
  clampedTo: number | null // cantidad real aplicada cuando se limitó por stock
}

interface CartState {
  items: CartItem[]
  customer: Customer | null
  discount: number       // descuento global en pesos
  notes: string

  // Totales calculados
  subtotal: number
  total: number

  // Acciones
  addItem: (product: Product, quantity?: number) => AddItemResult
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => UpdateQuantityResult
  updateItemDiscount: (productId: string, discount: number) => void
  setCustomer: (customer: Customer | null) => void
  setDiscount: (discount: number) => void
  setNotes: (notes: string) => void
  clearCart: () => void
}

function calculateSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.subtotal, 0)
}

// Redondea a gramos/mililitros (3 decimales) para no arrastrar ruido de
// punto flotante (24 - 0.5 - 0.5 ... puede acabar en 22.999999999999996).
function roundQty(n: number): number {
  return Math.round(n * 1000) / 1000
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customer: null,
  discount: 0,
  notes: '',
  subtotal: 0,
  total: 0,

  addItem: (product, quantity = 1) => {
    const { items } = get()
    const existing = items.find((i) => i.product.id === product.id)
    const currentQty = existing?.quantity ?? 0
    const stock = roundQty(Number(product.stock))

    // Cuánto de lo pedido cabe realmente dado lo que ya hay en el carrito.
    const addable = Math.max(0, roundQty(Math.min(quantity, stock - currentQty)))

    if (addable <= 0) {
      return { requested: quantity, added: 0, limitedByStock: true, availableStock: stock }
    }

    let newItems: CartItem[]

    if (existing) {
      // Si ya existe, incrementar cantidad (y refrescar el snapshot del producto)
      newItems = items.map((item) => {
        if (item.product.id !== product.id) return item
        const newQty = roundQty(item.quantity + addable)
        return {
          ...item,
          product,
          quantity: newQty,
          subtotal: newQty * item.unit_price - item.discount,
        }
      })
    } else {
      const newItem: CartItem = {
        product,
        quantity: addable,
        unit_price: Number(product.price),
        discount: 0,
        subtotal: addable * Number(product.price),
      }
      newItems = [...items, newItem]
    }

    const subtotal = calculateSubtotal(newItems)
    set({ items: newItems, subtotal, total: subtotal - get().discount })

    return {
      requested: quantity,
      added: addable,
      limitedByStock: addable < quantity,
      availableStock: stock,
    }
  },

  removeItem: (productId) => {
    const newItems = get().items.filter((i) => i.product.id !== productId)
    const subtotal = calculateSubtotal(newItems)
    set({ items: newItems, subtotal, total: subtotal - get().discount })
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId)
      return { ok: true, clampedTo: null }
    }

    const items = get().items
    const existing = items.find((i) => i.product.id === productId)
    if (!existing) return { ok: true, clampedTo: null }

    const stock = roundQty(Number(existing.product.stock))
    const requested = roundQty(quantity)
    const finalQty = Math.min(requested, stock)
    const clamped = finalQty < requested

    const newItems = items.map((item) => {
      if (item.product.id !== productId) return item
      return {
        ...item,
        quantity: finalQty,
        subtotal: finalQty * item.unit_price - item.discount,
      }
    })
    const subtotal = calculateSubtotal(newItems)
    set({ items: newItems, subtotal, total: subtotal - get().discount })

    return { ok: !clamped, clampedTo: clamped ? finalQty : null }
  },

  updateItemDiscount: (productId, discount) => {
    const newItems = get().items.map((item) => {
      if (item.product.id !== productId) return item
      return {
        ...item,
        discount,
        subtotal: item.quantity * item.unit_price - discount,
      }
    })
    const subtotal = calculateSubtotal(newItems)
    set({ items: newItems, subtotal, total: subtotal - get().discount })
  },

  setCustomer: (customer) => set({ customer }),

  setDiscount: (discount) => {
    const { subtotal } = get()
    set({ discount, total: subtotal - discount })
  },

  setNotes: (notes) => set({ notes }),

  clearCart: () =>
    set({ items: [], customer: null, discount: 0, notes: '', subtotal: 0, total: 0 }),
}))
