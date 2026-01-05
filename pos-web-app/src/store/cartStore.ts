import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { wsService } from '../lib/websocket';

export interface CartItem {
  id: string;
  productId: string;
  sku: string;
  name: string;
  price: number;
  quantity: number;
  taxRate: number;
  discount: number;
  modifiers?: Array<{
    id: string;
    name: string;
    price: number;
  }>;
  notes?: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  sellingPrice: number;
  taxRate: number;
}

interface CartState {
  items: CartItem[];
  discount: number;
  discountType: 'fixed' | 'percentage';
  
  // Computed values
  subtotal: number;
  tax: number;
  total: number;
  itemCount: number;
  
  // Actions
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateItemDiscount: (itemId: string, discount: number) => void;
  addModifier: (itemId: string, modifier: any) => void;
  setDiscount: (amount: number, type: 'fixed' | 'percentage') => void;
  clearCart: () => void;
  
  // Internal
  calculate: () => void;
  syncToDisplay: () => void;
}

export const useCartStore = create<CartState>((set: any, get: any) => ({
  items: [],
  discount: 0,
  discountType: 'fixed',
  subtotal: 0,
  tax: 0,
  total: 0,
  itemCount: 0,

  addItem: (product: any, quantity = 1) => {
    const state = get();
    
    // Check if item already exists
    const existingItem = state.items.find((item: any) => item.productId === product.id);
    
    let newItems: CartItem[];
    
    if (existingItem) {
      // Update quantity
      newItems = state.items.map((item: any) =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + quantity }
          : item
      );
    } else {
      // Add new item
      const newItem: CartItem = {
        id: uuidv4(),
        productId: product.id,
        sku: product.sku,
        name: product.name,
        price: product.sellingPrice,
        quantity,
        taxRate: product.taxRate,
        discount: 0,
      };
      newItems = [...state.items, newItem];
    }
    
    set({ items: newItems });
    get().calculate();
    get().syncToDisplay();
  },

  removeItem: (itemId: any) => {
    const state = get();
    set({ items: state.items.filter((item: any) => item.id !== itemId) });
    get().calculate();
    get().syncToDisplay();
  },

  updateQuantity: (itemId: any, quantity: any) => {
    const state = get();
    
    if (quantity <= 0) {
      get().removeItem(itemId);
      return;
    }
    
    set({
      items: state.items.map((item: any) =>
        item.id === itemId ? { ...item, quantity } : item
      ),
    });
    get().calculate();
    get().syncToDisplay();
  },

  updateItemDiscount: (itemId: any, discount: any) => {
    const state = get();
    set({
      items: state.items.map((item: any) =>
        item.id === itemId ? { ...item, discount } : item
      ),
    });
    get().calculate();
    get().syncToDisplay();
  },

  addModifier: (itemId: any, modifier: any) => {
    const state = get();
    set({
      items: state.items.map((item: any) =>
        item.id === itemId
          ? {
              ...item,
              modifiers: [...(item.modifiers || []), modifier],
            }
          : item
      ),
    });
    get().calculate();
    get().syncToDisplay();
  },

  setDiscount: (amount: any, type: any) => {
    set({ discount: amount, discountType: type });
    get().calculate();
    get().syncToDisplay();
  },

  clearCart: () => {
    set({
      items: [],
      discount: 0,
      discountType: 'fixed',
      subtotal: 0,
      tax: 0,
      total: 0,
      itemCount: 0,
    });
    get().syncToDisplay();
  },

  calculate() {
    const state = get();
    
    // Calculate subtotal
    let subtotal = 0;
    let totalTax = 0;
    
    state.items.forEach((item: any) => {
      const itemSubtotal = item.price * item.quantity;
      const modifiersTotal = (item.modifiers || []).reduce(
        (sum: any, mod: any) => sum + mod.price,
        0
      );
      const itemTotal = itemSubtotal + modifiersTotal - item.discount;
      
      subtotal += itemTotal;
      totalTax += itemTotal * (item.taxRate / 100);
    });
    
    // Apply cart discount
    let discountAmount = state.discount;
    if (state.discountType === 'percentage') {
      discountAmount = subtotal * (state.discount / 100);
    }
    
    const finalSubtotal = subtotal - discountAmount;
    const finalTax = finalSubtotal * 0.16; // Recalculate tax on discounted amount
    const total = finalSubtotal + finalTax;
    const itemCount = state.items.reduce((sum: any, item: any) => sum + item.quantity, 0);
    
    set({
      subtotal: finalSubtotal,
      tax: finalTax,
      total,
      itemCount,
    });
  },

  syncToDisplay: () => {
    const state = get();
    
    if (wsService.isConnected()) {
      wsService.sendCartUpdate({
        terminalId: '', // Will be set by wsService
        items: state.items,
        subtotal: state.subtotal,
        tax: state.tax,
        discount: state.discount,
        total: state.total,
        timestamp: new Date(),
      });
    }
  },
}));

// Calculate on initialization
useCartStore.getState().calculate();
