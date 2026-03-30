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

async function getCoursePublishReadiness(courseId, teacherId, draftData = {}) {
  const courseResult = await sqlPool.query`
    SELECT Id, Title, Description, IsPublished
    FROM Courses
    WHERE Id = ${courseId} AND CreatedBy = ${teacherId}
  `;

  if (courseResult.recordset.length === 0) {
    return {
      found: false,
      canPublish: false,
      checks: {
        hasTitle: false,
        hasDescription: false,
        hasModule: false,
        everyModuleHasLesson: false
      },
      missingItems: ['Cursul nu a fost găsit.']
    };
  }

  const course = courseResult.recordset[0];
  const title = typeof draftData.title === 'string'
    ? draftData.title.trim()
    : (course.Title || '').trim();
  const description = typeof draftData.description === 'string'
    ? draftData.description.trim()
    : (course.Description || '').trim();

  const modulesResult = await sqlPool.query`
    SELECT Id, Title
    FROM CourseModules
    WHERE CourseId = ${courseId}
    ORDER BY OrderIndex, Id
  `;

  const modules = modulesResult.recordset;
  const modulesWithoutLessons = [];

  for (const module of modules) {
    const lessonCountResult = await sqlPool.query`
      SELECT COUNT(1) AS LessonCount
      FROM CourseLessons
      WHERE ModuleId = ${module.Id}
    `;

    const lessonCount = lessonCountResult.recordset[0]?.LessonCount || 0;
    if (lessonCount === 0) {
      modulesWithoutLessons.push(module.Title);
    }
  }

  const checks = {
    hasTitle: !!title,
    hasDescription: !!description,
    hasModule: modules.length > 0,
    everyModuleHasLesson: modules.length > 0 && modulesWithoutLessons.length === 0
  };

  const missingItems = [];

  if (!checks.hasTitle) missingItems.push('Adaugă titlul cursului.');
  if (!checks.hasDescription) missingItems.push('Adaugă descrierea cursului.');
  if (!checks.hasModule) missingItems.push('Adaugă cel puțin un modul.');

  for (const moduleTitle of modulesWithoutLessons) {
    missingItems.push(`Adaugă cel puțin o lecție la modulul "${moduleTitle}".`);
  }

  return {
    found: true,
    canPublish: missingItems.length === 0,
    checks,
    missingItems
  };
}

// CREATE COURSE
app.post('/api/courses', protect, restrictTo('Profesor'), async (req, res) => {
  const { title, description, thumbnailUrl } = req.body;
  const cleanTitle = typeof title === 'string' ? title.trim() : '';
  const cleanDescription = typeof description === 'string' ? description.trim() : '';

  if (!cleanTitle) {
    return res.status(400).json({ message: 'Titlul este obligatoriu.' });
  }

  try {
    const result = await sqlPool.query`
      INSERT INTO Courses (title, description, createdBy, createdAt, thumbnailUrl, isPublished)
      OUTPUT INSERTED.*
      VALUES (${cleanTitle}, ${cleanDescription || null}, ${req.user.id}, GETDATE(), ${thumbnailUrl}, ${false})
    `;

    const course = result.recordset[0];
    res.status(201).json({
      ...course,
      message: 'Cursul a fost creat ca draft. Îl poți publica după ce adaugi descriere, module și lecții.'
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Eroare la crearea cursului.' });
  }
});

// UPDATE COURSE
app.put('/api/courses/:id', protect, restrictTo('Profesor'), async (req, res) => {
  const courseId = parseInt(req.params.id);
  const { title, description, thumbnailUrl, isPublished } = req.body;
  const cleanTitle = typeof title === 'string' ? title.trim() : '';
  const cleanDescription = typeof description === 'string' ? description.trim() : '';
  const nextPublishedState = isPublished === true || isPublished === 1;

  if (!cleanTitle) {
    return res.status(400).json({ message: 'Titlul este obligatoriu.' });
  }

  try {
    if (nextPublishedState) {
      const readiness = await getCoursePublishReadiness(courseId, req.user.id, {
        title: cleanTitle,
        description: cleanDescription
      });

      if (!readiness.found) {
        return res.status(404).json({ message: 'Cursul nu a fost găsit.' });
      }

      if (!readiness.canPublish) {
        return res.status(400).json({
          message: 'Cursul nu poate fi publicat încă.',
          missingItems: readiness.missingItems,
          checks: readiness.checks
        });
      }
    }

    const result = await sqlPool.query`
      UPDATE Courses
      SET Title = ${cleanTitle},
          Description = ${cleanDescription || null},
          ThumbnailUrl = ${thumbnailUrl},
          IsPublished = ${nextPublishedState}
      WHERE Id = ${courseId} AND CreatedBy = ${req.user.id}
    `;

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: 'Cursul nu a fost găsit.' });
    }

    res.json({ message: 'Curs actualizat cu succes!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Eroare la actualizarea cursului.' });
  }
});

app.get('/api/courses/:id/publish-readiness', protect, restrictTo('Profesor'), async (req, res) => {
  const courseId = parseInt(req.params.id);

  try {
    const readiness = await getCoursePublishReadiness(courseId, req.user.id);

    if (!readiness.found) {
      return res.status(404).json({ message: 'Cursul nu a fost găsit.' });
    }

    res.json(readiness);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Eroare la verificarea condițiilor de publicare.' });
  }
});

// GET FULL COURSE STRUCTURE FOR STUDENT
app.get('/api/student/courses/:id/full', protect, restrictTo('Student'), async (req, res) => {
  const courseId = parseInt(req.params.id);

  try {
    // 1. Validare Securitate: Verificăm dacă studentul este înrolat la acest curs
    const enrollmentCheck = await sqlPool.query`
      SELECT 1 FROM CourseEnrollments 
      WHERE CourseId = ${courseId} AND StudentId = ${req.user.id}
    `;

    if (enrollmentCheck.recordset.length === 0) {
      return res.status(403).json({ message: 'Acces interzis. Nu ești înscris la acest curs.' });
    }

    // 2. Preluăm datele de bază ale cursului
    const courseResult = await sqlPool.query`
      SELECT * FROM Courses WHERE Id = ${courseId}
    `;

    if (courseResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Cursul nu a fost găsit.' });
    }

    const course = courseResult.recordset[0];

    // 3. Preluăm modulele asociate cursului
    const modulesResult = await sqlPool.query`
      SELECT * FROM CourseModules WHERE CourseId = ${courseId} ORDER BY OrderIndex
    `;

    const modules = modulesResult.recordset;

    // 4. Preluăm lecțiile pentru fiecare modul
    for (let mod of modules) {
      const lessonsResult = await sqlPool.query`
        SELECT * FROM CourseLessons WHERE ModuleId = ${mod.Id} ORDER BY OrderIndex
      `;
      mod.lessons = lessonsResult.recordset;
    }

    // 5. Trimitem structura completă
    res.json({
      course,
      modules
    });

  } catch (err) {
    console.error("❌ Eroare la preluarea cursului complet pentru student:", err);
    res.status(500).json({ message: 'Eroare server la preluarea datelor cursului.' });
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
    const courseResult = await sqlPool.query`
      SELECT Id, IsPublished
      FROM Courses
      WHERE Id = ${courseId} AND CreatedBy = ${req.user.id}
    `;

    if (courseResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Cursul nu a fost găsit.' });
    }

    if (!courseResult.recordset[0].IsPublished) {
      return res.status(400).json({
        message: 'Poți adăuga sau invita studenți doar după publicarea cursului.'
      });
    }

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

app.get('/api/student/courses', protect, restrictTo('Student'), async (req, res) => {
  try {
    const result = await sqlPool.query`
      SELECT c.* FROM Courses c
      INNER JOIN CourseEnrollments ce ON ce.CourseId = c.Id
      WHERE ce.StudentId = ${req.user.id}
      ORDER BY c.CreatedAt DESC
    `;
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Eroare la preluarea cursurilor studentului.' });
  }
});

app.get('/api/courses/:id/students', protect, restrictTo('Profesor'), async (req, res) => {
  const courseId = req.params.id;
  try {
    const result = await sqlPool.query`
      SELECT u.Id, u.FirstName, u.LastName, u.Email, u.AcademicYear
      FROM Users u
      INNER JOIN CourseEnrollments ce ON ce.StudentId = u.Id
      WHERE ce.CourseId = ${courseId}
    `;
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Eroare la preluarea studenților cursului.' });
  }
});

// GET ALL COURSES WITH STUDENTS (for teacher)
app.get('/api/teacher/courses-with-students', protect, restrictTo('Profesor'), async (req, res) => {
  try {
    // 1️⃣ Luăm toate cursurile profesorului
    const coursesResult = await sqlPool.query`
      SELECT * FROM Courses
      WHERE CreatedBy = ${req.user.id}
      ORDER BY CreatedAt DESC
    `;

    const courses = coursesResult.recordset;

    // 2️⃣ Pentru fiecare curs luăm studenții
    for (let course of courses) {
      const studentsResult = await sqlPool.query`
        SELECT u.Id, u.FirstName, u.LastName, u.Email, u.AcademicYear
        FROM Users u
        INNER JOIN CourseEnrollments ce ON ce.StudentId = u.Id
        WHERE ce.CourseId = ${course.Id}
      `;

      course.students = studentsResult.recordset;
    }
console.log("COURSES WITH STUDENTS:", courses);
    res.json(courses);

  } catch (err) {
    console.error("❌ Error fetching courses with students:", err);
    res.status(500).json({ message: "Eroare la preluarea datelor." });
  }
});

// CREATE MODULE
app.post('/api/modules', protect, restrictTo('Profesor'), async (req, res) => {
  const { courseId, title, orderIndex } = req.body;

  if (!courseId || !title) {
    return res.status(400).json({ message: 'CourseId și Title sunt obligatorii.' });
  }

  try {
    const result = await sqlPool.query`
      INSERT INTO CourseModules (CourseId, Title, OrderIndex)
      OUTPUT INSERTED.*
      VALUES (${courseId}, ${title}, ${orderIndex || 0})
    `;

    res.status(201).json(result.recordset[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Eroare la crearea modulului.' });
  }
});

// UPDATE MODULE
app.put('/api/modules/:id', protect, restrictTo('Profesor'), async (req, res) => {
  const moduleId = parseInt(req.params.id);
  const { title, orderIndex } = req.body;

  if (!title) {
    return res.status(400).json({ message: 'Titlul este obligatoriu.' });
  }

  try {
    await sqlPool.query`
      UPDATE CourseModules
      SET Title = ${title}, OrderIndex = ${orderIndex}
      WHERE Id = ${moduleId}
    `;
    res.json({ message: 'Capitol actualizat cu succes.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Eroare la actualizarea capitolului.' });
  }
});

// GET MODULE BY ID
app.get('/api/modules/:id', protect, restrictTo('Profesor'), async (req, res) => {
  const moduleId = parseInt(req.params.id);

  if (isNaN(moduleId)) {
    return res.status(400).json({ message: 'ID modul invalid.' });
  }

  try {
    const result = await sqlPool.query`
      SELECT m.*, c.Title AS CourseTitle
      FROM CourseModules m
      INNER JOIN Courses c ON c.Id = m.CourseId
      WHERE m.Id = ${moduleId}
    `;

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Modulul nu există.' });
    }

    res.json(result.recordset[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Eroare la preluarea modulului.' });
  }
});

// DELETE SINGLE MODULE (with lessons)
app.delete('/api/modules/:id', protect, restrictTo('Profesor'), async (req, res) => {
  const moduleId = parseInt(req.params.id);

  try {
    // 1️⃣ Șterge lecțiile asociate
    await sqlPool.query`
      DELETE FROM CourseLessons
      WHERE ModuleId = ${moduleId}
    `;

    // 2️⃣ Șterge modulul
    await sqlPool.query`
      DELETE FROM CourseModules
      WHERE Id = ${moduleId}
    `;

    res.json({ message: 'Capitolul și lecțiile sale au fost șterse cu succes.' });
  } catch (err) {
    console.error('❌ Error deleting module:', err);
    res.status(500).json({ message: 'Eroare la ștergerea capitolului.' });
  }
});

// DELETE ALL MODULES FOR A COURSE (with lessons)
app.delete('/api/courses/:courseId/modules', protect, restrictTo('Profesor'), async (req, res) => {
  const courseId = parseInt(req.params.courseId);

  try {
    // 1️⃣ Șterge lecțiile tuturor modulelor
    await sqlPool.query`
      DELETE FROM CourseLessons
      WHERE ModuleId IN (
        SELECT Id FROM CourseModules WHERE CourseId = ${courseId}
      )
    `;

    // 2️⃣ Șterge toate modulele cursului
    await sqlPool.query`
      DELETE FROM CourseModules
      WHERE CourseId = ${courseId}
    `;

    res.json({ message: 'Toate capitolele și lecțiile asociate au fost șterse cu succes.' });
  } catch (err) {
    console.error('❌ Error deleting all modules:', err);
    res.status(500).json({ message: 'Eroare la ștergerea capitolelor.' });
  }
});

// CREATE LESSON
app.post('/api/lessons', protect, restrictTo('Profesor'), async (req, res) => {
  const { moduleId, title, content, videoUrl, orderIndex } = req.body;

  if (!moduleId || !title) {
    return res.status(400).json({ message: 'ModuleId și Title sunt obligatorii.' });
  }

  try {
    const result = await sqlPool.query`
      INSERT INTO CourseLessons (ModuleId, Title, Content, VideoUrl, OrderIndex)
      OUTPUT INSERTED.*
      VALUES (${moduleId}, ${title}, ${content}, ${videoUrl}, ${orderIndex || 0})
    `;

    res.status(201).json(result.recordset[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Eroare la crearea lecției.' });
  }
});

// DELETE LESSON
app.delete('/api/lessons/:id', protect, restrictTo('Profesor'), async (req, res) => {
  const lessonId = parseInt(req.params.id);

  if (isNaN(lessonId)) {
    return res.status(400).json({ message: 'ID lecție invalid.' });
  }

  try {
    const result = await sqlPool.query`
      DELETE FROM CourseLessons
      WHERE Id = ${lessonId}
    `;

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: 'Lecția nu există.' });
    }

    res.json({ message: 'Lecția a fost ștearsă cu succes.' });

  } catch (err) {
    console.error('❌ Error deleting lesson:', err);
    res.status(500).json({ message: 'Eroare la ștergerea lecției.' });
  }
});

// UPDATE LESSON
app.put('/api/lessons/:id', protect, restrictTo('Profesor'), async (req, res) => {
  const lessonId = parseInt(req.params.id);
  const { title, content, videoUrl, orderIndex } = req.body;

  if (isNaN(lessonId)) {
    return res.status(400).json({ message: 'ID lecție invalid.' });
  }

  if (!title) {
    return res.status(400).json({ message: 'Titlul este obligatoriu.' });
  }

  try {
    const result = await sqlPool.query`
      UPDATE CourseLessons
      SET 
        Title = ${title},
        Content = ${content || ''},
        VideoUrl = ${videoUrl || ''},
        OrderIndex = ${orderIndex || 0}
      WHERE Id = ${lessonId}
    `;

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: 'Lecția nu există.' });
    }

    res.json({ message: 'Lecția a fost actualizată cu succes.' });

  } catch (err) {
    console.error('❌ Error updating lesson:', err);
    res.status(500).json({ message: 'Eroare la actualizarea lecției.' });
  }
});

app.get('/api/lessons/:id', protect, restrictTo('Profesor'), async (req, res) => {
  const lessonId = parseInt(req.params.id);

  const result = await sqlPool.query`
    SELECT *
    FROM CourseLessons
    WHERE Id = ${lessonId}
  `;

  if (result.recordset.length === 0)
    return res.status(404).json({ message: 'Lecția nu există.' });

  res.json(result.recordset[0]);
});

// GET FULL COURSE STRUCTURE
app.get('/api/courses/:id/full', protect, restrictTo('Profesor'), async (req, res) => {
  const courseId = req.params.id;

  try {
    // 1. course
    const courseResult = await sqlPool.query`
      SELECT * FROM Courses WHERE Id = ${courseId}
    `;

    if (courseResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Cursul nu există.' });
    }

    const course = courseResult.recordset[0];

    // 2. modules
    const modulesResult = await sqlPool.query`
      SELECT * FROM CourseModules WHERE CourseId = ${courseId} ORDER BY OrderIndex
    `;

    const modules = modulesResult.recordset;

    // 3. lessons for each module
    for (let mod of modules) {
      const lessonsResult = await sqlPool.query`
        SELECT * FROM CourseLessons WHERE ModuleId = ${mod.Id} ORDER BY OrderIndex
      `;

      mod.lessons = lessonsResult.recordset;
    }

    res.json({
      course,
      modules
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Eroare la preluarea cursului complet.' });
  }
});

// CREATE MODULE
app.post('/api/modules', protect, restrictTo('Profesor'), async (req, res) => {
  const { courseId, title, orderIndex } = req.body;

  if (!courseId || !title) {
    return res.status(400).json({ message: 'courseId și title sunt obligatorii.' });
  }

  try {
    const result = await sqlPool.query`
      INSERT INTO CourseModules (CourseId, Title, OrderIndex)
      OUTPUT INSERTED.*
      VALUES (${courseId}, ${title}, ${orderIndex})
    `;

    res.status(201).json(result.recordset[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Eroare la crearea modulului.' });
  }
});

// GET MODULES BY COURSE ID
app.get('/api/modules', protect, restrictTo('Profesor'), async (req, res) => {
  const courseId = req.query.courseId;

  if (!courseId) {
    return res.status(400).json({ message: 'Parametrul courseId este obligatoriu.' });
  }

  try {
    const result = await sqlPool.query`
      SELECT *
      FROM CourseModules
      WHERE CourseId = ${courseId}
      ORDER BY OrderIndex
    `;

    res.json(result.recordset);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Eroare la preluarea modulelor.' });
  }
});

// GET LESSONS BY MODULE (MISSING ROUTE) ⚠️
app.get('/api/lessons', protect, restrictTo('Profesor'), async (req, res) => {
  const moduleId = req.query.moduleId;

  if (!moduleId) {
    return res.status(400).json({ message: 'moduleId este obligatoriu.' });
  }

  try {
    const result = await sqlPool.query`
      SELECT *
      FROM CourseLessons
      WHERE ModuleId = ${moduleId}
      ORDER BY OrderIndex
    `;

    res.json(result.recordset);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Eroare la preluarea lecțiilor.' });
  }
});

app.post('/api/course-invitations', protect, restrictTo('Profesor'), async (req, res) => {
  const { courseId, studentIds } = req.body;

  if (!courseId || !Array.isArray(studentIds)) {
    return res.status(400).json({ message: 'Date invalide.' });
  }

  try {
    const courseResult = await sqlPool.query`
      SELECT Id, IsPublished
      FROM Courses
      WHERE Id = ${courseId} AND CreatedBy = ${req.user.id}
    `;

    if (courseResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Cursul nu a fost găsit.' });
    }

    if (!courseResult.recordset[0].IsPublished) {
      return res.status(400).json({
        message: 'Poți invita studenți doar după ce cursul este publicat.'
      });
    }

    for (const studentId of studentIds) {
      // verificăm dacă invitația există deja
      const exists = await sqlPool.query`
        SELECT 1 FROM CourseInvitations
        WHERE CourseId = ${courseId} AND StudentId = ${studentId} AND Status = 'Pending'
      `;
      if (exists.recordset.length === 0) {
        await sqlPool.query`
          INSERT INTO CourseInvitations (CourseId, StudentId, TeacherId, Status)
          VALUES (${courseId}, ${studentId}, ${req.user.id}, 'Pending')
        `;
      }
    }

    res.json({ message: 'Invitațiile au fost trimise cu succes.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Eroare la trimiterea invitațiilor.' });
  }
});

app.get('/api/course-invitations', protect, restrictTo('Student'), async (req, res) => {
  try {
    const result = await sqlPool.query`
      SELECT ci.Id, ci.CourseId, ci.Status, c.Title, c.Description,
             u.FirstName AS TeacherFirstName, u.LastName AS TeacherLastName
      FROM CourseInvitations ci
      INNER JOIN Courses c ON c.Id = ci.CourseId
      INNER JOIN Users u ON u.Id = ci.TeacherId
      WHERE ci.StudentId = ${req.user.id} AND ci.Status = 'Pending'
      ORDER BY ci.InvitedAt DESC
    `;
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Eroare la preluarea invitațiilor.' });
  }
});

app.post('/api/course-invitations/:id/respond', protect, restrictTo('Student'), async (req, res) => {
  const invitationId = req.params.id;
  const { accept } = req.body;

  if (typeof accept !== 'boolean') {
    return res.status(400).json({ message: 'Parametru invalid.' });
  }

  try {
    // 1️⃣ Preluăm invitația
    const result = await sqlPool.query`
      SELECT * FROM CourseInvitations
      WHERE Id = ${invitationId} AND StudentId = ${req.user.id} AND Status = 'Pending'
    `;

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Invitația nu există sau a fost deja procesată.' });
    }

    const invitation = result.recordset[0];

    // 2️⃣ Actualizăm status
    const newStatus = accept ? 'Accepted' : 'Declined';
    await sqlPool.query`
      UPDATE CourseInvitations
      SET Status = ${newStatus}
      WHERE Id = ${invitationId}
    `;

    // 3️⃣ Dacă accept → înscriem studentul în curs
    if (accept) {
      await sqlPool.query`
        IF NOT EXISTS (
          SELECT 1 FROM CourseEnrollments
          WHERE CourseId = ${invitation.CourseId} AND StudentId = ${req.user.id}
        )
        INSERT INTO CourseEnrollments (CourseId, StudentId, EnrolledAt)
        VALUES (${invitation.CourseId}, ${req.user.id}, GETDATE())
      `;
    }

    res.json({ message: `Invitația a fost ${newStatus.toLowerCase()}.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Eroare la procesarea invitației.' });
  }
});

// GET STUDENTS (profesor poate filtra după academicYear)
app.get('/api/students', protect, restrictTo('Profesor'), async (req, res) => {
  const { academicYear } = req.query;

  try {
    let query = sqlPool.request();
    let sqlQuery = `
      SELECT id, firstName, lastName, academicYear, email
      FROM Users
      WHERE role = 'Student'
    `;

    if (academicYear) {
      sqlQuery += ` AND academicYear = @academicYear`;
      query.input('academicYear', sql.Int, academicYear);
    }

    const result = await query.query(sqlQuery);
    res.json(result.recordset);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Eroare la preluarea studenților.' });
  }
});

// GET LINKED TEACHERS (student -> professors who teach their courses)
app.get('/api/student/teachers', protect, restrictTo('Student'), async (req, res) => {
  try {
    const result = await sqlPool.request()
      .input("studentId", sql.Int, req.user.id)
      .query(`
        SELECT DISTINCT 
            u.Id,
            u.FirstName,
            u.LastName,
            u.Email,
            u.Avatar,
            u.Role,
            c.Title AS CourseTitle
        FROM Users u
        INNER JOIN Courses c ON c.CreatedBy = u.Id
        INNER JOIN CourseEnrollments ce ON ce.CourseId = c.Id
        WHERE ce.StudentId = @studentId
      `);

    // Formatăm avatarul (dacă e null -> default)
    const teachers = result.recordset.map(t => ({
      Id: t.Id,
      FirstName: t.FirstName,
      LastName: t.LastName,
      Email: t.Email,
      Avatar: t.Avatar ? t.Avatar : "assets/avatar-default.png",
      Role: t.Role,
      course: t.CourseTitle || ''
    }));

    res.json(teachers);

  } catch (err) {
    console.error("❌ Error getting linked teachers:", err);
    res.status(500).json({ message: "Eroare server la preluarea profesorilor." });
  }
});
// =========================
// QUIZZES (TEACHER)
// =========================

async function getQuizPublishReadiness(quizId, teacherId, draftData = {}) {
  const quizResult = await sqlPool.query`
    SELECT q.Id, q.Title, q.Description, q.ScheduledAt, q.CourseId,
           c.Title AS CourseTitle, c.IsPublished AS CourseIsPublished
    FROM CourseQuizzes q
    INNER JOIN Courses c ON c.Id = q.CourseId
    WHERE q.Id = ${quizId} AND q.CreatedBy = ${teacherId}
  `;

  if (quizResult.recordset.length === 0) {
    return {
      found: false,
      canPublish: false,
      checks: {
        hasTitle: false,
        hasDescription: false,
        coursePublished: false,
        hasScheduledAt: false,
        hasFutureSchedule: false,
        hasQuestion: false,
        everyQuestionHasEnoughOptions: false,
        everyQuestionHasValidAnswers: false
      },
      missingItems: ['Quiz-ul nu a fost găsit.']
    };
  }

  const quiz = quizResult.recordset[0];
  const title = typeof draftData.title === 'string' ? draftData.title.trim() : (quiz.Title || '').trim();
  const description = typeof draftData.description === 'string' ? draftData.description.trim() : (quiz.Description || '').trim();
  const targetCourseId = draftData.courseId ?? quiz.CourseId;

  const courseResult = await sqlPool.query`
    SELECT Id, Title, IsPublished
    FROM Courses
    WHERE Id = ${targetCourseId} AND CreatedBy = ${teacherId}
  `;

  const course = courseResult.recordset[0] || null;

  const scheduleSource = Object.prototype.hasOwnProperty.call(draftData, 'scheduledAt')
    ? draftData.scheduledAt
    : quiz.ScheduledAt;

  let hasFutureSchedule = false;
  if (scheduleSource) {
    const parsed = new Date(scheduleSource);
    hasFutureSchedule = !Number.isNaN(parsed.getTime()) && parsed > new Date();
  }

  const questionsResult = await sqlPool.query`
    SELECT
      qq.Id,
      qq.QuestionText,
      qq.QuestionType,
      COUNT(qo.Id) AS OptionCount,
      SUM(CASE WHEN qo.IsCorrect = 1 THEN 1 ELSE 0 END) AS CorrectCount
    FROM QuizQuestions qq
    LEFT JOIN QuizOptions qo ON qo.QuestionId = qq.Id
    WHERE qq.QuizId = ${quizId}
    GROUP BY qq.Id, qq.QuestionText, qq.QuestionType
    ORDER BY qq.Id
  `;

  const questions = questionsResult.recordset;
  const optionIssues = [];
  const answerIssues = [];

  for (const question of questions) {
    const label = question.QuestionText || `Întrebarea #${question.Id}`;
    const normalizedType = (question.QuestionType || '').toLowerCase();
    const optionCount = Number(question.OptionCount || 0);
    const correctCount = Number(question.CorrectCount || 0);
    const requiresOptions = normalizedType !== 'open';

    if (requiresOptions && optionCount < 2) {
      optionIssues.push(`Întrebarea "${label}" trebuie să aibă cel puțin 2 opțiuni.`);
    }

    if (requiresOptions && normalizedType === 'single' && correctCount !== 1) {
      answerIssues.push(`Întrebarea "${label}" trebuie să aibă exact 1 răspuns corect.`);
    }

    if (requiresOptions && normalizedType === 'multiple' && correctCount < 2) {
      answerIssues.push(`Întrebarea "${label}" trebuie să aibă cel puțin 2 răspunsuri corecte.`);
    }
  }

  const checks = {
    hasTitle: !!title,
    hasDescription: !!description,
    coursePublished: !!course?.IsPublished,
    hasScheduledAt: !!scheduleSource,
    hasFutureSchedule,
    hasQuestion: questions.length > 0,
    everyQuestionHasEnoughOptions: optionIssues.length === 0,
    everyQuestionHasValidAnswers: answerIssues.length === 0
  };

  const missingItems = [];

  if (!checks.hasTitle) missingItems.push('Adaugă titlul quiz-ului.');
  if (!checks.hasDescription) missingItems.push('Adaugă descrierea quiz-ului.');
  if (!course) missingItems.push('Selectează un curs valid pentru acest quiz.');
  else if (!checks.coursePublished) missingItems.push(`Publică mai întâi cursul asociat: "${course.Title}".`);
  if (!checks.hasScheduledAt) missingItems.push('Setează data și ora susținerii.');
  else if (!checks.hasFutureSchedule) missingItems.push('Data quiz-ului trebuie să fie în viitor la momentul publicării.');
  if (!checks.hasQuestion) missingItems.push('Adaugă cel puțin o întrebare.');

  missingItems.push(...optionIssues, ...answerIssues);

  return {
    found: true,
    canPublish: missingItems.length === 0,
    checks,
    missingItems
  };
}

// CREATE QUIZ
app.post('/api/quizzes', protect, restrictTo('Profesor'), async (req, res) => {
  const { courseId, title, description, scheduledAt } = req.body;
  const cleanTitle = typeof title === 'string' ? title.trim() : '';
  const cleanDescription = typeof description === 'string' ? description.trim() : '';

  if (!courseId || !cleanTitle) {
    return res.status(400).json({
      message: "courseId și title sunt obligatorii."
    });
  }

  try {
    const courseResult = await sqlPool.query`
      SELECT Id
      FROM Courses
      WHERE Id = ${courseId} AND CreatedBy = ${req.user.id}
    `;

    if (courseResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Cursul selectat nu a fost găsit.' });
    }

    let scheduledDate = null;
    if (scheduledAt) {
      scheduledDate = new Date(scheduledAt);
      const now = new Date();
      if (Number.isNaN(scheduledDate.getTime()) || scheduledDate <= now) {
        return res.status(400).json({
          message: "Data quiz-ului trebuie să fie în viitor."
        });
      }
    }

    const request = sqlPool.request()
      .input('CourseId', sql.Int, courseId)
      .input('Title', sql.NVarChar(255), cleanTitle)
      .input('Description', sql.NVarChar(sql.MAX), cleanDescription || '')
      .input('CreatedBy', sql.Int, req.user.id)
      .input('IsPublished', sql.Bit, 0)
      .input('ScheduledAt', sql.DateTime2, scheduledDate);

    const result = await request.query(`
      INSERT INTO CourseQuizzes 
      (CourseId, Title, Description, CreatedBy, CreatedAt, IsPublished, ScheduledAt)
      OUTPUT INSERTED.*
      VALUES (@CourseId, @Title, @Description, @CreatedBy, GETDATE(), @IsPublished, @ScheduledAt)
    `);

    res.status(201).json({
      ...result.recordset[0],
      message: 'Quiz-ul a fost creat ca draft. Îl poți publica după ce adaugi întrebări și opțiuni valide.'
    });

  } catch (err) {
    console.error("❌ Error creating quiz:", err);
    res.status(500).json({ message: "Eroare la crearea quiz-ului." });
  }
});

// GET QUIZZES BY TEACHER
app.get('/api/quizzes/teacher/:teacherId', protect, restrictTo('Profesor'), async (req, res) => {
  const teacherId = parseInt(req.params.teacherId);

  try {
    const result = await sqlPool.query`
      SELECT * FROM CourseQuizzes
      WHERE CreatedBy = ${teacherId}
      ORDER BY CreatedAt DESC
    `;
    res.json(result.recordset);
  } catch (err) {
    console.error("❌ Error fetching quizzes by teacher:", err);
    res.status(500).json({ message: "Eroare la preluarea quiz-urilor profesorului." });
  }
});

// GET FULL QUIZ (WITH QUESTIONS AND OPTIONS)
app.get('/api/quizzes/:id/full', protect, restrictTo('Profesor'), async (req, res) => {
  const quizId = parseInt(req.params.id);

  try {
    const quizResult = await sqlPool.query`
      SELECT * FROM CourseQuizzes WHERE Id = ${quizId}
    `;

    if (quizResult.recordset.length === 0)
      return res.status(404).json({ message: "Quiz-ul nu există." });

    const quiz = quizResult.recordset[0];

    // QUESTIONS
    const questionsResult = await sqlPool.query`
      SELECT * FROM QuizQuestions WHERE QuizId = ${quizId}
    `;
    const questions = questionsResult.recordset;

    // OPTIONS for each question
    for (let q of questions) {
      const optionsResult = await sqlPool.query`
        SELECT * FROM QuizOptions WHERE QuestionId = ${q.Id}
      `;
      q.options = optionsResult.recordset;
    }

    res.json({ quiz, questions });
  } catch (err) {
    console.error("❌ Error fetching full quiz:", err);
    res.status(500).json({ message: "Eroare la preluarea quiz-ului complet." });
  }
});

// UPDATE QUIZ
app.put('/api/quizzes/:id', protect, restrictTo('Profesor'), async (req, res) => {
  const quizId = parseInt(req.params.id);
  const { title, description, courseId, isPublished, scheduledAt } = req.body;
  const cleanTitle = typeof title === 'string' ? title.trim() : '';
  const cleanDescription = typeof description === 'string' ? description.trim() : '';
  const nextPublishedState = isPublished === true || isPublished === 1;

  if (!cleanTitle) {
    return res.status(400).json({ message: "Titlul este obligatoriu." });
  }

  if (!courseId) {
    return res.status(400).json({ message: "Selectează un curs pentru quiz." });
  }

  try {
    const quizCheck = await sqlPool.query`
      SELECT * FROM CourseQuizzes WHERE Id = ${quizId} AND CreatedBy = ${req.user.id}
    `;

    if (quizCheck.recordset.length === 0) {
      return res.status(404).json({ message: "Quiz inexistent." });
    }

    const courseResult = await sqlPool.query`
      SELECT Id FROM Courses WHERE Id = ${courseId} AND CreatedBy = ${req.user.id}
    `;

    if (courseResult.recordset.length === 0) {
      return res.status(404).json({ message: 'Cursul selectat nu a fost găsit.' });
    }

    let scheduledDate = null;
    if (scheduledAt) {
      scheduledDate = new Date(scheduledAt);
      if (Number.isNaN(scheduledDate.getTime())) {
        return res.status(400).json({ message: "Data programată este invalidă." });
      }
      const now = new Date();
      if (scheduledDate <= now) {
        return res.status(400).json({ message: "Data quiz-ului trebuie să fie în viitor." });
      }
    }

    if (nextPublishedState) {
      const readiness = await getQuizPublishReadiness(quizId, req.user.id, {
        title: cleanTitle,
        description: cleanDescription,
        courseId,
        scheduledAt
      });

      if (!readiness.canPublish) {
        return res.status(400).json({
          message: 'Quiz-ul nu poate fi publicat încă.',
          missingItems: readiness.missingItems,
          checks: readiness.checks
        });
      }
    }

    await sqlPool.request()
      .input('CourseId', sql.Int, courseId)
      .input('Title', sql.NVarChar(255), cleanTitle)
      .input('Description', sql.NVarChar(sql.MAX), cleanDescription || '')
      .input('IsPublished', sql.Bit, nextPublishedState ? 1 : 0)
      .input('ScheduledAt', sql.DateTime2, scheduledDate)
      .query(`
        UPDATE CourseQuizzes
        SET 
          CourseId = @CourseId,
          Title = @Title,
          Description = @Description,
          IsPublished = @IsPublished,
          ScheduledAt = @ScheduledAt
        WHERE Id = ${quizId} AND CreatedBy = ${req.user.id}
      `);

    res.json({ message: "Quiz actualizat cu succes." });

  } catch (err) {
    console.error("❌ Error updating quiz:", err);
    res.status(500).json({ message: "Eroare la actualizare." });
  }
});

app.get('/api/quizzes/:id/publish-readiness', protect, restrictTo('Profesor'), async (req, res) => {
  const quizId = parseInt(req.params.id);

  try {
    const readiness = await getQuizPublishReadiness(quizId, req.user.id);

    if (!readiness.found) {
      return res.status(404).json({ message: 'Quiz-ul nu a fost găsit.' });
    }

    res.json(readiness);
  } catch (err) {
    console.error('❌ Error checking quiz publish readiness:', err);
    res.status(500).json({ message: 'Eroare la verificarea condițiilor de publicare.' });
  }
});

// DELETE QUIZ
app.delete('/api/quizzes/:id', protect, restrictTo('Profesor'), async (req, res) => {
  const quizId = parseInt(req.params.id);

  try {
    // DELETE options -> questions -> quiz
    await sqlPool.query`
      DELETE FROM QuizOptions
      WHERE QuestionId IN (SELECT Id FROM QuizQuestions WHERE QuizId = ${quizId})
    `;
    await sqlPool.query`
      DELETE FROM QuizQuestions WHERE QuizId = ${quizId}
    `;
    await sqlPool.query`
      DELETE FROM CourseQuizzes WHERE Id = ${quizId}
    `;

    res.json({ message: "Quiz șters." });
  } catch (err) {
    console.error("❌ Error deleting quiz:", err);
    res.status(500).json({ message: "Eroare la ștergerea quiz-ului." });
  }
});



// GET ALL PUBLISHED QUIZZES FOR A STUDENT
// În app.js, caută ruta care aduce testele pentru student:
app.get('/api/quizzes/student', protect, restrictTo('Student'), async (req, res) => {
  try {
    const studentId = req.user.id;

    const result = await sqlPool.query`
      SELECT 
        q.Id, 
        q.Title, 
        q.Description, 
        q.ScheduledAt,
        q.CourseId,
        c.Title AS CourseTitle,

        (SELECT COUNT(*) 
         FROM QuizResults qr 
         WHERE qr.QuizId = q.Id AND qr.StudentId = ${studentId}) as HasTaken,

        (SELECT COALESCE(MAX(Score), 0) 
         FROM QuizResults qr 
         WHERE qr.QuizId = q.Id AND qr.StudentId = ${studentId}) as UserScore

      FROM CourseQuizzes q
      INNER JOIN Courses c ON c.Id = q.CourseId
      INNER JOIN CourseEnrollments ce 
        ON ce.CourseId = q.CourseId 
        AND ce.StudentId = ${studentId}
      WHERE q.IsPublished = 1 AND c.IsPublished = 1
      ORDER BY q.ScheduledAt ASC, q.CreatedAt DESC
    `;

    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Eroare la preluarea listei de teste." });
  }
});

// GET GRADES FOR LOGGED IN STUDENT
app.get('/api/student/my-grades', protect, restrictTo('Student'), async (req, res) => {
  try {
    const studentId = req.user.id;

    const result = await sqlPool.query`
      SELECT 
          qr.Id AS ResultId,
          q.Title AS QuizTitle,
          c.Title AS CourseTitle,
          qr.Score,
          qr.SubmittedAt,
          (SELECT SUM(Points) FROM QuizQuestions WHERE QuizId = q.Id) AS MaxScore
      FROM QuizResults qr
      INNER JOIN CourseQuizzes q ON qr.QuizId = q.Id
      INNER JOIN Courses c ON q.CourseId = c.Id
      WHERE qr.StudentId = ${studentId}
      ORDER BY qr.SubmittedAt DESC;
    `;

    res.json(result.recordset);
  } catch (err) {
    console.error("❌ Eroare la preluarea notelor:", err);
    res.status(500).json({ message: "Eroare la încărcarea notelor." });
  }
});

// GET FULL QUIZ PENTRU STUDENT (FĂRĂ RĂSPUNSURILE CORECTE)
app.get('/api/student/quizzes/:id/take', protect, restrictTo('Student'), async (req, res) => {
  const quizId = parseInt(req.params.id);

  try {
    const studentId = req.user.id;

    const checkAttempt = await sqlPool.query`
      SELECT Id FROM QuizResults WHERE QuizId = ${quizId} AND StudentId = ${studentId}
    `;

    if (checkAttempt.recordset.length > 0) {
      return res.status(400).json({ 
        message: "Ai susținut deja acest test! Nu este permisă trimiterea multiplă." 
      });
    }

    const accessResult = await sqlPool.query`
      SELECT q.*
      FROM CourseQuizzes q
      INNER JOIN Courses c ON c.Id = q.CourseId
      INNER JOIN CourseEnrollments ce ON ce.CourseId = q.CourseId AND ce.StudentId = ${studentId}
      WHERE q.Id = ${quizId} AND q.IsPublished = 1 AND c.IsPublished = 1
    `;

    if (accessResult.recordset.length === 0) {
      return res.status(404).json({ message: "Quiz-ul nu există, nu este publicat sau nu ai acces la el." });
    }

    const quiz = accessResult.recordset[0];

    const now = new Date();
    const scheduledDate = new Date(quiz.ScheduledAt);
    if (quiz.ScheduledAt && now < scheduledDate) {
      return res.status(403).json({ message: "Acest test nu a început încă." });
    }

    const questionsResult = await sqlPool.query`
      SELECT Id, QuestionText, QuestionType, Points 
      FROM QuizQuestions 
      WHERE QuizId = ${quizId}
    `;
    const questions = questionsResult.recordset;

    for (let q of questions) {
      const optionsResult = await sqlPool.query`
        SELECT Id, OptionText 
        FROM QuizOptions 
        WHERE QuestionId = ${q.Id}
      `;
      q.options = optionsResult.recordset;
    }

    res.json({ quiz, questions });

  } catch (err) {
    console.error("❌ Eroare la preluarea testului pentru student:", err);
    res.status(500).json({ message: "Eroare la încărcarea testului." });
  }
});

// SUBMIT QUIZ (Calculare scor și salvare)
app.post('/api/quizzes/:id/submit', protect, restrictTo('Student'), async (req, res) => {
  const quizId = parseInt(req.params.id);
  const studentAnswers = req.body;

  try {
    const accessResult = await sqlPool.query`
      SELECT q.*
      FROM CourseQuizzes q
      INNER JOIN Courses c ON c.Id = q.CourseId
      INNER JOIN CourseEnrollments ce ON ce.CourseId = q.CourseId AND ce.StudentId = ${req.user.id}
      WHERE q.Id = ${quizId} AND q.IsPublished = 1 AND c.IsPublished = 1
    `;

    if (accessResult.recordset.length === 0) {
      return res.status(403).json({ message: 'Nu ai acces la acest quiz.' });
    }

    const quiz = accessResult.recordset[0];
    if (quiz.ScheduledAt && new Date() < new Date(quiz.ScheduledAt)) {
      return res.status(403).json({ message: 'Acest test nu a început încă.' });
    }

    const existingAttempt = await sqlPool.query`
      SELECT Id FROM QuizResults WHERE QuizId = ${quizId} AND StudentId = ${req.user.id}
    `;

    if (existingAttempt.recordset.length > 0) {
      return res.status(400).json({ message: 'Ai trimis deja răspunsurile pentru acest test.' });
    }

    const questionsRes = await sqlPool.query`
      SELECT Id, Points, QuestionType FROM QuizQuestions WHERE QuizId = ${quizId}
    `;
    const questions = questionsRes.recordset;

    const correctOptionsRes = await sqlPool.query`
      SELECT qo.Id, qo.QuestionId
      FROM QuizOptions qo
      INNER JOIN QuizQuestions qq ON qo.QuestionId = qq.Id
      WHERE qq.QuizId = ${quizId} AND qo.IsCorrect = 1
    `;
    const correctOptions = correctOptionsRes.recordset;

    let totalScore = 0;
    let maxPossibleScore = 0;

    for (const q of questions) {
      maxPossibleScore += q.Points;
      const selectedIds = Array.isArray(studentAnswers[q.Id]) ? studentAnswers[q.Id] : [];
      const correctIdsForQ = correctOptions
        .filter(opt => opt.QuestionId === q.Id)
        .map(opt => opt.Id);

      const isCorrect =
        selectedIds.length === correctIdsForQ.length &&
        selectedIds.every(id => correctIdsForQ.includes(id));

      if (isCorrect) {
        totalScore += q.Points;
      }
    }

    const resultInsert = await sqlPool.query`
      INSERT INTO QuizResults (QuizId, StudentId, Score, SubmittedAt)
      OUTPUT INSERTED.Id
      VALUES (${quizId}, ${req.user.id}, ${totalScore}, GETDATE())
    `;
    const quizResultId = resultInsert.recordset[0].Id;

    for (const [questionIdStr, optionIdsArray] of Object.entries(studentAnswers)) {
      const qId = parseInt(questionIdStr);
      const optionIds = Array.isArray(optionIdsArray) ? optionIdsArray : [];

      for (const optId of optionIds) {
        await sqlPool.query`
          INSERT INTO StudentAnswers (ResultId, QuestionId, OptionId)
          VALUES (${quizResultId}, ${qId}, ${optId})
        `;
      }
    }

    res.status(201).json({ 
      message: "Test finalizat cu succes!", 
      score: totalScore,
      maxScore: maxPossibleScore
    });

  } catch (err) {
    console.error("❌ Eroare la trimiterea testului:", err);
    res.status(500).json({ message: "Eroare la procesarea testului." });
  }
});


// ADD QUESTION
app.post('/api/quizzes/:quizId/questions', protect, restrictTo('Profesor'), async (req, res) => {
  const quizId = parseInt(req.params.quizId);
  const { questionText, questionType, points } = req.body;

  if (!questionText || !questionType) {
    return res.status(400).json({ message: 'Textul și tipul întrebării sunt obligatorii.' });
  }

  try {
    const result = await sqlPool.query`
      INSERT INTO QuizQuestions (QuizId, QuestionText, QuestionType, Points)
      OUTPUT INSERTED.*
      VALUES (${quizId}, ${questionText}, ${questionType}, ${points || 1})
    `;
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.error("❌ Error adding question:", err);
    res.status(500).json({ message: "Eroare la adăugarea întrebării." });
  }
});

// ADD OPTION TO QUESTION
app.post('/api/questions/:questionId/options', protect, restrictTo('Profesor'), async (req, res) => {
  const questionId = parseInt(req.params.questionId);
  const { optionText, isCorrect } = req.body;

  if (!optionText) {
    return res.status(400).json({ message: "OptionText este obligatoriu." });
  }

  try {
    const result = await sqlPool.query`
      INSERT INTO QuizOptions (QuestionId, OptionText, IsCorrect)
      OUTPUT INSERTED.*
      VALUES (${questionId}, ${optionText}, ${isCorrect || 0})
    `;
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.error("❌ Error adding option:", err);
    res.status(500).json({ message: "Eroare la adăugarea opțiunii." });
  }
});

// GET QUESTIONS BY QUIZ (simple list)
app.get('/api/quizzes/:quizId/questions', protect, restrictTo('Profesor'), async (req, res) => {
  const quizId = parseInt(req.params.quizId);

  try {
    const result = await sqlPool.query`
      SELECT *
      FROM QuizQuestions
      WHERE QuizId = ${quizId}
      ORDER BY Id
    `;
    res.json(result.recordset);

  } catch (err) {
    console.error("❌ Error fetching questions:", err);
    res.status(500).json({ message: "Eroare la preluarea întrebărilor." });
  }
});


// UPDATE QUESTION
app.put('/api/questions/:id', protect, restrictTo('Profesor'), async (req, res) => {
  const questionId = parseInt(req.params.id);
  const { questionText, questionType, points } = req.body;

  try {
    await sqlPool.query`
      UPDATE QuizQuestions
      SET QuestionText = ${questionText},
          QuestionType = ${questionType},
          Points = ${points}
      WHERE Id = ${questionId}
    `;

    res.json({ message: "Întrebarea a fost actualizată." });

  } catch (err) {
    console.error("❌ Error updating question:", err);
    res.status(500).json({ message: "Eroare la actualizarea întrebării." });
  }
});

// GET OPTIONS BY QUESTION
app.get('/api/questions/:questionId/options', protect, restrictTo('Profesor'), async (req, res) => {
  const questionId = parseInt(req.params.questionId);
  try {
    const result = await sqlPool.query`
      SELECT * FROM QuizOptions WHERE QuestionId = ${questionId}
    `;
    res.json(result.recordset);
  } catch (err) {
    console.error("❌ Error fetching options:", err);
    res.status(500).json({ message: "Eroare la preluarea opțiunilor." });
  }
});



// DELETE QUESTION + OPTIONS
app.delete('/api/questions/:id', protect, restrictTo('Profesor'), async (req, res) => {
  const questionId = parseInt(req.params.id);

  try {
    await sqlPool.query`
      DELETE FROM QuizOptions WHERE QuestionId = ${questionId}
    `;
    await sqlPool.query`
      DELETE FROM QuizQuestions WHERE Id = ${questionId}
    `;

    res.json({ message: "Întrebarea și opțiunile au fost șterse." });

  } catch (err) {
    console.error("❌ Error deleting question:", err);
    res.status(500).json({ message: "Eroare la ștergerea întrebării." });
  }
});

// GET QUESTION BY ID
app.get('/api/questions/:id', protect, restrictTo('Profesor'), async (req, res) => {
  const questionId = parseInt(req.params.id);

  if (isNaN(questionId)) {
    return res.status(400).json({ message: 'ID întrebare invalid.' });
  }

  try {
    const result = await sqlPool.query`
      SELECT *
      FROM QuizQuestions
      WHERE Id = ${questionId}
    `;

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'Întrebarea nu există.' });
    }

    res.json(result.recordset[0]);

  } catch (err) {
    console.error('❌ Error fetching question by id:', err);
    res.status(500).json({ message: 'Eroare la preluarea întrebării.' });
  }
});



// UPDATE OPTION
app.put('/api/options/:id', protect, restrictTo('Profesor'), async (req, res) => {
  const optionId = parseInt(req.params.id);
  const { optionText, isCorrect } = req.body;

  console.log('💡 Received update request for optionId:', optionId);
  console.log('💡 Payload:', { optionText, isCorrect });

  try {
    const result = await sqlPool.query`
      UPDATE QuizOptions
      SET OptionText = ${optionText},
          IsCorrect = ${isCorrect}
      WHERE Id = ${optionId}
    `;

    console.log('✅ SQL Update executed, result:', result);
    res.json({ message: "Opțiunea a fost actualizată." });

  } catch (err) {
    console.error('❌ Error updating option:', err);
    res.status(500).json({ message: "Eroare la actualizarea opțiunii." });
  }
});



// DELETE OPTION
app.delete('/api/options/:id', protect, restrictTo('Profesor'), async (req, res) => {
  const optionId = parseInt(req.params.id);

  try {
    await sqlPool.query`
      DELETE FROM QuizOptions WHERE Id = ${optionId}
    `;

    res.json({ message: "Opțiunea a fost ștearsă." });

  } catch (err) {
    console.error("❌ Error deleting option:", err);
    res.status(500).json({ message: "Eroare la ștergerea opțiunii." });
  }
});


// PUBLISH / UNPUBLISH QUIZ
app.patch('/api/quizzes/:id/publish', protect, restrictTo('Profesor'), async (req, res) => {
  const quizId = parseInt(req.params.id);
  const nextPublishedState = typeof req.body?.isPublished === 'boolean' ? req.body.isPublished : true;

  try {
    const quizResult = await sqlPool.query`
      SELECT Id FROM CourseQuizzes WHERE Id = ${quizId} AND CreatedBy = ${req.user.id}
    `;

    if (quizResult.recordset.length === 0) {
      return res.status(404).json({ message: "Quiz inexistent." });
    }

    if (nextPublishedState) {
      const readiness = await getQuizPublishReadiness(quizId, req.user.id);
      if (!readiness.canPublish) {
        return res.status(400).json({
          message: 'Quiz-ul nu poate fi publicat încă.',
          missingItems: readiness.missingItems,
          checks: readiness.checks
        });
      }
    }

    await sqlPool.query`
      UPDATE CourseQuizzes
      SET IsPublished = ${nextPublishedState}
      WHERE Id = ${quizId} AND CreatedBy = ${req.user.id}
    `;

    res.json({ message: nextPublishedState ? "Quiz publicat." : "Quiz ascuns." });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Eroare la schimbarea stării." });
  }
});


// GET QUIZZES BY COURSE
app.get('/api/quizzes/by-course/:courseId', protect, restrictTo('Profesor'), async (req, res) => {
  const courseId = parseInt(req.params.courseId);

  try {
    const result = await sqlPool.query`
      SELECT *
      FROM CourseQuizzes
      WHERE CourseId = ${courseId}
      ORDER BY CreatedAt DESC
    `;
    res.json(result.recordset);

  } catch (err) {
    console.error("❌ Error fetching quizzes by course:", err);
    res.status(500).json({ message: "Eroare la preluarea quiz-urilor cursului." });
  }
});

// =========================
// COURSE SCHEDULE API
// =========================

// CREATE SCHEDULE (profesor)
app.post('/api/course-schedules', protect, restrictTo('Profesor'), async (req, res) => {
  const { courseId, dayOfWeek, startTime, endTime } = req.body;

  if (!courseId || !dayOfWeek || !startTime || !endTime) {
    return res.status(400).json({ message: 'courseId, dayOfWeek, startTime și endTime sunt obligatorii.' });
  }

  try {
    const result = await sqlPool.query`
      INSERT INTO CourseSchedule (CourseId, UserId, DayOfWeek, StartTime, EndTime)
      OUTPUT INSERTED.*
      VALUES (${courseId}, ${req.user.id}, ${dayOfWeek}, ${startTime}, ${endTime})
    `;
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.error("❌ Error creating schedule:", err);
    res.status(500).json({ message: 'Eroare la crearea programării.' });
  }
});

// GET SCHEDULES BY COURSE (profesor)
app.get('/api/course-schedules', protect, restrictTo('Profesor'), async (req, res) => {
  const { courseId } = req.query;

  if (!courseId) return res.status(400).json({ message: 'Parametrul courseId este obligatoriu.' });

  try {
    const result = await sqlPool.query`
      SELECT * FROM CourseSchedule
      WHERE CourseId = ${courseId}
      ORDER BY DayOfWeek, StartTime
    `;
    res.json(result.recordset);
  } catch (err) {
    console.error("❌ Error fetching schedules:", err);
    res.status(500).json({ message: 'Eroare la preluarea programărilor.' });
  }
});

// UPDATE SCHEDULE (profesor)
app.put('/api/course-schedules/:id', protect, restrictTo('Profesor'), async (req, res) => {
  const scheduleId = parseInt(req.params.id);
  const { dayOfWeek, startTime, endTime } = req.body;

  if (!dayOfWeek || !startTime || !endTime) {
    return res.status(400).json({ 
      message: 'dayOfWeek, startTime și endTime sunt obligatorii.' 
    });
  }

  try {
    const result = await sqlPool.query`
      UPDATE CourseSchedule
      SET 
        DayOfWeek = ${dayOfWeek},
        StartTime = ${startTime}, 
        EndTime = ${endTime}
      WHERE Id = ${scheduleId}
    `;

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: 'Programarea nu există.' });
    }

    res.json({ message: 'Programarea a fost actualizată cu succes.' });
  } catch (err) {
    console.error("❌ Error updating schedule:", err);
    res.status(500).json({ message: 'Eroare la actualizarea programării.' });
  }
});

// DELETE SCHEDULE (profesor)
app.delete('/api/course-schedules/:id', protect, restrictTo('Profesor'), async (req, res) => {
  const scheduleId = parseInt(req.params.id);

  try {
    const result = await sqlPool.query`
      DELETE FROM CourseSchedule
      WHERE Id = ${scheduleId}
    `;

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: 'Programarea nu există.' });
    }

    res.json({ message: 'Programarea a fost ștearsă cu succes.' });
  } catch (err) {
    console.error("❌ Error deleting schedule:", err);
    res.status(500).json({ message: 'Eroare la ștergerea programării.' });
  }
});

// GET ALL SCHEDULES FOR STUDENT (student -> toate cursurile la care e înscris)
app.get('/api/student/course-schedules', protect, restrictTo('Student'), async (req, res) => {
  const studentId = req.user.id;

  try {
    const result = await sqlPool.query`
      SELECT cs.*, c.Title AS CourseTitle, u.FirstName AS TeacherFirstName, u.LastName AS TeacherLastName
      FROM CourseSchedule cs
      INNER JOIN Courses c ON c.Id = cs.CourseId
      INNER JOIN Users u ON u.Id = c.CreatedBy
      INNER JOIN CourseEnrollments ce ON ce.CourseId = c.Id
      WHERE ce.StudentId = ${studentId}
      ORDER BY cs.DayOfWeek, cs.StartTime
    `;

    res.json(result.recordset);
  } catch (err) {
    console.error("❌ Error fetching student schedules:", err);
    res.status(500).json({ message: 'Eroare la preluarea programărilor studentului.' });
  }
});

// GET UPCOMING SCHEDULES FOR STUDENT
app.get('/api/student/course-schedules/upcoming', protect, restrictTo('Student'), async (req, res) => {
  const studentId = req.user.id;

  try {
    const result = await sqlPool.query`
      SELECT cs.*, c.Title AS CourseTitle, u.FirstName AS TeacherFirstName, u.LastName AS TeacherLastName
      FROM CourseSchedule cs
      INNER JOIN Courses c ON c.Id = cs.CourseId
      INNER JOIN Users u ON u.Id = c.CreatedBy
      INNER JOIN CourseEnrollments ce ON ce.CourseId = c.Id
      WHERE ce.StudentId = ${studentId}
      ORDER BY cs.DayOfWeek, cs.StartTime
    `;
    res.json(result.recordset);
  } catch (err) {
    console.error("❌ Error fetching upcoming schedules:", err);
    res.status(500).json({ message: 'Eroare la preluarea programărilor viitoare.' });
  }
});

// GET ALL SCHEDULES FOR TEACHER
app.get('/api/course-schedules/teacher/all-schedules', protect, restrictTo('Profesor'), async (req, res) => {
  const teacherId = req.user.id;

  try {
    const result = await sqlPool.query`
      SELECT cs.*, c.Title AS CourseTitle
      FROM CourseSchedule cs
      INNER JOIN Courses c ON c.Id = cs.CourseId
      WHERE cs.UserId = ${teacherId}
      ORDER BY cs.DayOfWeek, cs.StartTime
    `;
    res.json(result.recordset);
  } catch (err) {
    console.error("❌ Error fetching teacher schedules:", err);
    res.status(500).json({ message: 'Eroare la preluarea programărilor profesorului.' });
  }
});





