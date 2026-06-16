// src/components/teacher/MarkSheet.jsx
// FIX: Save banner only appears AFTER user stops typing (500ms idle)
// No interruption while using arrow keys or typing quickly
import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { subscribeMarks, saveMark, getStudents } from "../../utils/db";
import { calcSBATotal, calcWeightedTotal, calcGrade, TASK_MAX, GRADE_SCALE } from "../../utils/constants";

function GradeBadge({ total }) {
  const g = calcGrade(total);
  if (!g) return <span style={{color:"var(--mut)"}}>—</span>;
  return <span className="grade-badge" style={{background:g.bg,color:g.color}}>{g.grade}</span>;
}

function ProfCell({ total }) {
  const g = calcGrade(total);
  if (!g) return <span style={{color:"var(--mut)"}}>—</span>;
  return <span style={{fontSize:10,color:g.color}}>{g.level} ({g.remark})</span>;
}

function SaveStatus({ status }) {
  if (status === "saving") return (
    <div style={{width:14,height:14,border:"2px solid #D0E8DC",borderTopColor:"var(--mg)",
      borderRadius:"50%",animation:"spin .7s linear infinite",margin:"0 auto"}}/>
  );
  if (status === "saved") return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="var(--mg)" strokeWidth="2.5" style={{display:"block",margin:"0 auto"}}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
  if (status === "error") return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="#B71C1C" strokeWidth="2.5" style={{display:"block",margin:"0 auto"}}>
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
  return null;
}

// Global save state — what the banner shows
// "idle"    = nothing happening, no banner
// "pending" = user is typing, debounce hasn't fired yet — NO banner shown
// "saving"  = debounce fired, Firestore write in progress — show banner
// "saved"   = all done — show green pill briefly
// "error"   = write failed — show error
const IDLE    = "idle";
const PENDING = "pending";
const SAVING  = "saving";
const SAVED   = "saved";
const ERROR   = "error";

export default function MarkSheet({ termId, classCode, classLabel, subjectCode, subjectName }) {
  const [students,     setStudents]     = useState([]);
  const [marks,        setMarks]        = useState({});
  const [inputErrors,  setInputErrors]  = useState({});
  const [rowStatus,    setRowStatus]    = useState({}); // per-row ✓ spinner
  const [globalStatus, setGlobalStatus] = useState(IDLE);
  const [loading,      setLoading]      = useState(true);

  const saveTimers    = useRef({});  // debounce timers per student
  const pendingWrites = useRef(0);   // count of in-flight Firestore writes
  const savedTimer    = useRef(null);// timer to clear "saved" state

  useEffect(() => {
    if (termId && classCode) getStudents(termId, classCode).then(setStudents);
  }, [termId, classCode]);

  useEffect(() => {
    if (!termId || !classCode || !subjectCode) return;
    setLoading(true);
    const unsub = subscribeMarks(termId, classCode, subjectCode, data => {
      setMarks(data);
      setLoading(false);
    });
    return () => unsub();
  }, [termId, classCode, subjectCode]);

  // Block tab close only while Firestore writes are in flight
  useEffect(() => {
    const h = e => {
      if (pendingWrites.current > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, []);

  const doSave = useCallback(async (studentId, markData) => {
    pendingWrites.current++;
    setGlobalStatus(SAVING);
    setRowStatus(p => ({ ...p, [studentId]: "saving" }));

    try {
      await saveMark(termId, classCode, subjectCode, studentId, markData);
      setRowStatus(p => ({ ...p, [studentId]: "saved" }));

      // Clear row tick after 3s
      setTimeout(() => {
        setRowStatus(p => {
          if (p[studentId] === "saved") { const n={...p}; delete n[studentId]; return n; }
          return p;
        });
      }, 3000);
    } catch (err) {
      console.error("saveMark:", err);
      setRowStatus(p => ({ ...p, [studentId]: "error" }));
      setGlobalStatus(ERROR);
      toast.error("Save failed — check Firestore rules", { id:"save-err", duration:6000 });
    } finally {
      pendingWrites.current = Math.max(0, pendingWrites.current - 1);

      // If all writes done, show saved state briefly then go idle
      if (pendingWrites.current === 0) {
        setGlobalStatus(prev => prev === ERROR ? ERROR : SAVED);
        clearTimeout(savedTimer.current);
        savedTimer.current = setTimeout(() => setGlobalStatus(IDLE), 3000);
      }
    }
  }, [termId, classCode, subjectCode]);

  function handleChange(studentId, field, rawVal) {
    const max    = TASK_MAX[field] || 100;
    const errKey = `${studentId}-${field}`;

    // Validation — just mark the cell red, don't save
    if (rawVal !== "" && (isNaN(Number(rawVal)) || Number(rawVal) < 0 || Number(rawVal) > max)) {
      setInputErrors(p => ({ ...p, [errKey]: true }));
      return;
    }
    setInputErrors(p => { const n={...p}; delete n[errKey]; return n; });

    const val     = rawVal === "" ? "" : Number(rawVal);
    const updated = { ...(marks[studentId] || {}), [field]: val };

    // Update local state immediately (smooth UI)
    setMarks(p => ({ ...p, [studentId]: updated }));

    // Mark as pending — no banner yet, user may still be typing
    setGlobalStatus(prev => prev === ERROR ? ERROR : PENDING);

    // Debounce: only save after 600ms of no changes
    clearTimeout(saveTimers.current[studentId]);
    saveTimers.current[studentId] = setTimeout(() => {
      doSave(studentId, updated);
    }, 600);
  }

  async function saveAllNow() {
    // Cancel pending debounces and save everything immediately
    Object.keys(saveTimers.current).forEach(id => clearTimeout(saveTimers.current[id]));
    const toSave = students.filter(s => marks[s.id]);
    if (!toSave.length) return;
    await Promise.all(toSave.map(st => doSave(st.id, marks[st.id])));
    toast.success("All marks saved!");
  }

  // Stats
  const filled = students.filter(s => {
    const m = marks[s.id] || {};
    return m.t1 !== undefined && m.t1 !== "" && m.ex !== undefined && m.ex !== "";
  }).length;
  const totals   = students.map(s => calcWeightedTotal(marks[s.id] || {})).filter(t => t !== "");
  const classAvg = totals.length
    ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length * 10) / 10
    : null;

  const accentColor = classCode === "B7" ? "var(--b7)" : classCode === "B8" ? "var(--b8)" : "var(--b9)";
  const pct         = students.length ? Math.round(filled / students.length * 100) : 0;

  if (loading) return (
    <div className="loading-center"><div className="spinner"/><span>Loading mark sheet…</span></div>
  );
  if (students.length === 0) return (
    <div className="alert alert-warn">
      No students found for {classLabel}. Ask your administrator to add students first.
    </div>
  );

  return (
    <div>
      {/* ── Header ── */}
      <div style={{
        display:"flex", alignItems:"center", gap:14,
        padding:"14px 18px", background:"#fff",
        border:"1px solid var(--bdr)", borderRadius:"var(--radius-lg)",
        marginBottom:10,
      }}>
        <div style={{width:6,height:44,borderRadius:4,background:accentColor,flexShrink:0}}/>
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:600,color:"var(--dg)"}}>{classLabel} — {subjectName}</div>
          <div style={{fontSize:11,color:"var(--mut)",marginTop:2}}>
            {students.length} students · {filled} filled · Enter marks in the yellow cells
          </div>
        </div>

        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {/* Global save state pill — only shows when relevant */}
          {globalStatus === SAVING && (
            <div style={{
              display:"flex",alignItems:"center",gap:7,
              background:"#FFF8E7",border:"1px solid #F5A623",
              borderRadius:20,padding:"5px 14px",
              fontSize:12,fontWeight:500,color:"#92600A",
            }}>
              <div style={{
                width:12,height:12,border:"2px solid #F5A623",
                borderTopColor:"#92600A",borderRadius:"50%",
                animation:"spin .7s linear infinite",flexShrink:0,
              }}/>
              Saving…
            </div>
          )}
          {globalStatus === SAVED && (
            <div style={{
              display:"flex",alignItems:"center",gap:6,
              background:"var(--lg)",border:"1px solid var(--bdr)",
              borderRadius:20,padding:"5px 14px",
              fontSize:12,fontWeight:500,color:"var(--mg)",
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="var(--mg)" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              All saved
            </div>
          )}
          {globalStatus === ERROR && (
            <div style={{
              background:"#FFEBEE",border:"1px solid #FFCDD2",
              borderRadius:20,padding:"5px 14px",
              fontSize:12,fontWeight:500,color:"#B71C1C",
            }}>
              ⚠ Save failed
            </div>
          )}

          <div style={{textAlign:"center",minWidth:52}}>
            <div style={{fontSize:10,color:"var(--mut)"}}>Done</div>
            <div style={{fontSize:18,fontWeight:700,color:accentColor}}>{pct}%</div>
          </div>
          {classAvg !== null && (
            <div style={{textAlign:"center",minWidth:52}}>
              <div style={{fontSize:10,color:"var(--mut)"}}>Avg</div>
              <div style={{fontSize:18,fontWeight:700,color:"var(--dg)"}}>{classAvg}</div>
            </div>
          )}
          <button className="btn btn-primary btn-sm"
            onClick={saveAllNow}
            disabled={globalStatus === SAVING}>
            {globalStatus === SAVING ? "Saving…" : "Save All"}
          </button>
        </div>
      </div>

      {/* ── Saving banner — only shown while Firestore write is IN FLIGHT ── */}
      {globalStatus === SAVING && (
        <div style={{
          background:"#FFF8E7",border:"1.5px solid #F5A623",
          borderRadius:"var(--radius-md)",padding:"9px 16px",
          display:"flex",alignItems:"center",gap:10,
          marginBottom:10,fontSize:13,color:"#7A5200",fontWeight:500,
        }}>
          <div style={{
            width:15,height:15,border:"2px solid #F5A623",
            borderTopColor:"#92600A",borderRadius:"50%",
            animation:"spin .7s linear infinite",flexShrink:0,
          }}/>
          Saving — please do not navigate away until complete.
        </div>
      )}

      {/* ── Error guidance ── */}
      {globalStatus === ERROR && (
        <div className="alert alert-danger" style={{marginBottom:10}}>
          <strong>⚠ Marks failed to save.</strong> Go to Firebase Console → Firestore → Rules
          and make sure <code>marksData</code> allows authenticated writes, then click Publish.
        </div>
      )}

      {/* ── Table ── */}
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th style={{width:36}}>#</th>
              <th style={{textAlign:"left",minWidth:160}}>Student Name</th>
              <th>Task 1<br/><span style={{opacity:.6,fontSize:9,fontWeight:400}}>/30</span></th>
              <th>Task 2<br/><span style={{opacity:.6,fontSize:9,fontWeight:400}}>/20</span></th>
              <th>Task 3<br/><span style={{opacity:.6,fontSize:9,fontWeight:400}}>/30</span></th>
              <th>Task 4<br/><span style={{opacity:.6,fontSize:9,fontWeight:400}}>/20</span></th>
              <th style={{background:"#0F5233"}}>SBA<br/>/100</th>
              <th>Exam<br/><span style={{opacity:.6,fontSize:9,fontWeight:400}}>/100</span></th>
              <th style={{background:"#0F5233"}}>Total<br/>/100</th>
              <th>Grade</th>
              <th style={{textAlign:"left",minWidth:200}}>Level of Proficiency</th>
              <th style={{width:44}}>✓</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, idx) => {
              const m      = marks[student.id] || {};
              const sba    = calcSBATotal(m);
              const tot    = calcWeightedTotal(m);
              const status = rowStatus[student.id];
              return (
                <tr key={student.id} style={{background: idx%2===0 ? "#fff" : "var(--pg)"}}>
                  <td>{idx+1}</td>
                  <td style={{textAlign:"left",fontWeight:500}}>{student.name}</td>
                  {["t1","t2","t3","t4"].map(field => (
                    <td key={field}>
                      <input
                        className={`mark-input${inputErrors[`${student.id}-${field}`] ? " error" : ""}`}
                        type="number" min="0" max={TASK_MAX[field]}
                        value={m[field] !== undefined && m[field] !== "" ? m[field] : ""}
                        placeholder="—"
                        title={`Out of ${TASK_MAX[field]}`}
                        onChange={e => handleChange(student.id, field, e.target.value)}
                      />
                    </td>
                  ))}
                  <td className="calc-cell" style={{fontWeight:700}}>
                    {sba !== "" ? sba : "—"}
                  </td>
                  <td>
                    <input
                      className={`mark-input${inputErrors[`${student.id}-ex`] ? " error" : ""}`}
                      type="number" min="0" max="100"
                      value={m.ex !== undefined && m.ex !== "" ? m.ex : ""}
                      placeholder="—"
                      title="Out of 100"
                      onChange={e => handleChange(student.id, "ex", e.target.value)}
                    />
                  </td>
                  <td className="calc-cell" style={{fontWeight:700,fontSize:12}}>
                    {tot !== "" ? tot : "—"}
                  </td>
                  <td><GradeBadge total={tot}/></td>
                  <td style={{textAlign:"left"}}><ProfCell total={tot}/></td>
                  <td><SaveStatus status={status}/></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Grade legend */}
      <div style={{marginTop:12,display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
        <span style={{fontSize:10,color:"var(--mut)",marginRight:4}}>Grade scale:</span>
        {GRADE_SCALE.map(g => (
          <span key={g.grade} className="grade-badge" style={{background:g.bg,color:g.color}}>
            {g.grade}: {g.min}–{g.max} · {g.remark}
          </span>
        ))}
      </div>
    </div>
  );
}
