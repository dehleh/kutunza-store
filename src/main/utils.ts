import { format } from 'date-fns';

// Generate unique receipt number: KG-YYYYMMDD-XXXX
export function generateReceiptNumber(): string {
  const dateStr = format(new Date(), 'yyyyMMdd');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `KG-${dateStr}-${random}`;
}

// Generate SKU: KG-CAT-XXXX
export function generateSKU(categoryPrefix: string = 'GEN'): string {
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `KG-${categoryPrefix.substring(0, 3).toUpperCase()}-${random}`;
}

// Format currency
export function formatCurrency(amount: number, currency: string = 'NGN'): string {
  const symbols: Record<string, string> = {
    NGN: '₦',
    USD: '$',
    GBP: '£',
    EUR: '€',
  };
  
  const symbol = symbols[currency] || currency;
  return `${symbol}${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Calculate totals for cart
export function calculateCartTotals(items: any[], taxRate: number = 0, discount: number = 0, discountType: 'percentage' | 'fixed' = 'fixed') {
  const subtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  
  let discountAmount = 0;
  if (discountType === 'percentage') {
    discountAmount = subtotal * (discount / 100);
  } else {
    discountAmount = discount;
  }
  
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = taxableAmount * (taxRate / 100);
  const total = taxableAmount + taxAmount;
  
  return {
    subtotal,
    discountAmount,
    taxAmount,
    total,
  };
}
