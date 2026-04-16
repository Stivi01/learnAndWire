function createPublishReadinessHelpers({ getSqlPool }) {
  async function getCoursePublishReadiness(courseId, teacherId, draftData = {}) {
    const sqlPool = getSqlPool();
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

  async function getQuizPublishReadiness(quizId, teacherId, draftData = {}) {
    const sqlPool = getSqlPool();
    const quizResult = await sqlPool.query`
      SELECT q.Id, q.Title, q.Description, q.ScheduledAt, q.ClosedAt, q.CourseId,
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
    const title = typeof draftData.title === 'string'
      ? draftData.title.trim()
      : (quiz.Title || '').trim();
    const description = typeof draftData.description === 'string'
      ? draftData.description.trim()
      : (quiz.Description || '').trim();
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
    const closedSource = Object.prototype.hasOwnProperty.call(draftData, 'closedAt')
      ? draftData.closedAt
      : quiz.ClosedAt;

    let hasFutureSchedule = false;
    if (scheduleSource) {
      const parsed = new Date(scheduleSource);
      hasFutureSchedule = !Number.isNaN(parsed.getTime()) && parsed > new Date();
    }

    let hasValidClosedAt = true;
    if (closedSource) {
      const closedParsed = new Date(closedSource);
      hasValidClosedAt = !Number.isNaN(closedParsed.getTime());
      
      if (hasValidClosedAt) {
        // Dacă există scheduledAt, closedAt trebuie să fie după scheduledAt
        if (scheduleSource) {
          const scheduledParsed = new Date(scheduleSource);
          if (closedParsed <= scheduledParsed) {
            hasValidClosedAt = false;
          }
        } else {
          // Dacă nu există scheduledAt, closedAt trebuie să fie în viitor
          if (closedParsed <= new Date()) {
            hasValidClosedAt = false;
          }
        }
      }
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
      hasValidClosedAt: !closedSource || hasValidClosedAt, // Dacă nu există closedAt, e valid; altfel verificăm
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
    if (closedSource && !checks.hasValidClosedAt) {
      if (scheduleSource) {
        missingItems.push('Data limită trebuie să fie după data de începere a quiz-ului.');
      } else {
        missingItems.push('Data limită trebuie să fie în viitor.');
      }
    }
    if (!checks.hasQuestion) missingItems.push('Adaugă cel puțin o întrebare.');

    missingItems.push(...optionIssues, ...answerIssues);

    return {
      found: true,
      canPublish: missingItems.length === 0,
      checks,
      missingItems
    };
  }

  return {
    getCoursePublishReadiness,
    getQuizPublishReadiness
  };
}

module.exports = { createPublishReadinessHelpers };
