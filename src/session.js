const SESSION_KEY = "ziesorra_portal_context";

export function saveTeacherContext(context) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(context));
}

export function getTeacherContext() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function clearTeacherContext() {
  sessionStorage.removeItem(SESSION_KEY);
}
