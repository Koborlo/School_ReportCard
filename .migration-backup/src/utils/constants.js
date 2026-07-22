// src/utils/constants.js

export const SCHOOL_NAME = "Gaddiel Aquaah Methodist 'A' Basic School";
export const SCHOOL_TEL  = "0244128878";
export const SCHOOL_CIRCUIT = "Tarkwa";
export const SCHOOL_POSTAL  = "P.O. BOX 169 Tarkwa";

export const CLASSES = [
  { code: "B7", label: "Basic 7", alias: "JHS 1" },
  { code: "B8", label: "Basic 8", alias: "JHS 2" },
  { code: "B9", label: "Basic 9", alias: "JHS 3" },
];

export const DEFAULT_SUBJECTS = [
  { code: "EN",  name: "English Language",        category: "Language" },
  { code: "MA",  name: "Mathematics",             category: "Mathematics" },
  { code: "SC",  name: "Science",                 category: "Science" },
  { code: "SS",  name: "Social Studies",          category: "Social Studies" },
  { code: "CT",  name: "Career Technology",       category: "Vocational" },
  { code: "RME", name: "Rel. & Moral Education",  category: "Moral" },
  { code: "GH",  name: "Ghanaian Language",       category: "Language" },
  { code: "CA",  name: "Creative Art & Design",   category: "Arts" },
  { code: "PE",  name: "Physical Edu. & Health",  category: "Health" },
  { code: "FR",  name: "French",                  category: "Language" },
];

export const TASK_MAX = { t1: 30, t2: 20, t3: 30, t4: 20 };
export const SBA_PCT  = 50;
export const EXAM_PCT = 50;

export const GRADE_SCALE = [
  { grade: "1", min: 80, max: 100, level: "Highly Proficient",            remark: "Excellent",   color: "#1B5E20", bg: "#E8F5E9" },
  { grade: "2", min: 70, max: 79,  level: "Proficient",                   remark: "Very Good",   color: "#1B5E20", bg: "#E8F5E9" },
  { grade: "3", min: 60, max: 69,  level: "Proficient",                   remark: "Good",        color: "#33691E", bg: "#DCEDC8" },
  { grade: "4", min: 50, max: 59,  level: "Approaching Proficiency",      remark: "Credit",      color: "#827717", bg: "#FFF9C4" },
  { grade: "5", min: 40, max: 49,  level: "Developing",                   remark: "Pass",        color: "#E65100", bg: "#FFF3E0" },
  { grade: "6", min: 30, max: 39,  level: "Emerging",                     remark: "Weak Pass",   color: "#B71C1C", bg: "#FFEBEE" },
  { grade: "7", min: 0,  max: 29,  level: "Beginning",                    remark: "Fail",        color: "#B71C1C", bg: "#FFCDD2" },
];

export const ROLES = {
  ADMIN:   "admin",
  TEACHER: "teacher",
};

// ── Calculation helpers ──────────────────────────────────────────────────────
export function calcSBATotal(marks) {
  const { t1 = "", t2 = "", t3 = "", t4 = "" } = marks;
  if (t1 === "" && t2 === "" && t3 === "" && t4 === "") return "";
  return (Number(t1||0) + Number(t2||0) + Number(t3||0) + Number(t4||0));
}

export function calcWeightedTotal(marks) {
  const sba  = calcSBATotal(marks);
  const exam = marks.ex;
  if (sba === "" || exam === "") return "";
  const sbaPct  = Math.round((sba  / 100) * SBA_PCT  * 10) / 10;
  const examPct = Math.round((Number(exam) / 100) * EXAM_PCT * 10) / 10;
  return Math.round((sbaPct + examPct) * 10) / 10;
}

export function calcGrade(total) {
  if (total === "") return null;
  return GRADE_SCALE.find(g => total >= g.min && total <= g.max) || null;
}

export function calcPosition(scores, myScore) {
  if (myScore === "") return "";
  const valid = scores.filter(s => s !== "" && s !== null && s !== undefined);
  const rank  = valid.filter(s => Number(s) > Number(myScore)).length + 1;
  return rank;
}

export function ordinal(n) {
  if (!n) return "";
  const s = ["th","st","nd","rd"];
  const v = n % 100;
  return n + (s[(v-20)%10] || s[v] || s[0]);
}
