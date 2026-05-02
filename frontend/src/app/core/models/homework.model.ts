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
}
