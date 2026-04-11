const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const Admin = require('../models/Admin');
const AdminLoginHistory = require('../models/AdminLoginHistory');
const { verifyToken, getJwtSecret } = require('../middleware/auth');

const router = express.Router();

const FALLBACK_PASSWORD_HASH = '$2a$12$F0xvNB4dpIvV60fQWQvX6OSQ1D2x6QPHMebVw6fE5qgcRkWxN8S2C';

const loginLimiterWindowMs = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000);
const loginLimiterMax = Number(process.env.AUTH_RATE_LIMIT_MAX || 5);

const loginLimiter = rateLimit({
 windowMs: Number.isFinite(loginLimiterWindowMs) && loginLimiterWindowMs > 0 ? loginLimiterWindowMs : 10 * 60 * 1000,
 max: Number.isFinite(loginLimiterMax) && loginLimiterMax > 0 ? loginLimiterMax : 5,
 standardHeaders: true,
 legacyHeaders: false,
 skipSuccessfulRequests: true,
 message: { message: 'Too many login attempts. Try again later.' }
});

function buildAuthCookieOptions() {
 const isProduction = process.env.NODE_ENV === 'production';

 return {
 httpOnly: true,
 secure: isProduction,
 sameSite: isProduction ? 'none' : 'lax',
 path: '/api',
 maxAge: 15 * 60 * 1000
 };
}

function getAuthCookieName() {
 return process.env.AUTH_COOKIE_NAME || 'skillvance_admin_token';
}

function getClientIp(req) {
 const forwarded = req.headers['x-forwarded-for'];
 if (typeof forwarded === 'string' && forwarded.length > 0) {
 return forwarded.split(',')[0].trim();
 }

 return req.socket?.remoteAddress || req.ip || 'unknown';
}

router.post('/login', loginLimiter, async (req, res, next) => {
 try {
 const username = String(req.body?.username || '').trim().toLowerCase();
 const password = String(req.body?.password || '');

 if (!username || !password || password.length > 256) {
 console.log(`[AUTH] Login attempt - missing credentials`);
 return res.status(400).json({ message: 'Username and password are required.' });
 }

 console.log(`[AUTH] Login attempt - username: ${username}`);
 const admin = await Admin.findOne({ username }).select('password username email role');
 if (!admin) {
 console.log(`[AUTH] Login failed - user not found: ${username}`);
 await bcrypt.compare(password, FALLBACK_PASSWORD_HASH);
 return res.status(401).json({ message: 'Invalid username or password.' });
 }

 console.log(`[AUTH] User found: ${username}, checking password`);
 const isValidPassword = await admin.comparePassword(password);
 if (!isValidPassword) {
 console.log(`[AUTH] Login failed - invalid password for: ${username}`);
 return res.status(401).json({ message: 'Invalid username or password.' });
 }

 console.log(`[AUTH] Password valid for ${username}, generating token`);
 if (typeof admin.needsPasswordRehash === 'function' && admin.needsPasswordRehash()) {
 admin.password = password;
 await admin.save();
 }

 const token = jwt.sign(
 {
 sub: String(admin._id),
 username: admin.username,
 role: admin.role
 },
 getJwtSecret(),
 {
 expiresIn: process.env.JWT_EXPIRES_IN || '15m',
 algorithm: 'HS256',
 issuer: process.env.JWT_ISSUER || 'skillvance-api',
 audience: process.env.JWT_AUDIENCE || 'skillvance-admin'
 }
 );

 console.log(`[AUTH] Login successful for ${username}, setting cookie`);
 res.cookie(getAuthCookieName(), token, buildAuthCookieOptions());

 AdminLoginHistory.create({
 adminId: admin._id,
 username: admin.username,
 email: admin.email,
 ipAddress: getClientIp(req),
 userAgent: String(req.get('user-agent') || '')
 }).catch(historyError => {
 console.error('[AUTH] Failed to store login history:', historyError);
 });

 return res.json({
 token,
 admin: {
 id: admin._id,
 username: admin.username,
 email: admin.email,
 role: admin.role
 }
 });
 } catch (error) {
 console.error(`[AUTH] Login error:`, error);
 return next(error);
 }
});

router.get('/verify', verifyToken, (req, res) => {
 return res.json({
 authenticated: true,
 user: req.user
 });
});

router.post('/logout', verifyToken, (_req, res) => {
 res.clearCookie(getAuthCookieName(), {
 path: '/api'
 });

 return res.json({ message: 'Logged out successfully.' });
});

module.exports = router;