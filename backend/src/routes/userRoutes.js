function registerUserRoutes(app, { getSqlPool, protect, restrictTo, sql }) {
  app.get('/api/students', protect, restrictTo('Profesor'), async (req, res) => {
    const { academicYear } = req.query;

    try {
      const sqlPool = getSqlPool();
      const query = sqlPool.request();
      let sqlQuery = `
        SELECT id, firstName, lastName, academicYear, email
        FROM Users
        WHERE role = 'Student'
      `;

      if (academicYear) {
        sqlQuery += ' AND academicYear = @academicYear';
        query.input('academicYear', sql.Int, academicYear);
      }

      const result = await query.query(sqlQuery);
      res.json(result.recordset);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Eroare la preluarea studenților.' });
    }
  });

  app.get('/api/student/teachers', protect, restrictTo('Student'), async (req, res) => {
    try {
      const sqlPool = getSqlPool();
      const result = await sqlPool.request()
        .input('studentId', sql.Int, req.user.id)
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
          WHERE ce.StudentId = @studentId AND ce.IsExcluded = 0
        `);

      const teachers = result.recordset.map((teacher) => ({
        Id: teacher.Id,
        FirstName: teacher.FirstName,
        LastName: teacher.LastName,
        Email: teacher.Email,
        Avatar: teacher.Avatar || 'assets/avatar-default.png',
        Role: teacher.Role,
        course: teacher.CourseTitle || ''
      }));

      res.json(teachers);
    } catch (err) {
      console.error('❌ Error getting linked teachers:', err);
      res.status(500).json({ message: 'Eroare server la preluarea profesorilor.' });
    }
  });

  app.get('/api/student-notifications', protect, restrictTo('Student'), async (req, res) => {
    try {
      const sqlPool = getSqlPool();
      const studentId = req.user.id;

      const [invitationsResult, exclusionsResult, quizzesResult, modulesResult, lessonsResult, homeworksResult] = await Promise.all([
        sqlPool.query`
          SELECT ci.Id, ci.CourseId, ci.Status, c.Title, c.Description,
                 u.FirstName AS TeacherFirstName, u.LastName AS TeacherLastName
          FROM CourseInvitations ci
          INNER JOIN Courses c ON c.Id = ci.CourseId
          INNER JOIN Users u ON u.Id = ci.TeacherId
          WHERE ci.StudentId = ${studentId} AND ci.Status = 'Pending'
          ORDER BY ci.InvitedAt DESC
        `,
        sqlPool.query`
          SELECT 
            ce.CourseId AS courseId,
            c.Title AS courseTitle,
            ce.ExcludedAt AS excludedAt
          FROM CourseEnrollments ce
          INNER JOIN Courses c ON c.Id = ce.CourseId
          WHERE ce.StudentId = ${studentId} AND ce.IsExcluded = ${1}
          ORDER BY ce.ExcludedAt DESC
        `,
        sqlPool.query`
          SELECT TOP 5 
            q.Id AS id,
            q.CourseId AS courseId,
            q.Title AS title,
            q.Description AS description,
            c.Title AS courseTitle,
            q.ScheduledAt AS scheduledAt,
            q.CreatedAt AS createdAt
          FROM CourseQuizzes q
          INNER JOIN Courses c ON c.Id = q.CourseId
          INNER JOIN CourseEnrollments ce ON ce.CourseId = q.CourseId AND ce.StudentId = ${studentId}
          INNER JOIN CourseInvitations ci ON ci.CourseId = q.CourseId AND ci.StudentId = ${studentId}
          WHERE q.IsPublished = ${1} AND c.IsPublished = ${1} AND ce.IsExcluded = ${0} AND ci.Status = 'Accepted'
          ORDER BY q.CreatedAt DESC
        `,
        sqlPool.query`
          SELECT TOP 5 
            m.Id AS id,
            m.CourseId AS courseId,
            m.Title AS title,
            c.Title AS courseTitle
          FROM CourseModules m
          INNER JOIN Courses c ON c.Id = m.CourseId
          INNER JOIN CourseEnrollments ce ON ce.CourseId = m.CourseId AND ce.StudentId = ${studentId}
          INNER JOIN CourseInvitations ci ON ci.CourseId = m.CourseId AND ci.StudentId = ${studentId}
          WHERE ce.IsExcluded = ${0} AND ci.Status = 'Accepted'
          ORDER BY m.Id DESC
        `,
        sqlPool.query`
          SELECT TOP 5 
            l.Id AS id,
            l.ModuleId AS moduleId,
            l.Title AS title,
            m.Title AS moduleTitle,
            c.Id AS courseId,
            c.Title AS courseTitle
          FROM CourseLessons l
          INNER JOIN CourseModules m ON m.Id = l.ModuleId
          INNER JOIN Courses c ON c.Id = m.CourseId
          INNER JOIN CourseEnrollments ce ON ce.CourseId = c.Id AND ce.StudentId = ${studentId}
          INNER JOIN CourseInvitations ci ON ci.CourseId = c.Id AND ci.StudentId = ${studentId}
          WHERE ce.IsExcluded = ${0} AND ci.Status = 'Accepted'
          ORDER BY l.Id DESC
        `,
        sqlPool.query`
          SELECT TOP 5 
            h.Id AS id,
            h.CourseId AS courseId,
            h.Title AS title,
            c.Title AS courseTitle,
            h.DueAt AS dueAt,
            h.CreatedAt AS createdAt,
            h.MaxPoints AS maxPoints
          FROM Homeworks h
          INNER JOIN Courses c ON c.Id = h.CourseId
          INNER JOIN CourseEnrollments ce ON ce.CourseId = h.CourseId AND ce.StudentId = ${studentId}
          INNER JOIN CourseInvitations ci ON ci.CourseId = h.CourseId AND ci.StudentId = ${studentId}
          WHERE ce.IsExcluded = ${0} AND ci.Status = 'Accepted'
          ORDER BY h.CreatedAt DESC
        `,
      ]);

      res.json({
        invitations: invitationsResult.recordset,
        exclusions: exclusionsResult.recordset,
        quizzes: quizzesResult.recordset,
        modules: modulesResult.recordset,
        lessons: lessonsResult.recordset,
        homeworks: homeworksResult.recordset,
      });
    } catch (err) {
      console.error('❌ Error fetching student notifications:', err);
      res.status(500).json({ message: 'Eroare la preluarea notificărilor.' });
    }
  });
}

module.exports = { registerUserRoutes };
