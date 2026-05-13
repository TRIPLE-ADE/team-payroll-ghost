import { http } from "@/lib/http";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
}

export async function loginRequest(body: LoginRequest): Promise<LoginResponse> {
  const { data } = await http.post<LoginResponse>("/api/v1/auth/login", body);
  return data;
}
