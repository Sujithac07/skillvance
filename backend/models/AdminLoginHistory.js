const mongoose = require('mongoose');

const adminLoginHistorySchema = new mongoose.Schema(
 {
 adminId: {
 type: mongoose.Schema.Types.ObjectId,
 ref: 'Admin',
 required: true,
 index: true
 },
 username: {
 type: String,
 required: true,
 trim: true,
 lowercase: true
 },
 email: {
 type: String,
 required: true,
 trim: true,
 lowercase: true
 },
 ipAddress: {
 type: String,
 trim: true
 },
 userAgent: {
 type: String,
 trim: true
 },
 browser: {
 type: String,
 trim: true
 },
 browserVersion: {
 type: String,
 trim: true
 },
 os: {
 type: String,
 trim: true
 },
 osVersion: {
 type: String,
 trim: true
 },
 deviceType: {
 type: String,
 trim: true
 },
 deviceVendor: {
 type: String,
 trim: true
 },
 deviceModel: {
 type: String,
 trim: true
 },
 source: {
 type: String,
 trim: true
 }
 },
 {
 timestamps: true
 }
);

adminLoginHistorySchema.index({ adminId: 1, createdAt: -1 });

module.exports = mongoose.models.AdminLoginHistory || mongoose.model('AdminLoginHistory', adminLoginHistorySchema);
