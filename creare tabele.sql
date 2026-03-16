SELECT TOP (1000) *
  FROM [LAW].[dbo].[Users]


  ALTER TABLE Users
ADD phone VARCHAR(50) NULL,
    address VARCHAR(255) NULL;
EXEC sp_rename 'Users.academic_year', 'academicYear', 'COLUMN';

ALTER TABLE Users
ADD avatar VARCHAR(255) NULL;
delete from Users where id=3

update Users
set avatar = null where id=3


-- 1️⃣ Tabel: Courses
CREATE TABLE Courses (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Title NVARCHAR(255) NOT NULL,
    Description NVARCHAR(MAX),
    CreatedBy INT NOT NULL, -- Profesor
    CreatedAt DATETIME DEFAULT GETDATE(),
    ThumbnailUrl NVARCHAR(500),
    IsPublished BIT DEFAULT 0,
    FOREIGN KEY (CreatedBy) REFERENCES Users(Id)
);

-- 2️⃣ Tabel: CourseModules
CREATE TABLE CourseModules (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    CourseId INT NOT NULL,
    Title NVARCHAR(255) NOT NULL,
    OrderIndex INT NOT NULL,
    FOREIGN KEY (CourseId) REFERENCES Courses(Id) ON DELETE CASCADE
);

-- 3️⃣ Tabel: CourseLessons
CREATE TABLE CourseLessons (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ModuleId INT NOT NULL,
    Title NVARCHAR(255) NOT NULL,
    Content NVARCHAR(MAX),
    OrderIndex INT NOT NULL,
    VideoUrl NVARCHAR(500),
    FOREIGN KEY (ModuleId) REFERENCES CourseModules(Id) ON DELETE CASCADE
);

-- 4️⃣ Tabel: LessonResources
CREATE TABLE LessonResources (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    LessonId INT NOT NULL,
    Type NVARCHAR(50) NOT NULL, -- image, pdf, zip, video etc.
    Url NVARCHAR(500) NOT NULL,
    FOREIGN KEY (LessonId) REFERENCES CourseLessons(Id) ON DELETE CASCADE
);

-- 5️⃣ Tabel: CourseEnrollments
CREATE TABLE CourseEnrollments (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    CourseId INT NOT NULL,
    StudentId INT NOT NULL,
    EnrolledAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (CourseId) REFERENCES Courses(Id) ON DELETE CASCADE,
    FOREIGN KEY (StudentId) REFERENCES Users(Id)
);

-- 6️⃣ Tabel: LessonProgress
CREATE TABLE LessonProgress (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    LessonId INT NOT NULL,
    StudentId INT NOT NULL,
    IsCompleted BIT DEFAULT 0,
    CompletedAt DATETIME NULL,
    FOREIGN KEY (LessonId) REFERENCES CourseLessons(Id) ON DELETE CASCADE,
    FOREIGN KEY (StudentId) REFERENCES Users(Id)
);

CREATE TABLE CourseInvitations (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    CourseId INT NOT NULL,
    StudentId INT NOT NULL,
    InvitedAt DATETIME DEFAULT GETDATE(),
    Status NVARCHAR(20) NOT NULL DEFAULT 'Pending', -- Pending / Accepted / Declined
    FOREIGN KEY (CourseId) REFERENCES Courses(Id) ON DELETE CASCADE,
    FOREIGN KEY (StudentId) REFERENCES Users(Id)
);

ALTER TABLE CourseInvitations
ADD TeacherId INT NOT NULL;

-- Creează foreign key către Users(Id)
ALTER TABLE CourseInvitations
ADD CONSTRAINT FK_CourseInvitations_Teacher
FOREIGN KEY (TeacherId) REFERENCES Users(Id);


-----------QUIZ URI

CREATE TABLE CourseQuizzes (
    Id INT IDENTITY PRIMARY KEY,
    CourseId INT NOT NULL,
    Title NVARCHAR(200) NOT NULL,
    Description NVARCHAR(MAX),
    CreatedBy INT NOT NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),
    IsPublished BIT DEFAULT 0,

    FOREIGN KEY (CourseId) REFERENCES Courses(Id),
    FOREIGN KEY (CreatedBy) REFERENCES Users(Id)
);

CREATE TABLE QuizQuestions (
    Id INT IDENTITY PRIMARY KEY,
    QuizId INT NOT NULL,
    QuestionText NVARCHAR(MAX) NOT NULL,
    QuestionType VARCHAR(20) NOT NULL, -- 'single' sau 'multiple'
    Points INT DEFAULT 1,

    FOREIGN KEY (QuizId) REFERENCES CourseQuizzes(Id)
);

CREATE TABLE QuizOptions (
    Id INT IDENTITY PRIMARY KEY,
    QuestionId INT NOT NULL,
    OptionText NVARCHAR(MAX) NOT NULL,
    IsCorrect BIT NOT NULL DEFAULT 0,

    FOREIGN KEY (QuestionId) REFERENCES QuizQuestions(Id)
);

CREATE TABLE QuizResults (
    Id INT IDENTITY PRIMARY KEY,
    QuizId INT NOT NULL,
    StudentId INT NOT NULL,
    Score INT NOT NULL,
    SubmittedAt DATETIME DEFAULT GETDATE(),

    FOREIGN KEY (QuizId) REFERENCES CourseQuizzes(Id),
    FOREIGN KEY (StudentId) REFERENCES Users(Id)
);

CREATE TABLE StudentAnswers (
    Id INT IDENTITY PRIMARY KEY,
    ResultId INT NOT NULL,
    QuestionId INT NOT NULL,
    OptionId INT NOT NULL,

    FOREIGN KEY (ResultId) REFERENCES QuizResults(Id),
    FOREIGN KEY (QuestionId) REFERENCES QuizQuestions(Id),
    FOREIGN KEY (OptionId) REFERENCES QuizOptions(Id)
);
