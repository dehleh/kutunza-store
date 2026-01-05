import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:5000';
const STORE_ID = import.meta.env.VITE_STORE_ID || '';

export interface CartUpdate {
  terminalId: string;
  items: any[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  timestamp: Date;
}

export interface CustomerDisplayMessage {
  type: 'cart_update' | 'transaction_complete' | 'welcome' | 'idle';
  data?: any;
}

class WebSocketService {
  private socket: Socket | null = null;
  private terminalId: string = '';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private listeners: Map<string, Set<Function>> = new Map();

  connect(terminalId: string, token: string) {
    if (this.socket?.connected) {
      return;
    }

    this.terminalId = terminalId;

    this.socket = io(WS_URL, {
      auth: {
        token,
        storeId: STORE_ID,
        terminalId,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      this.reconnectAttempts = 0;
      toast.success('Connected to server');
      this.emit('system:connected', { terminalId: this.terminalId });
    });

    this.socket.on('disconnect', (reason: any) => {
      console.log('❌ WebSocket disconnected:', reason);
      
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect manually
        this.socket?.connect();
      }
    });

    this.socket.on('connect_error', (error: any) => {
      this.reconnectAttempts++;
      console.error('Connection error:', error.message);
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        toast.error('Cannot connect to server - working offline');
      }
    });

    this.socket.on('error', (error: any) => {
      console.error('Socket error:', error);
      toast.error('Connection error');
    });

    // Custom events
    this.socket.on('cart:updated', (data: CartUpdate) => {
      this.emit('cart:updated', data);
    });

    this.socket.on('transaction:complete', (data: any) => {
      this.emit('transaction:complete', data);
    });

    this.socket.on('system:message', (data: any) => {
      this.emit('system:message', data);
    });

    this.socket.on('inventory:updated', (data: any) => {
      this.emit('inventory:updated', data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  // Send cart updates to customer display
  sendCartUpdate(cart: CartUpdate) {
    if (!this.socket?.connected) {
      console.warn('Socket not connected, cannot send cart update');
      return;
    }

    this.socket.emit('cart:update', {
      ...cart,
      terminalId: this.terminalId,
    });
  }

  // Send transaction complete to customer display
  sendTransactionComplete(data: any) {
    if (!this.socket?.connected) return;

    this.socket.emit('transaction:complete', {
      terminalId: this.terminalId,
      ...data,
    });
  }

  // Subscribe to customer display on specific terminal
  subscribeToTerminal(terminalId: string) {
    if (!this.socket?.connected) return;

    this.socket.emit('display:subscribe', { terminalId });
  }

  // Generic event listener
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  // Emit to local listeners
  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }

  getSocket() {
    return this.socket;
  }
}

export const wsService = new WebSocketService();
