import mongoose from 'mongoose';

const technicianAvailabilitySchema = new mongoose.Schema(
  {
    technician: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dayOfWeek: { type: Number, min: 0, max: 6, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    isWorkingDay: { type: Boolean, default: true }
  },
  { timestamps: true }
);

technicianAvailabilitySchema.index({ technician: 1, dayOfWeek: 1 }, { unique: true });

export default mongoose.model('TechnicianAvailability', technicianAvailabilitySchema);
