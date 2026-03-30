const { createOwnershipHelpers } = require('../utils/ownership');
const { createPublishReadinessHelpers } = require('../utils/publishReadiness');

function registerCourseRoutes(app, { getSqlPool, protect, restrictTo }) {
  const {
    getTeacherOwnedCourse,
    getTeacherOwnedModule,
    getTeacherOwnedLesson,
    rejectPublishedCourseContentEdit
  } = createOwnershipHelpers({ getSqlPool });

  const { getCoursePublishReadiness } = createPublishReadinessHelpers({ getSqlPool });

  app.post('/api/courses', protect, restrictTo('Profesor'), async (req, res) => {
    const { title, description, thumbnailUrl } = req.body;
    const cleanTitle = typeof title === 'string' ? title.trim() : '';
    const cleanDescription = typeof description === 'string' ? description.trim() : '';

    if (!cleanTitle) {
      return res.status(400).json({ message: 'Titlul este obligatoriu.' });
    }

    try {
      const sqlPool = getSqlPool();
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

  app.put('/api/courses/:id', protect, restrictTo('Profesor'), async (req, res) => {
    const courseId = parseInt(req.params.id, 10);
    const { title, description, thumbnailUrl, isPublished } = req.body;
    const cleanTitle = typeof title === 'string' ? title.trim() : '';
    const cleanDescription = typeof description === 'string' ? description.trim() : '';
    const nextPublishedState = isPublished === true || isPublished === 1;

    if (!cleanTitle) {
      return res.status(400).json({ message: 'Titlul este obligatoriu.' });
    }

    try {
      const sqlPool = getSqlPool();
      const currentCourseResult = await sqlPool.query`
        SELECT Id, Title, Description, ThumbnailUrl, IsPublished
        FROM Courses
        WHERE Id = ${courseId} AND CreatedBy = ${req.user.id}
      `;

      if (currentCourseResult.recordset.length === 0) {
        return res.status(404).json({ message: 'Cursul nu a fost găsit.' });
      }

      const currentCourse = currentCourseResult.recordset[0];
      const metadataChanged =
        cleanTitle !== (currentCourse.Title || '').trim() ||
        cleanDescription !== (currentCourse.Description || '').trim() ||
        (thumbnailUrl || '') !== (currentCourse.ThumbnailUrl || '');

      if (currentCourse.IsPublished && (nextPublishedState || metadataChanged)) {
        return res.status(400).json({
          message: 'Cursul este deja publicat și nu mai poate fi editat. Dacă vrei modificări, retrage-l mai întâi din publicare.'
        });
      }

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
    const courseId = parseInt(req.params.id, 10);

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

  app.get('/api/student/courses/:id/full', protect, restrictTo('Student'), async (req, res) => {
    const courseId = parseInt(req.params.id, 10);

    try {
      const sqlPool = getSqlPool();
      const enrollmentCheck = await sqlPool.query`
        SELECT 1 FROM CourseEnrollments
        WHERE CourseId = ${courseId} AND StudentId = ${req.user.id}
      `;

      if (enrollmentCheck.recordset.length === 0) {
        return res.status(403).json({ message: 'Acces interzis. Nu ești înscris la acest curs.' });
      }

      const courseResult = await sqlPool.query`
        SELECT * FROM Courses WHERE Id = ${courseId}
      `;

      if (courseResult.recordset.length === 0) {
        return res.status(404).json({ message: 'Cursul nu a fost găsit.' });
      }

      const course = courseResult.recordset[0];
      const modulesResult = await sqlPool.query`
        SELECT * FROM CourseModules WHERE CourseId = ${courseId} ORDER BY OrderIndex
      `;

      const modules = modulesResult.recordset;

      for (const module of modules) {
        const lessonsResult = await sqlPool.query`
          SELECT * FROM CourseLessons WHERE ModuleId = ${module.Id} ORDER BY OrderIndex
        `;
        module.lessons = lessonsResult.recordset;
      }

      res.json({ course, modules });
    } catch (err) {
      console.error('❌ Eroare la preluarea cursului complet pentru student:', err);
      res.status(500).json({ message: 'Eroare server la preluarea datelor cursului.' });
    }
  });

  app.get('/api/courses', protect, restrictTo('Profesor'), async (req, res) => {
    try {
      const sqlPool = getSqlPool();
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

  app.post('/api/course-enrollments', protect, restrictTo('Profesor'), async (req, res) => {
    const { courseId, studentIds } = req.body;

    if (!courseId || !Array.isArray(studentIds)) {
      return res.status(400).json({ message: 'Date invalide.' });
    }

    try {
      const sqlPool = getSqlPool();
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
      const sqlPool = getSqlPool();
      const result = await sqlPool.query`
        SELECT c.* FROM Courses c
        INNER JOIN CourseEnrollments ce ON ce.CourseId = c.Id
        WHERE ce.StudentId = ${req.user.id} AND c.IsPublished = 1
        ORDER BY c.CreatedAt DESC
      `;

      res.json(result.recordset);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Eroare la preluarea cursurilor studentului.' });
    }
  });

  app.get('/api/courses/:id/students', protect, restrictTo('Profesor'), async (req, res) => {
    const courseId = parseInt(req.params.id, 10);

    try {
      const sqlPool = getSqlPool();
      const course = await getTeacherOwnedCourse(courseId, req.user.id);

      if (!course) {
        return res.status(404).json({ message: 'Cursul nu există sau nu îți aparține.' });
      }

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

  app.get('/api/teacher/courses-with-students', protect, restrictTo('Profesor'), async (req, res) => {
    try {
      const sqlPool = getSqlPool();
      const coursesResult = await sqlPool.query`
        SELECT * FROM Courses
        WHERE CreatedBy = ${req.user.id}
        ORDER BY CreatedAt DESC
      `;

      const courses = coursesResult.recordset;

      for (const course of courses) {
        const studentsResult = await sqlPool.query`
          SELECT u.Id, u.FirstName, u.LastName, u.Email, u.AcademicYear
          FROM Users u
          INNER JOIN CourseEnrollments ce ON ce.StudentId = u.Id
          WHERE ce.CourseId = ${course.Id}
        `;

        course.students = studentsResult.recordset;
      }

      res.json(courses);
    } catch (err) {
      console.error('❌ Error fetching courses with students:', err);
      res.status(500).json({ message: 'Eroare la preluarea datelor.' });
    }
  });

  app.post('/api/modules', protect, restrictTo('Profesor'), async (req, res) => {
    const { courseId, title, orderIndex } = req.body;
    const cleanTitle = typeof title === 'string' ? title.trim() : '';

    if (!courseId || !cleanTitle) {
      return res.status(400).json({ message: 'CourseId și Title sunt obligatorii.' });
    }

    try {
      const sqlPool = getSqlPool();
      const course = await getTeacherOwnedCourse(courseId, req.user.id);

      if (!course) {
        return res.status(404).json({ message: 'Cursul nu există sau nu îți aparține.' });
      }

      if (course.IsPublished) {
        return rejectPublishedCourseContentEdit(res);
      }

      const result = await sqlPool.query`
        INSERT INTO CourseModules (CourseId, Title, OrderIndex)
        OUTPUT INSERTED.*
        VALUES (${courseId}, ${cleanTitle}, ${orderIndex || 0})
      `;

      res.status(201).json(result.recordset[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Eroare la crearea modulului.' });
    }
  });

  app.put('/api/modules/:id', protect, restrictTo('Profesor'), async (req, res) => {
    const moduleId = parseInt(req.params.id, 10);
    const { title, orderIndex } = req.body;
    const cleanTitle = typeof title === 'string' ? title.trim() : '';

    if (!cleanTitle) {
      return res.status(400).json({ message: 'Titlul este obligatoriu.' });
    }

    try {
      const sqlPool = getSqlPool();
      const module = await getTeacherOwnedModule(moduleId, req.user.id);

      if (!module) {
        return res.status(404).json({ message: 'Modulul nu există sau nu îți aparține.' });
      }

      if (module.CourseIsPublished) {
        return rejectPublishedCourseContentEdit(res);
      }

      await sqlPool.query`
        UPDATE CourseModules
        SET Title = ${cleanTitle}, OrderIndex = ${orderIndex}
        WHERE Id = ${moduleId}
      `;

      res.json({ message: 'Capitol actualizat cu succes.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Eroare la actualizarea capitolului.' });
    }
  });

  app.get('/api/modules/:id', protect, restrictTo('Profesor'), async (req, res) => {
    const moduleId = parseInt(req.params.id, 10);

    if (Number.isNaN(moduleId)) {
      return res.status(400).json({ message: 'ID modul invalid.' });
    }

    try {
      const sqlPool = getSqlPool();
      const result = await sqlPool.query`
        SELECT m.*, c.Title AS CourseTitle, c.IsPublished AS CourseIsPublished
        FROM CourseModules m
        INNER JOIN Courses c ON c.Id = m.CourseId
        WHERE m.Id = ${moduleId} AND c.CreatedBy = ${req.user.id}
      `;

      if (result.recordset.length === 0) {
        return res.status(404).json({ message: 'Modulul nu există sau nu îți aparține.' });
      }

      res.json(result.recordset[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Eroare la preluarea modulului.' });
    }
  });

  app.delete('/api/modules/:id', protect, restrictTo('Profesor'), async (req, res) => {
    const moduleId = parseInt(req.params.id, 10);

    try {
      const sqlPool = getSqlPool();
      const module = await getTeacherOwnedModule(moduleId, req.user.id);

      if (!module) {
        return res.status(404).json({ message: 'Modulul nu există sau nu îți aparține.' });
      }

      if (module.CourseIsPublished) {
        return rejectPublishedCourseContentEdit(res);
      }

      await sqlPool.query`
        DELETE FROM CourseLessons
        WHERE ModuleId = ${moduleId}
      `;

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

  app.delete('/api/courses/:courseId/modules', protect, restrictTo('Profesor'), async (req, res) => {
    const courseId = parseInt(req.params.courseId, 10);

    try {
      const sqlPool = getSqlPool();
      const course = await getTeacherOwnedCourse(courseId, req.user.id);

      if (!course) {
        return res.status(404).json({ message: 'Cursul nu există sau nu îți aparține.' });
      }

      if (course.IsPublished) {
        return rejectPublishedCourseContentEdit(res);
      }

      await sqlPool.query`
        DELETE FROM CourseLessons
        WHERE ModuleId IN (
          SELECT Id FROM CourseModules WHERE CourseId = ${courseId}
        )
      `;

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

  app.post('/api/lessons', protect, restrictTo('Profesor'), async (req, res) => {
    const { moduleId, title, content, videoUrl, orderIndex } = req.body;
    const cleanTitle = typeof title === 'string' ? title.trim() : '';
    const cleanContent = typeof content === 'string' ? content.trim() : '';

    if (!moduleId || !cleanTitle || !cleanContent) {
      return res.status(400).json({ message: 'ModuleId, Title și Content sunt obligatorii.' });
    }

    try {
      const sqlPool = getSqlPool();
      const module = await getTeacherOwnedModule(moduleId, req.user.id);

      if (!module) {
        return res.status(404).json({ message: 'Modulul nu există sau nu îți aparține.' });
      }

      if (module.CourseIsPublished) {
        return rejectPublishedCourseContentEdit(res);
      }

      const result = await sqlPool.query`
        INSERT INTO CourseLessons (ModuleId, Title, Content, VideoUrl, OrderIndex)
        OUTPUT INSERTED.*
        VALUES (${moduleId}, ${cleanTitle}, ${cleanContent}, ${videoUrl}, ${orderIndex || 0})
      `;

      res.status(201).json(result.recordset[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Eroare la crearea lecției.' });
    }
  });

  app.delete('/api/lessons/:id', protect, restrictTo('Profesor'), async (req, res) => {
    const lessonId = parseInt(req.params.id, 10);

    if (Number.isNaN(lessonId)) {
      return res.status(400).json({ message: 'ID lecție invalid.' });
    }

    try {
      const sqlPool = getSqlPool();
      const lesson = await getTeacherOwnedLesson(lessonId, req.user.id);

      if (!lesson) {
        return res.status(404).json({ message: 'Lecția nu există sau nu îți aparține.' });
      }

      if (lesson.CourseIsPublished) {
        return rejectPublishedCourseContentEdit(res);
      }

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

  app.put('/api/lessons/:id', protect, restrictTo('Profesor'), async (req, res) => {
    const lessonId = parseInt(req.params.id, 10);
    const { title, content, videoUrl, orderIndex } = req.body;
    const cleanTitle = typeof title === 'string' ? title.trim() : '';
    const cleanContent = typeof content === 'string' ? content.trim() : '';

    if (Number.isNaN(lessonId)) {
      return res.status(400).json({ message: 'ID lecție invalid.' });
    }

    if (!cleanTitle || !cleanContent) {
      return res.status(400).json({ message: 'Titlul și conținutul sunt obligatorii.' });
    }

    try {
      const sqlPool = getSqlPool();
      const lesson = await getTeacherOwnedLesson(lessonId, req.user.id);

      if (!lesson) {
        return res.status(404).json({ message: 'Lecția nu există sau nu îți aparține.' });
      }

      if (lesson.CourseIsPublished) {
        return rejectPublishedCourseContentEdit(res);
      }

      const result = await sqlPool.query`
        UPDATE CourseLessons
        SET
          Title = ${cleanTitle},
          Content = ${cleanContent},
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
    const lessonId = parseInt(req.params.id, 10);

    try {
      const sqlPool = getSqlPool();
      const result = await sqlPool.query`
        SELECT l.*
        FROM CourseLessons l
        INNER JOIN CourseModules m ON m.Id = l.ModuleId
        INNER JOIN Courses c ON c.Id = m.CourseId
        WHERE l.Id = ${lessonId} AND c.CreatedBy = ${req.user.id}
      `;

      if (result.recordset.length === 0) {
        return res.status(404).json({ message: 'Lecția nu există sau nu îți aparține.' });
      }

      res.json(result.recordset[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Eroare la preluarea lecției.' });
    }
  });

  app.get('/api/courses/:id/full', protect, restrictTo('Profesor'), async (req, res) => {
    const courseId = req.params.id;

    try {
      const sqlPool = getSqlPool();
      const courseResult = await sqlPool.query`
        SELECT * FROM Courses WHERE Id = ${courseId} AND CreatedBy = ${req.user.id}
      `;

      if (courseResult.recordset.length === 0) {
        return res.status(404).json({ message: 'Cursul nu există sau nu îți aparține.' });
      }

      const course = courseResult.recordset[0];
      const modulesResult = await sqlPool.query`
        SELECT * FROM CourseModules WHERE CourseId = ${courseId} ORDER BY OrderIndex
      `;

      const modules = modulesResult.recordset;

      for (const module of modules) {
        const lessonsResult = await sqlPool.query`
          SELECT * FROM CourseLessons WHERE ModuleId = ${module.Id} ORDER BY OrderIndex
        `;
        module.lessons = lessonsResult.recordset;
      }

      res.json({ course, modules });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Eroare la preluarea cursului complet.' });
    }
  });

  app.get('/api/modules', protect, restrictTo('Profesor'), async (req, res) => {
    const courseId = req.query.courseId;

    if (!courseId) {
      return res.status(400).json({ message: 'Parametrul courseId este obligatoriu.' });
    }

    try {
      const sqlPool = getSqlPool();
      const course = await getTeacherOwnedCourse(Number(courseId), req.user.id);

      if (!course) {
        return res.status(404).json({ message: 'Cursul nu există sau nu îți aparține.' });
      }

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

  app.get('/api/lessons', protect, restrictTo('Profesor'), async (req, res) => {
    const moduleId = req.query.moduleId;

    if (!moduleId) {
      return res.status(400).json({ message: 'moduleId este obligatoriu.' });
    }

    try {
      const sqlPool = getSqlPool();
      const module = await getTeacherOwnedModule(Number(moduleId), req.user.id);

      if (!module) {
        return res.status(404).json({ message: 'Modulul nu există sau nu îți aparține.' });
      }

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
      const sqlPool = getSqlPool();
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
      const sqlPool = getSqlPool();
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
      const sqlPool = getSqlPool();
      const result = await sqlPool.query`
        SELECT * FROM CourseInvitations
        WHERE Id = ${invitationId} AND StudentId = ${req.user.id} AND Status = 'Pending'
      `;

      if (result.recordset.length === 0) {
        return res.status(404).json({ message: 'Invitația nu există sau a fost deja procesată.' });
      }

      const invitation = result.recordset[0];
      const newStatus = accept ? 'Accepted' : 'Declined';

      await sqlPool.query`
        UPDATE CourseInvitations
        SET Status = ${newStatus}
        WHERE Id = ${invitationId}
      `;

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
}

module.exports = { registerCourseRoutes };
