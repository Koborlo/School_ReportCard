// src/components/teacher/MarkSheet.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import {
  subscribeMarks, saveMark, getStudents,
} from "../../utils/db";
import {
  calcSBATotal, calcWeightedTotal, calcGrade, TASK_MAX, GRADE_SCALE,
} from "../../utils/constants";

const FIELDS = [
  { key: "t1", label: "Task 1", max: 30 },
  { key: "t2", label: "Task 2", max: 20 },
  { key: "t3", label: "Task 3", max: 30 },
  { key: "t4", label: "Task 4", max: 20 },
];

function GradeBadge({ total }) {
  const g = calcGrade(total);
  if (!g) return <span>—</span>;
  return (
    <span className="grade-badge" style={{ background: g.bg, color: g.color }}>
      {g.grade}
    </span>
  );
}

function ProficiencyCell({ total }) {
  const g = calcGrade(total);
  if (!g) return <span style={{ color: "var(--mut)" }}>—</span>;
  return (
    <span style={{ fontSize: 10, color: g.color }}>
      {g.level} ({g.remark})
    </span>
  );
}

export default function MarkSheet({ termId, classCode, classLabel, subjectCode, subjectName }) {
  const [students, setStudents] = useState([]);
  const [marks,    setMarks]    = useState({});
  const [errors,   setErrors]   = useState({});
  const [saving,   setSaving]   = useState({});   // { studentId: bool }
  const [loading,  setLoading]  = useState(true);
  const [liveCount, setLiveCount] = useState(0);
  const saveTimers = useRef({});

  // Load students
  useEffect(() => {
    if (!termId || !classCode) return;
    getStudents(termId, classCode).then(list => setStudents(list));
  }, [termId, classCode]);

  // Real-time marks subscription
  useEffect(() => {
    if (!termId || !classCode || !subjectCode) return;
    setLoading(true);
    const unsub = subscribeMarks(termId, classCode, subjectCode, (data) => {
      setMarks(data);
      setLiveCount(Object.keys(data).length);
      setLoading(false);
    });
    return () => unsub();
  }, [termId, classCode, subjectCode]);

  // Debounced auto-save per student
  const scheduleSave = useCallback((studentId, newMark) => {
    clearTimeout(saveTimers.current[studentId]);
    setSaving(prev => ({ ...prev, [studentId]: true }));
    saveTimers.current[studentId] = setTimeout(async () => {
      try {
        await saveMark(termId, classCode, subjectCode, studentId, newMark);
        setSaving(prev => ({ ...prev, [studentId]: false }));
      } catch {
        toast.error("Save failed — check your connection");
        setSaving(prev => ({ ...prev, [studentId]: false }));
      }
    }, 800);
  }, [termId, classCode, subjectCode]);

  function handleMarkChange(studentId, field, rawVal) {
    const max   = TASK_MAX[field] || 100;
    const val   = rawVal === "" ? "" : Number(rawVal);
    const errKey = `${studentId}-${field}`;

    if (rawVal !== "" && (isNaN(val) || val < 0 || val > max)) {
      setErrors(prev => ({ ...prev, [errKey]: `Max ${max}` }));
      return;
    }
    setErrors(prev => { const n = { ...prev }; delete n[errKey]; return n; });

    const current = marks[studentId] || {};
    const updated = { ...current, [field]: val };
    setMarks(prev => ({ ...prev, [studentId]: updated }));
    scheduleSave(studentId, updated);
  }

  // Stats
  const filled   = students.filter(s => {
    const m = marks[s.id] || {};
    return m.t1 !== "" && m.t1 !== undefined && m.ex !== "" && m.ex !== undefined;
  }).length;

  const totals   = students.map(s => calcWeightedTotal(marks[s.id] || {})).filter(t => t !== "");
  const classAvg = totals.length
    ? Math.round((totals.reduce((a, b) => a + b, 0) / totals.length) * 10) / 10
    : null;

  if (loading) return (
    <div className="loading-center">
      <div className="spinner" />
      <span>Loading mark sheet…</span>
    </div>
  );

  if (students.length === 0) return (
    <div className="alert alert-warn">
      No students found for {classLabel}. Ask your administrator to add students first.
    </div>
  );

  const accentColor = classCode === "B7" ? "var(--b7)" : classCode === "B8" ? "var(--b8)" : "var(--b9)";

  return (
    <div>
      {/* Header strip */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 16px", background: "#fff",
        border: "1px solid var(--bdr)", borderRadius: "var(--radius-lg)",
        marginBottom: 12,
      }}>
        <div style={{ width: 6, height: 40, borderRadius: 4, background: accentColor, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--dg)" }}>
            {classLabel} — {subjectName}
          </div>
          <div style={{ fontSize: 11, color: "var(--mut)", marginTop: 2 }}>
            {students.length} students · {filled} filled · Yellow cells are editable
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "var(--mut)" }}>Completion</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: accentColor }}>
              {students.length ? Math.round(filled / students.length * 100) : 0}%
            </div>
          </div>
          {classAvg !== null && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "var(--mut)" }}>Class Avg</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--dg)" }}>{classAvg}</div>
            </div>
          )}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "var(--mut)" }}>Live updates</div>
            <span className="chip chip-green" style={{ fontSize: 10 }}>
              <span className="live-dot" /> Syncing
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-bar" style={{ marginBottom: 14, height: 4 }}>
        <div className="progress-fill" style={{
          width: `${students.length ? filled / students.length * 100 : 0}%`,
          background: accentColor,
        }} />
      </div>

      {/* Instructions */}
      <div className="alert alert-info" style={{ marginBottom: 12 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
        Marks auto-save as you type. Other users see changes in real time. SBA total, weighted scores, grade and proficiency level calculate automatically.
      </div>

      {/* Table */}
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 36 }}>#</th>
              <th style={{ textAlign: "left", minWidth: 160 }}>Student Name</th>
              <th>Task 1 <span style={{ opacity: .6, fontSize: 9 }}>/30</span></th>
              <th>Task 2 <span style={{ opacity: .6, fontSize: 9 }}>/20</span></th>
              <th>Task 3 <span style={{ opacity: .6, fontSize: 9 }}>/30</span></th>
              <th>Task 4 <span style={{ opacity: .6, fontSize: 9 }}>/20</span></th>
              <th style={{ background: "#0F5233" }}>SBA /100</th>
              <th>Exam <span style={{ opacity: .6, fontSize: 9 }}>/100</span></th>
              <th style={{ background: "#0F5233" }}>Total /100</th>
              <th>Grade</th>
              <th style={{ textAlign: "left", minWidth: 180 }}>Level of Proficiency</th>
              <th style={{ width: 50 }}>Saved</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, idx) => {
              const m    = marks[student.id] || {};
              const sba  = calcSBATotal(m);
              const tot  = calcWeightedTotal(m);
              const isSaving = saving[student.id];

              return (
                <tr key={student.id}>
                  <td>{idx + 1}</td>
                  <td style={{ textAlign: "left", fontWeight: 500 }}>{student.name}</td>

                  {/* Task inputs */}
                  {["t1","t2","t3","t4"].map(field => {
                    const errKey = `${student.id}-${field}`;
                    const hasErr = !!errors[errKey];
                    return (
                      <td key={field}>
                        <input
                          className={`mark-input${hasErr ? " error" : ""}`}
                          type="number" min="0" max={TASK_MAX[field]}
                          value={m[field] ?? ""}
                          placeholder="—"
                          title={hasErr ? errors[errKey] : `Max ${TASK_MAX[field]}`}
                          onChange={e => handleMarkChange(student.id, field, e.target.value)}
                        />
                      </td>
                    );
                  })}

                  {/* SBA auto */}
                  <td className="calc-cell">{sba !== "" ? sba : "—"}</td>

                  {/* Exam input */}
                  <td>
                    <input
                      className={`mark-input${errors[`${student.id}-ex`] ? " error" : ""}`}
                      type="number" min="0" max="100"
                      value={m.ex ?? ""}
                      placeholder="—"
                      onChange={e => handleMarkChange(student.id, "ex", e.target.value)}
                    />
                  </td>

                  {/* Total auto */}
                  <td className="calc-cell" style={{ fontWeight: 700, fontSize: 12 }}>
                    {tot !== "" ? tot : "—"}
                  </td>

                  {/* Grade */}
                  <td><GradeBadge total={tot} /></td>

                  {/* Proficiency */}
                  <td style={{ textAlign: "left" }}>
                    <ProficiencyCell total={tot} />
                  </td>

                  {/* Save status */}
                  <td>
                    {isSaving ? (
                      <div style={{ width: 14, height: 14, border: "2px solid var(--bdr)", borderTopColor: "var(--mg)", borderRadius: "50%", animation: "spin .7s linear infinite", margin: "0 auto" }} />
                    ) : (m.t1 !== undefined || m.ex !== undefined) ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--mg)" strokeWidth="2.5" style={{ display: "block", margin: "0 auto" }}>
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer legend */}
      <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
        {GRADE_SCALE.map(g => (
          <span key={g.grade} className="grade-badge" style={{ background: g.bg, color: g.color }}>
            Grade {g.grade}: {g.min}–{g.max} ({g.remark})
          </span>
        ))}
      </div>
    </div>
  );
}
