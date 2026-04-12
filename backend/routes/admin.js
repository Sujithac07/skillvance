const express = require('express');
const bcrypt = require('bcryptjs');

const Admin = require('../models/Admin');
const AdminLoginHistory = require('../models/AdminLoginHistory');
const { verifyToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

function normalizeText(value) {
 return String(value || '').trim();
}

function normalizeUsername(value) {
 return normalizeText(value).toLowerCase();
}

function isValidEmail(value) {
 const email = normalizeText(value).toLowerCase();
 return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePasswordStrength(password) {
 const value = String(password || '');
 if (value.length < 8 || value.length > 256) {
 return 'Password must be between 8 and 256 characters.';
 }

 return null;
}

function validateUsername(username) {
 const value = normalizeUsername(username);
 if (value.length < 3 || value.length > 64) {
 return 'Username must be between 3 and 64 characters.';
 }

 if (!/^[a-z0-9._-]+$/.test(value)) {
 return 'Username can only contain lowercase letters, numbers, dots, underscores, and hyphens.';
 }

 return null;
}

function toAccountResponse(admin, summary = {}) {
 return {
 id: admin._id,
 username: admin.username,
 email: admin.email,
 role: admin.role,
 createdAt: admin.createdAt,
 updatedAt: admin.updatedAt,
 loginCount: summary.loginCount || 0,
 lastLoginAt: summary.lastLoginAt || null
 };
}

function maskEmail(email) {
 const value = String(email || '').trim();
 if (!value || !value.includes('@')) {
  return '***';
 }

 const [localPart, domainPart] = value.split('@');
 const safeLocal = localPart.length <= 2
  ? `${localPart.charAt(0) || '*'}*`
  : `${localPart.slice(0, 2)}***`;

 if (!domainPart) {
  return `${safeLocal}@***`;
 }

 const [domainName, ...restDomain] = domainPart.split('.');
 const safeDomainName = domainName.length <= 2
  ? `${domainName.charAt(0) || '*'}*`
  : `${domainName.slice(0, 2)}***`;
 const tld = restDomain.length ? `.${restDomain.join('.')}` : '';

 return `${safeLocal}@${safeDomainName}${tld}`;
}

function maskRole(role) {
 const value = String(role || '').trim();
 if (!value) {
  return '***';
 }

 if (value.length <= 2) {
  return `${value.charAt(0) || '*'}*`;
 }

 return `${value.charAt(0)}***${value.charAt(value.length - 1)}`;
}

function toRedactedAccountResponse(admin, summary = {}) {
 const account = toAccountResponse(admin, summary);
 return {
  ...account,
  email: maskEmail(account.email),
  role: maskRole(account.role)
 };
}

async function loadLoginSummaries(adminIds) {
 if (!adminIds.length) {
 return new Map();
 }

 const summaries = await AdminLoginHistory.aggregate([
  {
   $match: {
    adminId: { $in: adminIds }
   }
  },
  {
   $sort: { createdAt: -1 }
  },
  {
   $group: {
    _id: '$adminId',
    loginCount: { $sum: 1 },
    lastLoginAt: { $first: '$createdAt' }
   }
  }
 ]);

 return new Map(summaries.map(item => [String(item._id), item]));
}

router.get('/settings/admins', verifyToken, isAdmin, async (_req, res, next) => {
 try {
 const admins = await Admin.find({})
 .select('username email role createdAt updatedAt')
 .sort({ createdAt: -1 })
 .lean();

 const summaries = await loadLoginSummaries(admins.map(admin => admin._id));

 return res.json({
 admins: admins.map(admin => toAccountResponse(admin, summaries.get(String(admin._id)))),
 total: admins.length
 });
 } catch (error) {
 return next(error);
 }
});

router.get('/settings/admins/:adminId/login-history', verifyToken, isAdmin, async (req, res, next) => {
 try {
 const adminId = String(req.params.adminId || '').trim();
 if (!adminId) {
 return res.status(400).json({ message: 'Admin ID is required.' });
 }

 const admin = await Admin.findById(adminId).select('username email role createdAt updatedAt').lean();
 if (!admin) {
 return res.status(404).json({ message: 'Admin account not found.' });
 }

 const history = await AdminLoginHistory.find({ adminId })
 .sort({ createdAt: -1 })
 .limit(25)
 .lean();

 return res.json({
 admin: toAccountResponse(admin),
 history: history.map(item => ({
 id: item._id,
 username: item.username,
 email: item.email,
 ipAddress: item.ipAddress,
 userAgent: item.userAgent,
 browser: item.browser,
 browserVersion: item.browserVersion,
 os: item.os,
 osVersion: item.osVersion,
 deviceType: item.deviceType,
 deviceVendor: item.deviceVendor,
 deviceModel: item.deviceModel,
 source: item.source,
 createdAt: item.createdAt
 }))
 });
 } catch (error) {
 return next(error);
 }
});

router.post('/settings/password', verifyToken, isAdmin, async (req, res, next) => {
 try {
 const currentPassword = String(req.body?.currentPassword || '');
 const newPassword = String(req.body?.newPassword || '');
 const confirmPassword = String(req.body?.confirmPassword || '');

 if (!currentPassword || !newPassword || !confirmPassword) {
 return res.status(400).json({ message: 'Current password, new password, and confirmation are required.' });
 }

 if (newPassword !== confirmPassword) {
 return res.status(400).json({ message: 'New password and confirmation do not match.' });
 }

 const passwordError = validatePasswordStrength(newPassword);
 if (passwordError) {
 return res.status(400).json({ message: passwordError });
 }

 const admin = await Admin.findById(req.user.sub).select('+password');
 if (!admin) {
 return res.status(404).json({ message: 'Admin account not found.' });
 }

 const isCurrentPasswordValid = await bcrypt.compare(currentPassword, admin.password);
 if (!isCurrentPasswordValid) {
 return res.status(401).json({ message: 'Current password is incorrect.' });
 }

 admin.password = newPassword;
 await admin.save();

 return res.json({ message: 'Password updated successfully.' });
 } catch (error) {
 return next(error);
 }
});

router.post('/settings/admins', verifyToken, isAdmin, async (req, res, next) => {
 try {
 const username = normalizeUsername(req.body?.username);
 const email = normalizeText(req.body?.email).toLowerCase();
 const password = String(req.body?.password || '');

 if (!username || !email || !password) {
 return res.status(400).json({ message: 'Username, email, and password are required.' });
 }

 const usernameError = validateUsername(username);
 if (usernameError) {
 return res.status(400).json({ message: usernameError });
 }

 if (!isValidEmail(email)) {
 return res.status(400).json({ message: 'Please provide a valid email address.' });
 }

 const passwordError = validatePasswordStrength(password);
 if (passwordError) {
 return res.status(400).json({ message: passwordError });
 }

 const existingAdmin = await Admin.findOne({
 $or: [{ username }, { email }]
 }).lean();

 if (existingAdmin) {
 return res.status(409).json({ message: 'An admin with that username or email already exists.' });
 }

 const createdAdmin = await Admin.create({
 username,
 email,
 password,
 role: 'admin'
 });

 return res.status(201).json({
 message: 'Admin account created successfully.',
 admin: toRedactedAccountResponse(createdAdmin)
 });
 } catch (error) {
 if (error.code === 11000) {
 return res.status(409).json({ message: 'An admin with that username or email already exists.' });
 }

 return next(error);
 }
});

router.put('/settings/admins/:adminId', verifyToken, isAdmin, async (req, res, next) => {
 try {
 const adminId = String(req.params.adminId || '').trim();
 if (!adminId) {
 return res.status(400).json({ message: 'Admin ID is required.' });
 }

 const updates = {};
 if (req.body?.username !== undefined) {
 updates.username = normalizeUsername(req.body.username);
 const usernameError = validateUsername(updates.username);
 if (usernameError) {
 return res.status(400).json({ message: usernameError });
 }
 }

 if (req.body?.email !== undefined) {
 updates.email = normalizeText(req.body.email).toLowerCase();
 if (!isValidEmail(updates.email)) {
 return res.status(400).json({ message: 'Please provide a valid email address.' });
 }
 }

 if (req.body?.password !== undefined && String(req.body.password).trim()) {
 const password = String(req.body.password || '');
 const passwordError = validatePasswordStrength(password);
 if (passwordError) {
 return res.status(400).json({ message: passwordError });
 }

 updates.password = password;
 }

 if (!Object.keys(updates).length) {
 return res.status(400).json({ message: 'Provide at least one field to update.' });
 }

 const duplicateQuery = [];
 if (updates.username) {
 duplicateQuery.push({ username: updates.username });
 }
 if (updates.email) {
 duplicateQuery.push({ email: updates.email });
 }

 if (duplicateQuery.length) {
 const duplicateAdmin = await Admin.findOne({
 _id: { $ne: adminId },
 $or: duplicateQuery
 }).lean();

 if (duplicateAdmin) {
 return res.status(409).json({ message: 'Another admin already uses that username or email.' });
 }
 }

 const admin = await Admin.findById(adminId).select('+password');
 if (!admin) {
 return res.status(404).json({ message: 'Admin account not found.' });
 }

 if (updates.username) {
 admin.username = updates.username;
 }

 if (updates.email) {
 admin.email = updates.email;
 }

 if (updates.password) {
 admin.password = updates.password;
 }

 await admin.save();

 return res.json({
 message: 'Admin account updated successfully.',
 admin: toRedactedAccountResponse(admin)
 });
 } catch (error) {
 if (error.code === 11000) {
 return res.status(409).json({ message: 'Another admin already uses that username or email.' });
 }

 return next(error);
 }
});

router.delete('/settings/admins/:adminId', verifyToken, isAdmin, async (req, res, next) => {
 try {
 const adminId = String(req.params.adminId || '').trim();
 if (!adminId) {
 return res.status(400).json({ message: 'Admin ID is required.' });
 }

 if (String(req.user.sub) === adminId) {
 return res.status(400).json({ message: 'You cannot delete your own account while signed in.' });
 }

 const adminCount = await Admin.countDocuments();
 if (adminCount <= 1) {
 return res.status(400).json({ message: 'At least one admin account must remain.' });
 }

 const deleted = await Admin.findByIdAndDelete(adminId);
 if (!deleted) {
 return res.status(404).json({ message: 'Admin account not found.' });
 }

 await AdminLoginHistory.deleteMany({ adminId });

 return res.json({ message: 'Admin account deleted successfully.' });
 } catch (error) {
 return next(error);
 }
});

module.exports = router;
