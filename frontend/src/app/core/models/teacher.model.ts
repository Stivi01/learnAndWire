export interface Teacher {
  id: number;
  fullName: string;  // schimbat din 'name'
  email: string;
  role: string;
  avatarUrl: string;
  phone?: string;
  course?: string;
}
