import mongoose from 'mongoose';

const timeSlotSchema = new mongoose.Schema(
  {
    label: { type: String },
    dayOfWeek: { type: Number, min: 0, max: 6, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    intervalMinutes: { type: Number, default: 60, min: 15 },
    capacity: { type: Number, default: 1, min: 1 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

timeSlotSchema.index({ dayOfWeek: 1, startTime: 1 }, { unique: false });

export default mongoose.model('TimeSlotTemplate', timeSlotSchema);
