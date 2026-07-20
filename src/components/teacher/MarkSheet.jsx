import { useState, useEffect, useCallback, useRef, useMemo, memo } from "react";
import toast from "react-hot-toast";
import { subscribeMarks, saveMark, getStudents } from "../../utils/db";
import { calcSBATotal, calcWeightedTotal, calcGrade, TASK_MAX, GRADE_SCALE } from "../../utils/constants";

// ── Sub-components ──
const GradeBadge = memo(function GradeBadge({ total }) {
  const g = calcGrade(total);
  if (!g) return <span style={{ color: "var(--mut)" }}>—</span>;
  return <span className="grade-badge" style={{ background: g.bg, color: g.color }}>{g.grade}</span>;
});

const ProfCell = memo(function ProfCell({ total }) {
  const g = calcGrade(total);
  if (!g) return <span style={{ color: "var(--mut)" }}>—</span>;
  return <span style={{ fontSize: 10, color: g.color }}>{g.level} ({g.remark})</span>;
});

const SaveStatus = memo(function SaveStatus({ status }) {
  if (status === "saving") return (
    <div style={{
      width: 14, height: 14, border: "2px solid #D0E8DC", borderTopColor: "var(--mg)",
      borderRadius: "50%", animation: "spin .7s linear infinite", margin: "0 auto"
    }} />
  );
  if (status === "saved") return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="var(--mg)" strokeWidth="2.5" style={{ display: "block", margin: "0 auto" }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
  if (status === "error") return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="#B71C1C" strokeWidth="2.5" style={{ display: "block", margin: "0 auto" }}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
  return null;
});

// ── Constants ──
const IDLE = "idle", PENDING = "pending", SAVING = "saving", SAVED = "saved", ERROR = "error";
const FIELDS = ["t1", "t2", "t3", "t4", "ex"];
const EXAM_FIELD = "ex";

const StudentRow = memo(function StudentRow({
  student, idx, marks, inputErrors, rowStatus,
  onChange, onKeyDown, inputRef
}) {
  const m = marks || {};
  const sba = calcSBATotal(m);
  const tot = calcWeightedTotal(m);
  const status = rowStatus;

  return (
    <tr style={{ background: idx % 2 === 0 ? "#fff" : "var(--pg)" }}>
      <td>{idx + 1}</td>
      <td style={{ textAlign: "left", fontWeight: 500 }}>{student.name}</td>
      
      {["t1", "t2", "t3", "t4"].map(field => (
        <td key={field}>
          <input
            ref={el => { if (el) inputRef.current[`${student.id}-${field}`] = el; }}
            className={`mark-input${inputErrors[`${student.id}-${field}`] ? " error" : ""}`}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            min="0"
            max={TASK_MAX[field]}
            value={m[field] !== undefined && m[field] !== "" ? m[field] : ""}
            placeholder="—"
            title={`Out of ${TASK_MAX[field]}`}
            aria-label={`${student.name} ${field.toUpperCase()} out of ${TASK_MAX[field]}`}
            onChange={e => onChange(student.id, field, e.target.value)}
            onKeyDown={e => onKeyDown(e, student.id, field)}
            onWheel={e => e.target.blur()}
          />
        </td>
      ))}
      
      <td className="calc-cell" style={{ fontWeight: 700 }}>
        {sba !== "" ? sba : "—"}
      </td>
      
      <td>
        <input
          ref={el => { if (el) inputRef.current[`${student.id}-ex`] = el; }}
          className={`mark-input${inputErrors[`${student.id}-ex`] ? " error" : ""}`}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          min="0"
          max="100"
          value={m.ex !== undefined && m.ex !== "" ? m.ex : ""}
          placeholder="—"
          title="Out of 100"
          aria-label={`${student.name} Exam out of 100`}
          onChange={e => onChange(student.id, "ex", e.target.value)}
          onKeyDown={e => onKeyDown(e, student.id, "ex")}
          onWheel={e => e.target.blur()}
        />
      </td>
      
      <td className="calc-cell" style={{ fontWeight: 700, fontSize: 12 }}>
        {tot !== "" ? tot : "—"}
      </td>
      <td><GradeBadge total={tot} /></td>
      <td style={{ textAlign: "left" }}><ProfCell total={tot} /></td>
      <td><SaveStatus status={status} /></td>
    </tr>
  );
});

// ── Main Component ──
export default function MarkSheet({ termId, classCode, classLabel, subjectCode, subjectName }) {
  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState({});
  const [inputErrors, setInputErrors] = useState({});
  const [rowStatus, setRowStatus] = useState({});
  const [globalStatus, setGlobalStatus] = useState(IDLE);
  const [loading, setLoading] = useState(true);

  const saveTimers = useRef({});
  const rowStatusTimers = useRef({});
  const savedTimer = useRef(null);
  const pendingWrites = useRef(0);
  const latestMarksRef = useRef({});
  const inputRefs = useRef({});

  // Keep ref in sync for doSave
  useEffect(() => { latestMarksRef.current = marks; }, [marks]);

  // Load students
  useEffect(() => {
    if (termId && classCode) {
      getStudents(termId, classCode).then(setStudents);
    }
  }, [termId, classCode]);

  // Subscribe to marks
  useEffect(() => {
    if (!termId || !classCode || !subjectCode) return;
    setLoading(true);
    const unsub = subscribeMarks(termId, classCode, subjectCode, data => {
      setMarks(data);
      setLoading(false);
    });
    return () => unsub();
  }, [termId, classCode, subjectCode]);

  // Block tab close during saves
  useEffect(() => {
    const handler = e => {
      if (pendingWrites.current > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // Cleanup all timers on unmount
  useEffect(() => () => {
    Object.values(saveTimers.current).forEach(clearTimeout);
    Object.values(rowStatusTimers.current).forEach(clearTimeout);
    clearTimeout(savedTimer.current);
  }, []);

  const doSave = useCallback(async (studentId) => {
    pendingWrites.current++;
    setGlobalStatus(SAVING);
    setRowStatus(p => ({ ...p, [studentId]: "saving" }));

    const markData = latestMarksRef.current[studentId];

    try {
      await saveMark(termId, classCode, subjectCode, studentId, markData);
      setRowStatus(p => ({ ...p, [studentId]: "saved" }));

      clearTimeout(rowStatusTimers.current[studentId]);
      rowStatusTimers.current[studentId] = setTimeout(() => {
        setRowStatus(p => {
          if (p[studentId] === "saved") {
            const n = { ...p };
            delete n[studentId];
            return n;
          }
          return p;
        });
      }, 3000);
    } catch (err) {
      console.error("saveMark:", err);
      setRowStatus(p => ({ ...p, [studentId]: "error" }));
      setGlobalStatus(ERROR);
      toast.error("Save failed — check Firestore rules", { id: "save-err", duration: 6000 });
    } finally {
      pendingWrites.current = Math.max(0, pendingWrites.current - 1);

      if (pendingWrites.current === 0) {
        setGlobalStatus(prev => prev === ERROR ? ERROR : SAVED);
        clearTimeout(savedTimer.current);
        savedTimer.current = setTimeout(() => setGlobalStatus(IDLE), 3000);
      }
    }
  }, [termId, classCode, subjectCode]);

  const handleChange = useCallback((studentId, field, rawVal) => {
    const max = TASK_MAX[field] || 100;
    const errKey = `${studentId}-${field}`;

    if (rawVal !== "" && (isNaN(Number(rawVal)) || Number(rawVal) < 0 || Number(rawVal) > max)) {
      setInputErrors(p => ({ ...p, [errKey]: true }));
      return;
    }
    setInputErrors(p => { const n = { ...p }; delete n[errKey]; return n; });

    const val = rawVal === "" ? "" : Number(rawVal);
    const updated = { ...(marks[studentId] || {}), [field]: val };

    setMarks(p => ({ ...p, [studentId]: updated }));
    setGlobalStatus(prev => prev === ERROR ? ERROR : PENDING);

    clearTimeout(saveTimers.current[studentId]);
    saveTimers.current[studentId] = setTimeout(() => {
      doSave(studentId);
    }, 600);
  }, [marks, doSave]);

  const handleKeyDown = useCallback((e, studentId, field) => {
    const fields = FIELDS;
    const fieldIdx = fields.indexOf(field);
    const studentIdx = students.findIndex(s => s.id === studentId);

    const focus = (sid, fid) => {
      const key = `${sid}-${fid}`;
      const el = inputRefs.current[key];
      if (el) { el.focus(); el.select(); }
    };

    switch (e.key) {
      case "ArrowRight":
        if (fieldIdx < fields.length - 1) { e.preventDefault(); focus(studentId, fields[fieldIdx + 1]); }
        break;
      case "ArrowLeft":
        if (fieldIdx > 0) { e.preventDefault(); focus(studentId, fields[fieldIdx - 1]); }
        break;
      case "ArrowDown":
        if (studentIdx < students.length - 1) { e.preventDefault(); focus(students[studentIdx + 1].id, field); }
        break;
      case "ArrowUp":
        if (studentIdx > 0) { e.preventDefault(); focus(students[studentIdx - 1].id, field); }
        break;
      case "Enter":
        e.preventDefault();
        if (fieldIdx < fields.length - 1) {
          focus(studentId, fields[fieldIdx + 1]);
        } else if (studentIdx < students.length - 1) {
          focus(students[studentIdx + 1].id, fields[0]);
        }
        break;
    }
  }, [students]);

  async function saveAllNow() {
    Object.keys(saveTimers.current).forEach(id => clearTimeout(saveTimers.current[id]));
    
    const toSave = students.filter(s => {
      const local = marks[s.id];
      return local && Object.keys(local).length > 0 && Object.values(local).some(v => v !== "");
    });
    
    if (!toSave.length) {
      toast("No changes to save", { icon: "ℹ️" });
      return;
    }
    
    await Promise.all(toSave.map(st => doSave(st.id)));
    toast.success(`Saved ${toSave.length} student${toSave.length > 1 ? 's' : ''}`);
  }

  // Memoized stats
  const stats = useMemo(() => {
    const filled = students.filter(s => {
      const m = marks[s.id] || {};
      return m.t1 !== undefined && m.t1 !== "" && m.ex !== undefined && m.ex !== "";
    }).length;
    const totals = students.map(s => calcWeightedTotal(marks[s.id] || {})).filter(t => t !== "");
    const classAvg = totals.length
      ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length * 10) / 10
      : null;
    return {
      filled,
      classAvg,
      pct: students.length ? Math.round(filled / students.length * 100) : 0
    };
  }, [students, marks]);

  const accentColor = classCode === "B7" ? "var(--b7)" : classCode === "B8" ? "var(--b8)" : "var(--b9)";

  if (loading) return (
    <div className="loading-center"><div className="spinner" /><span>Loading mark sheet…</span></div>
  );
  if (students.length === 0) return (
    <div className="alert alert-warn">
      No students found for {classLabel}. Ask your administrator to add students first.
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "14px 18px", background: "#fff",
        border: "1px solid var(--bdr)", borderRadius: "var(--radius-lg)",
        marginBottom: 10,
      }}>
        <div style={{ width: 6, height: 44, borderRadius: 4, background: accentColor, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--dg)" }}>
            {classLabel} — {subjectName}
          </div>
          <div style={{ fontSize: 11, color: "var(--mut)", marginTop: 2 }}>
            {students.length} students · {stats.filled} filled · Use arrow keys to navigate
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {globalStatus === SAVING && (
            <div style={{
              display: "flex", alignItems: "center", gap: 7,
              background: "#FFF8E7", border: "1px solid #F5A623",
              borderRadius: 20, padding: "5px 14px",
              fontSize: 12, fontWeight: 500, color: "#92600A",
            }}>
              <div style={{
                width: 12, height: 12, border: "2px solid #F5A623",
                borderTopColor: "#92600A", borderRadius: "50%",
                animation: "spin .7s linear infinite", flexShrink: 0,
              }} />
              Saving…
            </div>
          )}
          {globalStatus === SAVED && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "var(--lg)", border: "1px solid var(--bdr)",
              borderRadius: 20, padding: "5px 14px",
              fontSize: 12, fontWeight: 500, color: "var(--mg)",
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="var(--mg)" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              All saved
            </div>
          )}
          {globalStatus === ERROR && (
            <div style={{
              background: "#FFEBEE", border: "1px solid #FFCDD2",
              borderRadius: 20, padding: "5px 14px",
              fontSize: 12, fontWeight: 500, color: "#B71C1C",
            }}>
              ⚠ Save failed
            </div>
          )}

          <div style={{ textAlign: "center", minWidth: 52 }}>
            <div style={{ fontSize: 10, color: "var(--mut)" }}>Done</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: accentColor }}>{stats.pct}%</div>
          </div>
          {stats.classAvg !== null && (
            <div style={{ textAlign: "center", minWidth: 52 }}>
              <div style={{ fontSize: 10, color: "var(--mut)" }}>Avg</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--dg)" }}>{stats.classAvg}</div>
            </div>
          )}
          <button className="btn btn-primary btn-sm"
            onClick={saveAllNow}
            disabled={globalStatus === SAVING}>
            {globalStatus === SAVING ? "Saving…" : "Save All"}
          </button>
        </div>
      </div>

      {/* Saving banner */}
      {globalStatus === SAVING && (
        <div style={{
          background: "#FFF8E7", border: "1.5px solid #F5A623",
          borderRadius: "var(--radius-md)", padding: "9px 16px",
          display: "flex", alignItems: "center", gap: 10,
          marginBottom: 10, fontSize: 13, color: "#7A5200", fontWeight: 500,
        }}>
          <div style={{
            width: 15, height: 15, border: "2px solid #F5A623",
            borderTopColor: "#92600A", borderRadius: "50%",
            animation: "spin .7s linear infinite", flexShrink: 0,
          }} />
          Saving — please do not navigate away until complete.
        </div>
      )}

      {/* Error guidance */}
      {globalStatus === ERROR && (
        <div className="alert alert-danger" style={{ marginBottom: 10 }}>
          <strong>⚠ Marks failed to save.</strong> Go to Firebase Console → Firestore → Rules
          and make sure <code>marksData</code> allows authenticated writes, then click Publish.
        </div>
      )}

      {/* Table */}
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 36 }}>#</th>
              <th style={{ textAlign: "left", minWidth: 160 }}>Student Name</th>
              <th>Task 1<br /><span style={{ opacity: .6, fontSize: 9, fontWeight: 400 }}>/30</span></th>
              <th>Task 2<br /><span style={{ opacity: .6, fontSize: 9, fontWeight: 400 }}>/20</span></th>
              <th>Task 3<br /><span style={{ opacity: .6, fontSize: 9, fontWeight: 400 }}>/30</span></th>
              <th>Task 4<br /><span style={{ opacity: .6, fontSize: 9, fontWeight: 400 }}>/20</span></th>
              <th style={{ background: "#0F5233" }}>SBA<br />/100</th>
              <th>Exam<br /><span style={{ opacity: .6, fontSize: 9, fontWeight: 400 }}>/100</span></th>
              <th style={{ background: "#0F5233" }}>Total<br />/100</th>
              <th>Grade</th>
              <th style={{ textAlign: "left", minWidth: 200 }}>Level of Proficiency</th>
              <th style={{ width: 44 }}>✓</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, idx) => (
              <StudentRow
                key={student.id}
                student={student}
                idx={idx}
                marks={marks[student.id]}
                inputErrors={inputErrors}
                rowStatus={rowStatus[student.id]}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                inputRef={inputRefs}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Grade legend */}
      <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 10, color: "var(--mut)", marginRight: 4 }}>Grade scale:</span>
        {GRADE_SCALE.map(g => (
          <span key={g.grade} className="grade-badge" style={{ background: g.bg, color: g.color }}>
            {g.grade}: {g.min}–{g.max} · {g.remark}
          </span>
        ))}
      </div>
    </div>
  );
}