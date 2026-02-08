export async function submitCode(code) {
  const res = await fetch("http://localhost:5000/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code }),
  });

  return res.json();
}
