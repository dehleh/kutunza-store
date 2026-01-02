import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useCartStore, CartItem } from '../store/cartStore';
import toast from 'react-hot-toast';
import {
  Search, ShoppingCart, User, LogOut, Settings, Trash2,
  Plus, Minus, CreditCard, Banknote, ArrowRightLeft,
  Pause, Play, Percent, Tag, X, Grid, LayoutGrid, Monitor
} from 'lucide-react';

interface Product {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  category_id: string;
  category_name: string;
  selling_price: number;
  cost_price: number;
  tax_rate: number;
  stock_quantity: number;
  track_stock: boolean;
  image_url: string | null;
}

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

const POSScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user, session, logout } = useAuthStore();
  const cart = useCartStore();
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [showHeldCarts, setShowHeldCarts] = useState(false);
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
          // Open help (future implementation)
          toast('Help: F2=Hold F3=Recall F4=Discount F12=Cash Payment');
          break;
        
        case 'F2':
          e.preventDefault();
          if (cart.items.length > 0) {
            const cartId = cart.holdCart();
            toast.success(`Order held: ${cartId}`);
          }
          break;
        
        case 'F3':
          e.preventDefault();
          setShowHeldCarts(true);
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
          // Close any open modal
          setShowPayment(false);
          setShowDiscount(false);
          setShowHeldCarts(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart.items.length, cart.total]);

  const loadData = async () => {
    try {
      const [productsData, categoriesData] = await Promise.all([
        window.api.products.getAll(),
        window.api.categories.getAll(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBarcodeScan = async (barcode: string) => {
    const product = await window.api.products.getByBarcode(barcode);
    if (product) {
      addToCart(product);
      toast.success(`Added: ${product.name}`);
    } else {
      toast.error('Product not found');
    }
  };

  const addToCart = (product: Product) => {
    if (product.track_stock && product.stock_quantity <= 0) {
      toast.error('Product out of stock');
      return;
    }

    cart.addItem({
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      quantity: 1,
      unitPrice: product.selling_price,
      costPrice: product.cost_price,
      taxRate: product.tax_rate,
      discount: 0,
      modifiers: [],
      notes: '',
    });
  };

  const handlePayment = async (method: 'cash' | 'card' | 'transfer', amountPaid: number) => {
    if (!session) {
      toast.error('No active session');
      return;
    }

    try {
      const saleData = {
        userId: user!.id,
        sessionId: session.id,
        customerId: cart.customer?.id || null,
        subtotal: cart.subtotal,
        taxAmount: cart.taxAmount,
        discountAmount: cart.discountAmount,
        discountType: cart.discountType,
        totalAmount: cart.total,
        paymentMethod: method,
        amountPaid,
        changeGiven: method === 'cash' ? Math.max(0, amountPaid - cart.total) : 0,
        notes: cart.notes,
        items: cart.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          costPrice: item.costPrice,
          taxRate: item.taxRate,
          taxAmount: (item.unitPrice * item.quantity) * (item.taxRate / 100),
          discount: item.discount,
          total: item.unitPrice * item.quantity - item.discount,
          modifiers: item.modifiers,
          notes: item.notes,
        })),
      };

      const sale = await window.api.sales.create(saleData);
      
      // Show completion on customer display
      if (window.api?.customerDisplay) {
        window.api.customerDisplay.complete({
          total: cart.total,
          paid: amountPaid,
          change: saleData.changeGiven,
        });
      }

      toast.success(`Sale completed! Receipt: ${sale.receipt_no}`);
      cart.clearCart();
      setShowPayment(false);
    } catch (error) {
      console.error('Sale failed:', error);
      toast.error('Failed to process sale');
    }
  };

  const handleLogout = async () => {
    if (cart.items.length > 0) {
      const confirm = window.confirm('You have items in cart. Are you sure you want to logout?');
      if (!confirm) return;
    }
    logout();
    navigate('/login');
  };

  const filteredProducts = products.filter(p => {
    const matchesCategory = !selectedCategory || p.category_id === selectedCategory;
    const matchesSearch = !searchQuery || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const formatCurrency = (amount: number) => 
    `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-kutunza-burgundy text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-kutunza-gold rounded-full flex items-center justify-center">
              <span className="text-lg font-bold text-kutunza-dark">K</span>
            </div>
            <div>
              <h1 className="font-display font-bold text-lg">Kutunza POS</h1>
              <p className="text-xs text-kutunza-gold">{user?.firstName} {user?.lastName}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.api?.app.openCustomerDisplay()}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Open Customer Display"
          >
            <Monitor size={20} />
          </button>
          <button
            onClick={() => navigate('/admin')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Back Office"
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
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-kutunza-burgundy"
                placeholder="Search products or scan barcode..."
              />
            </div>
          </div>

          {/* Categories */}
          <div className="p-4 bg-white border-b">
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`category-btn min-w-[100px] ${!selectedCategory ? 'active bg-gray-100' : 'bg-gray-50'}`}
              >
                <Grid size={24} className="text-gray-600 mb-1" />
                <span className="text-sm font-medium">All</span>
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`category-btn min-w-[100px] ${selectedCategory === cat.id ? 'active' : ''}`}
                  style={{ backgroundColor: selectedCategory === cat.id ? `${cat.color}20` : '#f9fafb' }}
                >
                  <div
                    className="w-8 h-8 rounded-full mb-1 flex items-center justify-center"
                    style={{ backgroundColor: cat.color }}
                  >
                    <span className="text-white text-sm">
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
                <div className="w-12 h-12 border-4 border-kutunza-burgundy border-t-transparent rounded-full animate-spin" />
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
                    className="product-card text-left"
                    disabled={product.track_stock && product.stock_quantity <= 0}
                  >
                    <div className="aspect-square bg-gray-100 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-3xl opacity-30">🍽️</span>
                      )}
                    </div>
                    <h3 className="font-medium text-sm truncate">{product.name}</h3>
                    <p className="text-kutunza-burgundy font-bold">
                      {formatCurrency(product.selling_price)}
                    </p>
                    {product.track_stock && (
                      <p className={`text-xs ${product.stock_quantity <= 5 ? 'text-red-500' : 'text-gray-400'}`}>
                        Stock: {product.stock_quantity}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Cart */}
        <div className="w-96 bg-white border-l flex flex-col">
          {/* Cart Header */}
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart size={20} className="text-kutunza-burgundy" />
              <span className="font-bold">Current Sale</span>
              <span className="bg-kutunza-burgundy text-white text-xs px-2 py-1 rounded-full">
                {cart.items.length}
              </span>
            </div>
            <div className="flex gap-2">
              {cart.heldCarts.length > 0 && (
                <button
                  onClick={() => setShowHeldCarts(true)}
                  className="p-2 hover:bg-gray-100 rounded-lg relative"
                  title="Held Orders"
                >
                  <Play size={18} />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-pos-warning text-white text-xs rounded-full flex items-center justify-center">
                    {cart.heldCarts.length}
                  </span>
                </button>
              )}
              {cart.items.length > 0 && (
                <>
                  <button
                    onClick={() => cart.holdCart()}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                    title="Hold Order"
                  >
                    <Pause size={18} />
                  </button>
                  <button
                    onClick={() => cart.clearCart()}
                    className="p-2 hover:bg-red-50 text-red-500 rounded-lg"
                    title="Clear Cart"
                  >
                    <Trash2 size={18} />
                  </button>
                </>
              )}
            </div>
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
              cart.items.map((item) => (
                <div key={item.id} className="cart-item">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{item.productName}</h4>
                    <p className="text-kutunza-burgundy font-bold">
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => cart.updateItemQuantity(item.id, item.quantity - 1)}
                      className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="w-8 text-center font-bold">{item.quantity}</span>
                    <button
                      onClick={() => cart.updateItemQuantity(item.id, item.quantity + 1)}
                      className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
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
              ))
            )}
          </div>

          {/* Cart Footer */}
          <div className="border-t p-4 space-y-3">
            {/* Discount Button */}
            <button
              onClick={() => setShowDiscount(true)}
              className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
            >
              <div className="flex items-center gap-2">
                <Percent size={18} className="text-gray-500" />
                <span className="text-sm">Discount</span>
              </div>
              {cart.discountAmount > 0 && (
                <span className="text-red-500 font-medium">
                  -{formatCurrency(cart.discountAmount)}
                </span>
              )}
            </button>

            {/* Totals */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatCurrency(cart.subtotal)}</span>
              </div>
              {cart.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Tax</span>
                  <span>{formatCurrency(cart.taxAmount)}</span>
                </div>
              )}
              {cart.discountAmount > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>Discount</span>
                  <span>-{formatCurrency(cart.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold pt-2 border-t">
                <span>Total</span>
                <span className="text-kutunza-burgundy">{formatCurrency(cart.total)}</span>
              </div>
            </div>

            {/* Payment Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setShowPayment(true)}
                disabled={cart.items.length === 0}
                className="pos-btn bg-pos-success text-white hover:bg-green-600 disabled:opacity-50 flex flex-col items-center py-3"
              >
                <Banknote size={20} />
                <span className="text-xs mt-1">Cash</span>
              </button>
              <button
                onClick={() => handlePayment('card', cart.total)}
                disabled={cart.items.length === 0}
                className="pos-btn bg-pos-info text-white hover:bg-blue-600 disabled:opacity-50 flex flex-col items-center py-3"
              >
                <CreditCard size={20} />
                <span className="text-xs mt-1">Card</span>
              </button>
              <button
                onClick={() => handlePayment('transfer', cart.total)}
                disabled={cart.items.length === 0}
                className="pos-btn bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50 flex flex-col items-center py-3"
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

      {/* Held Carts Modal */}
      {showHeldCarts && (
        <HeldCartsModal
          heldCarts={cart.heldCarts}
          onRecall={(id) => {
            cart.recallCart(id);
            setShowHeldCarts(false);
          }}
          onDelete={(id) => cart.deleteHeldCart(id)}
          onClose={() => setShowHeldCarts(false)}
        />
      )}
    </div>
  );
};

// Payment Modal Component
const PaymentModal: React.FC<{
  total: number;
  onPayment: (amount: number) => void;
  onClose: () => void;
}> = ({ total, onPayment, onClose }) => {
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
    `₦${value.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
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
            <p className="text-3xl font-bold text-kutunza-burgundy">{formatCurrency(total)}</p>
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
            <div className="bg-pos-success/10 rounded-xl p-4">
              <p className="text-sm text-gray-500">Change</p>
              <p className="text-2xl font-bold text-pos-success">{formatCurrency(change)}</p>
            </div>
          )}
        </div>

        {/* Quick Amounts */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[total, Math.ceil(total / 100) * 100, Math.ceil(total / 500) * 500, Math.ceil(total / 1000) * 1000].map((value, i) => (
            <button
              key={i}
              onClick={() => handleQuickAmount(value)}
              className="py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm font-medium"
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
              className="numpad-btn"
            >
              {key}
            </button>
          ))}
        </div>

        <button
          onClick={() => onPayment(displayAmount)}
          disabled={displayAmount < total}
          className="w-full pos-btn-success py-4 text-lg disabled:opacity-50"
        >
          Complete Payment
        </button>
      </div>
    </div>
  );
};

// Discount Modal Component
const DiscountModal: React.FC<{
  currentDiscount: number;
  currentType: 'percentage' | 'fixed';
  subtotal: number;
  onApply: (amount: number, type: 'percentage' | 'fixed') => void;
  onClose: () => void;
}> = ({ currentDiscount, currentType, subtotal, onApply, onClose }) => {
  const [type, setType] = useState<'percentage' | 'fixed'>(currentType);
  const [amount, setAmount] = useState(currentDiscount.toString());

  const calculatedDiscount = type === 'percentage' 
    ? subtotal * (parseFloat(amount) || 0) / 100
    : parseFloat(amount) || 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
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
            className={`flex-1 py-3 rounded-lg font-medium ${type === 'percentage' ? 'bg-kutunza-burgundy text-white' : 'bg-gray-100'}`}
          >
            <Percent size={18} className="inline mr-2" />
            Percentage
          </button>
          <button
            onClick={() => setType('fixed')}
            className={`flex-1 py-3 rounded-lg font-medium ${type === 'fixed' ? 'bg-kutunza-burgundy text-white' : 'bg-gray-100'}`}
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
          placeholder={type === 'percentage' ? '10%' : '₦1000'}
        />

        <p className="text-center text-gray-500 mb-4">
          Discount: ₦{calculatedDiscount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
        </p>

        <div className="flex gap-2">
          <button
            onClick={() => onApply(0, type)}
            className="flex-1 pos-btn-secondary"
          >
            Remove
          </button>
          <button
            onClick={() => onApply(parseFloat(amount) || 0, type)}
            className="flex-1 pos-btn-primary"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

// Held Carts Modal Component
const HeldCartsModal: React.FC<{
  heldCarts: { id: string; items: CartItem[]; customer: any; timestamp: string }[];
  onRecall: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}> = ({ heldCarts, onRecall, onDelete, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Held Orders</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        {heldCarts.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No held orders</p>
        ) : (
          <div className="space-y-3">
            {heldCarts.map((cart) => (
              <div key={cart.id} className="bg-gray-50 rounded-xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">{cart.id}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(cart.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  <p className="font-bold text-kutunza-burgundy">
                    ₦{cart.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0).toLocaleString()}
                  </p>
                </div>
                <p className="text-sm text-gray-500 mb-3">
                  {cart.items.length} item(s)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => onDelete(cart.id)}
                    className="flex-1 pos-btn-danger py-2 text-sm"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => onRecall(cart.id)}
                    className="flex-1 pos-btn-primary py-2 text-sm"
                  >
                    Recall
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default POSScreen;
