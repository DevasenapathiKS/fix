import mongoose from 'mongoose';

const technicianSkillSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

technicianSkillSchema.index({ name: 1 }, { unique: true });

export default mongoose.model('TechnicianSkill', technicianSkillSchema);
