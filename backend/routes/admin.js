const express = require('express');
const bcrypt = require('bcryptjs');

const Admin = require('../models/Admin');
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
 admin: {
 id: createdAdmin._id,
 username: createdAdmin.username,
 email: createdAdmin.email,
 role: createdAdmin.role
 }
 });
 } catch (error) {
 if (error.code === 11000) {
 return res.status(409).json({ message: 'An admin with that username or email already exists.' });
 }

 return next(error);
 }
});

module.exports = router;
