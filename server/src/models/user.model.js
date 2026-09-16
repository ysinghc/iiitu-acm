/**
 * Single identity for every login: exec board, HoDs, experts (mentors),
 * scholars, fellows and general members.
 *
 * - Scholars / fellows MUST have a mentor (an expert of their department).
 * - HoDs and experts are scoped to exactly one department.
 * - Exec roles are chapter-wide.
 */
const mongoose = require('mongoose');
const { ROLES } = require('../constants/roles');

const UserSchema = new mongoose.Schema(
  {
    // Human-readable member ID (ACM-2026-0007), auto-assigned on creation.
    // Sparse so the unique index builds cleanly even before backfill runs.
    userId: { type: String, unique: true, sparse: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.MEMBER,
    },
    // Exec title is implicit in role (chair/vice_chair/secretary/treasurer).
    // Department slug referencing the Department collection ('' = none).
    // Validated against live departments in services — never a stale enum.
    department: { type: String, default: '', trim: true },
    interestGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InterestGroup',
      default: null,
    },
    mentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    batch: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
    bio: { type: String, default: '' },
    github: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    passwordReset: {
      tokenHash: { type: String, default: '' },
      expiresAt: { type: Date, default: null },
    },
    // Bumped on password/role changes — instantly invalidates every
    // previously issued token (logout-everywhere semantics).
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

UserSchema.index({ role: 1, department: 1 });
UserSchema.index({ mentor: 1 });

UserSchema.methods.toSafeJSON = function toSafeJSON() {
  const obj = this.toObject({ versionKey: false });
  delete obj.passwordHash;
  delete obj.passwordReset; // reset token hashes must never leave the server
  return obj;
};

// Auto-assign a readable member ID to every new account.
UserSchema.pre('save', async function assignUserId() {
  if (!this.userId) {
    // Lazy require avoids any import-cycle risk with services.
    const { generateUserId } = require('../services/ids');
    this.userId = await generateUserId();
  }
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);
module.exports = User;
