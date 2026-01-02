import React, { useState, useEffect } from 'react';
import { ShoppingCart, Check, Sparkles } from 'lucide-react';

interface CartItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface CartData {
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
}

interface CompletionData {
  total: number;
  paid: number;
  change: number;
}

const CustomerDisplayScreen: React.FC = () => {
  const [cartData, setCartData] = useState<CartData | null>(null);
  const [showCompletion, setShowCompletion] = useState(false);
  const [completionData, setCompletionData] = useState<CompletionData | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Update time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Listen for cart updates from main process
    if (window.api?.customerDisplay) {
      window.api.customerDisplay.onCartUpdated((data) => {
        setCartData(data);
        setShowCompletion(false);
      });

      window.api.customerDisplay.onCartCleared(() => {
        setCartData(null);
        setShowCompletion(false);
      });

      window.api.customerDisplay.onSaleCompleted((data) => {
        setCompletionData(data);
        setShowCompletion(true);
        
        // Reset after 5 seconds
        setTimeout(() => {
          setShowCompletion(false);
          setCartData(null);
          setCompletionData(null);
        }, 5000);
      });
    }

    return () => {
      clearInterval(timeInterval);
      if (window.api?.customerDisplay) {
        window.api.customerDisplay.removeAllListeners();
      }
    };
  }, []);

  const formatCurrency = (amount: number) =>
    `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

  // Completion screen
  if (showCompletion && completionData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pos-success to-green-700 flex flex-col items-center justify-center text-white p-8">
        <div className="animate-bounce mb-8">
          <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center">
            <Check size={64} className="text-pos-success" />
          </div>
        </div>
        
        <h1 className="text-5xl font-display font-bold mb-4">Thank You!</h1>
        <p className="text-2xl mb-8 opacity-90">Your transaction is complete</p>
        
        <div className="bg-white/20 backdrop-blur rounded-2xl p-8 text-center">
          <div className="grid grid-cols-3 gap-8 text-xl">
            <div>
              <p className="opacity-70 mb-2">Total</p>
              <p className="text-3xl font-bold">{formatCurrency(completionData.total)}</p>
            </div>
            <div>
              <p className="opacity-70 mb-2">Paid</p>
              <p className="text-3xl font-bold">{formatCurrency(completionData.paid)}</p>
            </div>
            <div>
              <p className="opacity-70 mb-2">Change</p>
              <p className="text-3xl font-bold">{formatCurrency(completionData.change)}</p>
            </div>
          </div>
        </div>

        <p className="mt-8 text-xl opacity-75">
          Visit us again soon!
        </p>
      </div>
    );
  }

  // Empty/Welcome screen
  if (!cartData || cartData.items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-kutunza-burgundy to-kutunza-dark flex flex-col">
        {/* Header */}
        <header className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-kutunza-gold rounded-full flex items-center justify-center">
              <span className="text-3xl font-display font-bold text-kutunza-dark">K</span>
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-white">Kutunza Gourmet</h1>
              <p className="text-kutunza-gold">Premium Culinary Excellence</p>
            </div>
          </div>
          <div className="text-right text-white">
            <p className="text-4xl font-bold">{currentTime.toLocaleTimeString()}</p>
            <p className="text-lg opacity-75">{currentTime.toLocaleDateString('en-NG', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
          </div>
        </header>

        {/* Welcome Message */}
        <div className="flex-1 flex flex-col items-center justify-center text-white px-8">
          <Sparkles size={80} className="text-kutunza-gold mb-6 animate-pulse" />
          <h2 className="text-5xl font-display font-bold mb-4 text-center">
            Welcome to Kutunza Gourmet
          </h2>
          <p className="text-2xl opacity-75 text-center max-w-2xl">
            Experience premium culinary excellence. Where every meal is crafted with passion and served with love.
          </p>
        </div>

        {/* Footer */}
        <footer className="p-6 text-center text-white/50">
          <p>Graceland Estate, Lekki, Lagos</p>
        </footer>
      </div>
    );
  }

  // Active cart display
  return (
    <div className="min-h-screen bg-gradient-to-br from-kutunza-burgundy to-kutunza-dark flex flex-col">
      {/* Header */}
      <header className="p-6 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-kutunza-gold rounded-full flex items-center justify-center">
            <span className="text-xl font-display font-bold text-kutunza-dark">K</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-white">Kutunza Gourmet</h1>
        </div>
        <div className="flex items-center gap-3 text-white">
          <ShoppingCart size={28} />
          <span className="text-2xl font-bold">{cartData.items.length} items</span>
        </div>
      </header>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          {cartData.items.map((item, index) => (
            <div 
              key={item.id} 
              className="bg-white/10 backdrop-blur rounded-xl p-4 flex items-center justify-between animate-slideIn"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🍽️</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">{item.productName}</h3>
                  <p className="text-kutunza-gold">
                    {item.quantity} × {formatCurrency(item.unitPrice)}
                  </p>
                </div>
              </div>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(item.unitPrice * item.quantity)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="bg-black/30 backdrop-blur p-6">
        <div className="max-w-2xl mx-auto space-y-3">
          <div className="flex justify-between text-white/70 text-xl">
            <span>Subtotal</span>
            <span>{formatCurrency(cartData.subtotal)}</span>
          </div>
          
          {cartData.tax > 0 && (
            <div className="flex justify-between text-white/70 text-xl">
              <span>Tax</span>
              <span>{formatCurrency(cartData.tax)}</span>
            </div>
          )}
          
          {cartData.discount > 0 && (
            <div className="flex justify-between text-pos-success text-xl">
              <span>Discount</span>
              <span>-{formatCurrency(cartData.discount)}</span>
            </div>
          )}
          
          <div className="border-t border-white/20 pt-4 flex justify-between items-center">
            <span className="text-3xl font-bold text-white">Total</span>
            <span className="text-5xl font-bold text-kutunza-gold">
              {formatCurrency(cartData.total)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDisplayScreen;
