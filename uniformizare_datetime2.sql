-- ========================================
-- UNIFORMIZARE: Toate coloanele de data/ora pe DATETIME2
-- ========================================

-- 1. Courses - SchimbAT CreatedAt de DATETIME la DATETIME2
ALTER TABLE Courses
ALTER COLUMN CreatedAt DATETIME2 NOT NULL;

-- 2. CourseQuizzes - SchimbAT CreatedAt de DATETIME la DATETIME2
ALTER TABLE CourseQuizzes
ALTER COLUMN CreatedAt DATETIME2 NOT NULL;

-- 3. CourseEnrollments - SchimbAT EnrolledAt de DATETIME la DATETIME2
ALTER TABLE CourseEnrollments
ALTER COLUMN EnrolledAt DATETIME2 NOT NULL;

-- 4. LessonProgress - SchimbAT CompletedAt de DATETIME la DATETIME2
ALTER TABLE LessonProgress
ALTER COLUMN CompletedAt DATETIME2 NULL;

-- 5. CourseInvitations - SchimbAT InvitedAt de DATETIME la DATETIME2
ALTER TABLE CourseInvitations
ALTER COLUMN InvitedAt DATETIME2 NOT NULL;

-- 6. QuizResults - SchimbAT SubmittedAt de DATETIME la DATETIME2
ALTER TABLE QuizResults
ALTER COLUMN SubmittedAt DATETIME2 NOT NULL;

-- ========================================
-- ADAUG CreatedAt la CourseModules si CourseLessons pentru tracking
-- ========================================

-- 7. CourseModules - Adaug CreatedAt
IF NOT EXISTS(SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CourseModules' AND COLUMN_NAME = 'CreatedAt')
BEGIN
    ALTER TABLE CourseModules
    ADD CreatedAt DATETIME2 DEFAULT GETDATE();
END

-- 8. CourseLessons - Adaug CreatedAt
IF NOT EXISTS(SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CourseLessons' AND COLUMN_NAME = 'CreatedAt')
BEGIN
    ALTER TABLE CourseLessons
    ADD CreatedAt DATETIME2 DEFAULT GETDATE();
END

-- Verificare finala - Toate coloanele de data sa fie DATETIME2
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE DATA_TYPE IN ('datetime', 'datetime2')
    AND TABLE_SCHEMA = 'dbo'
ORDER BY TABLE_NAME, COLUMN_NAME;
