// src/store/cart.store.ts
import { create } from 'zustand'
import type { CartItem, Customer, Product } from '@/types'

interface CartState {
  items: CartItem[]
  customer: Customer | null
  discount: number       // descuento global en pesos
  notes: string

  // Totales calculados
  subtotal: number
  total: number

  // Acciones
  addItem: (product: Product, quantity?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  updateItemDiscount: (productId: string, discount: number) => void
  setCustomer: (customer: Customer | null) => void
  setDiscount: (discount: number) => void
  setNotes: (notes: string) => void
  clearCart: () => void
}

function calculateSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.subtotal, 0)
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

    let newItems: CartItem[]

    if (existing) {
      // Si ya existe, incrementar cantidad
      newItems = items.map((item) => {
        if (item.product.id !== product.id) return item
        const newQty = item.quantity + quantity
        return {
          ...item,
          quantity: newQty,
          subtotal: newQty * item.unit_price - item.discount,
        }
      })
    } else {
      const newItem: CartItem = {
        product,
        quantity,
        unit_price: Number(product.price),
        discount: 0,
        subtotal: quantity * Number(product.price),
      }
      newItems = [...items, newItem]
    }

    const subtotal = calculateSubtotal(newItems)
    set({ items: newItems, subtotal, total: subtotal - get().discount })
  },

  removeItem: (productId) => {
    const newItems = get().items.filter((i) => i.product.id !== productId)
    const subtotal = calculateSubtotal(newItems)
    set({ items: newItems, subtotal, total: subtotal - get().discount })
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId)
      return
    }
    const newItems = get().items.map((item) => {
      if (item.product.id !== productId) return item
      return {
        ...item,
        quantity,
        subtotal: quantity * item.unit_price - item.discount,
      }
    })
    const subtotal = calculateSubtotal(newItems)
    set({ items: newItems, subtotal, total: subtotal - get().discount })
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
