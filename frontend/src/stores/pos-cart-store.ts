"use client";

import { create } from "zustand";

export interface PosCartItem {
  productVariantId: number;
  sku: string;
  name: string;
  unitPrice: number;
  quantity: number;
  discountAmount: number;
}

interface PosCartState {
  items: PosCartItem[];
  cartDiscount: number;
  notes: string;
  addItem: (item: Omit<PosCartItem, "quantity" | "discountAmount">) => void;
  updateQuantity: (variantId: number, quantity: number) => void;
  removeItem: (variantId: number) => void;
  setCartDiscount: (amount: number) => void;
  setNotes: (notes: string) => void;
  clearCart: () => void;
}

export const usePosCartStore = create<PosCartState>((set) => ({
  items: [],
  cartDiscount: 0,
  notes: "",
  addItem: (incoming) =>
    set((state) => {
      const existing = state.items.find(
        (i) => i.productVariantId === incoming.productVariantId
      );
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productVariantId === incoming.productVariantId
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        };
      }
      return {
        items: [...state.items, { ...incoming, quantity: 1, discountAmount: 0 }],
      };
    }),
  updateQuantity: (variantId, quantity) =>
    set((state) => ({
      items:
        quantity <= 0
          ? state.items.filter((i) => i.productVariantId !== variantId)
          : state.items.map((i) =>
              i.productVariantId === variantId ? { ...i, quantity } : i
            ),
    })),
  removeItem: (variantId) =>
    set((state) => ({
      items: state.items.filter((i) => i.productVariantId !== variantId),
    })),
  setCartDiscount: (cartDiscount) => set({ cartDiscount: Math.max(0, cartDiscount) }),
  setNotes: (notes) => set({ notes }),
  clearCart: () => set({ items: [], cartDiscount: 0, notes: "" }),
}));
