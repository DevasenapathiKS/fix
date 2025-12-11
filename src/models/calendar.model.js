import mongoose from 'mongoose';

const technicianCalendarSchema = new mongoose.Schema(
  {
    technician: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    date: { type: Date, required: true },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    status: { type: String, enum: ['blocked', 'completed', 'cancelled'], default: 'blocked' }
  },
  { timestamps: true }
);

technicianCalendarSchema.index({ technician: 1, start: 1, end: 1 });
technicianCalendarSchema.index({ technician: 1, date: 1 }, { unique: true });

technicianCalendarSchema.pre('validate', function ensureDate(next) {
  if (!this.date && this.start) {
    this.date = this.start;
  }
  next();
});

export default mongoose.model('TechnicianCalendar', technicianCalendarSchema);
