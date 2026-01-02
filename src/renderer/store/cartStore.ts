import { create } from 'zustand';

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  taxRate: number;
  discount: number;
  modifiers: string[];
  notes: string;
}

interface Customer {
  id: string;
  name: string;
  phone?: string;
  loyaltyPoints?: number;
}

interface CartState {
  items: CartItem[];
  customer: Customer | null;
  discount: number;
  discountType: 'percentage' | 'fixed';
  notes: string;
  heldCarts: { id: string; items: CartItem[]; customer: Customer | null; timestamp: string }[];

  // Computed
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;

  // Actions
  addItem: (item: Omit<CartItem, 'id'>) => void;
  updateItemQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  setCustomer: (customer: Customer | null) => void;
  setDiscount: (amount: number, type: 'percentage' | 'fixed') => void;
  setNotes: (notes: string) => void;
  holdCart: () => string;
  recallCart: (id: string) => void;
  deleteHeldCart: (id: string) => void;
  calculateTotals: () => void;
}

const calculateItemTotal = (item: CartItem): number => {
  const baseTotal = item.unitPrice * item.quantity;
  const itemDiscount = item.discount || 0;
  return baseTotal - itemDiscount;
};

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customer: null,
  discount: 0,
  discountType: 'fixed',
  notes: '',
  heldCarts: [],
  subtotal: 0,
  taxAmount: 0,
  discountAmount: 0,
  total: 0,

  addItem: (item) => {
    const state = get();
    const existingIndex = state.items.findIndex(
      (i) => i.productId === item.productId && JSON.stringify(i.modifiers) === JSON.stringify(item.modifiers)
    );

    if (existingIndex >= 0) {
      // Update quantity of existing item
      const newItems = [...state.items];
      newItems[existingIndex].quantity += item.quantity;
      set({ items: newItems });
    } else {
      // Add new item
      const newItem: CartItem = {
        ...item,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
      set({ items: [...state.items, newItem] });
    }
    
    get().calculateTotals();
    
    // Update customer display
    if (window.api?.customerDisplay) {
      window.api.customerDisplay.update({
        items: get().items,
        subtotal: get().subtotal,
        tax: get().taxAmount,
        discount: get().discountAmount,
        total: get().total,
      });
    }
  },

  updateItemQuantity: (id, quantity) => {
    if (quantity <= 0) {
      get().removeItem(id);
      return;
    }

    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, quantity } : item
      ),
    }));
    
    get().calculateTotals();
    
    // Update customer display
    if (window.api?.customerDisplay) {
      window.api.customerDisplay.update({
        items: get().items,
        subtotal: get().subtotal,
        tax: get().taxAmount,
        discount: get().discountAmount,
        total: get().total,
      });
    }
  },

  removeItem: (id) => {
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    }));
    
    get().calculateTotals();
    
    // Update customer display
    if (window.api?.customerDisplay) {
      window.api.customerDisplay.update({
        items: get().items,
        subtotal: get().subtotal,
        tax: get().taxAmount,
        discount: get().discountAmount,
        total: get().total,
      });
    }
  },

  clearCart: () => {
    set({
      items: [],
      customer: null,
      discount: 0,
      discountType: 'fixed',
      notes: '',
      subtotal: 0,
      taxAmount: 0,
      discountAmount: 0,
      total: 0,
    });
    
    // Clear customer display
    if (window.api?.customerDisplay) {
      window.api.customerDisplay.clear();
    }
  },

  setCustomer: (customer) => set({ customer }),

  setDiscount: (amount, type) => {
    set({ discount: amount, discountType: type });
    get().calculateTotals();
  },

  setNotes: (notes) => set({ notes }),

  holdCart: () => {
    const state = get();
    const holdId = `HOLD-${Date.now()}`;
    
    set({
      heldCarts: [
        ...state.heldCarts,
        {
          id: holdId,
          items: [...state.items],
          customer: state.customer,
          timestamp: new Date().toISOString(),
        },
      ],
    });
    
    get().clearCart();
    return holdId;
  },

  recallCart: (id) => {
    const state = get();
    const heldCart = state.heldCarts.find((c) => c.id === id);
    
    if (heldCart) {
      set({
        items: heldCart.items,
        customer: heldCart.customer,
        heldCarts: state.heldCarts.filter((c) => c.id !== id),
      });
      get().calculateTotals();
    }
  },

  deleteHeldCart: (id) => {
    set((state) => ({
      heldCarts: state.heldCarts.filter((c) => c.id !== id),
    }));
  },

  calculateTotals: () => {
    const state = get();
    
    const subtotal = state.items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
    
    // Calculate tax (per item)
    const taxAmount = state.items.reduce((sum, item) => {
      const itemTotal = calculateItemTotal(item);
      return sum + (itemTotal * (item.taxRate / 100));
    }, 0);
    
    // Calculate discount
    let discountAmount = 0;
    if (state.discountType === 'percentage') {
      discountAmount = subtotal * (state.discount / 100);
    } else {
      discountAmount = state.discount;
    }
    
    const total = subtotal + taxAmount - discountAmount;
    
    set({
      subtotal,
      taxAmount,
      discountAmount,
      total: Math.max(0, total),
    });
  },
}));
