import mongoose from 'mongoose';
import crypto from 'crypto';
import { ORDER_STATUS } from '../constants/index.js';

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: [0, 0]
      }
    }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderCode: { type: String, unique: true, index: true },
    customer: { type: customerSchema, required: true },
    customerUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customerAddress: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomerAddress' },
    preferredSlot: {
      label: { type: String },
      start: { type: Date },
      end: { type: Date }
    },
    // Single service (backward compatible)
    serviceCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCategory' },
    serviceItem: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceItem' },
    // Multiple services support
    services: [
      {
        serviceCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCategory' },
        serviceItem: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceItem' },
        serviceName: { type: String },
        quantity: { type: Number, default: 1 },
        issueDescription: { type: String },
        estimatedCost: { type: Number }
      }
    ],
    issueDescription: { type: String },
    media: [
      {
        url: { type: String, required: true },
        kind: { type: String, enum: ['image', 'video', 'document'], default: 'image' },
        name: { type: String },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        uploadedAt: { type: Date, default: Date.now }
      }
    ],
    estimatedCost: { type: Number },
    scheduledAt: { type: Date, required: true },
    timeWindowStart: { type: Date, required: true },
    timeWindowEnd: { type: Date, required: true },
    status: { type: String, enum: Object.values(ORDER_STATUS), default: ORDER_STATUS.NEW },
    notes: { type: String },
    assignedTechnician: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedTechnicians: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    technicianResponseAt: { type: Date },
    technicianTracking: {
      lastCheckInAt: { type: Date },
      location: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point'
        },
        coordinates: { type: [Number], default: [0, 0] }
      }
    },
    customerApproval: {
      status: {
        type: String,
        enum: ['not_required', 'pending', 'approved', 'rejected'],
        default: 'not_required'
      },
      requestedItems: [
        {
          type: { type: String, enum: ['extra_work', 'spare_part'], required: true },
          description: { type: String },
          amount: { type: Number },
          quantity: { type: Number },
          unitPrice: { type: Number },
          part: { type: mongoose.Schema.Types.ObjectId, ref: 'SparePart' },
          serviceCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCategory' },
          serviceItem: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceItem' },
          serviceName: { type: String }
        }
      ],
      history: [
        {
          status: { type: String },
          note: { type: String },
          performedAt: { type: Date, default: Date.now }
        }
      ]
    },
    customerExperience: {
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String },
      ratedAt: { type: Date }
    },
    followUp: {
      reason: { type: String },
      attachments: [
        {
          url: { type: String, required: true },
          kind: { type: String, enum: ['image', 'video'], default: 'image' },
          name: { type: String }
        }
      ],
      createdAt: { type: Date },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      resolvedAt: { type: Date }
    },
    rescheduleCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

orderSchema.index({ status: 1, scheduledAt: 1 });
orderSchema.index({ customerUser: 1, createdAt: -1 });

const generateOrderCode = () => {
  const timePart = Date.now().toString(36).toUpperCase();
  const randomPart = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `ORD-${timePart}-${randomPart}`;
};

orderSchema.pre('save', async function assignOrderCode(next) {
  if (!this.isNew || this.orderCode) return next();

  let codeAssigned = false;
  while (!codeAssigned) {
    const candidate = generateOrderCode();
    const exists = await this.constructor.exists({ orderCode: candidate });
    if (!exists) {
      this.orderCode = candidate;
      codeAssigned = true;
    }
  }
  return next();
});

export default mongoose.model('Order', orderSchema);
