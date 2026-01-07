import { Server } from 'socket.io';

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

  // Get IO instance
  getIO() {
    return this.io;
  }
}

export const socketService = new SocketService();
export default socketService;

