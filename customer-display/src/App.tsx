import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import WelcomeScreen from './components/WelcomeScreen';
import CartDisplay from './components/CartDisplay';
import ThankYouScreen from './components/ThankYouScreen';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:5000';
const TERMINAL_ID = import.meta.env.VITE_TERMINAL_ID || 'terminal-001';
const STORE_NAME = import.meta.env.VITE_STORE_NAME || 'Kutunza Gourmet';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  discount: number;
}

interface CartUpdate {
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
}

type DisplayState = 'welcome' | 'cart' | 'thankyou';

export default function App() {
  const [state, setState] = useState<DisplayState>('welcome');
  const [cart, setCart] = useState<CartUpdate>({
    items: [],
    subtotal: 0,
    tax: 0,
    discount: 0,
    total: 0,
  });
  const [_socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [idleTimer, setIdleTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Connect to WebSocket
    const newSocket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected to server');
      setIsConnected(true);
      
      // Subscribe to terminal
      newSocket.emit('display:subscribe', { terminalId: TERMINAL_ID });
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
      setIsConnected(false);
    });

    newSocket.on('display:subscribed', (data) => {
      console.log('📺 Subscribed to terminal:', data.terminalId);
    });

    newSocket.on('cart:updated', (data: CartUpdate) => {
      console.log('🛒 Cart updated:', data);
      setCart(data);
      
      if (data.items.length > 0) {
        setState('cart');
        resetIdleTimer();
      } else {
        setState('welcome');
      }
    });

    newSocket.on('transaction:complete', (data: any) => {
      console.log('✅ Transaction complete:', data);
      setState('thankyou');
      
      // Return to welcome screen after 5 seconds
      setTimeout(() => {
        setState('welcome');
        setCart({
          items: [],
          subtotal: 0,
          tax: 0,
          discount: 0,
          total: 0,
        });
      }, 5000);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
      if (idleTimer) clearTimeout(idleTimer);
    };
  }, []);

  const resetIdleTimer = () => {
    if (idleTimer) clearTimeout(idleTimer);
    
    // Return to welcome screen after 2 minutes of inactivity
    const timer = setTimeout(() => {
      if (cart.items.length === 0) {
        setState('welcome');
      }
    }, 120000);
    
    setIdleTimer(timer);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 overflow-hidden">
      {/* Connection status indicator */}
      <div className="absolute top-4 right-4 z-50">
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
          isConnected ? 'bg-green-500' : 'bg-red-500'
        } text-white text-sm font-medium shadow-lg`}>
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-white animate-pulse' : 'bg-white/50'
          }`} />
          {isConnected ? 'Connected' : 'Offline'}
        </div>
      </div>

      {/* Store branding */}
      <div className="absolute top-4 left-4 z-50">
        <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-xl">
          <h1 className="text-2xl font-bold text-white">{STORE_NAME}</h1>
        </div>
      </div>

      {/* Main display area */}
      <AnimatePresence mode="wait">
        {state === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <WelcomeScreen storeName={STORE_NAME} />
          </motion.div>
        )}

        {state === 'cart' && (
          <motion.div
            key="cart"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <CartDisplay cart={cart} />
          </motion.div>
        )}

        {state === 'thankyou' && (
          <motion.div
            key="thankyou"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <ThankYouScreen total={cart.total} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
