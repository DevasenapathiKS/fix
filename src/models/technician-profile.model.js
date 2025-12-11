import mongoose from 'mongoose';

const technicianProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    serviceCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCategory' }],
    serviceItems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ServiceItem' }],
    skills: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TechnicianSkill' }],
    experienceYears: { type: Number, default: 0 },
    baseLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: [0, 0]
      }
    },
    workingHours: {
      start: { type: String, default: '08:00' },
      end: { type: String, default: '20:00' }
    },
    averageRating: { type: Number, default: 5 },
    calendarBlockedDates: [{ type: Date }]
  },
  { timestamps: true }
);

technicianProfileSchema.index({ baseLocation: '2dsphere' });

export default mongoose.model('TechnicianProfile', technicianProfileSchema);
