export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "PM" | "INTERNAL" | "CLIENT";
  departmentId: string | null;
}
