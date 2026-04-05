const fs = require('fs');
const path = require('path');

const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const connectDB = require('./config/db');
const Admin = require('./models/Admin');
const authRoutes = require('./routes/auth');
const certificateRoutes = require('./routes/certificates');

function loadEnvironment() {
  const projectRoot = path.resolve(__dirname, '..');
  const envPaths = [
    path.resolve(projectRoot, '.env'),
    path.resolve(__dirname, '.env'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'backend', '.env')
  ];

  envPaths.forEach(envPath => {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    }
  });
}

loadEnvironment();

const app = express();
app.disable('x-powered-by');

const trustProxyRaw = String(process.env.TRUST_PROXY || '').trim().toLowerCase();
if (trustProxyRaw === 'true' || Boolean(process.env.VERCEL)) {
  app.set('trust proxy', 1);
}

let initialized = false;
let initializationPromise = null;

function getAllowedOrigins() {
  function normalizeOrigin(value) {
    const rawValue = String(value || '').trim();
    if (!rawValue) {
      return null;
    }

    // Accept full URLs in env (including accidental paths) and convert to origin.
    try {
      return new URL(rawValue).origin;
    } catch (_error) {
      return rawValue;
    }
  }

  const raw = process.env.CORS_ORIGIN || '';
  const configuredOrigins = raw
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);

  if (process.env.VERCEL_URL) {
    configuredOrigins.push(normalizeOrigin(`https://${process.env.VERCEL_URL}`));
  }

  const uniqueConfiguredOrigins = [...new Set(configuredOrigins)];

  if (process.env.NODE_ENV !== 'production') {
    const devOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:5500',
      'http://127.0.0.1:5500',
      'http://localhost:5000',
      'http://127.0.0.1:5000'
    ];

    return [...new Set([...uniqueConfiguredOrigins, ...devOrigins])];
  }

  return uniqueConfiguredOrigins;
}

async function seedAdminIfNeeded() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  const email = process.env.ADMIN_EMAIL;
  const shouldSync = String(process.env.ADMIN_SYNC_ON_START || 'true').trim().toLowerCase() !== 'false';

  if (!username || !password || !email) {
    return;
  }

  const normalizedUsername = String(username).trim().toLowerCase();
  const normalizedEmail = String(email).trim().toLowerCase();

  const existing = await Admin.findOne({
    $or: [{ username: normalizedUsername }, { email: normalizedEmail }]
  }).select('+password');
  if (existing) {
    if (!shouldSync) {
      return;
    }

    let hasChanges = false;

    if (existing.username !== normalizedUsername) {
      existing.username = normalizedUsername;
      hasChanges = true;
    }

    if (existing.email !== normalizedEmail) {
      existing.email = normalizedEmail;
      hasChanges = true;
    }

    if (!(await existing.comparePassword(String(password)))) {
      // Assign plain password so model pre-save hook can hash with configured rounds.
      existing.password = String(password);
      hasChanges = true;
    }

    if (hasChanges) {
      await existing.save();
    }

    return;
  }

  await Admin.create({
    username: normalizedUsername,
    email: normalizedEmail,
    password: String(password),
    role: 'admin'
  });
}

async function initializeApp() {
  if (initialized) {
    return;
  }

  if (!process.env.JWT_SECRET) {
    throw new Error('Missing required environment variable: JWT_SECRET');
  }

  if (String(process.env.JWT_SECRET).length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  await connectDB();
  await seedAdminIfNeeded();
  initialized = true;
}

function ensureInitialized() {
  if (!initializationPromise) {
    initializationPromise = initializeApp().catch(error => {
      initializationPromise = null;
      throw error;
    });
  }

  return initializationPromise;
}

const allowedOrigins = getAllowedOrigins();

const apiLimiterWindowMs = Number(process.env.API_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const apiLimiterMax = Number(process.env.API_RATE_LIMIT_MAX || 300);

const apiLimiter = rateLimit({
  windowMs: Number.isFinite(apiLimiterWindowMs) && apiLimiterWindowMs > 0 ? apiLimiterWindowMs : 15 * 60 * 1000,
  max: Number.isFinite(apiLimiterMax) && apiLimiterMax > 0 ? apiLimiterMax : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again shortly.' }
});

app.use(helmet());
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      const error = new Error('Origin not allowed by CORS policy');
      error.status = 403;
      return callback(error);
    }
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use('/api', apiLimiter);

app.use(async (req, res, next) => {
  try {
    await ensureInitialized();
    return next();
  } catch (error) {
    return next(error);
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', service: 'skillvance-api' });
});

app.use('/api/auth', authRoutes);
app.use('/api/certificates', certificateRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  const message =
    err.name === 'ValidationError'
      ? err.message
      : status >= 500
      ? 'Internal server error.'
      : err.message;

  res.status(status).json({ message });
});

module.exports = app;
module.exports.ensureInitialized = ensureInitialized;

if (require.main === module && !process.env.VERCEL) {
  const port = Number(process.env.PORT || 5000);
  ensureInitialized()
    .then(() => {
      app.listen(port, () => {
        console.log(`Skillvance backend running on port ${port}`);
      });
    })
    .catch(error => {
      console.error('Failed to initialize backend:', error.message);
      process.exit(1);
    });
}