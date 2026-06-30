export interface AppUser {
  id: string;
  email: string;
  nombre: string;
}

export interface ServiceResponse<T> {
  data: T | null;
  error: string | null;
}
