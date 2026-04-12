const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const RefreshToken = require('../models/RefreshToken');

function getJwtSecret() {
 if (!process.env.JWT_SECRET) {
 throw new Error('Missing required environment variable: JWT_SECRET');
 }

 return process.env.JWT_SECRET;
}

function getJwtAlgorithm() {
 const raw = String(process.env.JWT_ALGORITHM || 'HS256').trim().toUpperCase();
 return raw === 'RS256' ? 'RS256' : 'HS256';
}

function getVerificationCandidates() {
 const candidates = [];
 const preferredAlgorithm = getJwtAlgorithm();

 const primaryPublicKey = String(process.env.JWT_PUBLIC_KEY || '').trim();
 const publicKeys = String(process.env.JWT_PUBLIC_KEYS || '')
  .split('|||')
  .map(item => item.trim())
  .filter(Boolean);
 const rsKeys = [primaryPublicKey, ...publicKeys].filter(Boolean);

 const hasHsSecret = Boolean(String(process.env.JWT_SECRET || '').trim());
 const hsSecrets = hasHsSecret
  ? [
   getJwtSecret(),
   ...String(process.env.JWT_SECRET_PREVIOUS || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
  ]
  : [];

 if (preferredAlgorithm === 'RS256') {
  rsKeys.forEach(key => candidates.push({ algorithm: 'RS256', key }));
  hsSecrets.forEach(key => candidates.push({ algorithm: 'HS256', key }));
 } else {
  hsSecrets.forEach(key => candidates.push({ algorithm: 'HS256', key }));
  rsKeys.forEach(key => candidates.push({ algorithm: 'RS256', key }));
 }

 if (!candidates.length) {
  throw new Error('No JWT verification keys are configured.');
 }

 return candidates;
}

function verifyAccessToken(token) {
 const candidates = getVerificationCandidates();
 let lastError = null;

 for (const candidate of candidates) {
    try {
     return jwt.verify(token, candidate.key, {
        algorithms: [candidate.algorithm],
        issuer: process.env.JWT_ISSUER || 'skillvance-api',
        audience: process.env.JWT_AUDIENCE || 'skillvance-admin'
     });
    } catch (error) {
     lastError = error;
    }
 }

 throw lastError || new Error('Invalid or expired token.');
}

function isTokenExpiredError(error) {
 return Boolean(error && (error.name === 'TokenExpiredError' || String(error.message || '').toLowerCase().includes('expired')));
}

async function tryRefreshSession(req, res) {
 const refreshCookieName = process.env.REFRESH_COOKIE_NAME || 'skillvance_admin_refresh';
 const refreshTokenRaw = req.cookies ? req.cookies[refreshCookieName] : null;

 if (!refreshTokenRaw) {
    return null;
 }

 const tokenHash = RefreshToken.hashToken(refreshTokenRaw);
 const storedToken = await RefreshToken.findOne({ tokenHash }).lean();

 if (!storedToken || storedToken.revokedAt || (storedToken.expiresAt && new Date(storedToken.expiresAt) <= new Date())) {
    return null;
 }

 const admin = await Admin.findById(storedToken.adminId).select('username role').lean();
 if (!admin || admin.role !== 'admin') {
    return null;
 }

 req.user = {
    sub: String(admin._id),
    username: admin.username,
    role: admin.role,
    source: 'refresh-token'
 };
 req.authFromRefresh = true;

 await RefreshToken.updateOne(
    { _id: storedToken._id },
    { $set: { lastUsedAt: new Date() } }
 );

 return req.user;
}

async function verifyToken(req, res, next) {
 try {
 const authHeader = req.headers.authorization || '';
 const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
 const cookieName = process.env.AUTH_COOKIE_NAME || 'skillvance_admin_token';
 const cookieToken = req.cookies ? req.cookies[cookieName] : null;
 const token = bearerToken || cookieToken;

 if (!token) {
   const refreshedUser = await tryRefreshSession(req, res);
   if (refreshedUser) {
    return next();
   }

   return res.status(401).json({ message: 'Authentication required.' });
 }

 const payload = verifyAccessToken(token);

 req.user = payload;
 return next();
 } catch (error) {
    if (isTokenExpiredError(error)) {
    try {
      const refreshedUser = await tryRefreshSession(req, res);
      if (refreshedUser) {
       return next();
      }
    } catch (_refreshError) {
      return res.status(401).json({ message: 'Invalid or expired token.' });
     }
    }

 return res.status(401).json({ message: 'Invalid or expired token.' });
 }
}

async function isAdmin(req, res, next) {
 if (!req.user || !req.user.sub) {
  return res.status(403).json({ message: 'Admin access required.' });
 }

 try {
  const admin = await Admin.findById(req.user.sub).select('role').lean();
  if (!admin || admin.role !== 'admin') {
   return res.status(403).json({ message: 'Admin access required.' });
  }

  req.adminRole = admin.role;
  return next();
 } catch (_error) {
  return res.status(403).json({ message: 'Admin access required.' });
 }
}

module.exports = {
 verifyToken,
 isAdmin,
 getJwtSecret
};