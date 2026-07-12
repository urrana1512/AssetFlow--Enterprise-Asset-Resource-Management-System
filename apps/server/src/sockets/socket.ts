import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';

let io: SocketServer | null = null;

export function initSocketServer(server: HttpServer) {
  io = new SocketServer(server, {
    cors: {
      origin: '*', // Customize for production
      methods: ['GET', 'POST', 'PATCH'],
    },
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join room based on employee ID
    socket.on('join:employee', (employeeId: string) => {
      if (employeeId) {
        socket.join(`employee:${employeeId}`);
        console.log(`Socket ${socket.id} joined employee:${employeeId}`);
      }
    });

    // Join room based on department ID
    socket.on('join:department', (departmentId: string) => {
      if (departmentId) {
        socket.join(`department:${departmentId}`);
        console.log(`Socket ${socket.id} joined department:${departmentId}`);
      }
    });

    // Join room based on role
    socket.on('join:role', (role: string) => {
      if (role) {
        socket.join(`role:${role}`);
        console.log(`Socket ${socket.id} joined role:${role}`);
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}

export function getSocketIO(): SocketServer {
  if (!io) {
    throw new Error('Socket.io server has not been initialized');
  }
  return io;
}

export function emitToEmployee(employeeId: string, event: string, data: any) {
  if (io) {
    io.to(`employee:${employeeId}`).emit(event, data);
  }
}

export function emitToDepartment(departmentId: string, event: string, data: any) {
  if (io) {
    io.to(`department:${departmentId}`).emit(event, data);
  }
}

export function emitToRole(role: string, event: string, data: any) {
  if (io) {
    io.to(`role:${role}`).emit(event, data);
  }
}

export function emitToAll(event: string, data: any) {
  if (io) {
    io.emit(event, data);
  }
}
