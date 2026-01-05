// WebSocket server for real-time POS synchronization
import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from './env';
import { logger } from './logger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  storeId?: string;
  terminalId?: string;
}

export class WebSocketServer {
  private io: Server;
  private terminals: Map<string, Set<string>> = new Map(); // terminalId -> socketIds
  private displays: Map<string, string> = new Map(); // terminalId -> displaySocketId

  constructor(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: env.ALLOWED_ORIGINS === '*' ? '*' : env.ALLOWED_ORIGINS.split(','),
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    
    logger.info('✅ WebSocket server initialized');
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token;
        const storeId = socket.handshake.auth.storeId;
        const terminalId = socket.handshake.auth.terminalId;

        if (!token) {
          return next(new Error('Authentication token required'));
        }

        if (!storeId) {
          return next(new Error('Store ID required'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, env.JWT_SECRET) as any;
        
        socket.userId = decoded.userId;
        socket.storeId = storeId;
        socket.terminalId = terminalId || socket.id;

        logger.info(`🔌 Client authenticated: ${socket.userId} from store ${storeId}`);
        next();
      } catch (error: any) {
        logger.error('Authentication failed:', error.message);
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      const { userId, storeId, terminalId } = socket;
      
      logger.info(`✅ Client connected: ${socket.id} (User: ${userId}, Terminal: ${terminalId})`);

      // Join store room for broadcast messages
      socket.join(`store:${storeId}`);
      
      // Join terminal room
      if (terminalId) {
        socket.join(`terminal:${terminalId}`);
        
        // Track terminal connections
        if (!this.terminals.has(terminalId)) {
          this.terminals.set(terminalId, new Set());
        }
        this.terminals.get(terminalId)?.add(socket.id);
      }

      // Handle cart updates from POS
      socket.on('cart:update', (data) => {
        this.handleCartUpdate(socket, data);
      });

      // Handle transaction complete
      socket.on('transaction:complete', (data) => {
        this.handleTransactionComplete(socket, data);
      });

      // Customer display subscription
      socket.on('display:subscribe', (data) => {
        this.handleDisplaySubscribe(socket, data);
      });

      // Inventory updates
      socket.on('inventory:update', (data) => {
        this.handleInventoryUpdate(socket, data);
      });

      // System messages
      socket.on('system:ping', () => {
        socket.emit('system:pong', {
          timestamp: new Date().toISOString(),
          terminalId: socket.terminalId,
        });
      });

      // Disconnect handler
      socket.on('disconnect', (reason) => {
        logger.info(`❌ Client disconnected: ${socket.id} (Reason: ${reason})`);
        
        // Clean up terminal tracking
        if (terminalId) {
          this.terminals.get(terminalId)?.delete(socket.id);
          if (this.terminals.get(terminalId)?.size === 0) {
            this.terminals.delete(terminalId);
          }
        }

        // Clean up display tracking
        for (const [terminal, displaySocket] of this.displays.entries()) {
          if (displaySocket === socket.id) {
            this.displays.delete(terminal);
            break;
          }
        }
      });

      // Error handler
      socket.on('error', (error) => {
        logger.error({ error, socketId: socket.id }, `Socket error for ${socket.id}`);
      });
    });
  }

  private handleCartUpdate(socket: AuthenticatedSocket, data: any) {
    const { terminalId } = data;
    
    logger.debug(`📦 Cart update from terminal ${terminalId}`);
    
    // Broadcast to customer display for this terminal
    const displaySocketId = this.displays.get(terminalId);
    if (displaySocketId) {
      this.io.to(displaySocketId).emit('cart:updated', {
        ...data,
        timestamp: new Date().toISOString(),
      });
    }

    // Also broadcast to same terminal (for multiple POS instances)
    socket.to(`terminal:${terminalId}`).emit('cart:updated', data);
  }

  private handleTransactionComplete(socket: AuthenticatedSocket, data: any) {
    const { terminalId } = data;
    
    logger.info(`✅ Transaction complete from terminal ${terminalId}`);
    
    // Send to customer display
    const displaySocketId = this.displays.get(terminalId);
    if (displaySocketId) {
      this.io.to(displaySocketId).emit('transaction:complete', {
        ...data,
        timestamp: new Date().toISOString(),
      });
    }

    // Broadcast to store for other terminals to see
    socket.to(`store:${socket.storeId}`).emit('transaction:complete', data);
  }

  private handleDisplaySubscribe(socket: AuthenticatedSocket, data: any) {
    const { terminalId } = data;
    
    logger.info(`📺 Customer display subscribed to terminal ${terminalId}`);
    
    // Register this socket as the display for this terminal
    this.displays.set(terminalId, socket.id);
    
    socket.emit('display:subscribed', {
      terminalId,
      message: 'Successfully subscribed to terminal',
    });
  }

  private handleInventoryUpdate(socket: AuthenticatedSocket, data: any) {
    logger.info(`📦 Inventory update from ${socket.userId}`);
    
    // Broadcast inventory changes to all terminals in the store
    socket.to(`store:${socket.storeId}`).emit('inventory:updated', {
      ...data,
      timestamp: new Date().toISOString(),
      updatedBy: socket.userId,
    });
  }

  // Public methods for external use
  
  public broadcastToStore(storeId: string, event: string, data: any) {
    this.io.to(`store:${storeId}`).emit(event, data);
    logger.debug(`📡 Broadcasted ${event} to store ${storeId}`);
  }

  public sendToTerminal(terminalId: string, event: string, data: any) {
    this.io.to(`terminal:${terminalId}`).emit(event, data);
    logger.debug(`📡 Sent ${event} to terminal ${terminalId}`);
  }

  public getConnectedTerminals(storeId?: string): string[] {
    if (storeId) {
      const sockets = this.io.sockets.adapter.rooms.get(`store:${storeId}`);
      return sockets ? Array.from(sockets) : [];
    }
    return Array.from(this.terminals.keys());
  }

  public getStats() {
    return {
      connectedClients: this.io.sockets.sockets.size,
      terminals: this.terminals.size,
      displays: this.displays.size,
    };
  }
}
