// src/pages/TeacherViewMarks.jsx
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import AppShell from "../components/shared/AppShell";
import { useAuth } from "../hooks/useAuth";
import { getActiveTerm, getStudents, getMarks, deleteAllStudents } from "../utils/db";
import { DEFAULT_SUBJECTS, calcWeightedTotal, calcGrade, GRADE_SCALE } from "../utils/constants";

const CLS_LABEL = { B7:"Basic 7", B8:"Basic 8", B9:"Basic 9" };
const CLS_COLOR = { B7:"var(--b7)", B8:"var(--b8)", B9:"var(--b9)" };

function ordinal(n) {
  if (!n) return "";
  const s = ["th","st","nd","rd"], v = n % 100;
  return n + (s[(v-20)%10] || s[v] || s[0]);
}

export default function TeacherViewMarks() {
  const { profile }       = useAuth();
  const [term,    setTerm]    = useState(null);
  const [selCls,  setSelCls]  = useState("");
  const [selSubj, setSelSubj] = useState("");
  const [students,setStudents]= useState([]);
  const [marks,   setMarks]   = useState({});
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAll = async () => {
    if (!term || !selCls) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete ALL ${students.length} students from ${CLS_LABEL[selCls]}? This action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    setDeleting(true);
    try {
      const success = await deleteAllStudents(term.id, selCls);
      if (success) {
        setStudents([]);
        setMarks({});
        toast.success("All students deleted");
      } else {
        toast.error("Failed to delete students");
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Error deleting students");
    } finally {
      setDeleting(false);
    }
  };

  const myClasses  = profile?.classes  || [];
  const mySubjects = (profile?.subjects || [])
    .map(sc => DEFAULT_SUBJECTS.find(s => s.code === sc))
    .filter(Boolean);

  useEffect(() => {
    getActiveTerm().then(t => {
      setTerm(t);
      if (myClasses[0])        setSelCls(myClasses[0]);
      if (mySubjects[0])       setSelSubj(mySubjects[0].code);
    });
  }, [myClasses, mySubjects]);

  useEffect(() => {
    if (!term || !selCls || !selSubj) return;
    setLoading(true);
    Promise.all([
      getStudents(term.id, selCls),
      getMarks(term.id, selCls, selSubj),
    ]).then(([sts, mks]) => {
      setStudents(sts || []);
      setMarks(mks || {});
      setLoading(false);
    }).catch(err => {
      console.error("Failed to load marks:", err);
      setStudents([]);
      setMarks({});
      setLoading(false);
    });
  }, [term, selCls, selSubj]);

  const totals  = students
    .map(s => calcWeightedTotal(marks[s.id] || {}))
    .filter(t => t !== "");
  const avg     = totals.length
    ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length * 10) / 10
    : null;
  const highest = totals.length ? Math.max(...totals) : null;
  const lowest  = totals.length ? Math.min(...totals) : null;
  const passed  = totals.filter(t => t >= 50).length;
  const filled  = students.filter(s => {
    const m = marks[s.id] || {};
    return m.t1 !== undefined && m.t1 !== "" && m.ex !== undefined && m.ex !== "";
  }).length;

  const gradeDist = { "1":0,"2":0,"3":0,"4":0,"5":0,"6":0,"7":0 };
  students.forEach(s => {
    const t = calcWeightedTotal(marks[s.id] || {});
    const g = calcGrade(t);
    if (g) gradeDist[g.grade]++;
  });

  const subjName    = mySubjects.find(s => s.code === selSubj)?.name || selSubj;
  const accentColor = CLS_COLOR[selCls] || "var(--mg)";

  // Sort students by total score descending
  const sortedStudents = [...students]
    .map(st => ({ ...st, tot: calcWeightedTotal(marks[st.id] || {}) }))
    .sort((a, b) => {
      if (a.tot === "" && b.tot === "") return 0;
      if (a.tot === "") return 1;
      if (b.tot === "") return -1;
      return Number(b.tot) - Number(a.tot);
    });

  return (
    <AppShell title="View My Marks" termLabel={term ? `${term.term} ${term.year}` : ""}>
      {!term && (
        <div className="alert alert-warn">No active term. Contact your administrator.</div>
      )}

      {term && (
        <>
          {/* Selectors */}
          <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
            <span style={{ fontSize:12, color:"var(--mut)", fontWeight:500 }}>Class:</span>
            {myClasses.map(c => (
              <button key={c}
                className={`btn btn-sm ${selCls === c ? "btn-primary" : "btn-secondary"}`}
                style={selCls === c ? { background:CLS_COLOR[c], borderColor:CLS_COLOR[c] } : {}}
                onClick={() => setSelCls(c)}>
                {CLS_LABEL[c] || c}
              </button>
            ))}
            <span style={{ fontSize:12, color:"var(--mut)", fontWeight:500, marginLeft:8 }}>Subject:</span>
            {mySubjects.map(s => (
              <button key={s.code}
                className={`btn btn-sm ${selSubj === s.code ? "btn-primary" : "btn-secondary"}`}
                style={selSubj === s.code ? { background:accentColor, borderColor:accentColor } : {}}
                onClick={() => setSelSubj(s.code)}>
                {s.code}
              </button>
            ))}
             
            {students.length > 0 && (
              <button
                className="btn btn-sm btn-danger"
                onClick={handleDeleteAll}
                disabled={deleting}
                style={{ marginLeft: "auto", background: "#B71C1C", color: "#fff", border: "none" }}
                title="Delete all students in this class"
              >
                {deleting ? "Deleting…" : "Delete All Students"}
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="stats-grid" style={{ marginBottom:14 }}>
            <div className="stat-card">
              <div className="stat-label">Students</div>
              <div className="stat-value">{students.length}</div>
              <div className="stat-sub">{filled} marks filled</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Class Average</div>
              <div className="stat-value" style={{ color:"var(--mg)" }}>
                {avg !== null ? avg : <span style={{ fontSize:16, color:"var(--mut)" }}>No data</span>}
              </div>
              <div className="stat-sub">out of 100</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Pass Rate</div>
              <div className="stat-value" style={{
                color: totals.length && passed / totals.length >= 0.5 ? "var(--mg)" : "#B71C1C"
              }}>
                {totals.length ? Math.round(passed / totals.length * 100) : 0}%
              </div>
              <div className="stat-sub">{passed} of {totals.length} passed</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Highest / Lowest</div>
              <div className="stat-value" style={{ fontSize:18 }}>
                {highest !== null ? highest : "—"} / {lowest !== null ? lowest : "—"}
              </div>
              <div className="stat-sub">score range</div>
            </div>
          </div>

          {/* Grade distribution chart */}
          {totals.length > 0 && (
            <div className="card" style={{ marginBottom:14 }}>
              <div className="card-head">
                <div className="card-title">
                  Grade Distribution — {CLS_LABEL[selCls] || selCls} · {subjName}
                </div>
              </div>
              <div className="card-body">
                <div style={{ display:"flex", gap:8, alignItems:"flex-end", height:90 }}>
                  {Object.entries(gradeDist).map(([grade, count]) => {
                    const maxC   = Math.max(...Object.values(gradeDist), 1);
                    const colors = {
                      "1":"#1B5E20","2":"#2E7D32","3":"#388E3C",
                      "4":"#F9A825","5":"#EF6C00","6":"#C62828","7":"#B71C1C",
                    };
                    const h = maxC ? Math.max((count / maxC) * 65, count > 0 ? 6 : 0) : 0;
                    return (
                      <div key={grade} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:colors[grade] }}>
                          {count > 0 ? count : ""}
                        </div>
                        <div style={{
                          width:"100%", height:h,
                          background:colors[grade],
                          borderRadius:"4px 4px 0 0",
                          transition:"height .3s",
                          minHeight: count > 0 ? 4 : 0,
                        }}/>
                        <div style={{ fontSize:10, color:"var(--mut)" }}>G{grade}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display:"flex", gap:6, marginTop:10, flexWrap:"wrap" }}>
                  {GRADE_SCALE.map(g => (
                    <span key={g.grade} className="grade-badge" style={{ background:g.bg, color:g.color }}>
                      Grade {g.grade}: {g.min}–{g.max} · {g.remark}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Results table */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">
                {CLS_LABEL[selCls] || selCls} · {subjName} — Full Results
              </div>
              <span style={{ fontSize:11, color:"var(--mut)" }}>
                Read-only · edit via Enter Marks
              </span>
            </div>

            {loading ? (
              <div className="loading-center"><div className="spinner"/></div>
            ) : students.length === 0 ? (
              <div className="card-body">
                <div className="alert alert-warn">No students in this class yet.</div>
              </div>
            ) : (
              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width:36 }}>#</th>
                      <th style={{ textAlign:"left" }}>Student Name</th>
                      <th>T1/30</th>
                      <th>T2/20</th>
                      <th>T3/30</th>
                      <th>T4/20</th>
                      <th style={{ background:"#0F5233" }}>SBA/100</th>
                      <th>Exam/100</th>
                      <th style={{ background:"#0F5233" }}>Total/100</th>
                      <th>Grade</th>
                      <th>Position</th>
                      <th style={{ textAlign:"left" }}>Level of Proficiency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedStudents.map((student, idx) => {
                      const m   = marks[student.id] || {};
                      const sba = [m.t1,m.t2,m.t3,m.t4].every(v => v === undefined || v === "")
                        ? "" : (Number(m.t1||0)+Number(m.t2||0)+Number(m.t3||0)+Number(m.t4||0));
                      const tot = student.tot;
                      const g   = calcGrade(tot);
                      const pos = tot !== "" ? idx + 1 : null;

                      return (
                        <tr key={student.id} style={{ background: idx % 2 === 0 ? "#fff" : "var(--pg)" }}>
                          <td>{idx + 1}</td>
                          <td style={{ textAlign:"left", fontWeight:500 }}>{student.name}</td>
                          <td>{m.t1 !== undefined && m.t1 !== "" ? m.t1 : <span style={{color:"var(--mut)"}}>—</span>}</td>
                          <td>{m.t2 !== undefined && m.t2 !== "" ? m.t2 : <span style={{color:"var(--mut)"}}>—</span>}</td>
                          <td>{m.t3 !== undefined && m.t3 !== "" ? m.t3 : <span style={{color:"var(--mut)"}}>—</span>}</td>
                          <td>{m.t4 !== undefined && m.t4 !== "" ? m.t4 : <span style={{color:"var(--mut)"}}>—</span>}</td>
                          <td style={{ fontFamily:"monospace", fontWeight:600, color:"var(--mg)" }}>
                            {sba !== "" ? sba : <span style={{color:"var(--mut)"}}>—</span>}
                          </td>
                          <td>{m.ex !== undefined && m.ex !== "" ? m.ex : <span style={{color:"var(--mut)"}}>—</span>}</td>
                          <td style={{ fontWeight:700, color: g ? g.color : "var(--txt)" }}>
                            {tot !== "" ? tot : <span style={{color:"var(--mut)"}}>—</span>}
                          </td>
                          <td>
                            {g
                              ? <span className="grade-badge" style={{ background:g.bg, color:g.color }}>{g.grade}</span>
                              : <span style={{color:"var(--mut)"}}>—</span>
                            }
                          </td>
                          <td style={{ fontWeight:600, color:"var(--mg)" }}>
                            {pos ? ordinal(pos) : <span style={{color:"var(--mut)"}}>—</span>}
                          </td>
                          <td style={{ textAlign:"left", fontSize:10, color: g ? g.color : "var(--mut)" }}>
                            {g ? `${g.level} (${g.remark})` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}
