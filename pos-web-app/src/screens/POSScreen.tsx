import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { apiClient } from '../lib/api';
import { db } from '../lib/db';
import toast from 'react-hot-toast';
import {
  Search, ShoppingCart, LogOut, Settings, Trash2,
  Plus, Minus, CreditCard, Banknote, ArrowRightLeft,
  Percent, Tag, X, Grid, LayoutGrid
} from 'lucide-react';

interface Product {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  categoryId: string;
  categoryName: string;
  sellingPrice: number;
  costPrice: number;
  taxRate: number;
  stockQuantity: number;
  trackStock: boolean;
  imageUrl: string | null;
  isActive: boolean;
}

interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string;
  sortOrder: number;
}

export default function POSScreen() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const cart = useCartStore();
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [barcodeBuffer, setBarcodeBuffer] = useState('');

  // Load products and categories
  useEffect(() => {
    loadData();
  }, []);

  // Barcode scanner listener
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if in input field
      if (document.activeElement?.tagName === 'INPUT' && 
          document.activeElement !== barcodeInputRef.current) {
        return;
      }

      if (e.key === 'Enter' && barcodeBuffer) {
        handleBarcodeScan(barcodeBuffer);
        setBarcodeBuffer('');
        return;
      }

      if (e.key.length === 1) {
        setBarcodeBuffer(prev => prev + e.key);
        clearTimeout(timeout);
        timeout = setTimeout(() => setBarcodeBuffer(''), 100);
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      clearTimeout(timeout);
    };
  }, [barcodeBuffer]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if in input/textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      switch (e.key) {
        case 'F1':
          e.preventDefault();
          toast('Help: F4=Discount F12=Cash Payment', { icon: 'ℹ️' });
          break;
        
        case 'F4':
          e.preventDefault();
          if (cart.items.length > 0) {
            setShowDiscount(true);
          }
          break;
        
        case 'F12':
          e.preventDefault();
          if (cart.items.length > 0 && cart.total > 0) {
            setShowPayment(true);
          }
          break;
        
        case 'Escape':
          e.preventDefault();
          setShowPayment(false);
          setShowDiscount(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart.items.length, cart.total]);

  const loadData = async () => {
    try {
      // Try loading from API first
      const [productsData, categoriesData] = await Promise.all([
        apiClient.getProducts({ isActive: true }),
        apiClient.getCategories(true),
      ]);
      
      setProducts(productsData.data);
      setCategories(categoriesData.data);

      // Cache in IndexedDB
      await db.products.clear();
      await db.categories.clear();
      await db.products.bulkAdd(productsData.data);
      await db.categories.bulkAdd(categoriesData.data);
      
    } catch (error) {
      console.error('Failed to load from API, trying offline...', error);
      
      // Fallback to IndexedDB
      const offlineProducts = await db.products.toArray();
      const offlineCategories = await db.categories.toArray();
      
      if (offlineProducts.length > 0) {
        setProducts(offlineProducts as any);
        setCategories(offlineCategories);
        toast.success('Working offline', { icon: '📴' });
      } else {
        toast.error('Failed to load products');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBarcodeScan = (barcode: string) => {
    const product = products.find(p => p.barcode === barcode);
    if (product) {
      addToCart(product);
      toast.success(`Added: ${product.name}`);
    } else {
      toast.error('Product not found');
    }
  };

  const addToCart = (product: Product) => {
    if (product.trackStock && product.stockQuantity <= 0) {
      toast.error('Product out of stock');
      return;
    }

    cart.addItem(product);
  };

  const handlePayment = async (method: 'cash' | 'card' | 'transfer', amountPaid: number) => {
    try {
      const saleData = {
        items: cart.items,
        subtotal: cart.subtotal,
        tax: cart.tax,
        discount: cart.discount,
        total: cart.total,
        paymentMethod: method,
        amountPaid,
        changeGiven: method === 'cash' ? Math.max(0, amountPaid - cart.total) : 0,
      };

      await apiClient.createSale(saleData);
      
      toast.success('Sale completed!');
      cart.clearCart();
      setShowPayment(false);
    } catch (error) {
      console.error('Sale failed:', error);
      toast.error('Failed to process sale');
    }
  };

  const handleLogout = () => {
    if (cart.items.length > 0) {
      const confirm = window.confirm('You have items in cart. Are you sure you want to logout?');
      if (!confirm) return;
    }
    logout();
    navigate('/login');
  };

  const filteredProducts = products.filter(p => {
    const matchesCategory = !selectedCategory || p.categoryId === selectedCategory;
    const matchesSearch = !searchQuery || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch && p.isActive;
  });

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-primary text-white px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <span className="text-lg font-bold text-primary">K</span>
            </div>
            <div>
              <h1 className="font-bold text-lg">Kutunza POS</h1>
              <p className="text-xs text-white/80">{user?.firstName} {user?.lastName}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/admin')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Admin Panel"
          >
            <Settings size={20} />
          </button>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Products */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search Bar */}
          <div className="p-4 bg-white border-b">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                ref={barcodeInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Search products or scan barcode..."
              />
            </div>
          </div>

          {/* Categories */}
          <div className="p-4 bg-white border-b">
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`flex flex-col items-center justify-center min-w-[100px] px-4 py-3 rounded-xl transition-colors ${!selectedCategory ? 'bg-primary/10 border-2 border-primary' : 'bg-gray-50 hover:bg-gray-100'}`}
              >
                <Grid size={24} className="mb-1" style={{ color: !selectedCategory ? '#8B4513' : '#6b7280' }} />
                <span className="text-sm font-medium">All</span>
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex flex-col items-center justify-center min-w-[100px] px-4 py-3 rounded-xl transition-colors ${selectedCategory === cat.id ? 'border-2 shadow-md' : 'bg-gray-50 hover:bg-gray-100'}`}
                  style={{ 
                    backgroundColor: selectedCategory === cat.id ? `${cat.color}20` : '#f9fafb',
                    borderColor: selectedCategory === cat.id ? cat.color : 'transparent'
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-full mb-1 flex items-center justify-center"
                    style={{ backgroundColor: cat.color }}
                  >
                    <span className="text-white text-sm font-bold">
                      {cat.name.charAt(0)}
                    </span>
                  </div>
                  <span className="text-sm font-medium">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="spinner" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                <LayoutGrid size={48} className="mx-auto mb-4 opacity-50" />
                <p>No products found</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="bg-white rounded-xl p-3 shadow hover:shadow-lg transition-shadow text-left disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={product.trackStock && product.stockQuantity <= 0}
                  >
                    <div className="aspect-square bg-gray-100 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-3xl opacity-30">🍽️</span>
                      )}
                    </div>
                    <h3 className="font-medium text-sm truncate">{product.name}</h3>
                    <p className="text-primary font-bold">
                      {formatCurrency(product.sellingPrice)}
                    </p>
                    {product.trackStock && (
                      <p className={`text-xs ${product.stockQuantity <= 5 ? 'text-red-500' : 'text-gray-400'}`}>
                        Stock: {product.stockQuantity}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Cart */}
        <div className="w-96 bg-white border-l flex flex-col shadow-xl">
          {/* Cart Header */}
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart size={20} className="text-primary" />
              <span className="font-bold">Current Sale</span>
              <span className="bg-primary text-white text-xs px-2 py-1 rounded-full">
                {cart.itemCount}
              </span>
            </div>
            {cart.items.length > 0 && (
              <button
                onClick={() => cart.clearCart()}
                className="p-2 hover:bg-red-50 text-red-500 rounded-lg"
                title="Clear Cart"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {cart.items.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <ShoppingCart size={48} className="mx-auto mb-4 opacity-50" />
                <p>Cart is empty</p>
                <p className="text-sm">Scan or select items</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.items.map((item) => (
                  <div key={item.id} className="bg-gray-50 rounded-xl p-3 flex items-start gap-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{item.name}</h4>
                      <p className="text-primary font-bold">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => cart.updateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 rounded-full bg-white hover:bg-gray-200 flex items-center justify-center shadow"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-8 text-center font-bold">{item.quantity}</span>
                      <button
                        onClick={() => cart.updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 rounded-full bg-white hover:bg-gray-200 flex items-center justify-center shadow"
                      >
                        <Plus size={16} />
                      </button>
                      <button
                        onClick={() => cart.removeItem(item.id)}
                        className="w-8 h-8 rounded-full hover:bg-red-100 text-red-500 flex items-center justify-center"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Footer */}
          <div className="border-t p-4 space-y-3 bg-gray-50">
            {/* Discount Button */}
            <button
              onClick={() => setShowDiscount(true)}
              disabled={cart.items.length === 0}
              className="w-full flex items-center justify-between p-3 bg-white rounded-lg hover:bg-gray-50 disabled:opacity-50 shadow"
            >
              <div className="flex items-center gap-2">
                <Percent size={18} className="text-gray-500" />
                <span className="text-sm">Discount</span>
              </div>
              {cart.discount > 0 && (
                <span className="text-red-500 font-medium">
                  -{formatCurrency(cart.discount)}
                </span>
              )}
            </button>

            {/* Totals */}
            <div className="space-y-2 text-sm bg-white rounded-lg p-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatCurrency(cart.subtotal)}</span>
              </div>
              {cart.tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Tax</span>
                  <span>{formatCurrency(cart.tax)}</span>
                </div>
              )}
              {cart.discount > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>Discount</span>
                  <span>-{formatCurrency(cart.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold pt-2 border-t">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(cart.total)}</span>
              </div>
            </div>

            {/* Payment Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setShowPayment(true)}
                disabled={cart.items.length === 0}
                className="bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 flex flex-col items-center py-3 rounded-lg shadow-md transition-colors"
              >
                <Banknote size={20} />
                <span className="text-xs mt-1">Cash</span>
              </button>
              <button
                onClick={() => handlePayment('card', cart.total)}
                disabled={cart.items.length === 0}
                className="bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 flex flex-col items-center py-3 rounded-lg shadow-md transition-colors"
              >
                <CreditCard size={20} />
                <span className="text-xs mt-1">Card</span>
              </button>
              <button
                onClick={() => handlePayment('transfer', cart.total)}
                disabled={cart.items.length === 0}
                className="bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50 flex flex-col items-center py-3 rounded-lg shadow-md transition-colors"
              >
                <ArrowRightLeft size={20} />
                <span className="text-xs mt-1">Transfer</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <PaymentModal
          total={cart.total}
          onPayment={(amount) => handlePayment('cash', amount)}
          onClose={() => setShowPayment(false)}
        />
      )}

      {/* Discount Modal */}
      {showDiscount && (
        <DiscountModal
          currentDiscount={cart.discount}
          currentType={cart.discountType}
          subtotal={cart.subtotal}
          onApply={(amount, type) => {
            cart.setDiscount(amount, type);
            setShowDiscount(false);
          }}
          onClose={() => setShowDiscount(false)}
        />
      )}
    </div>
  );
}

// Payment Modal Component
function PaymentModal({
  total,
  onPayment,
  onClose
}: {
  total: number;
  onPayment: (amount: number) => void;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState('');
  const displayAmount = parseFloat(amount) || 0;
  const change = Math.max(0, displayAmount - total);

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  const handleNumpad = (digit: string) => {
    if (digit === 'C') {
      setAmount('');
    } else if (digit === '⌫') {
      setAmount(prev => prev.slice(0, -1));
    } else if (digit === '.') {
      if (!amount.includes('.')) {
        setAmount(prev => prev + '.');
      }
    } else {
      setAmount(prev => prev + digit);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(value);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Cash Payment</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-500">Total Due</p>
            <p className="text-3xl font-bold text-primary">{formatCurrency(total)}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500 mb-2">Amount Received</p>
            <input
              type="text"
              value={amount}
              readOnly
              className="w-full text-3xl font-bold text-center py-4 border-2 border-gray-200 rounded-xl"
              placeholder="0.00"
            />
          </div>

          {displayAmount >= total && (
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-sm text-gray-500">Change</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(change)}</p>
            </div>
          )}
        </div>

        {/* Quick Amounts */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[total, Math.ceil(total / 100) * 100, Math.ceil(total / 500) * 500, Math.ceil(total / 1000) * 1000].map((value, i) => (
            <button
              key={i}
              onClick={() => handleQuickAmount(value)}
              className="py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-xs font-medium"
            >
              {formatCurrency(value)}
            </button>
          ))}
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map((key) => (
            <button
              key={key}
              onClick={() => handleNumpad(key)}
              className="py-4 bg-gray-100 rounded-lg hover:bg-gray-200 text-lg font-medium"
            >
              {key}
            </button>
          ))}
        </div>

        <button
          onClick={() => onPayment(displayAmount)}
          disabled={displayAmount < total}
          className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white py-4 rounded-lg text-lg font-medium transition-colors"
        >
          Complete Payment
        </button>
      </div>
    </div>
  );
}

// Discount Modal Component
function DiscountModal({
  currentDiscount,
  currentType,
  subtotal,
  onApply,
  onClose
}: {
  currentDiscount: number;
  currentType: 'percentage' | 'fixed';
  subtotal: number;
  onApply: (amount: number, type: 'percentage' | 'fixed') => void;
  onClose: () => void;
}) {
  const [type, setType] = useState<'percentage' | 'fixed'>(currentType);
  const [amount, setAmount] = useState(currentDiscount.toString());

  const calculatedDiscount = type === 'percentage' 
    ? subtotal * (parseFloat(amount) || 0) / 100
    : parseFloat(amount) || 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Apply Discount</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setType('percentage')}
            className={`flex-1 py-3 rounded-lg font-medium transition-colors ${type === 'percentage' ? 'bg-primary text-white' : 'bg-gray-100'}`}
          >
            <Percent size={18} className="inline mr-2" />
            Percentage
          </button>
          <button
            onClick={() => setType('fixed')}
            className={`flex-1 py-3 rounded-lg font-medium transition-colors ${type === 'fixed' ? 'bg-primary text-white' : 'bg-gray-100'}`}
          >
            <Tag size={18} className="inline mr-2" />
            Fixed
          </button>
        </div>

        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full text-2xl text-center py-4 border-2 border-gray-200 rounded-xl mb-4"
          placeholder={type === 'percentage' ? '10' : '1000'}
        />

        <p className="text-center text-gray-500 mb-4">
          Discount: {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(calculatedDiscount)}
        </p>

        <div className="flex gap-2">
          <button
            onClick={() => onApply(0, type)}
            className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
          >
            Remove
          </button>
          <button
            onClick={() => onApply(parseFloat(amount) || 0, type)}
            className="flex-1 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
