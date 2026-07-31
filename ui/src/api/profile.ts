export interface UserProfile {
  userEmail: string;
}

export async function fetchProfile(): Promise<UserProfile> {
  const response = await fetch("/api/profile");
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json() as Promise<UserProfile>;
}
