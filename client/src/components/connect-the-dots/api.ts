import { apiRequest } from "@/lib/queryClient";

export const MAPS_KEY = ["/api/connect-the-dots/maps"];
export const COURSES_KEY = ["/api/connect-the-dots/courses"];
export const mapKey = (id: string) => [`/api/connect-the-dots/maps/${id}`];

export async function readJson<T>(method: string, url: string, body?: unknown): Promise<T> {
  const response = await apiRequest(method, url, body);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
