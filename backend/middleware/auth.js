const jwt = require('jsonwebtoken');

function getJwtSecret() {
 if (!process.env.JWT_SECRET) {
 throw new Error('Missing required environment variable: JWT_SECRET');
 }

 return process.env.JWT_SECRET;
}

function verifyToken(req, res, next) {
 const authHeader = req.headers.authorization || '';
 const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
 const cookieName = process.env.AUTH_COOKIE_NAME || 'skillvance_admin_token';
 const cookieToken = req.cookies ? req.cookies[cookieName] : null;
 const token = bearerToken || cookieToken;

 if (!token) {
 return res.status(401).json({ message: 'Authentication required.' });
 }

 try {
 const payload = jwt.verify(token, getJwtSecret(), {
 algorithms: ['HS256'],
 issuer: process.env.JWT_ISSUER || 'skillvance-api',
 audience: process.env.JWT_AUDIENCE || 'skillvance-admin'
 });

 req.user = payload;
 return next();
 } catch (error) {
 return res.status(401).json({ message: 'Invalid or expired token.' });
 }
}

function isAdmin(req, res, next) {
 if (!req.user || req.user.role !== 'admin') {
 return res.status(403).json({ message: 'Admin access required.' });
 }

 return next();
}

module.exports = {
 verifyToken,
 isAdmin,
 getJwtSecret
};