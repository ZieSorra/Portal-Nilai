import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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

const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

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

async function loadEntryData() {
  setSelectOptions(
    yearSelect,
    [],
    "Memuat tahun ajaran..."
  );
  setSelectOptions(
    classSelect,
    [],
    "Memuat kelas..."
  );

  const [{ data: years, error: yearsError }, { data: classes, error: classesError }] =
    await Promise.all([
      supabase
        .from("academic_years")
        .select("id,name")
        .eq("is_active", true)
        .order("name", { ascending: false }),
      supabase
        .from("classes")
        .select("id,name")
        .eq("is_active", true)
        .order("name", { ascending: true }),
    ]);

  if (yearsError) {
    throw new Error("Gagal memuat tahun ajaran: " + yearsError.message);
  }

  if (classesError) {
    throw new Error("Gagal memuat kelas: " + classesError.message);
  }

  if (!years?.length) {
    throw new Error("Belum ada tahun ajaran aktif.");
  }

  if (!classes?.length) {
    throw new Error("Belum ada kelas aktif.");
  }

  setSelectOptions(
    yearSelect,
    years.map((item) => ({ value: item.id, label: item.name })),
    "Pilih tahun ajaran"
  );

  setSelectOptions(
    classSelect,
    classes.map((item) => ({ value: item.id, label: item.name })),
    "Pilih kelas"
  );
}

async function validateClassEnrollment(academicYearId, classId) {
  const { data, error } = await supabase
    .from("student_enrollments")
    .select("id")
    .eq("academic_year_id", academicYearId)
    .eq("class_id", classId)
    .eq("is_active", true)
    .limit(1);

  if (error) {
    throw new Error("Gagal memeriksa data siswa kelas: " + error.message);
  }

  return Array.isArray(data) && data.length > 0;
}

teacherForm.addEventListener("submit", async (event) => {
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

  const submitButton = teacherForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = "Memeriksa...";

  try {
    const hasStudents = await validateClassEnrollment(academicYearId, classId);

    if (!hasStudents) {
      showError(
        entryError,
        "Kelas ini belum memiliki data siswa aktif pada tahun ajaran yang dipilih."
      );
      return;
    }

    const context = {
      academicYearId,
      academicYear,
      semester,
      classId,
      className,
    };

    saveTeacherContext(context);
    showWelcomePage(context);
  } catch (error) {
    showError(entryError, error.message || "Gagal memeriksa kelas.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Masuk";
  }
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
  showError(
    adminError,
    "Autentikasi admin belum diaktifkan. Jangan gunakan password asli di frontend."
  );
});

backButton.addEventListener("click", () => {
  clearTeacherContext();
  showEntryPage();
});

inputGradeButton.addEventListener("click", () => {
  window.alert("Menu Input Nilai akan dibangun pada fase berikutnya.");
});

(async function init() {
  try {
    await loadEntryData();

    const saved = getTeacherContext();
    if (saved?.academicYearId && saved?.semester && saved?.classId) {
      const matchingYear = [...yearSelect.options].some(
        (option) => option.value === saved.academicYearId
      );
      const matchingClass = [...classSelect.options].some(
        (option) => option.value === saved.classId
      );

      if (matchingYear && matchingClass) {
        yearSelect.value = saved.academicYearId;
        semesterSelect.value = saved.semester;
        classSelect.value = saved.classId;
        showWelcomePage(saved);
      } else {
        clearTeacherContext();
      }
    }
  } catch (error) {
    showError(entryError, error.message || "Gagal memuat data awal.");
  }
})();
