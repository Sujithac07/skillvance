const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const Admin = require('../models/Admin');
const AdminLoginHistory = require('../models/AdminLoginHistory');
const RefreshToken = require('../models/RefreshToken');
const { verifyToken, getJwtSecret } = require('../middleware/auth');
const { buildLoginClientInfo } = require('../utils/client-info');

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

function toSafeAdminResponse(admin) {
 return {
  id: String(admin._id),
  username: admin.username,
  email: maskEmail(admin.email),
  role: maskRole(admin.role)
 };
}

function getJwtAlgorithm() {
 const raw = String(process.env.JWT_ALGORITHM || 'HS256').trim().toUpperCase();
 return raw === 'RS256' ? 'RS256' : 'HS256';
}

function normalizePem(value) {
 const raw = String(value || '').trim();
 if (!raw) {
  return '';
 }

 // Vercel env UI often stores multiline keys with escaped newlines.
 const withoutQuotes = raw.replace(/^"([\s\S]*)"$/, '$1').replace(/^'([\s\S]*)'$/, '$1');
 return withoutQuotes
  .replace(/\\r\\n/g, '\n')
  .replace(/\\n/g, '\n');
}

function getJwtSigningCandidates() {
 const preferred = getJwtAlgorithm();
 const candidates = [];

 const rsKey = normalizePem(process.env.JWT_PRIVATE_KEY);
 const hsSecret = String(process.env.JWT_SECRET || '').trim();

 if (preferred === 'RS256') {
  if (rsKey) {
   candidates.push({ algorithm: 'RS256', key: rsKey });
  }
  if (hsSecret) {
   candidates.push({ algorithm: 'HS256', key: hsSecret });
  }
 } else {
  if (hsSecret) {
   candidates.push({ algorithm: 'HS256', key: hsSecret });
  }
  if (rsKey) {
   candidates.push({ algorithm: 'RS256', key: rsKey });
  }
 }

 if (!candidates.length) {
  throw new Error('No JWT signing key is configured. Set JWT_SECRET or JWT_PRIVATE_KEY.');
 }

 return candidates;
}

function parseDurationMs(duration, fallbackMs) {
 const value = String(duration || '').trim().toLowerCase();
 if (!value) {
  return fallbackMs;
 }

 if (/^\d+$/.test(value)) {
  const rawMs = Number(value);
  return Number.isFinite(rawMs) && rawMs > 0 ? rawMs : fallbackMs;
 }

 const match = value.match(/^(\d+)(ms|s|m|h|d)$/);
 if (!match) {
  return fallbackMs;
 }

 const amount = Number(match[1]);
 const unit = match[2];
 if (!Number.isFinite(amount) || amount <= 0) {
  return fallbackMs;
 }

 const multipliers = {
  ms: 1,
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000
 };

 return amount * multipliers[unit];
}

function getRefreshTokenTtlMs() {
 return parseDurationMs(process.env.REFRESH_TOKEN_EXPIRES_IN || '30d', 30 * 24 * 60 * 60 * 1000);
}

function buildAuthCookieOptions() {
 const isProduction = process.env.NODE_ENV === 'production';
 const sameSite = String(process.env.AUTH_COOKIE_SAMESITE || (isProduction ? 'strict' : 'lax')).toLowerCase();
 const allowedSameSite = new Set(['lax', 'strict', 'none']);
 const resolvedSameSite = allowedSameSite.has(sameSite) ? sameSite : (isProduction ? 'strict' : 'lax');

 return {
  httpOnly: true,
  secure: isProduction,
  sameSite: resolvedSameSite,
  path: '/',
  maxAge: 15 * 60 * 1000
 };
}

function buildRefreshCookieOptions() {
 const isProduction = process.env.NODE_ENV === 'production';
 const sameSite = String(process.env.REFRESH_COOKIE_SAMESITE || (isProduction ? 'strict' : 'lax')).toLowerCase();
 const allowedSameSite = new Set(['lax', 'strict', 'none']);
 const resolvedSameSite = allowedSameSite.has(sameSite) ? sameSite : (isProduction ? 'strict' : 'lax');

 return {
  httpOnly: true,
  secure: isProduction,
  sameSite: resolvedSameSite,
  path: '/',
  maxAge: getRefreshTokenTtlMs()
 };
}

function getAuthCookieName() {
 return process.env.AUTH_COOKIE_NAME || 'skillvance_admin_token';
}

function getRefreshCookieName() {
 return process.env.REFRESH_COOKIE_NAME || 'skillvance_admin_refresh';
}

function signAccessToken(admin) {
 const payload = {
  sub: String(admin._id),
  username: admin.username
 };

 const options = {
  expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  keyid: process.env.JWT_KEY_ID || undefined,
  issuer: process.env.JWT_ISSUER || 'skillvance-api',
  audience: process.env.JWT_AUDIENCE || 'skillvance-admin'
 };

 const candidates = getJwtSigningCandidates();
 let lastError = null;

 for (const candidate of candidates) {
  try {
   return jwt.sign(payload, candidate.key, {
    ...options,
    algorithm: candidate.algorithm
   });
  } catch (error) {
   lastError = error;
  }
 }

 throw lastError || new Error('Unable to sign JWT token.');
}

function looksLikeBcryptHash(value) {
 const hash = String(value || '');
 return hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$');
}

async function validateAdminPassword(admin, candidatePassword) {
 const storedPassword = String(admin?.password || '');
 if (!storedPassword) {
  return { valid: false, needsRehash: false };
 }

 // Normal path: bcrypt hash in DB.
 if (looksLikeBcryptHash(storedPassword)) {
  try {
   const valid = await bcrypt.compare(candidatePassword, storedPassword);
   return { valid, needsRehash: false };
  } catch (_error) {
   return { valid: false, needsRehash: false };
  }
 }

 // Legacy fallback: plaintext password stored in DB from older deployments.
 const validLegacy = storedPassword === candidatePassword;
 return { valid: validLegacy, needsRehash: validLegacy };
}

async function issueRefreshToken(adminId, req) {
 const refreshToken = crypto.randomBytes(48).toString('base64url');
 const jti = crypto.randomUUID();
 const now = new Date();
 const expiresAt = new Date(now.getTime() + getRefreshTokenTtlMs());
 const createdByIp = String(req.ip || req.socket?.remoteAddress || '').trim() || null;

 const allowMultipleSessions = String(process.env.REFRESH_ALLOW_MULTI_SESSION || 'false').trim().toLowerCase() === 'true';
 if (!allowMultipleSessions) {
  await RefreshToken.updateMany(
   {
    adminId,
    revokedAt: null,
    expiresAt: { $gt: now }
   },
   {
    $set: {
     revokedAt: now,
     replacedByJti: jti
    }
   }
  );
 }

 await RefreshToken.create({
  tokenHash: RefreshToken.hashToken(refreshToken),
  jti,
  adminId,
  expiresAt,
  createdByIp,
  lastUsedAt: now
 });

 return refreshToken;
}

router.post('/login', loginLimiter, async (req, res, next) => {
 try {
  const username = String(req.body?.username || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!username || !password || password.length > 256) {
   return res.status(400).json({ message: 'Username and password are required.' });
  }

  let admin = null;
  try {
   admin = await Admin.findOne({ username }).maxTimeMS(2000).select('password username email role');
  } catch (dbError) {
   console.error('[AUTH] Login DB lookup failed:', dbError);
   return res.status(503).json({ message: 'Authentication service temporarily unavailable. Please retry.' });
  }

  if (!admin) {
   await bcrypt.compare(password, FALLBACK_PASSWORD_HASH);
   return res.status(401).json({ message: 'Invalid username or password.' });
  }

  const passwordCheck = await validateAdminPassword(admin, password);
  if (!passwordCheck.valid) {
   return res.status(401).json({ message: 'Invalid username or password.' });
  }

  if (passwordCheck.needsRehash || (typeof admin.needsPasswordRehash === 'function' && admin.needsPasswordRehash())) {
   admin.password = password;
   await admin.save();
  }

  let token;
  try {
   token = signAccessToken(admin);
  } catch (signError) {
   console.error('[AUTH] JWT signing failed:', signError);
   return res.status(503).json({ message: 'Authentication configuration error. Contact support.' });
  }

  res.cookie(getAuthCookieName(), token, buildAuthCookieOptions());

  try {
   const refreshToken = await issueRefreshToken(admin._id, req);
   res.cookie(getRefreshCookieName(), refreshToken, buildRefreshCookieOptions());
  } catch (refreshError) {
   console.error('[AUTH] Refresh token issue failed, continuing with access token only:', refreshError.message);
  }

  AdminLoginHistory.create({
   adminId: admin._id,
   username: admin.username,
   email: admin.email,
   ...buildLoginClientInfo(req)
  }).catch(historyError => {
   console.error('[AUTH] Failed to store login history:', historyError);
  });

  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  return res.json({
   message: 'Login successful.',
   authenticated: true,
   admin: toSafeAdminResponse(admin)
  });
 } catch (error) {
  console.error('[AUTH] Login error:', error);
  return res.status(503).json({ message: 'Authentication service temporarily unavailable. Please retry.' });
 }
});

router.post('/refresh', async (req, res, next) => {
 try {
  const refreshTokenRaw = req.cookies ? req.cookies[getRefreshCookieName()] : null;
  if (!refreshTokenRaw) {
   return res.status(401).json({ message: 'Refresh token is required.' });
  }

  const tokenHash = RefreshToken.hashToken(refreshTokenRaw);
  const stored = await RefreshToken.findOne({ tokenHash });
  if (!stored || stored.revokedAt || (stored.expiresAt && stored.expiresAt <= new Date())) {
   return res.status(401).json({ message: 'Invalid or expired refresh token.' });
  }

  const admin = await Admin.findById(stored.adminId).select('username email role');
  if (!admin || admin.role !== 'admin') {
   stored.revokedAt = new Date();
   await stored.save();
   return res.status(401).json({ message: 'Invalid refresh token account.' });
  }

  const nextRefreshToken = await issueRefreshToken(admin._id, req);
  stored.revokedAt = new Date();
  stored.replacedByJti = 'rotated';
  stored.lastUsedAt = new Date();
  await stored.save();

  const token = signAccessToken(admin);
  res.cookie(getAuthCookieName(), token, buildAuthCookieOptions());
  res.cookie(getRefreshCookieName(), nextRefreshToken, buildRefreshCookieOptions());

  return res.json({
   message: 'Session refreshed.',
   authenticated: true
  });
 } catch (error) {
  return next(error);
 }
});

router.get('/verify', verifyToken, (req, res, next) => {
 try {
  if (req.authFromRefresh) {
   const token = signAccessToken({
    _id: req.user.sub,
    username: req.user.username
   });
   res.cookie(getAuthCookieName(), token, buildAuthCookieOptions());
  }

  return res.json({
   authenticated: true,
   user: {
    sub: req.user.sub,
    username: req.user.username || null
   }
  });
 } catch (error) {
  return next(error);
 }
});

router.post('/logout', async (req, res, next) => {
 try {
  const refreshTokenRaw = req.cookies ? req.cookies[getRefreshCookieName()] : null;
  if (refreshTokenRaw) {
   await RefreshToken.updateOne(
    { tokenHash: RefreshToken.hashToken(refreshTokenRaw) },
    {
     $set: {
      revokedAt: new Date(),
      replacedByJti: 'logout',
      lastUsedAt: new Date()
     }
    }
   );
  }

  res.clearCookie(getAuthCookieName(), { path: '/' });
  res.clearCookie(getRefreshCookieName(), { path: '/' });

  return res.json({ message: 'Logged out successfully.' });
 } catch (error) {
  return next(error);
 }
});

module.exports = router;
