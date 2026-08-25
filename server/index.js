const express = require('express');
const cors = require('cors');
require('dotenv').config();
const usersRouter = require('./routes/users');
const communityRouter = require('./routes/community');
const mothersRouter = require('./routes/mothers');
const authRouter = require('./routes/auth');
const childrenRouter = require('./routes/children');
const { uploadDirectory } = require('./middleware/documentUpload');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadDirectory));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/community', communityRouter);
app.use('/api/mothers', mothersRouter);
app.use('/api/children', childrenRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
