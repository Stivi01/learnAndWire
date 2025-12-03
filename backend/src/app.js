const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sql = require('mssql');

const app = express();
app.use(cors());
app.use(express.json());

const config = {
  user: 'db_user',
  password: 'Licenta20252026',
  server: 'NTZ\\SQLEXPRESS',
  database: 'LAW',
  options: { trustServerCertificate: true }
};

const JWT_SECRET = '2121212121212121212';

let sqlPool;
async function connectDb() {
  try {
    sqlPool = new sql.ConnectionPool(config);
    await sqlPool.connect();
    console.log('✅ Connected to MSSQL Database: LAW');
  } catch (err) {
    console.error('❌ DB connection error:', err);
    process.exit(1);
  }
}

// ------------------------------
// UTILS
// ------------------------------
function getRoleFromEmail(email) {
  const lower = email.toLowerCase();
  if (lower.endsWith('@etti.upb.ro')) return 'Profesor';
  if (lower.endsWith('@stud.etti.upb.ro')) return 'Student';
  return 'Student';
}

// ------------------------------
// REGISTER
// ------------------------------
app.post('/api/auth/register', async (req, res) => {
  const { email, password, firstName, lastName } = req.body;

  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ message: 'Toate câmpurile sunt obligatorii' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const role = getRoleFromEmail(email);

    const result = await sqlPool.query`
      INSERT INTO Users (email, passwordHash, role, firstName, lastName)
      OUTPUT INSERTED.id, INSERTED.email, INSERTED.role, INSERTED.firstName, INSERTED.lastName
      VALUES (${email}, ${passwordHash}, ${role}, ${firstName}, ${lastName})
    `;

    const newUser = result.recordset[0];

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(201).json({
      message: 'Cont creat cu succes!',
      token,
      user: newUser
    });
  } catch (err) {
    console.error(err);
    if (err.number === 2627) {
      return res.status(409).json({ message: 'Email deja înregistrat.' });
    }
    res.status(500).json({ message: 'Eroare server la înregistrare.' });
  }
});


// ------------------------------
// LOGIN
// ------------------------------
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await sqlPool.query`
      SELECT id, email, passwordHash, role, firstName, lastName, avatar
      FROM Users
      WHERE email = ${email}
    `;

    if (result.recordset.length === 0)
      return res.status(401).json({ message: 'Email sau parolă greșite.' });

    const user = result.recordset[0];

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid)
      return res.status(401).json({ message: 'Email sau parolă greșite.' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      message: 'Autentificare reușită!',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Eroare server la autentificare.' });
  }
});

// ------------------------------
// PROTECTED ROUTE
// ------------------------------
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) return res.status(401).json({ message: 'Token lipsă sau invalid.' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    const result = await sqlPool.query`
      SELECT id, email, role, firstName, lastName
      FROM Users
      WHERE id = ${decoded.id}
    `;

    if (result.recordset.length === 0)
      return res.status(401).json({ message: 'Utilizatorul nu există.' });

    req.user = result.recordset[0];
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token invalid.' });
  }
};

const restrictTo = (role) => (req, res, next) => {
  if (req.user.role !== role) {
    return res.status(403).json({ message: `Acces interzis. Ai nevoie de rolul ${role}.` });
  }
  next();
};

// ------------------------------
const PORT = process.env.PORT || 3000;
connectDb().then(() => {
  app.listen(PORT, () => console.log(`Server pornit pe http://localhost:${PORT}`));
});

// GET PROFILE (any logged user)
app.get('/api/profile', protect, async (req, res) => {
  try {
    const result = await sqlPool.query`
      SELECT id, email, role, firstName, lastName, phone, address, academicYear,avatar
      FROM Users
      WHERE id = ${req.user.id}
    `;

    const profile = result.recordset[0];

    // Dacă avatar e null → trimitem default
    if (!profile.avatar) {
      profile.avatar = 'assets/avatar-default.png';
    }

    res.json(profile);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Eroare server la încărcarea profilului.' });
  }
});

// UPDATE PROFILE
app.put('/api/profile', protect, async (req, res) => {
  const { firstName, lastName, phone, address, academicYear } = req.body;

  try {
    await sqlPool.query`
      UPDATE Users
      SET 
        firstName = ${firstName},
        lastName = ${lastName},
        phone = ${phone},
        address = ${address},
        academicYear = ${academicYear}
      WHERE id = ${req.user.id}
    `;

    res.json({ message: 'Profil actualizat cu succes!' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Eroare server la actualizarea profilului.' });
  }
});

const multer = require('multer');
const path = require('path');

// Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/avatars/');
  },
  filename: (req, file, cb) => {
    cb(
      null,
      'user_' + req.user.id + path.extname(file.originalname)
    );
  }
});

const upload = multer({ storage });
app.use('/uploads', express.static('uploads'));

app.post('/api/profile/avatar', protect, upload.single('avatar'), async (req, res) => {
  try {
    const avatarPath = req.file ? req.file.path.replace(/\\/g, '/') : null;

    await sqlPool.query`
      UPDATE Users
      SET avatar = ${avatarPath}
      WHERE id = ${req.user.id}
    `;

    res.json({
      message: "Avatar actualizat!",
      avatar: avatarPath
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Eroare server la upload avatar." });
  }
});

// CREATE COURSE
app.post('/api/courses', protect, restrictTo('Profesor'), async (req, res) => {
  const { title, description, thumbnailUrl, isPublished } = req.body;

  if (!title) return res.status(400).json({ message: 'Titlul este obligatoriu.' });

  try {
    const result = await sqlPool.query`
      INSERT INTO Courses (title, description, createdBy, createdAt, thumbnailUrl, isPublished)
      OUTPUT INSERTED.*
      VALUES (${title}, ${description}, ${req.user.id}, GETDATE(), ${thumbnailUrl}, ${isPublished})
    `;

    const course = result.recordset[0];
    res.status(201).json(course);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Eroare la crearea cursului.' });
  }
});

// GET COURSES BY TEACHER
app.get('/api/courses', protect, restrictTo('Profesor'), async (req, res) => {
  try {
    const result = await sqlPool.query`
      SELECT * FROM Courses
      WHERE createdBy = ${req.user.id}
      ORDER BY createdAt DESC
    `;
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Eroare la preluarea cursurilor.' });
  }
});

// INVITE STUDENTS
app.post('/api/course-enrollments', protect, restrictTo('Profesor'), async (req, res) => {
  const { courseId, studentIds } = req.body;

  if (!courseId || !Array.isArray(studentIds)) {
    return res.status(400).json({ message: 'Date invalide.' });
  }

  try {
    for (const studentId of studentIds) {
      await sqlPool.query`
        IF NOT EXISTS (
          SELECT 1 FROM CourseEnrollments
          WHERE CourseId = ${courseId} AND StudentId = ${studentId}
        )
        INSERT INTO CourseEnrollments (CourseId, StudentId, EnrolledAt)
        VALUES (${courseId}, ${studentId}, GETDATE())
      `;
    }

    res.json({ message: 'Studenții au fost adăugați în curs.' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Eroare la adăugarea studenților.' });
  }
});




