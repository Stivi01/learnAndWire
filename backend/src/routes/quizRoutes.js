const { createOwnershipHelpers } = require('../utils/ownership');
const { createPublishReadinessHelpers } = require('../utils/publishReadiness');

function registerQuizRoutes(app, { getSqlPool, protect, restrictTo, sql }) {
  const {
    getTeacherOwnedCourse,
    getTeacherOwnedQuiz,
    getTeacherOwnedQuestion,
    getTeacherOwnedOption,
    rejectPublishedQuizContentEdit
  } = createOwnershipHelpers({ getSqlPool });

  const { getQuizPublishReadiness } = createPublishReadinessHelpers({ getSqlPool });

  app.post('/api/quizzes', protect, restrictTo('Profesor'), async (req, res) => {
    const { courseId, title, description, scheduledAt } = req.body;
    const cleanTitle = typeof title === 'string' ? title.trim() : '';
    const cleanDescription = typeof description === 'string' ? description.trim() : '';

    if (!courseId || !cleanTitle) {
      return res.status(400).json({ message: 'courseId și title sunt obligatorii.' });
    }

    try {
      const sqlPool = getSqlPool();
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
          return res.status(400).json({ message: 'Data quiz-ului trebuie să fie în viitor.' });
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
      console.error('❌ Error creating quiz:', err);
      res.status(500).json({ message: 'Eroare la crearea quiz-ului.' });
    }
  });

  app.get('/api/quizzes/teacher/:teacherId', protect, restrictTo('Profesor'), async (req, res) => {
    try {
      const sqlPool = getSqlPool();
      const result = await sqlPool.query`
        SELECT * FROM CourseQuizzes
        WHERE CreatedBy = ${req.user.id}
        ORDER BY CreatedAt DESC
      `;

      res.json(result.recordset);
    } catch (err) {
      console.error('❌ Error fetching quizzes by teacher:', err);
      res.status(500).json({ message: 'Eroare la preluarea quiz-urilor profesorului.' });
    }
  });

  app.get('/api/quizzes/:id/full', protect, restrictTo('Profesor'), async (req, res) => {
    const quizId = parseInt(req.params.id, 10);

    try {
      const sqlPool = getSqlPool();
      const quizResult = await sqlPool.query`
        SELECT * FROM CourseQuizzes WHERE Id = ${quizId} AND CreatedBy = ${req.user.id}
      `;

      if (quizResult.recordset.length === 0) {
        return res.status(404).json({ message: 'Quiz-ul nu există sau nu îți aparține.' });
      }

      const quiz = quizResult.recordset[0];
      const questionsResult = await sqlPool.query`
        SELECT * FROM QuizQuestions WHERE QuizId = ${quizId}
      `;

      const questions = questionsResult.recordset;

      for (const question of questions) {
        const optionsResult = await sqlPool.query`
          SELECT * FROM QuizOptions WHERE QuestionId = ${question.Id}
        `;
        question.options = optionsResult.recordset;
      }

      res.json({ quiz, questions });
    } catch (err) {
      console.error('❌ Error fetching full quiz:', err);
      res.status(500).json({ message: 'Eroare la preluarea quiz-ului complet.' });
    }
  });

  app.put('/api/quizzes/:id', protect, restrictTo('Profesor'), async (req, res) => {
    const quizId = parseInt(req.params.id, 10);
    const { title, description, courseId, isPublished, scheduledAt } = req.body;
    const cleanTitle = typeof title === 'string' ? title.trim() : '';
    const cleanDescription = typeof description === 'string' ? description.trim() : '';
    const nextPublishedState = isPublished === true || isPublished === 1;

    if (!cleanTitle) {
      return res.status(400).json({ message: 'Titlul este obligatoriu.' });
    }

    if (!courseId) {
      return res.status(400).json({ message: 'Selectează un curs pentru quiz.' });
    }

    try {
      const sqlPool = getSqlPool();
      const quizCheck = await sqlPool.query`
        SELECT * FROM CourseQuizzes WHERE Id = ${quizId} AND CreatedBy = ${req.user.id}
      `;

      if (quizCheck.recordset.length === 0) {
        return res.status(404).json({ message: 'Quiz inexistent.' });
      }

      const currentQuiz = quizCheck.recordset[0];
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
          return res.status(400).json({ message: 'Data programată este invalidă.' });
        }

        if (scheduledDate <= new Date()) {
          return res.status(400).json({ message: 'Data quiz-ului trebuie să fie în viitor.' });
        }
      }

      const metadataChanged =
        cleanTitle !== (currentQuiz.Title || '').trim() ||
        cleanDescription !== (currentQuiz.Description || '').trim() ||
        Number(courseId) !== Number(currentQuiz.CourseId) ||
        (scheduledDate ? scheduledDate.toISOString() : null) !== (currentQuiz.ScheduledAt ? new Date(currentQuiz.ScheduledAt).toISOString() : null);

      if (currentQuiz.IsPublished && (nextPublishedState || metadataChanged)) {
        return res.status(400).json({
          message: 'Quiz-ul este deja publicat și nu mai poate fi editat. Dacă vrei modificări, retrage-l mai întâi din publicare.'
        });
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

      res.json({ message: 'Quiz actualizat cu succes.' });
    } catch (err) {
      console.error('❌ Error updating quiz:', err);
      res.status(500).json({ message: 'Eroare la actualizare.' });
    }
  });

  app.get('/api/quizzes/:id/publish-readiness', protect, restrictTo('Profesor'), async (req, res) => {
    const quizId = parseInt(req.params.id, 10);

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

  app.delete('/api/quizzes/:id', protect, restrictTo('Profesor'), async (req, res) => {
    const quizId = parseInt(req.params.id, 10);

    try {
      const sqlPool = getSqlPool();
      const quiz = await getTeacherOwnedQuiz(quizId, req.user.id);

      if (!quiz) {
        return res.status(404).json({ message: 'Quiz-ul nu există sau nu îți aparține.' });
      }

      await sqlPool.query`
        DELETE FROM QuizOptions
        WHERE QuestionId IN (SELECT Id FROM QuizQuestions WHERE QuizId = ${quizId})
      `;
      await sqlPool.query`
        DELETE FROM QuizQuestions WHERE QuizId = ${quizId}
      `;
      await sqlPool.query`
        DELETE FROM CourseQuizzes WHERE Id = ${quizId} AND CreatedBy = ${req.user.id}
      `;

      res.json({ message: 'Quiz șters.' });
    } catch (err) {
      console.error('❌ Error deleting quiz:', err);
      res.status(500).json({ message: 'Eroare la ștergerea quiz-ului.' });
    }
  });

  app.get('/api/quizzes/student', protect, restrictTo('Student'), async (req, res) => {
    try {
      const sqlPool = getSqlPool();
      const studentId = req.user.id;

      const result = await sqlPool.query`
        SELECT 
          q.Id,
          q.Title,
          q.Description,
          q.ScheduledAt,
          q.CourseId,
          c.Title AS CourseTitle,
          (SELECT COUNT(*) FROM QuizResults qr WHERE qr.QuizId = q.Id AND qr.StudentId = ${studentId}) AS HasTaken,
          (SELECT COALESCE(MAX(Score), 0) FROM QuizResults qr WHERE qr.QuizId = q.Id AND qr.StudentId = ${studentId}) AS UserScore
        FROM CourseQuizzes q
        INNER JOIN Courses c ON c.Id = q.CourseId
        INNER JOIN CourseEnrollments ce ON ce.CourseId = q.CourseId AND ce.StudentId = ${studentId}
        WHERE q.IsPublished = 1 AND c.IsPublished = 1
        ORDER BY q.ScheduledAt ASC, q.CreatedAt DESC
      `;

      res.json(result.recordset);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Eroare la preluarea listei de teste.' });
    }
  });

  app.get('/api/student/my-grades', protect, restrictTo('Student'), async (req, res) => {
    try {
      const sqlPool = getSqlPool();
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
      console.error('❌ Eroare la preluarea notelor:', err);
      res.status(500).json({ message: 'Eroare la încărcarea notelor.' });
    }
  });

  app.get('/api/student/quizzes/:id/take', protect, restrictTo('Student'), async (req, res) => {
    const quizId = parseInt(req.params.id, 10);

    try {
      const sqlPool = getSqlPool();
      const studentId = req.user.id;
      const checkAttempt = await sqlPool.query`
        SELECT Id FROM QuizResults WHERE QuizId = ${quizId} AND StudentId = ${studentId}
      `;

      if (checkAttempt.recordset.length > 0) {
        return res.status(400).json({
          message: 'Ai susținut deja acest test! Nu este permisă trimiterea multiplă.'
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
        return res.status(404).json({ message: 'Quiz-ul nu există, nu este publicat sau nu ai acces la el.' });
      }

      const quiz = accessResult.recordset[0];
      const now = new Date();
      const scheduledDate = new Date(quiz.ScheduledAt);

      if (quiz.ScheduledAt && now < scheduledDate) {
        return res.status(403).json({ message: 'Acest test nu a început încă.' });
      }

      const questionsResult = await sqlPool.query`
        SELECT Id, QuestionText, QuestionType, Points
        FROM QuizQuestions
        WHERE QuizId = ${quizId}
      `;

      const questions = questionsResult.recordset;

      for (const question of questions) {
        const optionsResult = await sqlPool.query`
          SELECT Id, OptionText
          FROM QuizOptions
          WHERE QuestionId = ${question.Id}
        `;
        question.options = optionsResult.recordset;
      }

      res.json({ quiz, questions });
    } catch (err) {
      console.error('❌ Eroare la preluarea testului pentru student:', err);
      res.status(500).json({ message: 'Eroare la încărcarea testului.' });
    }
  });

  app.post('/api/quizzes/:id/submit', protect, restrictTo('Student'), async (req, res) => {
    const quizId = parseInt(req.params.id, 10);
    const studentAnswers = req.body;

    try {
      const sqlPool = getSqlPool();
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

      for (const question of questions) {
        maxPossibleScore += question.Points;
        const selectedIds = Array.isArray(studentAnswers[question.Id]) ? studentAnswers[question.Id] : [];
        const correctIdsForQuestion = correctOptions
          .filter((option) => option.QuestionId === question.Id)
          .map((option) => option.Id);

        const isCorrect =
          selectedIds.length === correctIdsForQuestion.length &&
          selectedIds.every((id) => correctIdsForQuestion.includes(id));

        if (isCorrect) {
          totalScore += question.Points;
        }
      }

      const resultInsert = await sqlPool.query`
        INSERT INTO QuizResults (QuizId, StudentId, Score, SubmittedAt)
        OUTPUT INSERTED.Id
        VALUES (${quizId}, ${req.user.id}, ${totalScore}, GETDATE())
      `;
      const quizResultId = resultInsert.recordset[0].Id;

      for (const [questionIdStr, optionIdsArray] of Object.entries(studentAnswers)) {
        const questionId = parseInt(questionIdStr, 10);
        const optionIds = Array.isArray(optionIdsArray) ? optionIdsArray : [];

        for (const optionId of optionIds) {
          await sqlPool.query`
            INSERT INTO StudentAnswers (ResultId, QuestionId, OptionId)
            VALUES (${quizResultId}, ${questionId}, ${optionId})
          `;
        }
      }

      res.status(201).json({
        message: 'Test finalizat cu succes!',
        score: totalScore,
        maxScore: maxPossibleScore
      });
    } catch (err) {
      console.error('❌ Eroare la trimiterea testului:', err);
      res.status(500).json({ message: 'Eroare la procesarea testului.' });
    }
  });

  app.post('/api/quizzes/:quizId/questions', protect, restrictTo('Profesor'), async (req, res) => {
    const quizId = parseInt(req.params.quizId, 10);
    const { questionText, questionType, points } = req.body;
    const cleanQuestionText = typeof questionText === 'string' ? questionText.trim() : '';

    if (!cleanQuestionText || !questionType) {
      return res.status(400).json({ message: 'Textul și tipul întrebării sunt obligatorii.' });
    }

    try {
      const sqlPool = getSqlPool();
      const quiz = await getTeacherOwnedQuiz(quizId, req.user.id);

      if (!quiz) {
        return res.status(404).json({ message: 'Quiz-ul nu există sau nu îți aparține.' });
      }

      if (quiz.IsPublished) {
        return rejectPublishedQuizContentEdit(res);
      }

      const result = await sqlPool.query`
        INSERT INTO QuizQuestions (QuizId, QuestionText, QuestionType, Points)
        OUTPUT INSERTED.*
        VALUES (${quizId}, ${cleanQuestionText}, ${questionType}, ${points || 1})
      `;

      res.status(201).json(result.recordset[0]);
    } catch (err) {
      console.error('❌ Error adding question:', err);
      res.status(500).json({ message: 'Eroare la adăugarea întrebării.' });
    }
  });

  app.post('/api/questions/:questionId/options', protect, restrictTo('Profesor'), async (req, res) => {
    const questionId = parseInt(req.params.questionId, 10);
    const { optionText, isCorrect } = req.body;
    const cleanOptionText = typeof optionText === 'string' ? optionText.trim() : '';

    if (!cleanOptionText) {
      return res.status(400).json({ message: 'OptionText este obligatoriu.' });
    }

    try {
      const sqlPool = getSqlPool();
      const question = await getTeacherOwnedQuestion(questionId, req.user.id);

      if (!question) {
        return res.status(404).json({ message: 'Întrebarea nu există sau nu îți aparține.' });
      }

      if (question.QuizIsPublished) {
        return rejectPublishedQuizContentEdit(res);
      }

      const result = await sqlPool.query`
        INSERT INTO QuizOptions (QuestionId, OptionText, IsCorrect)
        OUTPUT INSERTED.*
        VALUES (${questionId}, ${cleanOptionText}, ${isCorrect || 0})
      `;

      res.status(201).json(result.recordset[0]);
    } catch (err) {
      console.error('❌ Error adding option:', err);
      res.status(500).json({ message: 'Eroare la adăugarea opțiunii.' });
    }
  });

  app.get('/api/quizzes/:quizId/questions', protect, restrictTo('Profesor'), async (req, res) => {
    const quizId = parseInt(req.params.quizId, 10);

    try {
      const sqlPool = getSqlPool();
      const quiz = await getTeacherOwnedQuiz(quizId, req.user.id);

      if (!quiz) {
        return res.status(404).json({ message: 'Quiz-ul nu există sau nu îți aparține.' });
      }

      const result = await sqlPool.query`
        SELECT *
        FROM QuizQuestions
        WHERE QuizId = ${quizId}
        ORDER BY Id
      `;

      res.json(result.recordset);
    } catch (err) {
      console.error('❌ Error fetching questions:', err);
      res.status(500).json({ message: 'Eroare la preluarea întrebărilor.' });
    }
  });

  app.put('/api/questions/:id', protect, restrictTo('Profesor'), async (req, res) => {
    const questionId = parseInt(req.params.id, 10);
    const { questionText, questionType, points } = req.body;
    const cleanQuestionText = typeof questionText === 'string' ? questionText.trim() : '';

    try {
      const sqlPool = getSqlPool();
      const question = await getTeacherOwnedQuestion(questionId, req.user.id);

      if (!question) {
        return res.status(404).json({ message: 'Întrebarea nu există sau nu îți aparține.' });
      }

      if (question.QuizIsPublished) {
        return rejectPublishedQuizContentEdit(res);
      }

      await sqlPool.query`
        UPDATE QuizQuestions
        SET QuestionText = ${cleanQuestionText},
            QuestionType = ${questionType},
            Points = ${points}
        WHERE Id = ${questionId}
      `;

      res.json({ message: 'Întrebarea a fost actualizată.' });
    } catch (err) {
      console.error('❌ Error updating question:', err);
      res.status(500).json({ message: 'Eroare la actualizarea întrebării.' });
    }
  });

  app.get('/api/questions/:questionId/options', protect, restrictTo('Profesor'), async (req, res) => {
    const questionId = parseInt(req.params.questionId, 10);

    try {
      const sqlPool = getSqlPool();
      const question = await getTeacherOwnedQuestion(questionId, req.user.id);

      if (!question) {
        return res.status(404).json({ message: 'Întrebarea nu există sau nu îți aparține.' });
      }

      const result = await sqlPool.query`
        SELECT * FROM QuizOptions WHERE QuestionId = ${questionId}
      `;

      res.json(result.recordset);
    } catch (err) {
      console.error('❌ Error fetching options:', err);
      res.status(500).json({ message: 'Eroare la preluarea opțiunilor.' });
    }
  });

  app.delete('/api/questions/:id', protect, restrictTo('Profesor'), async (req, res) => {
    const questionId = parseInt(req.params.id, 10);

    try {
      const sqlPool = getSqlPool();
      const question = await getTeacherOwnedQuestion(questionId, req.user.id);

      if (!question) {
        return res.status(404).json({ message: 'Întrebarea nu există sau nu îți aparține.' });
      }

      if (question.QuizIsPublished) {
        return rejectPublishedQuizContentEdit(res);
      }

      await sqlPool.query`
        DELETE FROM QuizOptions WHERE QuestionId = ${questionId}
      `;
      await sqlPool.query`
        DELETE FROM QuizQuestions WHERE Id = ${questionId}
      `;

      res.json({ message: 'Întrebarea și opțiunile au fost șterse.' });
    } catch (err) {
      console.error('❌ Error deleting question:', err);
      res.status(500).json({ message: 'Eroare la ștergerea întrebării.' });
    }
  });

  app.get('/api/questions/:id', protect, restrictTo('Profesor'), async (req, res) => {
    const questionId = parseInt(req.params.id, 10);

    if (Number.isNaN(questionId)) {
      return res.status(400).json({ message: 'ID întrebare invalid.' });
    }

    try {
      const sqlPool = getSqlPool();
      const result = await sqlPool.query`
        SELECT qq.*
        FROM QuizQuestions qq
        INNER JOIN CourseQuizzes q ON q.Id = qq.QuizId
        WHERE qq.Id = ${questionId} AND q.CreatedBy = ${req.user.id}
      `;

      if (result.recordset.length === 0) {
        return res.status(404).json({ message: 'Întrebarea nu există sau nu îți aparține.' });
      }

      res.json(result.recordset[0]);
    } catch (err) {
      console.error('❌ Error fetching question by id:', err);
      res.status(500).json({ message: 'Eroare la preluarea întrebării.' });
    }
  });

  app.put('/api/options/:id', protect, restrictTo('Profesor'), async (req, res) => {
    const optionId = parseInt(req.params.id, 10);
    const { optionText, isCorrect } = req.body;
    const cleanOptionText = typeof optionText === 'string' ? optionText.trim() : '';

    try {
      const sqlPool = getSqlPool();
      const option = await getTeacherOwnedOption(optionId, req.user.id);

      if (!option) {
        return res.status(404).json({ message: 'Opțiunea nu există sau nu îți aparține.' });
      }

      if (option.QuizIsPublished) {
        return rejectPublishedQuizContentEdit(res);
      }

      await sqlPool.query`
        UPDATE QuizOptions
        SET OptionText = ${cleanOptionText},
            IsCorrect = ${isCorrect}
        WHERE Id = ${optionId}
      `;

      res.json({ message: 'Opțiunea a fost actualizată.' });
    } catch (err) {
      console.error('❌ Error updating option:', err);
      res.status(500).json({ message: 'Eroare la actualizarea opțiunii.' });
    }
  });

  app.delete('/api/options/:id', protect, restrictTo('Profesor'), async (req, res) => {
    const optionId = parseInt(req.params.id, 10);

    try {
      const sqlPool = getSqlPool();
      const option = await getTeacherOwnedOption(optionId, req.user.id);

      if (!option) {
        return res.status(404).json({ message: 'Opțiunea nu există sau nu îți aparține.' });
      }

      if (option.QuizIsPublished) {
        return rejectPublishedQuizContentEdit(res);
      }

      await sqlPool.query`
        DELETE FROM QuizOptions WHERE Id = ${optionId}
      `;

      res.json({ message: 'Opțiunea a fost ștearsă.' });
    } catch (err) {
      console.error('❌ Error deleting option:', err);
      res.status(500).json({ message: 'Eroare la ștergerea opțiunii.' });
    }
  });

  app.patch('/api/quizzes/:id/publish', protect, restrictTo('Profesor'), async (req, res) => {
    const quizId = parseInt(req.params.id, 10);
    const nextPublishedState = typeof req.body?.isPublished === 'boolean' ? req.body.isPublished : true;

    try {
      const sqlPool = getSqlPool();
      const quizResult = await sqlPool.query`
        SELECT Id FROM CourseQuizzes WHERE Id = ${quizId} AND CreatedBy = ${req.user.id}
      `;

      if (quizResult.recordset.length === 0) {
        return res.status(404).json({ message: 'Quiz inexistent.' });
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

      res.json({ message: nextPublishedState ? 'Quiz publicat.' : 'Quiz ascuns.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Eroare la schimbarea stării.' });
    }
  });

  app.get('/api/quizzes/by-course/:courseId', protect, restrictTo('Profesor'), async (req, res) => {
    const courseId = parseInt(req.params.courseId, 10);

    try {
      const sqlPool = getSqlPool();
      const course = await getTeacherOwnedCourse(courseId, req.user.id);

      if (!course) {
        return res.status(404).json({ message: 'Cursul nu există sau nu îți aparține.' });
      }

      const result = await sqlPool.query`
        SELECT *
        FROM CourseQuizzes
        WHERE CourseId = ${courseId} AND CreatedBy = ${req.user.id}
        ORDER BY CreatedAt DESC
      `;

      res.json(result.recordset);
    } catch (err) {
      console.error('❌ Error fetching quizzes by course:', err);
      res.status(500).json({ message: 'Eroare la preluarea quiz-urilor cursului.' });
    }
  });
}

module.exports = { registerQuizRoutes };
