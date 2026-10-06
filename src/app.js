import { APP_CONFIG, SUPABASE_CONFIG } from "./config.js";
import { getRandomQuote } from "./quotes.js";
import {
  saveTeacherContext,
  getTeacherContext,
  clearTeacherContext,
} from "./session.js";

const entryPage = document.querySelector("#entry-page");
const welcomePage = document.querySelector("#welcome-page");

const yearSelect = document.querySelector("#academic-year");
const semesterSelect = document.querySelector("#semester");
const classSelect = document.querySelector("#class");
const teacherForm = document.querySelector("#teacher-form");
const entryError = document.querySelector("#entry-error");

const adminLink = document.querySelector("#admin-link");
const adminModal = document.querySelector("#admin-modal");
const adminForm = document.querySelector("#admin-form");
const adminPassword = document.querySelector("#admin-password");
const adminError = document.querySelector("#admin-error");

const classBadge = document.querySelector("#class-badge");
const contextSummary = document.querySelector("#context-summary");
const quoteText = document.querySelector("#quote-text");
const quoteAuthor = document.querySelector("#quote-author");
const inputGradeButton = document.querySelector("#input-grade-btn");
const backButton = document.querySelector("#back-button");

function showError(element, message) {
  element.textContent = message;
  element.classList.remove("hidden");
}

function clearError(element) {
  element.textContent = "";
  element.classList.add("hidden");
}

function setSelectOptions(select, options, placeholder) {
  select.innerHTML = "";
  const first = document.createElement("option");
  first.value = "";
  first.textContent = placeholder;
  select.appendChild(first);

  for (const option of options) {
    const el = document.createElement("option");
    el.value = option.value;
    el.textContent = option.label;
    select.appendChild(el);
  }
}

function showEntryPage() {
  entryPage.classList.remove("hidden");
  welcomePage.classList.add("hidden");
}

function showWelcomePage(context) {
  entryPage.classList.add("hidden");
  welcomePage.classList.remove("hidden");

  classBadge.textContent = context.className;

  contextSummary.innerHTML =
    "<strong>Tahun Ajaran:</strong> " + escapeHtml(context.academicYear) + "<br>" +
    "<strong>Semester:</strong> " + escapeHtml(context.semester) + "<br>" +
    "<strong>Kelas:</strong> " + escapeHtml(context.className);

  const quote = getRandomQuote();
  quoteText.textContent = quote.text;
  quoteAuthor.textContent = "— " + quote.author;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function seedDemoData() {
  setSelectOptions(
    yearSelect,
    [{ value: "demo-2026-2027", label: "2026/2027" }],
    "Pilih tahun ajaran"
  );

  setSelectOptions(
    classSelect,
    ["1A","1B","1C","2A","2B","2C","3A","3B","3C","4A","4B","4C","5A","5B","5C","6A","6B","6C"]
      .map(name => ({ value: "demo-" + name, label: name })),
    "Pilih kelas"
  );
}

async function loadEntryData() {
  // Phase 2 foundation.
  // Replace the demo loader with Supabase queries after SUPABASE_CONFIG is populated.
  if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey) {
    seedDemoData();
    return;
  }

  throw new Error("Supabase client wiring is intentionally pending in Phase 2.");
}

teacherForm.addEventListener("submit", (event) => {
  event.preventDefault();
  clearError(entryError);

  const academicYearId = yearSelect.value;
  const academicYear = yearSelect.selectedOptions[0]?.textContent ?? "";
  const semester = semesterSelect.value;
  const classId = classSelect.value;
  const className = classSelect.selectedOptions[0]?.textContent ?? "";

  if (!academicYearId || !semester || !classId) {
    showError(entryError, "Silakan lengkapi Tahun Ajaran, Semester, dan Kelas.");
    return;
  }

  saveTeacherContext({
    academicYearId,
    academicYear,
    semester,
    classId,
    className,
  });

  showWelcomePage({
    academicYearId,
    academicYear,
    semester,
    classId,
    className,
  });
});

adminLink.addEventListener("click", () => {
  clearError(adminError);
  adminPassword.value = "";
  adminModal.classList.remove("hidden");
  adminPassword.focus();
});

function closeAdminModal() {
  adminModal.classList.add("hidden");
}

document.querySelector("#close-admin").addEventListener("click", closeAdminModal);
document.querySelector("#cancel-admin").addEventListener("click", closeAdminModal);

adminForm.addEventListener("submit", (event) => {
  event.preventDefault();
  clearError(adminError);

  // The admin verification is deliberately not hardcoded here.
  showError(
    adminError,
    "Verifikasi admin akan dihubungkan ke mekanisme autentikasi yang aman sebelum produksi."
  );
});

backButton.addEventListener("click", () => {
  clearTeacherContext();
  showEntryPage();
});

inputGradeButton.addEventListener("click", () => {
  // Phase 2 stops at navigation placeholder.
  window.alert("Menu Input Nilai akan dibangun pada fase berikutnya.");
});

(async function init() {
  try {
    await loadEntryData();

    const saved = getTeacherContext();
    if (saved?.academicYearId && saved?.semester && saved?.classId) {
      yearSelect.value = saved.academicYearId;
      semesterSelect.value = saved.semester;
      classSelect.value = saved.classId;
      showWelcomePage(saved);
    }
  } catch (error) {
    showError(entryError, error.message || "Gagal memuat data awal.");
  }
})();
