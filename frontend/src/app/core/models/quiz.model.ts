export interface QuizData {
  id: number;
  courseId: number;
  title: string;
  description?: string;
  createdAt: string;
  createdBy: number;
  isPublished: boolean;
}

export interface QuizQuestion {
  id: number;
  quizId: number;
  questionText: string;
  questionType: 'single' | 'multiple';
  points: number;
  options?: QuizOption[];
}

export interface QuizOption {
  id: number;
  questionId: number;
  optionText: string;
  isCorrect: boolean;
}

export interface QuizResult {
  id: number;
  quizId: number;
  studentId: number;
  score: number;
  submittedAt: string;
}
