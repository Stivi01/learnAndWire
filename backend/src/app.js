const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { connectDb, getSqlPool, sql } = require('./config/db');
const { createAuthMiddleware } = require('./middleware/auth');
const { registerAuthRoutes } = require('./routes/authRoutes');
const { registerProfileRoutes } = require('./routes/profileRoutes');
const { registerCourseRoutes } = require('./routes/courseRoutes');
const { registerUserRoutes } = require('./routes/userRoutes');
const { registerQuizRoutes } = require('./routes/quizRoutes');
const { registerScheduleRoutes } = require('./routes/scheduleRoutes');

const app = express();
const JWT_SECRET = '2121212121212121212';

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const { protect, restrictTo } = createAuthMiddleware({ getSqlPool, JWT_SECRET });

registerAuthRoutes(app, { getSqlPool, bcrypt, jwt, JWT_SECRET });
registerProfileRoutes(app, { getSqlPool, protect });
registerCourseRoutes(app, { getSqlPool, protect, restrictTo });
registerUserRoutes(app, { getSqlPool, protect, restrictTo, sql });
registerQuizRoutes(app, { getSqlPool, protect, restrictTo, sql });
registerScheduleRoutes(app, { getSqlPool, protect, restrictTo });

const PORT = process.env.PORT || 3000;

connectDb()
  .then(() => {
    app.listen(PORT, () => console.log(`Server pornit pe http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('❌ DB connection error:', err);
    process.exit(1);
  });

module.exports = app;


