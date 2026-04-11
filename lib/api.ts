// lib/api.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// --- Helper Functions ---

// Get token from local storage (Client-side only)
export const getToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token");
  }
  return null;
};

// Wrapper around native fetch to automatically include the JWT token
async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `API Error: ${response.statusText}`);
  }

  return response.json();
}

// --- API Methods ---

export const api = {
  // Auth
  login: async (data: FormData) => {
    // OAuth2 expects form data, not JSON
    const response = await fetch(`${API_URL}/api/login`, {
      method: "POST",
      body: data,
    });
    if (!response.ok) throw new Error("Login failed");
    return response.json();
  },
  
  register: async (userData: any) => {
    return fetchAPI("/api/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  },

  // Events
  getEvents: async () => {
    return fetchAPI("/api/events");
  },

  createEvent: async (eventData: any) => {
    return fetchAPI("/api/events", {
      method: "POST",
      body: JSON.stringify(eventData),
    });
  },

  registerForEvent: async (eventId: number) => {
    return fetchAPI(`/api/events/${eventId}/register`, {
      method: "POST",
    });
  }
};