export interface HomeworkItem {
  id: number;
  courseId: number;
  courseTitle: string;
  title: string;
  description?: string;
  homeworkType: 'classic' | 'breadbord';
  instructionsUrl?: string | null;
  dueAt: string;
  createdAt: string;
  maxPoints?: number;
  submissionId?: number | null;
  submissionType?: 'classic' | 'breadbord' | null;
  submittedAt?: string | null;
  fileUrls?: string[];
  grade?: number | null;
  gradedAt?: string | null;
  comments?: string | null;
  isLate?: boolean;
}

export interface HomeworkSubmission {
  id: number;
  homeworkId: number;
  studentId: number;
  studentName: string;
  studentEmail: string;
  submissionType: 'classic' | 'breadbord';
  fileUrls: string[];
  grade?: number | null;
  maxPoints?: number;
  submittedAt: string;
  gradedAt?: string | null;
  comments?: string | null;
  isLate?: boolean;
}

export interface HomeworkStudentStatus {
  studentId: number;
  firstName: string;
  lastName: string;
  studentName: string;
  email: string;
  submissionId?: number | null;
  submissionType?: 'classic' | 'breadbord' | null;
  fileUrls?: string[];
  grade?: number | null;
  submittedAt?: string | null;
  gradedAt?: string | null;
  isLate?: boolean;
  comments?: string | null;
  status: 'not_submitted' | 'submitted_late' | 'submitted_on_time';
  maxPoints?: number;
}
