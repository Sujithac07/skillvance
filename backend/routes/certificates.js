const express = require('express');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const Certificate = require('../models/Certificate');
const { verifyToken, isAdmin } = require('../middleware/auth');

const router = express.Router();
const CERT_ID_REGEX = /^SKV\d{4}[A-Z]{2,5}\d{5}$/;
const LIST_CACHE_TTL_MS = 30 * 1000;

const certificateListCache = {
 data: null,
 expiresAt: 0
};

const verifyLimiterWindowMs = Number(process.env.CERT_VERIFY_RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000);
const verifyLimiterMax = Number(process.env.CERT_VERIFY_RATE_LIMIT_MAX || 60);

const verifyLimiter = rateLimit({
 windowMs: Number.isFinite(verifyLimiterWindowMs) && verifyLimiterWindowMs > 0 ? verifyLimiterWindowMs : 10 * 60 * 1000,
 max: Number.isFinite(verifyLimiterMax) && verifyLimiterMax > 0 ? verifyLimiterMax : 60,
 standardHeaders: true,
 legacyHeaders: false,
 message: { message: 'Too many verification attempts. Try again later.' }
});

function getPublicBaseUrl(req) {
 const configured = String(process.env.PUBLIC_APP_URL || '').trim();
 if (configured) {
  return configured.replace(/\/$/, '');
 }

 if (!req) {
  return 'https://www.skillvancetechnologies.com';
 }

 const protocol = String(req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0].trim();
 const host = String(req.headers['x-forwarded-host'] || req.get('host') || '').split(',')[0].trim();
 if (!host) {
  return 'https://www.skillvancetechnologies.com';
 }

 return `${protocol}://${host}`.replace(/\/$/, '');
}

function buildVerificationUrl(certId, req) {
 const id = String(certId || '').trim().toUpperCase();
 const baseUrl = getPublicBaseUrl(req);
 const query = new URLSearchParams({ certId: id });
 return `${baseUrl}/verify?${query.toString()}`;
}

function buildQrImageUrl(verificationUrl) {
 const encoded = encodeURIComponent(String(verificationUrl || ''));
 return `https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encoded}`;
}

function toApiCertificate(certificate, req) {
 const verificationUrl = buildVerificationUrl(certificate.id, req);
 return {
  ...certificate,
  verificationUrl,
  qrCodeUrl: buildQrImageUrl(verificationUrl)
 };
}

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

function invalidateCertificateListCache() {
 certificateListCache.data = null;
 certificateListCache.expiresAt = 0;
}

function validateCertificate(candidate, { partial = false } = {}) {
 const id = String(candidate?.id || '').trim().toUpperCase();
 if (!partial || candidate?.id !== undefined) {
 if (!id || !CERT_ID_REGEX.test(id)) {
 return 'Certificate ID must match format SKVYYYYCODE00000.';
 }
 }

 const name = candidate?.name;
 if (!partial || name !== undefined) {
 const normalizedName = String(name || '').trim();
 if (!normalizedName || normalizedName.length < 2 || normalizedName.length > 120) {
 return 'Student name must be between 2 and 120 characters.';
 }
 }

 const domain = candidate?.domain;
 if (!partial || domain !== undefined) {
 const normalizedDomain = String(domain || '').trim();
 if (!normalizedDomain || normalizedDomain.length > 120) {
 return 'Domain is required and must be 120 characters or less.';
 }
 }

 if (!partial || candidate?.email !== undefined) {
 const email = String(candidate?.email || '').trim();
 if (email.length > 180) {
 return 'Email must be 180 characters or less.';
 }
 }

 const issueDate = candidate?.issueDate;
 if (!partial || issueDate !== undefined) {
 if (!(issueDate instanceof Date) || Number.isNaN(issueDate.getTime())) {
 return 'Issue date is invalid.';
 }
 }

 if (!partial || candidate?.mentorName !== undefined) {
 const mentorName = String(candidate?.mentorName || '').trim();
 if (!mentorName || mentorName.length > 120) {
 return 'Mentor name is required and must be 120 characters or less.';
 }
 }

 if (!partial || candidate?.score !== undefined) {
 const score = candidate?.score;
 if (score !== undefined) {
 const numericScore = Number(score);
 if (!Number.isFinite(numericScore) || numericScore < 0 || numericScore > 100) {
 return 'Score must be a number between 0 and 100.';
 }
 }
 }

 return null;
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
 {
 new: true,
 projection: {
 id: 1,
 name: 1,
 domain: 1,
 email: 1,
 issueDate: 1,
 score: 1,
 mentorName: 1,
 verificationCount: 1,
 lastVerifiedAt: 1
 }
 }
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
 lastVerifiedAt: certificate.lastVerifiedAt,
 verificationUrl: buildVerificationUrl(certificate.id, req),
 qrCodeUrl: buildQrImageUrl(buildVerificationUrl(certificate.id, req))
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

 const rawLimit = Number(req.query.limit || 100);
 const limit = Math.min(Math.max(rawLimit, 1), 1000);

 if (certificateListCache.data && certificateListCache.expiresAt > Date.now()) {
 return res.json({ certificates: certificateListCache.data });
 }

 const certificates = await Certificate.find({})
 .select('id name domain email issueDate score mentorName verified verificationCount lastVerifiedAt createdAt updatedAt')
 .sort({ createdAt: -1 })
 .limit(limit)
 .lean();

 certificateListCache.data = certificates;
 certificateListCache.expiresAt = Date.now() + LIST_CACHE_TTL_MS;

 return res.json({ certificates: certificates.map(certificate => toApiCertificate(certificate, req)) });
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
 const validationError = validateCertificate(certificate, { partial: false });
 if (validationError) {
 return res.status(400).json({ message: validationError });
 }
 }

 const operations = certificates.map(certificate => ({
 updateOne: {
 filter: { id: certificate.id },
 update: {
 $set: certificate,
 $setOnInsert: { verificationCount: 0, verifiedIPs: [] }
 },
 upsert: true
 }
 }));

 await Certificate.bulkWrite(operations, { ordered: false });

 if (replace) {
 const ids = certificates.map(certificate => certificate.id);
 await Certificate.deleteMany({ id: { $nin: ids } });
 }

 invalidateCertificateListCache();

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

 payload.issueDate = parseDate(payload.issueDate);
 const validationError = validateCertificate(payload, { partial: false });
 if (validationError) {
 return res.status(400).json({ message: validationError });
 }

 const created = await Certificate.create(payload);

 invalidateCertificateListCache();

 return res.status(201).json({
 message: 'Certificate created successfully.',
 certificate: toApiCertificate(created.toObject ? created.toObject() : created, req)
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
 name: req.body?.name !== undefined ? String(req.body.name).trim() : undefined,
 domain: req.body?.domain !== undefined ? String(req.body.domain).trim() : undefined,
 email: req.body?.email !== undefined ? String(req.body.email).trim().toLowerCase() : undefined,
 issueDate: parseDate(getIssueDateFromBody(req.body)),
 score: parseScore(req.body?.score),
 mentorName: req.body?.mentorName !== undefined ? String(req.body.mentorName).trim() : undefined,
 verified: req.body?.verified
 };

 Object.keys(update).forEach(key => {
 if (update[key] === undefined || update[key] === null || update[key] === '') {
 delete update[key];
 }
 });

 if (Object.keys(update).length === 0) {
 return res.status(400).json({ message: 'Provide at least one field to update.' });
 }

 const validationError = validateCertificate({ id, ...update }, { partial: true });
 if (validationError) {
 return res.status(400).json({ message: validationError });
 }

 const certificate = await Certificate.findOneAndUpdate(
 { id },
 { $set: update },
 { new: true }
 );

 if (!certificate) {
 return res.status(404).json({ message: 'Certificate not found.' });
 }

 return res.json({
 message: 'Certificate updated successfully.',
 certificate: toApiCertificate(certificate.toObject ? certificate.toObject() : certificate, req)
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

 invalidateCertificateListCache();

 return res.json({ message: 'Certificate deleted successfully.' });
 } catch (error) {
 return next(error);
 }
});

module.exports = router;