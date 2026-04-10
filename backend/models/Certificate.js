const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema(
 {
 id: {
 type: String,
 required: true,
 uppercase: true,
 trim: true,
 match: /^SKV\d{4}[A-Z]{2,5}\d{5}$/
 },
 name: {
 type: String,
 required: true,
 trim: true,
 minlength: 2,
 maxlength: 120
 },
 domain: {
 type: String,
 required: true,
 trim: true,
 maxlength: 120
 },
 email: {
 type: String,
 trim: true,
 lowercase: true,
 maxlength: 180
 },
 issueDate: {
 type: Date,
 required: true
 },
 score: {
 type: Number,
 min: 0,
 max: 100,
 default: 0
 },
 mentorName: {
 type: String,
 required: true,
 trim: true,
 maxlength: 120
 },
 verified: {
 type: Boolean,
 default: true
 },
 verificationCount: {
 type: Number,
 default: 0,
 min: 0
 },
 createdBy: {
 type: mongoose.Schema.Types.ObjectId,
 ref: 'Admin'
 },
 verifiedIPs: {
 type: [String],
 default: []
 },
 lastVerifiedAt: {
 type: Date
 }
 },
 {
 timestamps: true
 }
);

certificateSchema.virtual('completionDate')
 .get(function getCompletionDate() {
 return this.issueDate;
 })
 .set(function setCompletionDate(value) {
 this.issueDate = value;
 });

certificateSchema.set('toJSON', { virtuals: true });
certificateSchema.set('toObject', { virtuals: true });

certificateSchema.index({ id: 1 }, { unique: true });
certificateSchema.index({ verified: 1 });
certificateSchema.index({ createdAt: -1 });
certificateSchema.index({ domain: 1 });

module.exports =
 mongoose.models.Certificate || mongoose.model('Certificate', certificateSchema);