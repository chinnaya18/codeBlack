import { API_URL, getAuthHeaders } from "./api";

export async function submitCode(code, language, round) {
  const res = await fetch(`${API_URL}/submit`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ code, language, round }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Submit failed" }));
    throw new Error(err.message);
  }

  return res.json();
}
