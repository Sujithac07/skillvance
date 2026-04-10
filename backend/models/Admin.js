const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

function getBcryptRounds() {
 return 12;
}

const adminSchema = new mongoose.Schema(
 {
 username: {
 type: String,
 required: true,
 unique: true,
 trim: true,
 lowercase: true
 },
 email: {
 type: String,
 required: true,
 unique: true,
 trim: true,
 lowercase: true
 },
 password: {
 type: String,
 required: true,
 minlength: 8,
 select: false
 },
 role: {
 type: String,
 default: 'admin',
 enum: ['admin']
 }
 },
 {
 timestamps: true
 }
);

adminSchema.pre('save', async function preSave(next) {
 if (!this.isModified('password')) {
 return next();
 }

 this.password = await bcrypt.hash(this.password, getBcryptRounds());
 return next();
});

adminSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
 return bcrypt.compare(candidatePassword, this.password);
};

adminSchema.methods.needsPasswordRehash = function needsPasswordRehash() {
 try {
 const currentRounds = bcrypt.getRounds(this.password || '');
 return currentRounds < getBcryptRounds();
 } catch (_error) {
 return false;
 }
};

module.exports = mongoose.models.Admin || mongoose.model('Admin', adminSchema);