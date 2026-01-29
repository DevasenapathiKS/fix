import { Server } from 'socket.io';
import Order from '../models/order.model.js';

class SocketService {
  constructor() {
    this.io = null;
    this.connectedAdmins = new Map(); // userId -> socketId
  }

  initialize(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      },
      path: '/socket.io'
    });

    this.io.on('connection', (socket) => {
      console.log(`[Socket] Client connected: ${socket.id}`);

      // Admin joins their room
      socket.on('admin:join', (data) => {
        const { userId } = data || {};
        if (userId) {
          socket.join('admins');
          socket.join(`user:${userId}`);
          this.connectedAdmins.set(userId, socket.id);
          console.log(`[Socket] Admin ${userId} joined`);
        }
      });

      // Technician joins their room
      socket.on('technician:join', (data) => {
        const { userId } = data || {};
        if (userId) {
          socket.join('technicians');
          socket.join(`user:${userId}`);
          console.log(`[Socket] Technician ${userId} joined`);
        }
      });

      // Customer joins their room
      socket.on('customer:join', (data) => {
        const { userId } = data || {};
        if (userId) {
          socket.join(`user:${userId}`);
          console.log(`[Socket] Customer ${userId} joined`);
        }
      });

      // Join order room for real-time activity (admin or customer)
      socket.on('order:join', async (data) => {
        const { orderId, userId, role } = data || {};
        if (!orderId) return;
        if (role === 'admin') {
          socket.join(`order:${orderId}`);
          console.log(`[Socket] Admin joined order ${orderId}`);
          return;
        }
        if (role === 'customer' && userId) {
          const order = await Order.findOne({ _id: orderId, customerUser: userId }).lean();
          if (order) {
            socket.join(`order:${orderId}`);
            console.log(`[Socket] Customer ${userId} joined order ${orderId}`);
          }
        }
      });

      socket.on('order:leave', (data) => {
        const { orderId } = data || {};
        if (orderId) {
          socket.leave(`order:${orderId}`);
        }
      });

      socket.on('disconnect', () => {
        console.log(`[Socket] Client disconnected: ${socket.id}`);
        // Clean up admin mapping
        for (const [userId, socketId] of this.connectedAdmins.entries()) {
          if (socketId === socket.id) {
            this.connectedAdmins.delete(userId);
            break;
          }
        }
      });
    });

    console.log('[Socket] WebSocket server initialized');
    return this.io;
  }

  // Emit to all admins
  emitToAdmins(event, payload) {
    if (this.io) {
      this.io.to('admins').emit(event, payload);
      console.log(`[Socket] Emitted ${event} to admins`);
    }
  }

  // Emit to specific user
  emitToUser(userId, event, payload) {
    if (this.io) {
      this.io.to(`user:${userId}`).emit(event, payload);
      console.log(`[Socket] Emitted ${event} to user ${userId}`);
    }
  }

  // Emit to all technicians
  emitToTechnicians(event, payload) {
    if (this.io) {
      this.io.to('technicians').emit(event, payload);
      console.log(`[Socket] Emitted ${event} to technicians`);
    }
  }

  // Emit to everyone in an order room (admin + customer viewing that order)
  emitToOrder(orderId, event, payload) {
    if (this.io && orderId) {
      this.io.to(`order:${orderId}`).emit(event, payload);
    }
  }

  // Get IO instance
  getIO() {
    return this.io;
  }
}

export const socketService = new SocketService();
export default socketService;

