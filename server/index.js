const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const usersRouter = require('./routes/users');
const notificationsRouter = require('./routes/notifications');
const communityRouter = require('./routes/community');
const mothersRouter = require('./routes/mothers');
const authRouter = require('./routes/auth');
const childrenRouter = require('./routes/children');
const programsRouter = require('./routes/programs');
const progressReportRouter = require('./routes/progressReport');
const documentsRouter = require('./routes/documents');
const reportsRouter = require('./routes/reports');
const aiSettingsRouter = require('./routes/aiSettings');
const { verifyToken } = require('./middleware/auth');
const { authorizeOperational, authorizeProgressReport } = require('./middleware/authorize');
const { errorHandler } = require('./middleware/errorHandler');
const db = require('./db');
const { ensureSuperadminAccount } = require('./services/superadminRecovery');
const { startCheckupReminderScheduler } = require('./services/checkupReminders');

const app = express();
app.set('trust proxy', 1);
const allowedOrigins = new Set(
  String(process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);
app.use(cors({
  origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin) ? origin || false : false),
  credentials: true,
}));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

const apiLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60 * 1000),
  max: Number(process.env.RATE_LIMIT_MAX || 100),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    code: 'RATE_LIMITED',
    message: 'Too many requests. Please try again later.',
    timestamp: new Date().toISOString(),
  },
});

const progressReportAiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    code: 'AI_RATE_LIMITED',
    message: 'Too many AI report requests. Please wait before trying again.',
    timestamp: new Date().toISOString(),
  },
});

const userAiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    code: 'AI_RATE_LIMITED',
    message: 'Too many AI requests. Please wait before trying again.',
    timestamp: new Date().toISOString(),
  },
});

const loginLimiter = rateLimit({
  windowMs: Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || 60 * 1000),
  max: Number(process.env.LOGIN_RATE_LIMIT_MAX || 5),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    code: 'LOGIN_RATE_LIMITED',
    message: 'Too many login attempts. Please wait a moment and try again.',
    timestamp: new Date().toISOString(),
  },
});

app.use('/api', apiLimiter);
app.use('/api/auth/login', loginLimiter);

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/community', verifyToken, authorizeOperational, communityRouter);
app.use('/api/mothers', verifyToken, authorizeOperational, mothersRouter);
app.use('/api/children', verifyToken, authorizeOperational, childrenRouter);
app.use('/api/programs', verifyToken, authorizeOperational, programsRouter);
app.use('/api/progress-report/ai', (req, res, next) => {
  if (req.method !== 'POST') return next();
  return progressReportAiLimiter(req, res, next);
});
app.use('/api/progress-report', verifyToken, authorizeOperational, authorizeProgressReport, progressReportRouter);
app.use('/api/ai-settings', verifyToken, authorizeOperational, (req, res, next) => {
  if (['POST', 'PUT'].includes(req.method)) return userAiLimiter(req, res, next);
  return next();
}, aiSettingsRouter);
app.use('/api/documents', verifyToken, authorizeOperational, documentsRouter);
app.use('/uploads', verifyToken, authorizeOperational, documentsRouter);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
db.ready
  .then(async () => {
    await ensureSuperadminAccount(db);
    startCheckupReminderScheduler(db);
    app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
  })
  .catch((error) => {
    console.error('Backend startup failed:', error.message);
    process.exitCode = 1;
  });
