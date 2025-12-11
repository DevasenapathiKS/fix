import mongoose from 'mongoose';
import { NOTIFICATION_EVENTS } from '../constants/index.js';

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    channel: { type: String, enum: ['push', 'email', 'sms', 'in_app'], default: 'in_app' },
    event: { type: String, enum: Object.values(NOTIFICATION_EVENTS), required: true },
    payload: { type: mongoose.Schema.Types.Mixed },
    readAt: { type: Date },
    deliveredAt: { type: Date }
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
