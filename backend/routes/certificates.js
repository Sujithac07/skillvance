const express = require('express');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const Certificate = require('../models/Certificate');
const { verifyToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

const verifyLimiterWindowMs = Number(process.env.CERT_VERIFY_RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000);
const verifyLimiterMax = Number(process.env.CERT_VERIFY_RATE_LIMIT_MAX || 60);

const verifyLimiter = rateLimit({
 windowMs: Number.isFinite(verifyLimiterWindowMs) && verifyLimiterWindowMs > 0 ? verifyLimiterWindowMs : 10 * 60 * 1000,
 max: Number.isFinite(verifyLimiterMax) && verifyLimiterMax > 0 ? verifyLimiterMax : 60,
 standardHeaders: true,
 legacyHeaders: false,
 message: { message: 'Too many verification attempts. Try again later.' }
});

function parseScore(value) {
 if (value === undefined || value === null || value === '') {
 return undefined;
 }

 const num = Number(value);
 return Number.isFinite(num) ? num : undefined;
}

function parseDate(value) {
 if (!value) {
 return undefined;
 }

 const date = new Date(value);
 return Number.isNaN(date.getTime()) ? undefined : date;
}

function normalizeCertificatePayload(payload) {
 const id = String(payload?.id || '').trim().toUpperCase();
 const name = String(payload?.name || '').trim();
 const domain = String(payload?.domain || '').trim();
 const email = String(payload?.email || '').trim().toLowerCase();
 const mentorName = String(payload?.mentorName || '').trim();
 const issueDate = parseDate(getIssueDateFromBody(payload));
 const score = parseScore(payload?.score);
 const verified = payload?.verified === undefined ? true : Boolean(payload?.verified);

 if (!id || !name || !domain || !issueDate || !mentorName) {
 throw new Error('Certificate ID, name, domain, issue date, and mentor name are required.');
 }

 const normalized = {
 id,
 name,
 domain,
 issueDate,
 mentorName,
 verified
 };

 if (email) {
 normalized.email = email;
 }

 if (score !== undefined) {
 normalized.score = score;
 }

 const verificationCount = Number(payload?.verificationCount);
 if (Number.isFinite(verificationCount) && verificationCount >= 0) {
 normalized.verificationCount = Math.floor(verificationCount);
 }

 if (Array.isArray(payload?.verifiedIPs)) {
 normalized.verifiedIPs = payload.verifiedIPs.filter(ip => typeof ip === 'string' && ip.trim().length > 0).map(ip => ip.trim());
 }

 const lastVerifiedAt = parseDate(payload?.lastVerifiedAt);
 if (lastVerifiedAt) {
 normalized.lastVerifiedAt = lastVerifiedAt;
 }

 return normalized;
}

function getIssueDateFromBody(body) {
 return body?.issueDate || body?.completionDate;
}

function getClientIp(req) {
 const forwarded = req.headers['x-forwarded-for'];
 if (typeof forwarded === 'string' && forwarded.length > 0) {
 return forwarded.split(',')[0].trim();
 }

 return req.socket?.remoteAddress || 'unknown';
}

router.get('/verify/:id', verifyLimiter, async (req, res, next) => {
 try {
 const id = String(req.params.id || '').trim().toUpperCase();
 if (!id) {
 return res.status(400).json({ message: 'Certificate ID is required.' });
 }

 const clientIp = getClientIp(req);
 const certificate = await Certificate.findOneAndUpdate(
 { id, verified: true },
 {
 $inc: { verificationCount: 1 },
 $set: { lastVerifiedAt: new Date() },
 $addToSet: { verifiedIPs: clientIp }
 },
 { new: true }
 ).lean();
 if (!certificate) {
 return res.status(404).json({ message: 'Certificate not found.' });
 }

 return res.json({
 verified: true,
 certificate: {
 id: certificate.id,
 name: certificate.name,
 domain: certificate.domain,
 email: certificate.email,
 issueDate: certificate.issueDate || certificate.completionDate,
 completionDate: certificate.issueDate || certificate.completionDate,
 score: certificate.score,
 mentorName: certificate.mentorName,
 verificationCount: certificate.verificationCount,
 lastVerifiedAt: certificate.lastVerifiedAt
 }
 });
 } catch (error) {
 return next(error);
 }
});

router.get('/', verifyToken, isAdmin, async (req, res, next) => {
 try {
 // Double-check authentication - should not reach here without valid auth
 if (!req.user) {
 return res.status(401).json({ message: 'Authentication required.' });
 }

 if (req.user.role !== 'admin') {
 return res.status(403).json({ message: 'Admin access required.' });
 }

 const rawLimit = Number(req.query.limit || 100);
 const limit = Math.min(Math.max(rawLimit, 1), 1000);

 const certificates = await Certificate.find({})
 .sort({ createdAt: -1 })
 .limit(limit)
 .lean();

 return res.json({ certificates });
 } catch (error) {
 return next(error);
 }
});

router.post('/import', verifyToken, isAdmin, async (req, res, next) => {
 try {
 const source = Array.isArray(req.body)
 ? req.body
 : Array.isArray(req.body?.certificates)
 ? req.body.certificates
 : Array.isArray(req.body?.items)
 ? req.body.items
 : null;

 if (!source || source.length === 0) {
 return res.status(400).json({ message: 'At least one certificate is required for import.' });
 }

 const replace = Boolean(req.body?.replace);
 const certificates = source.map(normalizeCertificatePayload);

 for (const certificate of certificates) {
 await Certificate.findOneAndUpdate(
 { id: certificate.id },
 { $set: certificate, $setOnInsert: { verificationCount: 0, verifiedIPs: [] } },
 { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
 );
 }

 if (replace) {
 const ids = certificates.map(certificate => certificate.id);
 await Certificate.deleteMany({ id: { $nin: ids } });
 }

 return res.json({
 message: replace ? 'Certificates imported and replaced successfully.' : 'Certificates imported successfully.',
 imported: certificates.length,
 replace
 });
 } catch (error) {
 if (error.message && error.message.includes('required')) {
 return res.status(400).json({ message: error.message });
 }

 return next(error);
 }
});

router.post('/', verifyToken, isAdmin, async (req, res, next) => {
 try {
 const payload = {
 id: String(req.body?.id || '').trim().toUpperCase(),
 name: String(req.body?.name || '').trim(),
 domain: String(req.body?.domain || '').trim(),
 email: String(req.body?.email || '').trim().toLowerCase(),
 issueDate: getIssueDateFromBody(req.body),
 score: parseScore(req.body?.score),
 mentorName: String(req.body?.mentorName || '').trim(),
 verified: true,
 verificationCount: 0,
 verifiedIPs: []
 };

 if (!payload.email) {
 delete payload.email;
 }

 if (payload.score === undefined) {
 delete payload.score;
 }

 if (req.user?.sub && mongoose.Types.ObjectId.isValid(req.user.sub)) {
 payload.createdBy = req.user.sub;
 }

 const created = await Certificate.create(payload);

 return res.status(201).json({
 message: 'Certificate created successfully.',
 certificate: created
 });
 } catch (error) {
 if (error.code === 11000) {
 return res.status(409).json({ message: 'Certificate ID already exists.' });
 }

 return next(error);
 }
});

router.put('/:id', verifyToken, isAdmin, async (req, res, next) => {
 try {
 const id = String(req.params.id || '').trim().toUpperCase();
 if (!id) {
 return res.status(400).json({ message: 'Certificate ID is required.' });
 }

 const update = {
 name: req.body?.name,
 domain: req.body?.domain,
 email: req.body?.email,
 issueDate: getIssueDateFromBody(req.body),
 score: parseScore(req.body?.score),
 mentorName: req.body?.mentorName,
 verified: req.body?.verified
 };

 Object.keys(update).forEach(key => {
 if (update[key] === undefined || update[key] === null || update[key] === '') {
 delete update[key];
 }
 });

 const certificate = await Certificate.findOneAndUpdate(
 { id },
 { $set: update },
 { new: true, runValidators: true }
 );

 if (!certificate) {
 return res.status(404).json({ message: 'Certificate not found.' });
 }

 return res.json({
 message: 'Certificate updated successfully.',
 certificate
 });
 } catch (error) {
 return next(error);
 }
});

router.delete('/:id', verifyToken, isAdmin, async (req, res, next) => {
 try {
 const id = String(req.params.id || '').trim().toUpperCase();
 if (!id) {
 return res.status(400).json({ message: 'Certificate ID is required.' });
 }

 const certificate = await Certificate.findOneAndDelete({ id });
 if (!certificate) {
 return res.status(404).json({ message: 'Certificate not found.' });
 }

 return res.json({ message: 'Certificate deleted successfully.' });
 } catch (error) {
 return next(error);
 }
});

module.exports = router;