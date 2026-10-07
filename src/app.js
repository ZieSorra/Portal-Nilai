import { APP_CONFIG, SUPABASE_CONFIG, ADMIN_CONFIG } from "./config.js";
import { getRandomQuote } from "./quotes.js";
import {
  saveTeacherContext,
  getTeacherContext,
  clearTeacherContext,
} from "./session.js";

const entryPage = document.querySelector("#entry-page");
const welcomePage = document.querySelector("#welcome-page");
const inputPage = document.querySelector("#input-page");
const adminPage = document.querySelector("#admin-page");
const legerPage = document.querySelector("#leger-page");

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
const legerButton = document.querySelector("#leger-btn");
const legerBackButton = document.querySelector("#leger-back-button");
const legerContext = document.querySelector("#leger-context");
const legerStsTab = document.querySelector("#leger-sts-tab");
const legerSasTab = document.querySelector("#leger-sas-tab");
const legerFormula = document.querySelector("#leger-formula");
const legerError = document.querySelector("#leger-error");
const legerSuccess = document.querySelector("#leger-success");
const legerTableHead = document.querySelector("#leger-table-head");
const legerTableBody = document.querySelector("#leger-table-body");
const backButton = document.querySelector("#back-button");

const inputBackButton = document.querySelector("#input-back-button");
const inputContext = document.querySelector("#input-context");
const subjectSelect = document.querySelector("#subject-select");
const componentSelect = document.querySelector("#component-select");
const materialField = document.querySelector("#material-field");
const materialSelect = document.querySelector("#material-select");
const inputError = document.querySelector("#input-error");
const inputSuccess = document.querySelector("#input-success");
const gradeTableBody = document.querySelector("#grade-table-body");
const saveGradesButton = document.querySelector("#save-grades-button");

const adminYearSelect = document.querySelector("#admin-year-select");
const adminClassSelect = document.querySelector("#admin-class-select");
const adminTahfidzError = document.querySelector("#admin-tahfidz-error");
const adminTahfidzSuccess = document.querySelector("#admin-tahfidz-success");
const tahfidzForm = document.querySelector("#tahfidz-form");
const tahfidzEditId = document.querySelector("#tahfidz-edit-id");
const tahfidzSurahName = document.querySelector("#tahfidz-surah-name");
const tahfidzSurahNumber = document.querySelector("#tahfidz-surah-number");
const tahfidzAyatStart = document.querySelector("#tahfidz-ayat-start");
const tahfidzAyatEnd = document.querySelector("#tahfidz-ayat-end");
const tahfidzAssessmentLabel = document.querySelector("#tahfidz-assessment-label");
const tahfidzSequence = document.querySelector("#tahfidz-sequence");
const tahfidzTableBody = document.querySelector("#tahfidz-table-body");
const cancelTahfidzEdit = document.querySelector("#cancel-tahfidz-edit");
const adminLogoutButton = document.querySelector("#admin-logout-button");
const fiqihForm = document.querySelector("#fiqih-form");
const fiqihEditId = document.querySelector("#fiqih-edit-id");
const fiqihAssessmentLabel = document.querySelector("#fiqih-assessment-label");
const fiqihMaterialName = document.querySelector("#fiqih-material-name");
const fiqihSequence = document.querySelector("#fiqih-sequence");
const fiqihTableBody = document.querySelector("#fiqih-table-body");
const cancelFiqihEdit = document.querySelector("#cancel-fiqih-edit");

const supabase = window.supabase?.createClient
  ? window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey)
  : (await import("https://esm.sh/@supabase/supabase-js@2")).createClient(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.anonKey
    );

let teacherContext = null;
let students = [];
let currentComponents = [];
let currentMaterials = [];
let currentGrades = new Map();
let pendingImportRows = [];
let adminTahfidzComponent = null;
let adminTahfidzMaterials = [];
let adminFiqihSubject = null;
let adminFiqihComponents = [];
let legerMode = "STS";
let legerData = null;

function clearImportPanel() {
  pendingImportRows = [];
  document.querySelector("#import-panel").classList.add("hidden");
  document.querySelector("#import-preview-body").innerHTML = "";
  document.querySelector("#import-summary").textContent = "";
  clearError(document.querySelector("#import-error"));
  document.querySelector("#confirm-import-button").disabled = true;
  document.querySelector("#grade-file-input").value = "";
}

function normalizeHeader(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\\s+/g, " ");
}

function normalizeName(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\\s+/g, " ");
}

function parseScore(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const score = Number(String(value).replace(",", ".").trim());
  return Number.isFinite(score) && score >= 0 && score <= 100 ? Number(score.toFixed(2)) : null;
}

function validateImportRows(rawRows) {
  const importError = document.querySelector("#import-error");
  clearError(importError);
  const seen = new Set();
  const enrolledByNis = new Map(students.filter(s => s.nis).map(s => [normalizeName(s.nis), s]));
  const enrolledByName = new Map(students.map(s => [normalizeName(s.name), s]));

  if (!rawRows.length) throw new Error("File tidak memiliki data.");
  const headers = Object.keys(rawRows[0]).map(normalizeHeader);
  if (!headers.includes("nilai")) throw new Error("Kolom wajib 'Nilai' tidak ditemukan.");
  if (!headers.includes("nis") && !headers.includes("nama")) {
    throw new Error("File harus memiliki kolom 'NIS' atau 'Nama'.");
  }

  return rawRows.map((raw, index) => {
    const normalized = {};
    for (const [key, value] of Object.entries(raw)) normalized[normalizeHeader(key)] = value;

    const nis = String(normalized.nis ?? "").trim();
    const name = String(normalized.nama ?? "").trim();
    const student = (nis && enrolledByNis.get(normalizeName(nis))) || enrolledByName.get(normalizeName(name));
    const score = parseScore(normalized.nilai);
    const key = student?.enrollmentId ?? ("row-" + index);

    let status = "OK";
    if (!student) status = "Siswa tidak ditemukan di kelas aktif";
    else if (seen.has(student.enrollmentId)) status = "Duplikat siswa";
    else if (score === null) status = "Nilai tidak valid (0–100)";
    seen.add(student?.enrollmentId ?? key);

    return {
      rowNumber: index + 2,
      enrollmentId: student?.enrollmentId ?? null,
      nis: student?.nis || nis,
      name: student?.name || name,
      score,
      status,
      valid: status === "OK",
    };
  });
}

function renderImportPreview(rows) {
  const body = document.querySelector("#import-preview-body");
  body.innerHTML = rows.map((row, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(row.nis)}</td>
      <td>${escapeHtml(row.name)}</td>
      <td>${row.score ?? ""}</td>
      <td class="${row.valid ? "import-ok" : "import-invalid"}">${escapeHtml(row.status)}</td>
    </tr>
  `).join("");

  const validCount = rows.filter(r => r.valid).length;
  const invalidCount = rows.length - validCount;
  document.querySelector("#import-summary").textContent =
    validCount + " baris valid • " + invalidCount + " baris perlu diperbaiki.";
  document.querySelector("#confirm-import-button").disabled = invalidCount > 0 || validCount === 0;
}

async function processImportFile(file) {
  clearError(inputError);
  inputSuccess.classList.add("hidden");
  clearImportPanel();

  if (!subjectSelect.value || !componentSelect.value) {
    showError(inputError, "Pilih mata pelajaran dan komponen penilaian sebelum upload.");
    return;
  }

  if (!window.XLSX) {
    showError(inputError, "Modul pembaca Excel belum tersedia. Muat ulang halaman lalu coba lagi.");
    return;
  }

  try {
    const buffer = await file.arrayBuffer();
    const workbook = window.XLSX.read(buffer, { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows = window.XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
    const rows = validateImportRows(rawRows);
    pendingImportRows = rows;

    document.querySelector("#import-panel").classList.remove("hidden");
    renderImportPreview(rows);
  } catch (error) {
    showError(document.querySelector("#import-error"), error.message || "Gagal membaca file.");
    document.querySelector("#import-panel").classList.remove("hidden");
  }
}

async function confirmImport() {
  if (!pendingImportRows.length || pendingImportRows.some(r => !r.valid)) return;

  const componentId = componentSelect.value;
  const component = currentComponents.find(item => item.id === componentId);
  const materialId = component?.assessment_type === "tahfidz" ? materialSelect.value : null;

  if (component?.assessment_type === "tahfidz" && !materialId) {
    showError(document.querySelector("#import-error"), "Pilih materi Tahfidz terlebih dahulu.");
    return;
  }

  const button = document.querySelector("#confirm-import-button");
  button.disabled = true;
  button.textContent = "Menyimpan...";

  try {
    for (const row of pendingImportRows) {
      const existing = currentGrades.get(row.enrollmentId);
      if (existing) {
        const { error } = await supabase.from("grades").update({ score: row.score }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("grades").insert({
          enrollment_id: row.enrollmentId,
          semester: teacherContext.semester,
          subject_id: subjectSelect.value,
          assessment_component_id: componentId,
          tahfidz_material_id: materialId,
          score: row.score,
        });
        if (error) throw error;
      }
    }

    await loadGrades();
    showSuccess("Import berhasil disimpan.");
    clearImportPanel();
  } catch (error) {
    showError(document.querySelector("#import-error"), "Gagal menyimpan import: " + error.message);
    button.disabled = false;
    button.textContent = "Konfirmasi & Simpan";
  }
}

function downloadTemplate() {
  if (!window.XLSX) {
    showError(inputError, "Modul Excel belum tersedia. Muat ulang halaman lalu coba lagi.");
    return;
  }

  const rows = students.map(student => ({
    NIS: student.nis,
    Nama: student.name,
    Nilai: "",
  }));

  const worksheet = window.XLSX.utils.json_to_sheet(rows);
  const workbook = window.XLSX.utils.book_new();
  window.XLSX.utils.book_append_sheet(workbook, worksheet, "Nilai");
  window.XLSX.writeFile(workbook, "Template-Input-Nilai.xlsx");
}



function showLegerPage() {
  entryPage.classList.add("hidden");
  welcomePage.classList.add("hidden");
  inputPage.classList.add("hidden");
  adminPage.classList.add("hidden");
  legerPage.classList.add("hidden");
  legerPage.classList.remove("hidden");
  legerContext.textContent =
    teacherContext.className + " • " +
    teacherContext.semester + " • " +
    teacherContext.academicYear;
}

function getAssessmentLabel(name) {
  const value = String(name ?? "").trim();
  const match = value.match(/^(Sumatif 1|Sumatif 2|Sumatif 3|STS|SAS)\b/i);
  return match ? match[1].replace(/^sumatif/i, "Sumatif") : null;
}

function getQuranSubType(name) {
  const value = String(name ?? "").toLowerCase();
  if (value.startsWith("qira’ah") || value.startsWith("qira'ah") || value.startsWith("qiraah")) return "Qira'ah";
  if (value.startsWith("kitabah")) return "Kitabah";
  return null;
}

function average(values) {
  const numbers = values.filter(value => Number.isFinite(Number(value))).map(Number);
  if (!numbers.length) return null;
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

function ceilScore(value) {
  return value === null ? null : Math.ceil(value);
}

function formatLegerScore(value) {
  return value === null ? "—" : String(value);
}

function buildLegerUnits(subjects, components) {
  const units = [];

  for (const subject of subjects) {
    const subjectComponents = components.filter(item => item.subject_id === subject.id);

    if (subject.name === "Fiqih Ibadah") {
      if (subjectComponents.length) {
        units.push({
          key: "fiqih:" + subject.id,
          subjectId: subject.id,
          label: "Fiqih Ibadah",
          type: "fiqih",
          components: subjectComponents,
        });
      }
      continue;
    }

    if (subject.subject_type === "quran") {
      for (const subType of ["Qira'ah", "Kitabah", "Tahfidz"]) {
        const matching = subjectComponents.filter(item =>
          subType === "Tahfidz"
            ? item.assessment_type === "tahfidz"
            : getQuranSubType(item.name) === subType
        );
        if (matching.length) {
          units.push({
            key: "quran:" + subject.id + ":" + subType,
            subjectId: subject.id,
            label: subject.name + " — " + subType,
            type: subType === "Tahfidz" ? "tahfidz" : "standard",
            components: matching,
          });
        }
      }
      continue;
    }

    if (subjectComponents.length) {
      units.push({
        key: "subject:" + subject.id,
        subjectId: subject.id,
        label: subject.name,
        type: "standard",
        components: subjectComponents,
      });
    }
  }

  return units;
}

function getUnitLabelScores(unit, grades, materials) {
  const componentIds = new Set(unit.components.map(item => item.id));
  const unitGrades = grades.filter(row => componentIds.has(row.assessment_component_id));
  const labelScores = new Map();

  for (const grade of unitGrades) {
    const component = unit.components.find(item => item.id === grade.assessment_component_id);
    let label = getAssessmentLabel(component?.name);

    if (unit.type === "tahfidz") {
      const material = materials.find(item => item.id === grade.tahfidz_material_id);
      label = material?.assessment_label ?? null;
    }

    if (!label) continue;
    if (!labelScores.has(label)) labelScores.set(label, []);
    labelScores.get(label).push(Number(grade.score));
  }

  return labelScores;
}

function calculateUnitSTS(unit, grades, materials) {
  const labelScores = getUnitLabelScores(unit, grades, materials);
  return {
    s1: average(labelScores.get("Sumatif 1") ?? []),
    s2: average(labelScores.get("Sumatif 2") ?? []),
    sts: average(labelScores.get("STS") ?? []),
  };
}

function calculateUnitSAS(unit, grades, materials) {
  const labelScores = getUnitLabelScores(unit, grades, materials);

  if (unit.type === "fiqih") {
    const allScores = [...labelScores.values()].flat();
    return ceilScore(average(allScores));
  }

  const s1 = average(labelScores.get("Sumatif 1") ?? []);
  const s2 = average(labelScores.get("Sumatif 2") ?? []);
  const s3 = average(labelScores.get("Sumatif 3") ?? []);
  const sts = average(labelScores.get("STS") ?? []);
  const sas = average(labelScores.get("SAS") ?? []);

  if ([s1, s2, s3, sts, sas].some(value => value === null)) return null;

  const result = (((s1 + s2 + s3) / 3) * 2 + sts + sas) / 4;
  return ceilScore(result);
}

function normalizeMaterialName(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function formatTahfidzRange(material) {
  const start = Number(material?.ayat_start);
  const end = Number(material?.ayat_end);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return "";
  return start === end ? String(start) : start + "–" + end;
}

function getTahfidzSasColumns(unit, grades, materials) {
  const componentIds = new Set(unit.components.map(item => item.id));
  const materialById = new Map(materials.map(item => [item.id, item]));
  const componentById = new Map(unit.components.map(item => [item.id, item]));
  const groups = new Map();

  for (const grade of grades) {
    if (!componentIds.has(grade.assessment_component_id) || !grade.tahfidz_material_id) continue;
    const material = materialById.get(grade.tahfidz_material_id);
    const component = componentById.get(grade.assessment_component_id);
    const assessment = material.assessment_label
      ? getAssessmentLabel(material.assessment_label)
      : getAssessmentLabel(component?.name);
    if (!material || !assessment) continue;

    const surahKey = normalizeMaterialName(material.surah_name);
    let groupKey;
    let mode;
    let label;

    if (assessment === "Sumatif 1" || assessment === "Sumatif 2") {
      groupKey = "surah:" + surahKey + ":s12";
      mode = "s12";
      label = material.surah_name;
    } else if (assessment === "Sumatif 3" || assessment === "STS") {
      groupKey = "surah:" + surahKey + ":s3sts";
      mode = "s3sts";
      label = material.surah_name;
    } else if (assessment === "SAS") {
      groupKey = "material:" + material.id + ":sas";
      mode = "sas";
      const range = formatTahfidzRange(material);
      label = material.surah_name + (range ? " " + range : "");
    } else {
      continue;
    }

    if (!groups.has(groupKey)) {
      groups.set(groupKey, { key: groupKey, label, mode, gradeIds: new Set() });
    }
    groups.get(groupKey).gradeIds.add(grade.id);
  }

  return [...groups.values()];
}

function getFiqihSasColumns(unit, grades) {
  const componentIds = new Set(unit.components.map(item => item.id));
  const groups = new Map();

  for (const grade of grades) {
    if (!componentIds.has(grade.assessment_component_id)) continue;
    const component = unit.components.find(item => item.id === grade.assessment_component_id);
    if (!component) continue;
    const label = String(component.name ?? "").trim();
    if (!label) continue;

    if (!groups.has(component.id)) {
      groups.set(component.id, { key: "fiqih:" + component.id, label, mode: "component", gradeIds: new Set() });
    }
    groups.get(component.id).gradeIds.add(grade.id);
  }

  return [...groups.values()];
}

function calculateDynamicSasColumn(column, studentGrades) {
  const scores = studentGrades
    .filter(grade => column.gradeIds.has(grade.id))
    .map(grade => Number(grade.score));
  return average(scores);
}
function renderLegerTable() {
  if (!legerData) return;

  const { students, units, grades, materials } = legerData;
  const isSTS = legerMode === "STS";

  legerFormula.textContent = isSTS
    ? "Leger STS: setiap unit menampilkan Sumatif 1, Sumatif 2, dan STS."
    : "Leger SAS: mata pelajaran biasa menggunakan ((rata-rata Sumatif 1, 2, 3 × 2) + STS + SAS) : 4, dibulatkan ke atas. Tahfidz menampilkan nilai per surat/materi sesuai penilaian yang diuji; Fiqih Ibadah menampilkan nilai per materi/komponen yang diuji.";

  if (!units.length) {
    legerTableHead.innerHTML = "";
    legerTableBody.innerHTML = '<tr><td class="empty-state">Belum ada komponen penilaian untuk leger.</td></tr>';
    return;
  }

  if (isSTS) {
    const topCells = units.map(unit =>
      `<th colspan="3">${escapeHtml(unit.label)}</th>`
    ).join("");
    const subCells = units.map(() => "<th>S1</th><th>S2</th><th>STS</th>").join("");

    legerTableHead.innerHTML =
      "<tr><th rowspan=\"2\">No.</th><th rowspan=\"2\">Nama Siswa</th>" + topCells + "</tr>" +
      "<tr>" + subCells + "</tr>";

    legerTableBody.innerHTML = students.map((student, index) => {
      const studentGrades = grades.filter(row => row.enrollment_id === student.enrollmentId);
      const cells = units.map(unit => {
        const scores = calculateUnitSTS(unit, studentGrades, materials);
        return "<td>" + formatLegerScore(scores.s1) + "</td>" +
          "<td>" + formatLegerScore(scores.s2) + "</td>" +
          "<td>" + formatLegerScore(scores.sts) + "</td>";
      }).join("");

      return "<tr><td>" + (index + 1) + "</td><td><strong>" +
        escapeHtml(student.name) +
        "</strong>" +
        (student.nis ? '<div class="student-meta">' + escapeHtml(student.nis) + "</div>" : "") +
        "</td>" + cells + "</tr>";
    }).join("");
    return;
  }

  const sasColumns = units.map(unit => {
    if (unit.type === "tahfidz") return { unit, columns: getTahfidzSasColumns(unit, grades, materials) };
    if (unit.type === "fiqih") return { unit, columns: getFiqihSasColumns(unit, grades) };
    return { unit, columns: [{ key: unit.key + ":sas", label: "SAS", mode: "standard", gradeIds: new Set() }] };
  });

  const visibleSasColumns = sasColumns.filter(group => group.columns.length > 0);
  const topCells = visibleSasColumns.map(group =>
    `<th colspan="${group.columns.length}">${escapeHtml(group.unit.label)}</th>`
  ).join("");
  const subCells = visibleSasColumns.map(group =>
    group.columns.map(column => `<th>${escapeHtml(column.label)}</th>`).join("")
  ).join("");

  legerTableHead.innerHTML =
    "<tr><th rowspan=\"2\">No.</th><th rowspan=\"2\">Nama Siswa</th>" + topCells + "</tr>" +
    "<tr>" + subCells + "</tr>";

  legerTableBody.innerHTML = students.map((student, index) => {
    const studentGrades = grades.filter(row => row.enrollment_id === student.enrollmentId);
    const cells = visibleSasColumns.map(group => group.columns.map(column => {
      const score = column.mode === "standard"
        ? calculateUnitSAS(group.unit, studentGrades, materials)
        : ceilScore(calculateDynamicSasColumn(column, studentGrades));
      return "<td><strong>" + formatLegerScore(score) + "</strong></td>";
    }).join("")).join("");

    return "<tr><td>" + (index + 1) + "</td><td><strong>" +
      escapeHtml(student.name) +
      "</strong>" +
      (student.nis ? '<div class="student-meta">' + escapeHtml(student.nis) + "</div>" : "") +
      "</td>" + cells + "</tr>";
  }).join("");
}

async function loadLegerData() {
  clearError(legerError);
  legerSuccess.classList.add("hidden");
  legerTableHead.innerHTML = "";
  legerTableBody.innerHTML = '<tr><td class="empty-state">Memuat leger...</td></tr>';

  await loadStudents();

  const [{ data: subjects, error: subjectError }, { data: components, error: componentError }] =
    await Promise.all([
      supabase
        .from("subjects")
        .select("id,name,subject_type")
        .eq("is_active", true)
        .order("name", { ascending: true }),
      supabase
        .from("assessment_components")
        .select("id,subject_id,name,assessment_type,sequence")
        .eq("academic_year_id", teacherContext.academicYearId)
        .eq("class_id", teacherContext.classId)
        .eq("is_active", true)
        .order("sequence", { ascending: true }),
    ]);

  if (subjectError) throw new Error("Gagal memuat mata pelajaran leger: " + subjectError.message);
  if (componentError) throw new Error("Gagal memuat komponen leger: " + componentError.message);

  const { data: grades, error: gradeError } = await supabase
    .from("grades")
    .select("id,enrollment_id,assessment_component_id,tahfidz_material_id,score")
    .eq("semester", teacherContext.semester)
    .in("enrollment_id", students.map(student => student.enrollmentId));

  if (gradeError) throw new Error("Gagal memuat nilai leger: " + gradeError.message);

  const { data: materials, error: materialError } = await supabase
    .from("tahfidz_materials")
    .select("id,assessment_component_id,surah_name,surah_number,ayat_start,ayat_end,assessment_label,sequence")
    .eq("is_active", true);

  if (materialError) throw new Error("Gagal memuat materi Tahfidz: " + materialError.message);

  legerData = {
    students,
    units: buildLegerUnits(subjects ?? [], components ?? []),
    grades: grades ?? [],
    materials: materials ?? [],
  };

  renderLegerTable();
}

async function openLegerPage() {
  teacherContext = getTeacherContext();
  if (!teacherContext) {
    showEntryPage();
    return;
  }

  showLegerPage();

  try {
    await loadLegerData();
  } catch (error) {
    showError(legerError, error.message || "Gagal memuat leger.");
    legerTableHead.innerHTML = "";
    legerTableBody.innerHTML = '<tr><td class="empty-state">Gagal memuat data leger.</td></tr>';
  }
}

function showAdminPage() {
  entryPage.classList.add("hidden");
  welcomePage.classList.add("hidden");
  inputPage.classList.add("hidden");
  legerPage.classList.add("hidden");
  adminPage.classList.remove("hidden");
}

function resetTahfidzForm() {
  tahfidzEditId.value = "";
  tahfidzSurahName.value = "";
  tahfidzSurahNumber.value = "";
  tahfidzAyatStart.value = "";
  tahfidzAyatEnd.value = "";
  tahfidzAssessmentLabel.value = "";
  tahfidzSequence.value = "1";
  cancelTahfidzEdit.classList.add("hidden");
}

function clearAdminMessages() {
  clearError(adminTahfidzError);
  adminTahfidzSuccess.classList.add("hidden");
}

function showAdminError(message) {
  showError(adminTahfidzError, message);
}

async function loadAdminSelectors() {
  const [{ data: years, error: yearsError }, { data: classes, error: classesError }] =
    await Promise.all([
      supabase.from("academic_years").select("id,name").eq("is_active", true).order("name", { ascending: false }),
      supabase.from("classes").select("id,name").eq("is_active", true).order("name", { ascending: true }),
    ]);
  if (yearsError) throw new Error("Gagal memuat tahun ajaran admin: " + yearsError.message);
  if (classesError) throw new Error("Gagal memuat kelas admin: " + classesError.message);
  setSelectOptions(adminYearSelect, (years ?? []).map(item => ({ value: item.id, label: item.name })), "Pilih tahun ajaran");
  setSelectOptions(adminClassSelect, (classes ?? []).map(item => ({ value: item.id, label: item.name })), "Pilih kelas");
}

async function loadAdminTahfidz() {
  clearAdminMessages();
  resetTahfidzForm();
  tahfidzTableBody.innerHTML = '<tr><td colspan="6" class="empty-state">Memuat materi...</td></tr>';
  const yearId = adminYearSelect.value;
  const classId = adminClassSelect.value;
  if (!yearId || !classId) {
    adminTahfidzComponent = null;
    adminTahfidzMaterials = [];
    tahfidzTableBody.innerHTML = '<tr><td colspan="6" class="empty-state">Pilih tahun ajaran dan kelas.</td></tr>';
    return;
  }

  const { data: components, error: componentError } = await supabase
    .from("assessment_components")
    .select("id,name,assessment_type,sequence")
    .eq("academic_year_id", yearId)
    .eq("class_id", classId)
    .eq("assessment_type", "tahfidz")
    .eq("is_active", true)
    .order("sequence", { ascending: true })
    .limit(1);

  if (componentError) throw new Error("Gagal memuat komponen Tahfidz: " + componentError.message);
  adminTahfidzComponent = components?.[0] ?? null;

  if (!adminTahfidzComponent) {
    adminTahfidzMaterials = [];
    tahfidzTableBody.innerHTML = '<tr><td colspan="6" class="empty-state">Komponen Tahfidz belum tersedia untuk kelas ini.</td></tr>';
    return;
  }

  const { data, error } = await supabase
    .from("tahfidz_materials")
    .select("id,surah_name,surah_number,ayat_start,ayat_end,assessment_label,sequence,is_active")
    .eq("assessment_component_id", adminTahfidzComponent.id)
    .eq("is_active", true)
    .order("sequence", { ascending: true });

  if (error) throw new Error("Gagal memuat materi Tahfidz: " + error.message);
  adminTahfidzMaterials = data ?? [];
  renderAdminTahfidz();
}

function renderAdminTahfidz() {
  if (!adminTahfidzMaterials.length) {
    tahfidzTableBody.innerHTML = '<tr><td colspan="6" class="empty-state">Belum ada materi Tahfidz.</td></tr>';
    return;
  }
  tahfidzTableBody.innerHTML = adminTahfidzMaterials.map((item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(item.surah_name)}${item.surah_number ? ` <span class="student-meta">(${item.surah_number})</span>` : ""}</td>
      <td>${item.ayat_start}–${item.ayat_end}</td>
      <td>${escapeHtml(item.assessment_label)}</td>
      <td>${item.sequence}</td>
      <td><div class="row-actions">
        <button type="button" class="secondary-button edit-tahfidz" data-id="${item.id}">Edit</button>
        <button type="button" class="danger-button delete-tahfidz" data-id="${item.id}">Nonaktifkan</button>
      </div></td>
    </tr>
  `).join("");
  document.querySelectorAll(".edit-tahfidz").forEach(button => button.addEventListener("click", () => startTahfidzEdit(button.dataset.id)));
  document.querySelectorAll(".delete-tahfidz").forEach(button => button.addEventListener("click", () => deactivateTahfidz(button.dataset.id)));
}

function startTahfidzEdit(id) {
  const item = adminTahfidzMaterials.find(row => row.id === id);
  if (!item) return;
  tahfidzEditId.value = item.id;
  tahfidzSurahName.value = item.surah_name;
  tahfidzSurahNumber.value = item.surah_number ?? "";
  tahfidzAyatStart.value = item.ayat_start;
  tahfidzAyatEnd.value = item.ayat_end;
  tahfidzAssessmentLabel.value = item.assessment_label;
  tahfidzSequence.value = item.sequence;
  cancelTahfidzEdit.classList.remove("hidden");
  tahfidzSurahName.focus();
}

tahfidzForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearAdminMessages();
  if (!adminTahfidzComponent) {
    showAdminError("Pilih tahun ajaran dan kelas yang memiliki komponen Tahfidz.");
    return;
  }
  const surahName = tahfidzSurahName.value.trim();
  const surahNumber = Number(tahfidzSurahNumber.value);
  const ayatStart = Number(tahfidzAyatStart.value);
  const ayatEnd = Number(tahfidzAyatEnd.value);
  const assessmentLabel = tahfidzAssessmentLabel.value.trim();
  const sequence = Number(tahfidzSequence.value);
  if (!surahName || !Number.isInteger(surahNumber) || surahNumber < 1 || surahNumber > 114 ||
      !Number.isInteger(ayatStart) || ayatStart < 1 ||
      !Number.isInteger(ayatEnd) || ayatEnd < ayatStart ||
      !assessmentLabel || !Number.isInteger(sequence) || sequence < 1) {
    showAdminError("Lengkapi data dengan benar. Ayat akhir harus sama atau lebih besar dari ayat mulai.");
    return;
  }
  const payload = {
    assessment_component_id: adminTahfidzComponent.id,
    surah_name: surahName,
    surah_number: surahNumber,
    ayat_start: ayatStart,
    ayat_end: ayatEnd,
    assessment_label: assessmentLabel,
    sequence,
    is_active: true,
  };
  const id = tahfidzEditId.value;
  const { error } = id
    ? await supabase.from("tahfidz_materials").update(payload).eq("id", id)
    : await supabase.from("tahfidz_materials").insert(payload);
  if (error) {
    showAdminError("Gagal menyimpan materi Tahfidz: " + error.message);
    return;
  }
  adminTahfidzSuccess.textContent = id ? "Materi Tahfidz berhasil diperbarui." : "Materi Tahfidz berhasil ditambahkan.";
  adminTahfidzSuccess.classList.remove("hidden");
  resetTahfidzForm();
  await loadAdminTahfidz();
});

cancelTahfidzEdit.addEventListener("click", resetTahfidzForm);

async function deactivateTahfidz(id) {
  const item = adminTahfidzMaterials.find(row => row.id === id);
  if (!item) return;
  if (!window.confirm("Nonaktifkan materi " + item.surah_name + " ayat " + item.ayat_start + "–" + item.ayat_end + "?")) return;
  clearAdminMessages();
  const { error } = await supabase.from("tahfidz_materials").update({ is_active: false }).eq("id", id);
  if (error) {
    showAdminError("Gagal menonaktifkan materi Tahfidz: " + error.message);
    return;
  }
  adminTahfidzSuccess.textContent = "Materi Tahfidz berhasil dinonaktifkan.";
  adminTahfidzSuccess.classList.remove("hidden");
  await loadAdminTahfidz();
}

function resetFiqihForm() {
  fiqihEditId.value = "";
  fiqihAssessmentLabel.value = "";
  fiqihMaterialName.value = "";
  fiqihSequence.value = "1";
  cancelFiqihEdit.classList.add("hidden");
}

async function loadAdminFiqih() {
  const yearId = adminYearSelect.value;
  const classId = adminClassSelect.value;
  if (!yearId || !classId) {
    adminFiqihSubject = null;
    adminFiqihComponents = [];
    fiqihTableBody.innerHTML = '<tr><td colspan="4" class="empty-state">Pilih tahun ajaran dan kelas.</td></tr>';
    return;
  }

  const { data: subject, error: subjectError } = await supabase
    .from("subjects")
    .select("id,name")
    .eq("name", "Fiqih Ibadah")
    .eq("is_active", true)
    .maybeSingle();

  if (subjectError) throw new Error("Gagal memuat mata pelajaran Fiqih Ibadah: " + subjectError.message);
  adminFiqihSubject = subject;

  if (!adminFiqihSubject) {
    adminFiqihComponents = [];
    fiqihTableBody.innerHTML = '<tr><td colspan="4" class="empty-state">Mata pelajaran Fiqih Ibadah belum tersedia.</td></tr>';
    return;
  }

  const { data, error } = await supabase
    .from("assessment_components")
    .select("id,name,assessment_type,sequence,is_active")
    .eq("academic_year_id", yearId)
    .eq("class_id", classId)
    .eq("subject_id", adminFiqihSubject.id)
    .eq("is_active", true)
    .order("sequence", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw new Error("Gagal memuat komponen Fiqih: " + error.message);
  adminFiqihComponents = data ?? [];
  renderAdminFiqih();
}

function renderAdminFiqih() {
  if (!adminFiqihComponents.length) {
    fiqihTableBody.innerHTML = '<tr><td colspan="4" class="empty-state">Belum ada komponen Fiqih Ibadah.</td></tr>';
    return;
  }

  fiqihTableBody.innerHTML = adminFiqihComponents.map((item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(item.name)}</td>
      <td>${item.sequence}</td>
      <td><div class="row-actions">
        <button type="button" class="secondary-button edit-fiqih" data-id="${item.id}">Edit</button>
        <button type="button" class="danger-button delete-fiqih" data-id="${item.id}">Nonaktifkan</button>
      </div></td>
    </tr>
  `).join("");

  document.querySelectorAll(".edit-fiqih").forEach(button =>
    button.addEventListener("click", () => startFiqihEdit(button.dataset.id))
  );
  document.querySelectorAll(".delete-fiqih").forEach(button =>
    button.addEventListener("click", () => deactivateFiqih(button.dataset.id))
  );
}

function startFiqihEdit(id) {
  const item = adminFiqihComponents.find(row => row.id === id);
  if (!item) return;

  const separator = " — ";
  const parts = item.name.split(separator);
  fiqihEditId.value = item.id;
  fiqihAssessmentLabel.value = parts.length > 1 ? parts[0].trim() : item.name;
  fiqihMaterialName.value = parts.length > 1 ? parts.slice(1).join(separator).trim() : "";
  fiqihSequence.value = item.sequence;
  cancelFiqihEdit.classList.remove("hidden");
  fiqihAssessmentLabel.focus();
}

fiqihForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearAdminMessages();

  if (!adminFiqihSubject || !adminYearSelect.value || !adminClassSelect.value) {
    showAdminError("Pilih tahun ajaran dan kelas terlebih dahulu.");
    return;
  }

  const label = fiqihAssessmentLabel.value.trim();
  const material = fiqihMaterialName.value.trim();
  const sequence = Number(fiqihSequence.value);

  if (!label || !material || !Number.isInteger(sequence) || sequence < 1) {
    showAdminError("Label penilaian, materi Fiqih, dan urutan wajib diisi dengan benar.");
    return;
  }

  const payload = {
    academic_year_id: adminYearSelect.value,
    class_id: adminClassSelect.value,
    subject_id: adminFiqihSubject.id,
    name: label + " — " + material,
    assessment_type: "standard",
    sequence,
    is_active: true,
  };

  const id = fiqihEditId.value;
  const { error } = id
    ? await supabase.from("assessment_components").update(payload).eq("id", id)
    : await supabase.from("assessment_components").insert(payload);

  if (error) {
    showAdminError("Gagal menyimpan komponen Fiqih: " + error.message);
    return;
  }

  adminTahfidzSuccess.textContent = id
    ? "Komponen Fiqih berhasil diperbarui."
    : "Komponen Fiqih berhasil ditambahkan.";
  adminTahfidzSuccess.classList.remove("hidden");
  resetFiqihForm();
  await loadAdminFiqih();
});

cancelFiqihEdit.addEventListener("click", resetFiqihForm);

async function deactivateFiqih(id) {
  const item = adminFiqihComponents.find(row => row.id === id);
  if (!item) return;
  if (!window.confirm("Nonaktifkan komponen " + item.name + "?")) return;

  clearAdminMessages();
  const { error } = await supabase
    .from("assessment_components")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    showAdminError("Gagal menonaktifkan komponen Fiqih: " + error.message);
    return;
  }

  adminTahfidzSuccess.textContent = "Komponen Fiqih berhasil dinonaktifkan.";
  adminTahfidzSuccess.classList.remove("hidden");
  await loadAdminFiqih();
}

async function openAdminPage() {
  try {
    showAdminPage();
    await loadAdminSelectors();
    await loadAdminTahfidz();
    await loadAdminFiqih();
  } catch (error) {
    showAdminError(error.message || "Gagal memuat halaman admin.");
  }
}

async function adminLogout() {
  await supabase.auth.signOut();
  adminPage.classList.add("hidden");
  showEntryPage();
}

function showError(element, message) {
  element.textContent = message;
  element.classList.remove("hidden");
}

function clearError(element) {
  element.textContent = "";
  element.classList.add("hidden");
}

function showSuccess(message) {
  inputSuccess.textContent = message;
  inputSuccess.classList.remove("hidden");
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
  inputPage.classList.add("hidden");
  legerPage.classList.add("hidden");
}

function showWelcomePage(context) {
  entryPage.classList.add("hidden");
  welcomePage.classList.remove("hidden");
  inputPage.classList.add("hidden");
  legerPage.classList.add("hidden");

  classBadge.textContent = context.className;
  contextSummary.innerHTML =
    "<strong>Tahun Ajaran:</strong> " + escapeHtml(context.academicYear) + "<br>" +
    "<strong>Semester:</strong> " + escapeHtml(context.semester) + "<br>" +
    "<strong>Kelas:</strong> " + escapeHtml(context.className);

  const quote = getRandomQuote();
  quoteText.textContent = quote.text;
  quoteAuthor.textContent = "— " + quote.author;
}

function showInputPage() {
  entryPage.classList.add("hidden");
  welcomePage.classList.add("hidden");
  inputPage.classList.remove("hidden");
  legerPage.classList.add("hidden");
  inputContext.textContent =
    teacherContext.className + " • " +
    teacherContext.semester + " • " +
    teacherContext.academicYear;
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
  setSelectOptions(yearSelect, [], "Memuat tahun ajaran...");
  setSelectOptions(classSelect, [], "Memuat kelas...");

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

  if (yearsError) throw new Error("Gagal memuat tahun ajaran: " + yearsError.message);
  if (classesError) throw new Error("Gagal memuat kelas: " + classesError.message);
  if (!years?.length) throw new Error("Belum ada tahun ajaran aktif.");
  if (!classes?.length) throw new Error("Belum ada kelas aktif.");

  setSelectOptions(yearSelect, years.map((item) => ({ value: item.id, label: item.name })), "Pilih tahun ajaran");
  setSelectOptions(classSelect, classes.map((item) => ({ value: item.id, label: item.name })), "Pilih kelas");
}

async function validateClassEnrollment(academicYearId, classId) {
  const { data, error } = await supabase.rpc("check_class_has_students", {
    p_academic_year_id: academicYearId,
    p_class_id: classId,
  });
  if (error) throw new Error("Gagal memeriksa data siswa kelas: " + error.message);
  return data === true;
}

async function loadSubjects() {
  setSelectOptions(subjectSelect, [], "Memuat mata pelajaran...");
  setSelectOptions(componentSelect, [], "Pilih mata pelajaran");
  componentSelect.disabled = true;
  materialField.classList.add("hidden");
  materialSelect.innerHTML = "";
  currentComponents = [];
  currentMaterials = [];
  currentGrades = new Map();
  renderGradeRows(false);

  const { data, error } = await supabase
    .from("subjects")
    .select("id,name,subject_type")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw new Error("Gagal memuat mata pelajaran: " + error.message);
  if (!data?.length) throw new Error("Belum ada mata pelajaran aktif.");

  setSelectOptions(subjectSelect, data.map((item) => ({
    value: item.id,
    label: item.name,
  })), "Pilih mata pelajaran");
}

async function loadStudents() {
  const { data, error } = await supabase
    .from("student_enrollments")
    .select("id,student_id,students(id,name,nis)")
    .eq("academic_year_id", teacherContext.academicYearId)
    .eq("class_id", teacherContext.classId)
    .eq("is_active", true)
    .order("student_id", { ascending: true });

  if (error) throw new Error("Gagal memuat siswa: " + error.message);

  students = (data ?? [])
    .map((row) => ({
      enrollmentId: row.id,
      studentId: row.student_id,
      name: row.students?.name ?? "Tanpa nama",
      nis: row.students?.nis ?? "",
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "id"));

  if (!students.length) throw new Error("Belum ada siswa aktif di kelas ini.");
}

async function loadComponents(subjectId) {
  clearError(inputError);
  inputSuccess.classList.add("hidden");
  setSelectOptions(componentSelect, [], "Memuat komponen...");
  componentSelect.disabled = true;
  materialField.classList.add("hidden");
  materialSelect.innerHTML = "";
  currentMaterials = [];
  renderGradeRows(false);

  const { data, error } = await supabase
    .from("assessment_components")
    .select("id,name,assessment_type,sequence")
    .eq("academic_year_id", teacherContext.academicYearId)
    .eq("class_id", teacherContext.classId)
    .eq("subject_id", subjectId)
    .eq("is_active", true)
    .order("sequence", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw new Error("Gagal memuat komponen penilaian: " + error.message);

  currentComponents = data ?? [];

  if (!currentComponents.length) {
    setSelectOptions(componentSelect, [], "Belum ada komponen penilaian");
    return;
  }

  setSelectOptions(
    componentSelect,
    currentComponents.map((item) => ({ value: item.id, label: item.name })),
    "Pilih komponen penilaian"
  );
  componentSelect.disabled = false;
}

async function loadMaterials(componentId) {
  const component = currentComponents.find((item) => item.id === componentId);
  materialField.classList.add("hidden");
  materialSelect.innerHTML = "";
  currentMaterials = [];

  if (!component || component.assessment_type !== "tahfidz") return;

  const { data, error } = await supabase
    .from("tahfidz_materials")
    .select("id,surah_name,surah_number,ayat_start,ayat_end,assessment_label,sequence")
    .eq("assessment_component_id", componentId)
    .eq("is_active", true)
    .order("sequence", { ascending: true });

  if (error) throw new Error("Gagal memuat materi Tahfidz: " + error.message);
  currentMaterials = data ?? [];

  if (!currentMaterials.length) {
    throw new Error("Komponen Tahfidz ini belum memiliki materi/ayat yang ditetapkan.");
  }

  setSelectOptions(
    materialSelect,
    currentMaterials.map((item) => ({
      value: item.id,
      label: item.assessment_label + " — " + item.surah_name + " ayat " + item.ayat_start + "–" + item.ayat_end,
    })),
    "Pilih materi Tahfidz"
  );
  materialField.classList.remove("hidden");
}

async function loadGrades() {
  clearError(inputError);
  inputSuccess.classList.add("hidden");

  const componentId = componentSelect.value;
  if (!componentId) {
    renderGradeRows(false);
    return;
  }

  const component = currentComponents.find((item) => item.id === componentId);
  const materialId = component?.assessment_type === "tahfidz" ? materialSelect.value : null;

  if (component?.assessment_type === "tahfidz" && !materialId) {
    renderGradeRows(false);
    return;
  }

  let query = supabase
    .from("grades")
    .select("id,enrollment_id,score,tahfidz_material_id")
    .eq("semester", teacherContext.semester)
    .eq("assessment_component_id", componentId);

  query = materialId ? query.eq("tahfidz_material_id", materialId) : query.is("tahfidz_material_id", null);

  const { data, error } = await query;
  if (error) throw new Error("Gagal memuat nilai: " + error.message);

  currentGrades = new Map((data ?? []).map((row) => [row.enrollment_id, row]));
  renderGradeRows(true);
}

function renderGradeRows(enabled) {
  if (!students.length) {
    gradeTableBody.innerHTML = '<tr><td colspan="3" class="empty-state">Belum ada siswa.</td></tr>';
    saveGradesButton.disabled = true;
    return;
  }

  if (!enabled) {
    gradeTableBody.innerHTML = '<tr><td colspan="3" class="empty-state">Pilih komponen penilaian untuk menampilkan kolom nilai.</td></tr>';
    saveGradesButton.disabled = true;
    return;
  }

  gradeTableBody.innerHTML = students.map((student, index) => {
    const existing = currentGrades.get(student.enrollmentId);
    const value = existing?.score ?? "";
    return `
      <tr>
        <td>${index + 1}</td>
        <td>
          <strong>${escapeHtml(student.name)}</strong>
          ${student.nis ? `<div class="student-meta">${escapeHtml(student.nis)}</div>` : ""}
        </td>
        <td>
          <input
            class="score-input"
            type="number"
            min="0"
            max="100"
            step="0.01"
            inputmode="decimal"
            data-enrollment-id="${student.enrollmentId}"
            value="${value}"
            aria-label="Nilai ${escapeHtml(student.name)}"
          />
        </td>
      </tr>
    `;
  }).join("");

  saveGradesButton.disabled = false;
}

async function saveGrades() {
  clearError(inputError);
  inputSuccess.classList.add("hidden");

  const componentId = componentSelect.value;
  if (!componentId) {
    showError(inputError, "Pilih komponen penilaian terlebih dahulu.");
    return;
  }

  const component = currentComponents.find((item) => item.id === componentId);
  const materialId = component?.assessment_type === "tahfidz" ? materialSelect.value : null;

  if (component?.assessment_type === "tahfidz" && !materialId) {
    showError(inputError, "Pilih materi Tahfidz terlebih dahulu.");
    return;
  }

  const inputs = [...document.querySelectorAll(".score-input")];
  const rows = [];

  for (const input of inputs) {
    const raw = input.value.trim();
    if (raw === "") continue;

    const score = Number(raw);
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      showError(inputError, "Semua nilai harus berada di antara 0 dan 100.");
      input.focus();
      return;
    }

    rows.push({
      enrollmentId: input.dataset.enrollmentId,
      score: Number(score.toFixed(2)),
    });
  }

  if (!rows.length) {
    showError(inputError, "Masukkan minimal satu nilai sebelum menyimpan.");
    return;
  }

  saveGradesButton.disabled = true;
  saveGradesButton.textContent = "Menyimpan...";

  try {
    for (const row of rows) {
      const existing = currentGrades.get(row.enrollmentId);

      if (existing) {
        const { error } = await supabase
          .from("grades")
          .update({ score: row.score })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const payload = {
          enrollment_id: row.enrollmentId,
          semester: teacherContext.semester,
          subject_id: subjectSelect.value,
          assessment_component_id: componentId,
          tahfidz_material_id: materialId,
          score: row.score,
        };

        const { error } = await supabase.from("grades").insert(payload);
        if (error) throw error;
      }
    }

    await loadGrades();
    showSuccess("Nilai berhasil disimpan.");
  } catch (error) {
    showError(inputError, "Gagal menyimpan nilai: " + error.message);
  } finally {
    saveGradesButton.disabled = false;
    saveGradesButton.textContent = "Simpan Nilai";
  }
}

async function openInputPage() {
  teacherContext = getTeacherContext();
  if (!teacherContext) {
    showEntryPage();
    return;
  }

  showInputPage();
  clearError(inputError);
  inputSuccess.classList.add("hidden");

  try {
    await loadSubjects();
    await loadStudents();
  } catch (error) {
    showError(inputError, error.message || "Gagal memuat data Input Nilai.");
  }
}

subjectSelect.addEventListener("change", async () => {
  clearImportPanel();
  try {
    await loadComponents(subjectSelect.value);
  } catch (error) {
    showError(inputError, error.message || "Gagal memuat komponen.");
  }
});

componentSelect.addEventListener("change", async () => {
  clearImportPanel();
  try {
    await loadMaterials(componentSelect.value);
    await loadGrades();
  } catch (error) {
    showError(inputError, error.message || "Gagal memuat data penilaian.");
  }
});

materialSelect.addEventListener("change", async () => {
  clearImportPanel();
  try {
    await loadGrades();
  } catch (error) {
    showError(inputError, error.message || "Gagal memuat nilai Tahfidz.");
  }
});

saveGradesButton.addEventListener("click", saveGrades);

document.querySelector("#grade-file-input").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (file) await processImportFile(file);
});

document.querySelector("#confirm-import-button").addEventListener("click", confirmImport);
document.querySelector("#cancel-import-button").addEventListener("click", clearImportPanel);
document.querySelector("#download-template-button").addEventListener("click", downloadTemplate);

inputGradeButton.addEventListener("click", openInputPage);
legerButton.addEventListener("click", openLegerPage);
legerBackButton.addEventListener("click", () => {
  if (teacherContext) showWelcomePage(teacherContext);
  else showEntryPage();
});
legerStsTab.addEventListener("click", () => {
  legerMode = "STS";
  legerStsTab.className = "primary-button";
  legerSasTab.className = "secondary-button";
  renderLegerTable();
});
legerSasTab.addEventListener("click", () => {
  legerMode = "SAS";
  legerStsTab.className = "secondary-button";
  legerSasTab.className = "primary-button";
  renderLegerTable();
});

inputBackButton.addEventListener("click", () => {
  if (teacherContext) showWelcomePage(teacherContext);
  else showEntryPage();
});

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
      showError(entryError, "Kelas ini belum memiliki data siswa aktif pada tahun ajaran yang dipilih.");
      return;
    }

    teacherContext = {
      academicYearId,
      academicYear,
      semester,
      classId,
      className,
    };

    saveTeacherContext(teacherContext);
    showWelcomePage(teacherContext);
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

adminForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError(adminError);
  const password = adminPassword.value;
  if (!password) {
    showError(adminError, "Masukkan password admin.");
    return;
  }
  const submitButton = adminForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = "Memeriksa...";
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: ADMIN_CONFIG.email,
      password,
    });
    if (error) throw error;
    closeAdminModal();
    await openAdminPage();
  } catch (error) {
    showError(adminError, "Login admin gagal. Periksa password admin.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Masuk";
  }
});

adminYearSelect.addEventListener("change", async () => {
  try {
    await loadAdminTahfidz();
    await loadAdminFiqih();
  } catch (error) {
    showAdminError(error.message);
  }
});
adminClassSelect.addEventListener("change", async () => {
  try {
    await loadAdminTahfidz();
    await loadAdminFiqih();
  } catch (error) {
    showAdminError(error.message);
  }
});
adminLogoutButton.addEventListener("click", adminLogout);

backButton.addEventListener("click", () => {
  clearTeacherContext();
  teacherContext = null;
  showEntryPage();
});

(async function init() {
  try {
    await loadEntryData();

    const saved = getTeacherContext();
    if (saved?.academicYearId && saved?.semester && saved?.classId) {
      const matchingYear = [...yearSelect.options].some((option) => option.value === saved.academicYearId);
      const matchingClass = [...classSelect.options].some((option) => option.value === saved.classId);

      if (matchingYear && matchingClass) {
        teacherContext = saved;
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
