const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const usersRouter = require('./routes/users');
const communityRouter = require('./routes/community');
const mothersRouter = require('./routes/mothers');
const authRouter = require('./routes/auth');
const childrenRouter = require('./routes/children');
const { verifyToken } = require('./middleware/auth');
const { authorizeOperational } = require('./middleware/authorize');
const { uploadDirectory } = require('./middleware/documentUpload');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
app.set('trust proxy', 1);
app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

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
app.use('/uploads', express.static(uploadDirectory));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/community', verifyToken, authorizeOperational, communityRouter);
app.use('/api/mothers', verifyToken, authorizeOperational, mothersRouter);
app.use('/api/children', verifyToken, authorizeOperational, childrenRouter);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
