const express = require('express');
const cors = require('cors');
require('dotenv').config();
const usersRouter = require('./routes/users');
const communityRouter = require('./routes/community');
const mothersRouter = require('./routes/mothers');
const authRouter = require('./routes/auth');
const childrenRouter = require('./routes/children');
const { verifyToken } = require('./middleware/auth');
const { authorizeOperational } = require('./middleware/authorize');
const { uploadDirectory } = require('./middleware/documentUpload');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadDirectory));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/community', verifyToken, authorizeOperational, communityRouter);
app.use('/api/mothers', verifyToken, authorizeOperational, mothersRouter);
app.use('/api/children', verifyToken, authorizeOperational, childrenRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
