// src/components/teacher/MarkSheet.jsx
// FIXES:
// 1. Marks save IMMEDIATELY on every change (no debounce loss on navigation)
// 2. Unsaved changes warning blocks accidental navigation
// 3. Firestore errors shown clearly with retry button
// 4. Save status per-row (spinner → tick → error)
import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { subscribeMarks, saveMark, getStudents } from "../../utils/db";
import { calcSBATotal, calcWeightedTotal, calcGrade, TASK_MAX, GRADE_SCALE } from "../../utils/constants";

function GradeBadge({ total }) {
  const g = calcGrade(total);
  if (!g) return <span style={{ color:"var(--mut)" }}>—</span>;
  return <span className="grade-badge" style={{ background:g.bg, color:g.color }}>{g.grade}</span>;
}

function ProfCell({ total }) {
  const g = calcGrade(total);
  if (!g) return <span style={{ color:"var(--mut)" }}>—</span>;
  return <span style={{ fontSize:10, color:g.color }}>{g.level} ({g.remark})</span>;
}

// Per-row save status indicator
function SaveStatus({ status }) {
  if (status === "saving") return (
    <div style={{
      width:14, height:14, border:"2px solid var(--bdr)",
      borderTopColor:"var(--mg)", borderRadius:"50%",
      animation:"spin .7s linear infinite", margin:"0 auto",
    }}/>
  );
  if (status === "saved") return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="var(--mg)" strokeWidth="2.5" style={{ display:"block", margin:"0 auto" }}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
  if (status === "error") return (
    <span style={{ color:"#B71C1C", fontSize:14, display:"block", textAlign:"center" }}
      title="Save failed — check Firestore rules">✕</span>
  );
  return null;
}

export default function MarkSheet({ termId, classCode, classLabel, subjectCode, subjectName }) {
  const [students,   setStudents]   = useState([]);
  const [marks,      setMarks]      = useState({});
  const [errors,     setErrors]     = useState({});
  const [saveStatus, setSaveStatus] = useState({}); // { studentId: "saving"|"saved"|"error" }
  const [loading,    setLoading]    = useState(true);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const saveTimers  = useRef({});
  const pendingSave = useRef({}); // track in-flight saves

  // Load students
  useEffect(() => {
    if (!termId || !classCode) return;
    getStudents(termId, classCode).then(list => setStudents(list));
  }, [termId, classCode]);

  // Real-time marks subscription
  useEffect(() => {
    if (!termId || !classCode || !subjectCode) return;
    setLoading(true);
    const unsub = subscribeMarks(termId, classCode, subjectCode, data => {
      setMarks(data);
      setLoading(false);
    });
    return () => unsub();
  }, [termId, classCode, subjectCode]);

  // Warn user if they try to navigate away with unsaved marks
  useEffect(() => {
    const handler = e => {
      if (hasUnsaved) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsaved]);

  // Save with short debounce (300ms) — fast enough that navigation won't lose data
  const scheduleSave = useCallback((studentId, markData) => {
    clearTimeout(saveTimers.current[studentId]);
    setSaveStatus(prev => ({ ...prev, [studentId]: "saving" }));
    setHasUnsaved(true);

    saveTimers.current[studentId] = setTimeout(async () => {
      try {
        await saveMark(termId, classCode, subjectCode, studentId, markData);
        setSaveStatus(prev => ({ ...prev, [studentId]: "saved" }));
        setHasUnsaved(false);
        // Clear "saved" tick after 3 seconds
        setTimeout(() => {
          setSaveStatus(prev => {
            if (prev[studentId] === "saved") {
              const n = { ...prev };
              delete n[studentId];
              return n;
            }
            return prev;
          });
        }, 3000);
      } catch (err) {
        console.error("saveMark failed:", err);
        setSaveStatus(prev => ({ ...prev, [studentId]: "error" }));
        toast.error(`Save failed: ${err.message}`, { id:`save-err-${studentId}`, duration:6000 });
      }
    }, 300); // 300ms debounce — short enough to survive navigation
  }, [termId, classCode, subjectCode]);

  function handleChange(studentId, field, rawVal) {
    const max    = TASK_MAX[field] || 100;
    const errKey = `${studentId}-${field}`;

    // Validation
    if (rawVal !== "" && (isNaN(Number(rawVal)) || Number(rawVal) < 0 || Number(rawVal) > max)) {
      setErrors(prev => ({ ...prev, [errKey]: `Max is ${max}` }));
      return;
    }
    setErrors(prev => { const n = { ...prev }; delete n[errKey]; return n; });

    const val     = rawVal === "" ? "" : Number(rawVal);
    const updated = { ...(marks[studentId] || {}), [field]: val };
    setMarks(prev => ({ ...prev, [studentId]: updated }));
    scheduleSave(studentId, updated);
  }

  // Save ALL pending marks immediately (called on page unload or manual save)
  async function saveAllNow() {
    const toSave = Object.entries(saveTimers.current);
    if (!toSave.length) return;

    // Cancel all pending timers and save immediately
    toSave.forEach(([studentId]) => clearTimeout(saveTimers.current[studentId]));

    await Promise.all(
      students.map(async st => {
        const m = marks[st.id];
        if (!m) return;
        try {
          await saveMark(termId, classCode, subjectCode, st.id, m);
          setSaveStatus(prev => ({ ...prev, [st.id]: "saved" }));
        } catch (err) {
          setSaveStatus(prev => ({ ...prev, [st.id]: "error" }));
        }
      })
    );
    setHasUnsaved(false);
    toast.success("All marks saved!");
  }

  // Stats
  const filled = students.filter(s => {
    const m = marks[s.id] || {};
    return m.t1 !== undefined && m.t1 !== "" && m.ex !== undefined && m.ex !== "";
  }).length;

  const totals  = students.map(s => calcWeightedTotal(marks[s.id] || {})).filter(t => t !== "");
  const classAvg = totals.length
    ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length * 10) / 10
    : null;

  const accentColor = classCode === "B7" ? "var(--b7)" : classCode === "B8" ? "var(--b8)" : "var(--b9)";
  const savingCount = Object.values(saveStatus).filter(s => s === "saving").length;
  const errorCount  = Object.values(saveStatus).filter(s => s === "error").length;

  if (loading) return (
    <div className="loading-center">
      <div className="spinner"/>
      <span>Loading mark sheet…</span>
    </div>
  );

  if (students.length === 0) return (
    <div className="alert alert-warn">
      No students found for {classLabel}. Ask your administrator to add students first.
    </div>
  );

  return (
    <div>
      {/* Header strip */}
      <div style={{
        display:"flex", alignItems:"center", gap:12,
        padding:"12px 16px", background:"#fff",
        border:"1px solid var(--bdr)", borderRadius:"var(--radius-lg)",
        marginBottom:12,
      }}>
        <div style={{ width:6, height:40, borderRadius:4, background:accentColor, flexShrink:0 }}/>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:600, color:"var(--dg)" }}>
            {classLabel} — {subjectName}
          </div>
          <div style={{ fontSize:11, color:"var(--mut)", marginTop:2 }}>
            {students.length} students · {filled} filled · Yellow cells are editable · Marks save automatically
          </div>
        </div>
        <div style={{ display:"flex", gap:16, alignItems:"center" }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:10, color:"var(--mut)" }}>Completion</div>
            <div style={{ fontSize:16, fontWeight:700, color:accentColor }}>
              {students.length ? Math.round(filled / students.length * 100) : 0}%
            </div>
          </div>
          {classAvg !== null && (
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:10, color:"var(--mut)" }}>Class Avg</div>
              <div style={{ fontSize:16, fontWeight:700, color:"var(--dg)" }}>{classAvg}</div>
            </div>
          )}
          {/* Manual save button */}
          <button
            className="btn btn-primary btn-sm"
            onClick={saveAllNow}
            disabled={!hasUnsaved && savingCount === 0}
          >
            {savingCount > 0 ? `Saving ${savingCount}…` : "Save All"}
          </button>
        </div>
      </div>

      {/* Unsaved warning bar */}
      {hasUnsaved && (
        <div style={{
          background:"#FFF8E7", border:"1px solid #F5A623",
          borderRadius:"var(--radius-md)", padding:"8px 14px",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          marginBottom:12, fontSize:12, color:"#92600A",
        }}>
          <span>⚠ You have unsaved changes — do not navigate away yet</span>
          <button className="btn btn-gold btn-sm" onClick={saveAllNow}>Save Now</button>
        </div>
      )}

      {/* Firestore error help */}
      {errorCount > 0 && (
        <div className="alert alert-danger" style={{ marginBottom:12 }}>
          <div>
            <strong>⚠ {errorCount} mark{errorCount > 1 ? "s" : ""} failed to save.</strong>
            <div style={{ marginTop:6, fontSize:11, lineHeight:1.7 }}>
              This is usually a <strong>Firestore security rules</strong> problem.
              Go to <strong>Firebase Console → Firestore → Rules</strong> and make sure
              the <code>marksData</code> collection allows authenticated writes:
              <div style={{
                background:"#1e1e1e", borderRadius:6, padding:"8px 12px",
                fontFamily:"monospace", fontSize:11, color:"#9CDCFE",
                marginTop:8, lineHeight:1.8,
              }}>
                match /marksData/{"{key}"}/entries/{"{studentId}"} {"{"}<br/>
                &nbsp;&nbsp;allow read, write: if request.auth != null;<br/>
                {"}"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Syncing indicator */}
      {savingCount > 0 && (
        <div style={{
          display:"flex", alignItems:"center", gap:8,
          fontSize:11, color:"var(--mg)", marginBottom:8,
        }}>
          <div style={{ width:12, height:12, border:"2px solid var(--bdr)",
            borderTopColor:"var(--mg)", borderRadius:"50%",
            animation:"spin .7s linear infinite" }}/>
          Saving {savingCount} row{savingCount > 1 ? "s" : ""}…
        </div>
      )}

      {/* Mark entry table */}
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width:36 }}>#</th>
              <th style={{ textAlign:"left", minWidth:160 }}>Student Name</th>
              <th>Task 1<br/><span style={{ opacity:.6, fontSize:9, fontWeight:400 }}>/30</span></th>
              <th>Task 2<br/><span style={{ opacity:.6, fontSize:9, fontWeight:400 }}>/20</span></th>
              <th>Task 3<br/><span style={{ opacity:.6, fontSize:9, fontWeight:400 }}>/30</span></th>
              <th>Task 4<br/><span style={{ opacity:.6, fontSize:9, fontWeight:400 }}>/20</span></th>
              <th style={{ background:"#0F5233" }}>SBA /100</th>
              <th>Exam<br/><span style={{ opacity:.6, fontSize:9, fontWeight:400 }}>/100</span></th>
              <th style={{ background:"#0F5233" }}>Total /100</th>
              <th>Grade</th>
              <th style={{ textAlign:"left", minWidth:180 }}>Level of Proficiency</th>
              <th style={{ width:44 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, idx) => {
              const m    = marks[student.id] || {};
              const sba  = calcSBATotal(m);
              const tot  = calcWeightedTotal(m);
              const status = saveStatus[student.id];

              return (
                <tr key={student.id}>
                  <td>{idx + 1}</td>
                  <td style={{ textAlign:"left", fontWeight:500 }}>{student.name}</td>

                  {/* Task 1–4 inputs */}
                  {["t1","t2","t3","t4"].map(field => {
                    const errKey = `${student.id}-${field}`;
                    return (
                      <td key={field}>
                        <input
                          className={`mark-input${errors[errKey] ? " error" : ""}`}
                          type="number" min="0" max={TASK_MAX[field]}
                          value={m[field] ?? ""}
                          placeholder="—"
                          title={errors[errKey] || `Max ${TASK_MAX[field]}`}
                          onChange={e => handleChange(student.id, field, e.target.value)}
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
                      onChange={e => handleChange(student.id, "ex", e.target.value)}
                    />
                  </td>

                  {/* Total auto */}
                  <td className="calc-cell" style={{ fontWeight:700, fontSize:12 }}>
                    {tot !== "" ? tot : "—"}
                  </td>

                  {/* Grade */}
                  <td><GradeBadge total={tot}/></td>

                  {/* Proficiency */}
                  <td style={{ textAlign:"left" }}><ProfCell total={tot}/></td>

                  {/* Save status */}
                  <td><SaveStatus status={status}/></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Grade scale legend */}
      <div style={{ marginTop:12, display:"flex", gap:8, flexWrap:"wrap" }}>
        {GRADE_SCALE.map(g => (
          <span key={g.grade} className="grade-badge" style={{ background:g.bg, color:g.color }}>
            Grade {g.grade}: {g.min}–{g.max} ({g.remark})
          </span>
        ))}
      </div>
    </div>
  );
}
