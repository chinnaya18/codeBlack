import { API_URL } from "./api";

export async function loginUser(username, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Login failed");
  }

  const data = await res.json();

  // Store auth data
  localStorage.setItem("token", data.token);
  localStorage.setItem("username", data.username);
  localStorage.setItem("role", data.role);

  return data;
}

export async function registerUser(username, password) {
  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      try {
        const err = await res.json();
        throw new Error(err.message || "Registration failed");
      } catch (e) {
        // If response isn't JSON, it's likely an HTML error page from server crash
        throw new Error(`Registration failed (${res.status}): Server error`);
      }
    }

    const data = await res.json();

    // Store auth data (auto-login after registration)
    localStorage.setItem("token", data.token);
    localStorage.setItem("username", data.username);
    localStorage.setItem("role", data.role);

    return data;
  } catch (err) {
    throw new Error(err.message || "Registration failed");
  }
}

export function getUser() {
  return {
    username: localStorage.getItem("username"),
    role: localStorage.getItem("role"),
    token: localStorage.getItem("token"),
  };
}

export function isLoggedIn() {
  return !!localStorage.getItem("token");
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  localStorage.removeItem("role");
}
