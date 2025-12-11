import mongoose from 'mongoose';

const technicianAttendanceSchema = new mongoose.Schema(
  {
    technician: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    status: { type: String, enum: ['present', 'absent', 'on_leave'], default: 'present' },
    checkInAt: { type: Date },
    checkOutAt: { type: Date },
    note: { type: String }
  },
  { timestamps: true }
);

technicianAttendanceSchema.index({ technician: 1, date: 1 }, { unique: true });

export default mongoose.model('TechnicianAttendance', technicianAttendanceSchema);
