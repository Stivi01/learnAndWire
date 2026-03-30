const { createOwnershipHelpers } = require('../utils/ownership');

function registerScheduleRoutes(app, { getSqlPool, protect, restrictTo }) {
  const { getTeacherOwnedCourse, getTeacherOwnedSchedule } = createOwnershipHelpers({ getSqlPool });

  app.post('/api/course-schedules', protect, restrictTo('Profesor'), async (req, res) => {
    const { courseId, dayOfWeek, startTime, endTime } = req.body;

    if (!courseId || !dayOfWeek || !startTime || !endTime) {
      return res.status(400).json({
        message: 'courseId, dayOfWeek, startTime și endTime sunt obligatorii.'
      });
    }

    try {
      const sqlPool = getSqlPool();
      const course = await getTeacherOwnedCourse(courseId, req.user.id);

      if (!course) {
        return res.status(404).json({ message: 'Cursul nu există sau nu îți aparține.' });
      }

      const result = await sqlPool.query`
        INSERT INTO CourseSchedule (CourseId, UserId, DayOfWeek, StartTime, EndTime)
        OUTPUT INSERTED.*
        VALUES (${courseId}, ${req.user.id}, ${dayOfWeek}, ${startTime}, ${endTime})
      `;

      res.status(201).json(result.recordset[0]);
    } catch (err) {
      console.error('❌ Error creating schedule:', err);
      res.status(500).json({ message: 'Eroare la crearea programării.' });
    }
  });

  app.get('/api/course-schedules', protect, restrictTo('Profesor'), async (req, res) => {
    const { courseId } = req.query;

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
        SELECT * FROM CourseSchedule
        WHERE CourseId = ${courseId} AND UserId = ${req.user.id}
        ORDER BY DayOfWeek, StartTime
      `;

      res.json(result.recordset);
    } catch (err) {
      console.error('❌ Error fetching schedules:', err);
      res.status(500).json({ message: 'Eroare la preluarea programărilor.' });
    }
  });

  app.put('/api/course-schedules/:id', protect, restrictTo('Profesor'), async (req, res) => {
    const scheduleId = parseInt(req.params.id, 10);
    const { dayOfWeek, startTime, endTime } = req.body;

    if (!dayOfWeek || !startTime || !endTime) {
      return res.status(400).json({
        message: 'dayOfWeek, startTime și endTime sunt obligatorii.'
      });
    }

    try {
      const sqlPool = getSqlPool();
      const schedule = await getTeacherOwnedSchedule(scheduleId, req.user.id);

      if (!schedule) {
        return res.status(404).json({ message: 'Programarea nu există sau nu îți aparține.' });
      }

      const result = await sqlPool.query`
        UPDATE CourseSchedule
        SET
          DayOfWeek = ${dayOfWeek},
          StartTime = ${startTime},
          EndTime = ${endTime}
        WHERE Id = ${scheduleId} AND UserId = ${req.user.id}
      `;

      if (result.rowsAffected[0] === 0) {
        return res.status(404).json({ message: 'Programarea nu există.' });
      }

      res.json({ message: 'Programarea a fost actualizată cu succes.' });
    } catch (err) {
      console.error('❌ Error updating schedule:', err);
      res.status(500).json({ message: 'Eroare la actualizarea programării.' });
    }
  });

  app.delete('/api/course-schedules/:id', protect, restrictTo('Profesor'), async (req, res) => {
    const scheduleId = parseInt(req.params.id, 10);

    try {
      const sqlPool = getSqlPool();
      const schedule = await getTeacherOwnedSchedule(scheduleId, req.user.id);

      if (!schedule) {
        return res.status(404).json({ message: 'Programarea nu există sau nu îți aparține.' });
      }

      const result = await sqlPool.query`
        DELETE FROM CourseSchedule
        WHERE Id = ${scheduleId} AND UserId = ${req.user.id}
      `;

      if (result.rowsAffected[0] === 0) {
        return res.status(404).json({ message: 'Programarea nu există.' });
      }

      res.json({ message: 'Programarea a fost ștearsă cu succes.' });
    } catch (err) {
      console.error('❌ Error deleting schedule:', err);
      res.status(500).json({ message: 'Eroare la ștergerea programării.' });
    }
  });

  app.get('/api/student/course-schedules', protect, restrictTo('Student'), async (req, res) => {
    const studentId = req.user.id;

    try {
      const sqlPool = getSqlPool();
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
      console.error('❌ Error fetching student schedules:', err);
      res.status(500).json({ message: 'Eroare la preluarea programărilor studentului.' });
    }
  });

  app.get('/api/student/course-schedules/upcoming', protect, restrictTo('Student'), async (req, res) => {
    const studentId = req.user.id;

    try {
      const sqlPool = getSqlPool();
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
      console.error('❌ Error fetching upcoming schedules:', err);
      res.status(500).json({ message: 'Eroare la preluarea programărilor viitoare.' });
    }
  });

  app.get('/api/course-schedules/teacher/all-schedules', protect, restrictTo('Profesor'), async (req, res) => {
    const teacherId = req.user.id;

    try {
      const sqlPool = getSqlPool();
      const result = await sqlPool.query`
        SELECT cs.*, c.Title AS CourseTitle
        FROM CourseSchedule cs
        INNER JOIN Courses c ON c.Id = cs.CourseId
        WHERE cs.UserId = ${teacherId}
        ORDER BY cs.DayOfWeek, cs.StartTime
      `;

      res.json(result.recordset);
    } catch (err) {
      console.error('❌ Error fetching teacher schedules:', err);
      res.status(500).json({ message: 'Eroare la preluarea programărilor profesorului.' });
    }
  });
}

module.exports = { registerScheduleRoutes };
