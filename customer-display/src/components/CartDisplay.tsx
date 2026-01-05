import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '../utils/format';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  discount: number;
}

interface CartDisplayProps {
  cart: {
    items: CartItem[];
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
  };
}

export default function CartDisplay({ cart }: CartDisplayProps) {
  return (
    <div className="flex flex-col h-screen p-8 pt-24">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-4xl font-bold text-white mb-2">Your Order</h2>
        <p className="text-white/70 text-xl">
          {cart.items.reduce((sum, item) => sum + item.quantity, 0)} items
        </p>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto mb-6 space-y-3 pr-4">
        <AnimatePresence>
          {cart.items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 50, opacity: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-2xl font-semibold text-white mb-1">
                    {item.name}
                  </h3>
                  <div className="flex items-center gap-4 text-white/70">
                    <span className="text-lg">Qty: {item.quantity}</span>
                    <span className="text-lg">
                      {formatCurrency(item.price)} each
                    </span>
                  </div>
                  {item.discount > 0 && (
                    <div className="mt-2 inline-block bg-green-500/20 px-3 py-1 rounded-full">
                      <span className="text-green-300 text-sm font-medium">
                        Discount: {formatCurrency(item.discount)}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="text-right">
                  <div className="text-3xl font-bold text-white">
                    {formatCurrency(item.price * item.quantity - item.discount)}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Totals */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-white/20 backdrop-blur-lg rounded-3xl p-8 shadow-2xl"
      >
        <div className="space-y-4">
          {/* Subtotal */}
          <div className="flex justify-between items-center text-white/80">
            <span className="text-2xl">Subtotal</span>
            <span className="text-2xl font-semibold">
              {formatCurrency(cart.subtotal)}
            </span>
          </div>

          {/* Discount */}
          {cart.discount > 0 && (
            <div className="flex justify-between items-center text-green-300">
              <span className="text-2xl">Discount</span>
              <span className="text-2xl font-semibold">
                -{formatCurrency(cart.discount)}
              </span>
            </div>
          )}

          {/* Tax */}
          <div className="flex justify-between items-center text-white/80">
            <span className="text-2xl">Tax</span>
            <span className="text-2xl font-semibold">
              {formatCurrency(cart.tax)}
            </span>
          </div>

          {/* Divider */}
          <div className="border-t-2 border-white/30 my-4" />

          {/* Total */}
          <div className="flex justify-between items-center">
            <span className="text-4xl font-bold text-white">Total</span>
            <motion.span
              key={cart.total}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="text-5xl font-black text-white"
            >
              {formatCurrency(cart.total)}
            </motion.span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
