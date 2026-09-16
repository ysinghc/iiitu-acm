const mongoose = require('mongoose');

const DepartmentSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true }, // 'engineering' | 'research'
  name: { type: String, required: true },               // "Engineering Department"
  description: { type: String, default: '' },
  bannerImageUrl: { type: String, default: '' },
  mission: { type: String, default: '' },
  // Private departments never appear on the public Verticals pages — they
  // exist only for placement (member assignment, HoD scope, reports).
  visibility: { type: String, enum: ['public', 'private'], default: 'public' },
}, { timestamps: true });

const Department = mongoose.model('Department', DepartmentSchema);
module.exports = Department;
