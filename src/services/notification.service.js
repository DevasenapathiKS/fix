import env from '../config/env.js';
import { NOTIFICATION_EVENTS } from '../constants/index.js';
import Notification from '../models/notification.model.js';
import { socketService } from './socket.service.js';

class NotificationService {
  async notifyAdmin(event, payload) {
    // Emit to all admins via WebSocket
    socketService.emitToAdmins(event, payload);
    return this.dispatch({ topic: env.adminTopic, event, payload });
  }

  async notifyAdmins(event, payload) {
    // Emit to all admins via WebSocket
    socketService.emitToAdmins(event, payload);
    return this.dispatch({ topic: env.adminTopic, event, payload });
  }

  async notifyTechnician(technicianId, event, payload) {
    // Ensure recipient is set so in-app notifications can be stored and queried
    const enrichedPayload = {
      ...(payload || {}),
      recipient: payload?.recipient || technicianId
    };

    // Emit to specific technician via WebSocket
    socketService.emitToUser(technicianId, event, enrichedPayload);
    return this.dispatch({ topic: `${env.technicianTopic}.${technicianId}`, event, payload: enrichedPayload });
  }

  async notifyCustomer(customerId, event, payload) {
    // Emit to specific customer via WebSocket
    socketService.emitToUser(customerId, event, payload);
    return this.dispatch({ topic: `customer.${customerId}`, event, payload });
  }

  async dispatch({ topic, event, payload }) {
    // TODO: Integrate with actual provider (FCM, SNS, etc.)
    // eslint-disable-next-line no-console
    console.log('[Notification]', { topic, event, payload });
    if (payload?.recipient) {
      await Notification.create({
        recipient: payload.recipient,
        channel: 'in_app',
        event,
        payload
      });
    }
    return true;
  }
}

export const notificationService = new NotificationService();
export { NOTIFICATION_EVENTS };
