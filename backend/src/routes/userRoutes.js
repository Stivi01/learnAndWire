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
          WHERE ce.StudentId = @studentId
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
}

module.exports = { registerUserRoutes };
