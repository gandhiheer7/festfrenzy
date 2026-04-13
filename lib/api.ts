// lib/api.ts

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

// --- Types ---
export interface User {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
}

export interface Venue {
  id: number;
  name: string;
  location: string;
  capacity: number;
  created_at: string;
}

export interface Event {
  id: number;
  title: string;
  description: string;
  category: string;
  event_datetime: string;
  end_datetime: string;
  capacity: number;
  cost: number;
  image_url: string | null;
  venue_id: number;
  creator_id: number;
  created_at: string;
  venue: Venue;
  creator: User;
  registration_count: number;
}

export interface Registration {
  id: number;
  user_id: number;
  event_id: number;
  registered_at: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

// --- Token helpers ---
const TOKEN_KEY = "festfrenzy_token";

export const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

// --- Core fetch wrapper ---
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  requiresAuth = false
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (requiresAuth) {
    const token = getToken();
    if (!token) throw new Error("Not authenticated");
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Error ${res.status}: ${res.statusText}`);
  }

  // Handle 204 No Content
  if (res.status === 204) return {} as T;
  return res.json();
}

// --- API methods ---
export const api = {
  // Auth
  login: async (email: string, password: string): Promise<Token> => {
    const formData = new FormData();
    formData.append("username", email);
    formData.append("password", password);
    const res = await fetch(`${API_BASE}/api/login`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Login failed");
    }
    return res.json();
  },

  register: async (data: {
    email: string;
    password: string;
    full_name: string;
  }): Promise<User> =>
    request<User>("/api/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getMe: async (): Promise<User> =>
    request<User>("/api/users/me", {}, true),

  // Events
  getEvents: async (): Promise<Event[]> =>
    request<Event[]>("/api/events"),

  getEvent: async (id: number): Promise<Event> =>
    request<Event>(`/api/events/${id}`),

  createEvent: async (data: Omit<Event, "id" | "creator_id" | "created_at" | "venue" | "creator" | "registration_count">): Promise<Event> =>
    request<Event>("/api/events", {
      method: "POST",
      body: JSON.stringify(data),
    }, true),

  deleteEvent: async (id: number): Promise<void> =>
    request<void>(`/api/events/${id}`, { method: "DELETE" }, true),

  // Registrations
  registerForEvent: async (eventId: number): Promise<Registration> =>
    request<Registration>(`/api/events/${eventId}/register`, {
      method: "POST",
    }, true),

  cancelRegistration: async (eventId: number): Promise<void> =>
    request<void>(`/api/events/${eventId}/register`, {
      method: "DELETE",
    }, true),

  getMyRegistrations: async (): Promise<Registration[]> =>
    request<Registration[]>("/api/users/me/registrations", {}, true),

  // Venues
  getVenues: async (): Promise<Venue[]> =>
    request<Venue[]>("/api/venues"),

  createVenue: async (data: Omit<Venue, "id" | "created_at">): Promise<Venue> =>
    request<Venue>("/api/venues", {
      method: "POST",
      body: JSON.stringify(data),
    }, true),

  deleteVenue: async (id: number): Promise<void> =>
    request<void>(`/api/venues/${id}`, { method: "DELETE" }, true),

  // Admin
  getAllUsers: async (): Promise<User[]> =>
    request<User[]>("/api/admin/users", {}, true),

  makeAdmin: async (userId: number): Promise<User> =>
    request<User>(`/api/admin/users/${userId}/make-admin`, {
      method: "PATCH",
    }, true),

  removeAdmin: async (userId: number): Promise<User> =>
    request<User>(`/api/admin/users/${userId}/remove-admin`, {
      method: "PATCH",
    }, true),
};