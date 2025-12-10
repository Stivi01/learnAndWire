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

// CREATE QUIZ
app.post('/api/quizzes', protect, restrictTo('Profesor'), async (req, res) => {
  const { courseId, title, description, isPublished } = req.body;

  if (!courseId || !title) {
    return res.status(400).json({ message: "courseId și title sunt obligatorii." });
  }

  try {
    const result = await sqlPool.query`
      INSERT INTO CourseQuizzes (CourseId, Title, Description, CreatedBy, CreatedAt, IsPublished)
      OUTPUT INSERTED.*
      VALUES (${courseId}, ${title}, ${description || ''}, ${req.user.id}, GETDATE(), ${isPublished || 0})
    `;

    res.status(201).json(result.recordset[0]);
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
  const { title, description, isPublished } = req.body;

  try {
    await sqlPool.query`
      UPDATE CourseQuizzes
      SET Title = ${title}, Description = ${description}, IsPublished = ${isPublished}
      WHERE Id = ${quizId}
    `;

    res.json({ message: "Quiz actualizat." });
  } catch (err) {
    console.error("❌ Error updating quiz:", err);
    res.status(500).json({ message: "Eroare la actualizarea quiz-ului." });
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
  const { isPublished } = req.body;

  try {
    await sqlPool.query`
      UPDATE CourseQuizzes
      SET IsPublished = ${isPublished}
      WHERE Id = ${quizId}
    `;

    res.json({ message: isPublished ? "Quiz publicat." : "Quiz ascuns." });

  } catch (err) {
    console.error("❌ Error changing publish state:", err);
    res.status(500).json({ message: "Eroare la schimbarea stării quiz-ului." });
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





