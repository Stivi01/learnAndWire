const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { parseLocalDateTime } = require('../utils/dateUtils');

function registerHomeworkRoutes(app, { getSqlPool, protect, restrictTo, sql }) {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = 'uploads/documents/';
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  });

  const allowedInstructionExtensions = ['.pdf', '.doc', '.docx'];
  const allowedSubmissionExtensions = ['.pdf', '.doc', '.docx', '.svg'];

  const instructionsUpload = multer({
    storage,
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowedInstructionExtensions.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error('Doar fișiere PDF, DOC sau DOCX sunt permise pentru instrucțiuni.'));
      }
    }
  });

  const submissionUpload = multer({
    storage,
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowedSubmissionExtensions.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error('Doar fișiere PDF, DOC, DOCX sau SVG sunt permise pentru submisiuni.'));
      }
    }
  });

  function parseJsonArray(value) {
    if (!value) return [];
    try {
      return JSON.parse(value);
    } catch (err) {
      return [];
    }
  }

  app.post('/api/homeworks', protect, restrictTo('Profesor'), instructionsUpload.single('instructions'), async (req, res) => {
    const { courseId, title, type, description, dueAt } = req.body;
    const maxPoints = parseInt(req.body.maxPoints, 10);
    const cleanTitle = typeof title === 'string' ? title.trim() : '';
    const cleanDescription = typeof description === 'string' ? description.trim() : '';
    const homeworkType = type === 'breadbord' ? 'breadbord' : 'classic';

    if (!courseId || !cleanTitle || !dueAt || Number.isNaN(maxPoints)) {
      return res.status(400).json({ message: 'Toate câmpurile importante trebuie completate corect.' });
    }

    if (maxPoints < 1 || maxPoints > 1000) {
      return res.status(400).json({ message: 'Punctajul temei trebuie să fie între 1 și 1000.' });
    }

    try {
      const sqlPool = getSqlPool();
      const courseResult = await sqlPool.query`
        SELECT Id, Title FROM Courses WHERE Id = ${courseId} AND CreatedBy = ${req.user.id}
      `;

      if (courseResult.recordset.length === 0) {
        return res.status(404).json({ message: 'Cursul selectat nu a fost găsit.' });
      }

      const course = courseResult.recordset[0];
      if (homeworkType === 'breadbord' && !/IEM|METC/i.test(course.Title)) {
        return res.status(400).json({ message: 'Tema breadbord poate fi creată doar pentru materii IEM sau METC.' });
      }

      const instructionsUrl = req.file ? `/uploads/documents/${req.file.filename}` : null;
      const dueDate = parseLocalDateTime(dueAt);
      if (!dueDate) {
        return res.status(400).json({ message: 'Data limită este invalidă.' });
      }

      const request = sqlPool.request()
        .input('CourseId', sql.Int, courseId)
        .input('CreatedBy', sql.Int, req.user.id)
        .input('Title', sql.NVarChar(255), cleanTitle)
        .input('Description', sql.NVarChar(sql.MAX), cleanDescription || null)
        .input('HomeworkType', sql.NVarChar(50), homeworkType)
        .input('InstructionsUrl', sql.NVarChar(255), instructionsUrl)
        .input('DueAt', sql.DateTime2, dueDate)
        .input('MaxPoints', sql.Int, maxPoints);

      const result = await request.query(`
        INSERT INTO Homeworks (CourseId, CreatedBy, Title, Description, HomeworkType, InstructionsUrl, DueAt, CreatedAt, MaxPoints)
        OUTPUT INSERTED.*
        VALUES (@CourseId, @CreatedBy, @Title, @Description, @HomeworkType, @InstructionsUrl, @DueAt, GETDATE(), @MaxPoints)
      `);

      res.status(201).json(result.recordset[0]);
    } catch (err) {
      console.error('❌ Error creating homework:', err);
      res.status(500).json({ message: 'Eroare la crearea temei.' });
    }
  });

  app.get('/api/homeworks/teacher', protect, restrictTo('Profesor'), async (req, res) => {
    try {
      const sqlPool = getSqlPool();
      const result = await sqlPool.query`
        SELECT h.Id AS id,
               h.CourseId AS courseId,
               c.Title AS courseTitle,
               h.Title AS title,
               h.Description AS description,
               h.HomeworkType AS homeworkType,
               h.InstructionsUrl AS instructionsUrl,
               h.DueAt AS dueAt,
               h.CreatedAt AS createdAt,
               h.MaxPoints AS maxPoints,
               (SELECT COUNT(*) FROM HomeworkSubmissions hs WHERE hs.HomeworkId = h.Id) AS submissionCount
        FROM Homeworks h
        INNER JOIN Courses c ON c.Id = h.CourseId
        WHERE h.CreatedBy = ${req.user.id}
        ORDER BY h.DueAt ASC
      `;
      res.json(result.recordset);
    } catch (err) {
      console.error('❌ Error fetching teacher homeworks:', err);
      res.status(500).json({ message: 'Eroare la preluarea temelor create.' });
    }
  });

  app.get('/api/homeworks/student', protect, restrictTo('Student'), async (req, res) => {
    try {
      const sqlPool = getSqlPool();
      const result = await sqlPool.query`
        SELECT h.Id AS id,
               h.CourseId AS courseId,
               c.Title AS courseTitle,
               h.Title AS title,
               h.Description AS description,
               h.HomeworkType AS homeworkType,
               h.InstructionsUrl AS instructionsUrl,
               h.DueAt AS dueAt,
               h.CreatedAt AS createdAt,
               COALESCE(h.MaxPoints, 100) AS maxPoints,
               hs.Id AS submissionId,
               hs.SubmissionType AS submissionType,
               hs.FileUrls AS fileUrls,
               hs.Grade AS grade,
               hs.SubmittedAt AS submittedAt,
               hs.GradedAt AS gradedAt,
               hs.IsLate AS isLate,
               hs.Comments AS comments
        FROM Homeworks h
        INNER JOIN CourseEnrollments ce ON ce.CourseId = h.CourseId AND ce.StudentId = ${req.user.id}
        INNER JOIN Courses c ON c.Id = h.CourseId
        LEFT JOIN HomeworkSubmissions hs ON hs.HomeworkId = h.Id AND hs.StudentId = ${req.user.id}
        WHERE ce.IsExcluded = ${0}
        ORDER BY h.CreatedAt DESC
      `;

      const homeworks = result.recordset.map(hw => ({
        ...hw,
        fileUrls: parseJsonArray(hw.fileUrls),
        isLate: hw.isLate === true || hw.isLate === 1
      }));

      res.json(homeworks);
    } catch (err) {
      console.error('❌ Error fetching student homeworks:', err);
      res.status(500).json({ message: 'Eroare la preluarea temelor.' });
    }
  });

  app.post('/api/homeworks/:id/submit', protect, restrictTo('Student'), submissionUpload.array('files', 5), async (req, res) => {
    const homeworkId = parseInt(req.params.id, 10);
    const submissionType = req.body.submissionType === 'breadbord' ? 'breadbord' : 'classic';

    if (submissionType === 'classic' && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ message: 'Trebuie să atașezi cel puțin un fișier pentru tema clasică.' });
    }

    try {
      const sqlPool = getSqlPool();
      const homeworkResult = await sqlPool.query`
        SELECT h.*, c.Title AS CourseTitle
        FROM Homeworks h
        INNER JOIN Courses c ON c.Id = h.CourseId
        WHERE h.Id = ${homeworkId}
      `;

      if (homeworkResult.recordset.length === 0) {
        return res.status(404).json({ message: 'Tema nu a fost găsită.' });
      }

      const homework = homeworkResult.recordset[0];
      const enrollmentResult = await sqlPool.query`
        SELECT IsExcluded FROM CourseEnrollments
        WHERE CourseId = ${homework.CourseId} AND StudentId = ${req.user.id}
      `;

      if (enrollmentResult.recordset.length === 0 || enrollmentResult.recordset[0].IsExcluded === 1) {
        return res.status(403).json({ message: 'Nu ai acces la această temă.' });
      }

      const fileUrls = (req.files || []).map(file => `/uploads/documents/${file.filename}`);
      const fileUrlsJson = JSON.stringify(fileUrls);

      const existingResult = await sqlPool.query`
        SELECT Id FROM HomeworkSubmissions
        WHERE HomeworkId = ${homeworkId} AND StudentId = ${req.user.id}
      `;

      if (existingResult.recordset.length > 0) {
        return res.status(409).json({ message: 'Ai deja o submisie pentru această temă. Nu poți trimite tema de mai multe ori.' });
      }

      await sqlPool.query`
        INSERT INTO HomeworkSubmissions (HomeworkId, StudentId, SubmissionType, SubmittedAt, FileUrls, IsLate)
        SELECT ${homeworkId}, ${req.user.id}, ${submissionType}, GETDATE(), ${fileUrlsJson}, CASE WHEN GETDATE() > DueAt THEN 1 ELSE 0 END
        FROM Homeworks
        WHERE Id = ${homeworkId}
      `;

      res.status(201).json({ message: 'Tema a fost trimisă cu succes.' });
    } catch (err) {
      console.error('❌ Error submitting homework:', err);
      res.status(500).json({ message: 'Eroare la trimiterea temei.' });
    }
  });

  app.get('/api/homeworks/:id/submissions', protect, restrictTo('Profesor'), async (req, res) => {
    const homeworkId = parseInt(req.params.id, 10);

    try {
      const sqlPool = getSqlPool();
      const homeworkResult = await sqlPool.query`
        SELECT Id, DueAt FROM Homeworks WHERE Id = ${homeworkId} AND CreatedBy = ${req.user.id}
      `;

      if (homeworkResult.recordset.length === 0) {
        return res.status(404).json({ message: 'Tema nu a fost găsită sau nu îți aparține.' });
      }

      const homework = homeworkResult.recordset[0];

      const submissions = await sqlPool.query`
        SELECT hs.Id AS id,
               hs.HomeworkId AS homeworkId,
               hs.StudentId AS studentId,
               hs.SubmissionType AS submissionType,
               hs.FileUrls AS fileUrls,
               hs.Grade AS grade,
               hs.SubmittedAt AS submittedAt,
               hs.GradedAt AS gradedAt,
               hs.IsLate AS isLate,
               hs.Comments AS comments,
               u.FirstName AS firstName,
               u.LastName AS lastName,
               CONCAT(u.FirstName, ' ', u.LastName) AS studentName,
               u.Email AS email,
               COALESCE(h.MaxPoints, 100) AS maxPoints
        FROM HomeworkSubmissions hs
        INNER JOIN Users u ON u.Id = hs.StudentId
        INNER JOIN Homeworks h ON h.Id = hs.HomeworkId
        WHERE hs.HomeworkId = ${homeworkId}
        ORDER BY hs.SubmittedAt DESC
      `;

      res.json(submissions.recordset.map(row => ({
        ...row,
        fileUrls: parseJsonArray(row.fileUrls)
      })));
    } catch (err) {
      console.error('❌ Error fetching homework submissions:', err);
      res.status(500).json({ message: 'Eroare la preluarea submisiilor.' });
    }
  });

  // 📋 NEW ENDPOINT: Get all students with submission status for a homework
  app.get('/api/homeworks/:id/all-students', protect, restrictTo('Profesor'), async (req, res) => {
    const homeworkId = parseInt(req.params.id, 10);

    try {
      const sqlPool = getSqlPool();
      const homeworkResult = await sqlPool.query`
        SELECT h.Id, h.CourseId, h.DueAt, h.MaxPoints
        FROM Homeworks h
        WHERE h.Id = ${homeworkId} AND h.CreatedBy = ${req.user.id}
      `;

      if (homeworkResult.recordset.length === 0) {
        return res.status(404).json({ message: 'Tema nu a fost găsită sau nu îți aparține.' });
      }

      const homework = homeworkResult.recordset[0];

      const allStudents = await sqlPool.query`
        SELECT u.Id AS studentId,
               u.FirstName AS firstName,
               u.LastName AS lastName,
               CONCAT(u.FirstName, ' ', u.LastName) AS studentName,
               u.Email AS email,
               hs.Id AS submissionId,
               hs.SubmissionType AS submissionType,
               hs.FileUrls AS fileUrls,
               hs.Grade AS grade,
               hs.SubmittedAt AS submittedAt,
               hs.GradedAt AS gradedAt,
               hs.IsLate AS isLate,
               hs.Comments AS comments,
               CASE 
                 WHEN hs.Id IS NULL THEN 'not_submitted'
                 WHEN hs.IsLate = 1 THEN 'submitted_late'
                 ELSE 'submitted_on_time'
               END AS status,
               COALESCE(${homework.MaxPoints}, 100) AS maxPoints
        FROM CourseEnrollments ce
        INNER JOIN Users u ON u.Id = ce.StudentId
        LEFT JOIN HomeworkSubmissions hs ON hs.HomeworkId = ${homeworkId} AND hs.StudentId = u.Id
        WHERE ce.CourseId = ${homework.CourseId} AND ce.IsExcluded = 0
        ORDER BY u.FirstName, u.LastName
      `;

      res.json(allStudents.recordset.map(row => ({
        ...row,
        fileUrls: row.fileUrls ? parseJsonArray(row.fileUrls) : []
      })));
    } catch (err) {
      console.error('❌ Error fetching all students:', err);
      res.status(500).json({ message: 'Eroare la preluarea elevilor.' });
    }
  });

  app.put('/api/homeworks/submissions/:submissionId/grade', protect, restrictTo('Profesor'), async (req, res) => {
    const submissionId = parseInt(req.params.submissionId, 10);
    const { grade, comments } = req.body;
    const gradeValue = grade !== undefined && grade !== null && grade !== '' ? Number(grade) : null;
    const hasGrade = gradeValue !== null && !Number.isNaN(gradeValue);
    const hasComments = typeof comments === 'string';

    if (!hasGrade && !hasComments) {
      return res.status(400).json({ message: 'Este nevoie de o notă validă sau un comentariu.' });
    }

    try {
      const sqlPool = getSqlPool();
      const submissionResult = await sqlPool.query`
        SELECT hs.Id, hs.Grade, h.CreatedBy, h.MaxPoints AS MaxPoints
        FROM HomeworkSubmissions hs
        INNER JOIN Homeworks h ON h.Id = hs.HomeworkId
        WHERE hs.Id = ${submissionId}
      `;

      if (submissionResult.recordset.length === 0) {
        return res.status(404).json({ message: 'Submisia nu a fost găsită.' });
      }

      const submission = submissionResult.recordset[0];
      if (submission.CreatedBy !== req.user.id) {
        return res.status(403).json({ message: 'Nu poți nota această submisie.' });
      }

      if (hasGrade) {
        if (submission.Grade !== null && submission.Grade !== undefined) {
          return res.status(409).json({ message: 'Această submisie a fost deja notată.' });
        }

        if (gradeValue < 0 || gradeValue > submission.MaxPoints) {
          return res.status(400).json({ message: `Nota trebuie să fie între 0 și ${submission.MaxPoints}.` });
        }
      }

      const updateFields = [];
      const request = sqlPool.request().input('submissionId', sql.Int, submissionId);

      if (hasGrade) {
        request.input('grade', sql.Int, gradeValue);
        request.input('gradedBy', sql.Int, req.user.id);
        updateFields.push('Grade = @grade', 'GradedAt = GETDATE()', 'GradedBy = @gradedBy');
      }

      if (hasComments) {
        request.input('comments', sql.NVarChar(sql.MAX), comments || null);
        updateFields.push('Comments = @comments');
      }

      await request.query(`
        UPDATE HomeworkSubmissions
        SET ${updateFields.join(', ')}
        WHERE Id = @submissionId
      `);

      res.json({ message: 'Submisia a fost actualizată.' });
    } catch (err) {
      console.error('❌ Error grading homework submission:', err);
      res.status(500).json({ message: 'Eroare la salvarea notei.' });
    }
  });
}

module.exports = { registerHomeworkRoutes };
