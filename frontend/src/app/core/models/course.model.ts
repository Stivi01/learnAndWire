export interface Course {
  id: number;
  title: string;
  description: string;
  createdBy: number;
  createdAt: string;
  thumbnailUrl?: string;
  isPublished: boolean;
}
