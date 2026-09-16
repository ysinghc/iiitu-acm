const mongoose = require('mongoose');

const InterestGroupSchema = new mongoose.Schema({
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  // Lead expert — a login account (User with role expert), not a roster string.
  igl: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  name: { type: String, required: true },         // "Software Engineering"
  description: { type: String, default: '' },
  areaOfInterest: { type: String, default: '' },  // Short focus label
  order: { type: Number, default: 0 },            // Display ordering
}, { timestamps: true });

const InterestGroup = mongoose.model('InterestGroup', InterestGroupSchema);
module.exports = InterestGroup;
