const crypto = require('crypto');
const mongoose = require('mongoose');

function hashToken(token) {
 return crypto.createHash('sha256').update(String(token || ''), 'utf8').digest('hex');
}

const refreshTokenSchema = new mongoose.Schema(
 {
  tokenHash: {
   type: String,
   required: true,
   unique: true,
   index: true
  },
  jti: {
   type: String,
   required: true,
   unique: true,
   index: true
  },
  adminId: {
   type: mongoose.Schema.Types.ObjectId,
   required: true,
   ref: 'Admin',
   index: true
  },
  expiresAt: {
   type: Date,
   required: true,
   index: true
  },
  revokedAt: {
   type: Date,
   default: null,
   index: true
  },
  replacedByJti: {
   type: String,
   default: null
  },
  createdByIp: {
   type: String,
   default: null
  },
  lastUsedAt: {
   type: Date,
   default: null
  }
 },
 {
  timestamps: true
 }
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

refreshTokenSchema.statics.hashToken = hashToken;

module.exports = mongoose.models.RefreshToken || mongoose.model('RefreshToken', refreshTokenSchema);
