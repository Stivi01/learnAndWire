function createOwnershipHelpers({ getSqlPool }) {
  async function getTeacherOwnedCourse(courseId, teacherId) {
    const sqlPool = getSqlPool();
    const result = await sqlPool.query`
      SELECT Id, Title, IsPublished
      FROM Courses
      WHERE Id = ${courseId} AND CreatedBy = ${teacherId}
    `;

    return result.recordset[0] || null;
  }

  async function getTeacherOwnedModule(moduleId, teacherId) {
    const sqlPool = getSqlPool();
    const result = await sqlPool.query`
      SELECT m.Id, m.Title, m.CourseId, c.Title AS CourseTitle, c.IsPublished AS CourseIsPublished
      FROM CourseModules m
      INNER JOIN Courses c ON c.Id = m.CourseId
      WHERE m.Id = ${moduleId} AND c.CreatedBy = ${teacherId}
    `;

    return result.recordset[0] || null;
  }

  async function getTeacherOwnedLesson(lessonId, teacherId) {
    const sqlPool = getSqlPool();
    const result = await sqlPool.query`
      SELECT l.Id, l.Title, l.ModuleId, m.CourseId, c.Title AS CourseTitle, c.IsPublished AS CourseIsPublished
      FROM CourseLessons l
      INNER JOIN CourseModules m ON m.Id = l.ModuleId
      INNER JOIN Courses c ON c.Id = m.CourseId
      WHERE l.Id = ${lessonId} AND c.CreatedBy = ${teacherId}
    `;

    return result.recordset[0] || null;
  }

  async function getTeacherOwnedQuiz(quizId, teacherId) {
    const sqlPool = getSqlPool();
    const result = await sqlPool.query`
      SELECT q.Id, q.Title, q.CourseId, q.IsPublished, c.Title AS CourseTitle, c.IsPublished AS CourseIsPublished
      FROM CourseQuizzes q
      INNER JOIN Courses c ON c.Id = q.CourseId
      WHERE q.Id = ${quizId} AND q.CreatedBy = ${teacherId}
    `;

    return result.recordset[0] || null;
  }

  async function getTeacherOwnedQuestion(questionId, teacherId) {
    const sqlPool = getSqlPool();
    const result = await sqlPool.query`
      SELECT qq.Id, qq.QuestionText, qq.QuestionType, qq.QuizId, q.Title AS QuizTitle, q.IsPublished AS QuizIsPublished
      FROM QuizQuestions qq
      INNER JOIN CourseQuizzes q ON q.Id = qq.QuizId
      WHERE qq.Id = ${questionId} AND q.CreatedBy = ${teacherId}
    `;

    return result.recordset[0] || null;
  }

  async function getTeacherOwnedOption(optionId, teacherId) {
    const sqlPool = getSqlPool();
    const result = await sqlPool.query`
      SELECT qo.Id, qo.OptionText, qo.QuestionId, qq.QuizId, q.Title AS QuizTitle, q.IsPublished AS QuizIsPublished
      FROM QuizOptions qo
      INNER JOIN QuizQuestions qq ON qq.Id = qo.QuestionId
      INNER JOIN CourseQuizzes q ON q.Id = qq.QuizId
      WHERE qo.Id = ${optionId} AND q.CreatedBy = ${teacherId}
    `;

    return result.recordset[0] || null;
  }

  async function getTeacherOwnedSchedule(scheduleId, teacherId) {
    const sqlPool = getSqlPool();
    const result = await sqlPool.query`
      SELECT cs.Id, cs.CourseId, cs.UserId, c.Title AS CourseTitle
      FROM CourseSchedule cs
      INNER JOIN Courses c ON c.Id = cs.CourseId
      WHERE cs.Id = ${scheduleId} AND cs.UserId = ${teacherId} AND c.CreatedBy = ${teacherId}
    `;

    return result.recordset[0] || null;
  }

  function rejectPublishedCourseContentEdit(res) {
    return res.status(400).json({
      message: 'Cursul este publicat. Retrage-l din publicare înainte de a modifica modulele sau lecțiile.'
    });
  }

  function rejectPublishedQuizContentEdit(res) {
    return res.status(400).json({
      message: 'Quiz-ul este publicat. Retrage-l din publicare înainte de a modifica întrebările sau opțiunile.'
    });
  }

  return {
    getTeacherOwnedCourse,
    getTeacherOwnedModule,
    getTeacherOwnedLesson,
    getTeacherOwnedQuiz,
    getTeacherOwnedQuestion,
    getTeacherOwnedOption,
    getTeacherOwnedSchedule,
    rejectPublishedCourseContentEdit,
    rejectPublishedQuizContentEdit
  };
}

module.exports = { createOwnershipHelpers };
