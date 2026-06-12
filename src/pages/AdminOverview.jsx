// src/pages/AdminOverview.jsx
import { useState, useEffect } from "react";
import AppShell from "../components/shared/AppShell";
import { getActiveTerm, getStudents, getMarks } from "../utils/db";
import { CLASSES, DEFAULT_SUBJECTS, calcWeightedTotal, calcGrade } from "../utils/constants";

export default function AdminOverview() {
  const [term,     setTerm]     = useState(null);
  const [selClass, setSelClass] = useState("B7");
  const [selSubj,  setSelSubj]  = useState("EN");
  const [students, setStudents] = useState([]);
  const [marks,    setMarks]    = useState({});
  const [loading,  setLoading]  = useState(false);

  const ACC = { B7:"var(--b7)", B8:"var(--b8)", B9:"var(--b9)" };

  useEffect(() => { getActiveTerm().then(setTerm); }, []);

  useEffect(() => {
    if (!term) return;
    setLoading(true);
    Promise.all([
      getStudents(term.id, selClass),
      getMarks(term.id, selClass, selSubj),
    ]).then(([sts, mks]) => {
      setStudents(sts);
      setMarks(mks);
      setLoading(false);
    });
  }, [term, selClass, selSubj]);

  const subjName = DEFAULT_SUBJECTS.find(s => s.code === selSubj)?.name || selSubj;
  const clsLabel = CLASSES.find(c => c.code === selClass)?.label || selClass;

  // Compute stats
  const totals = students.map(s => calcWeightedTotal(marks[s.id] || {})).filter(t => t !== "");
  const avg    = totals.length ? Math.round(totals.reduce((a,b)=>a+b,0)/totals.length*10)/10 : null;
  const highest= totals.length ? Math.max(...totals) : null;
  const lowest = totals.length ? Math.min(...totals) : null;
  const passed = totals.filter(t => t >= 50).length;
  const filled = students.filter(s => {
    const m = marks[s.id] || {};
    return m.t1 !== undefined && m.t1 !== "" && m.ex !== undefined && m.ex !== "";
  }).length;

  // Grade distribution
  const gradeDist = { "1":0,"2":0,"3":0,"4":0,"5":0,"6":0,"7":0 };
  students.forEach(s => {
    const tot = calcWeightedTotal(marks[s.id] || {});
    const g   = calcGrade(tot);
    if (g) gradeDist[g.grade]++;
  });

  return (
    <AppShell title="Marks Overview" termLabel={term ? `${term.term} ${term.year}` : ""}>
      {!term && (
        <div className="alert alert-warn">No active term set.</div>
      )}

      {term && (
        <>
          {/* Selectors */}
          <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
            <div style={{ fontSize:12, color:"var(--mut)", fontWeight:500 }}>Class:</div>
            {CLASSES.map(c => (
              <button key={c.code} className={`btn btn-sm ${selClass===c.code?"btn-primary":"btn-secondary"}`}
                style={selClass===c.code?{background:ACC[c.code],borderColor:ACC[c.code]}:{}}
                onClick={() => setSelClass(c.code)}>{c.label}</button>
            ))}
            <div style={{ fontSize:12, color:"var(--mut)", fontWeight:500, marginLeft:8 }}>Subject:</div>
            <select className="form-select" style={{ width:"auto", padding:"5px 10px", fontSize:12 }}
              value={selSubj} onChange={e => setSelSubj(e.target.value)}>
              {DEFAULT_SUBJECTS.map(s => (
                <option key={s.code} value={s.code}>{s.code} — {s.name}</option>
              ))}
            </select>
          </div>

          {/* Stats row */}
          <div className="stats-grid" style={{ marginBottom:16 }}>
            <div className="stat-card">
              <div className="stat-label">Students</div>
              <div className="stat-value">{students.length}</div>
              <div className="stat-sub">{filled} marks filled</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Class Average</div>
              <div className="stat-value" style={{ color:"var(--mg)" }}>{avg ?? "—"}</div>
              <div className="stat-sub">out of 100</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Pass Rate</div>
              <div className="stat-value" style={{ color: passed/Math.max(totals.length,1) >= .5 ? "var(--mg)" : "#B71C1C" }}>
                {totals.length ? Math.round(passed/totals.length*100) : 0}%
              </div>
              <div className="stat-sub">{passed} of {totals.length} passed</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Highest / Lowest</div>
              <div className="stat-value" style={{ fontSize:18 }}>
                {highest ?? "—"} / {lowest ?? "—"}
              </div>
              <div className="stat-sub">score range</div>
            </div>
          </div>

          {/* Grade distribution */}
          <div className="card" style={{ marginBottom:14 }}>
            <div className="card-head">
              <div className="card-title">Grade Distribution — {clsLabel} · {subjName}</div>
            </div>
            <div className="card-body">
              <div style={{ display:"flex", gap:8, alignItems:"flex-end", height:80 }}>
                {Object.entries(gradeDist).map(([grade, count]) => {
                  const maxCount = Math.max(...Object.values(gradeDist), 1);
                  const colors   = {
                    "1":"#1B5E20","2":"#2E7D32","3":"#388E3C",
                    "4":"#F9A825","5":"#EF6C00",
                    "6":"#C62828","7":"#B71C1C",
                  };
                  const height = maxCount ? Math.max((count/maxCount)*60, count>0?8:0) : 0;
                  return (
                    <div key={grade} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                      <div style={{ fontSize:11, fontWeight:600, color:colors[grade] }}>{count}</div>
                      <div style={{
                        width:"100%", height, background:colors[grade],
                        borderRadius:"4px 4px 0 0", transition:"height .3s",
                        minHeight: count > 0 ? 4 : 0,
                      }}/>
                      <div style={{ fontSize:10, color:"var(--mut)" }}>G{grade}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Full student table */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">Student Results — {clsLabel} · {subjName}</div>
              <span style={{ fontSize:11, color:"var(--mut)" }}>Read-only — edit in teacher mark sheets</span>
            </div>
            {loading ? (
              <div className="loading-center"><div className="spinner"/></div>
            ) : students.length === 0 ? (
              <div className="card-body">
                <div className="alert alert-warn">No students in {clsLabel}. Add them in the Students section.</div>
              </div>
            ) : (
              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width:36 }}>#</th>
                      <th style={{ textAlign:"left" }}>Student Name</th>
                      <th>T1/30</th><th>T2/20</th><th>T3/30</th><th>T4/20</th>
                      <th>SBA/100</th><th>Exam/100</th><th>Total/100</th>
                      <th>Grade</th><th style={{ textAlign:"left" }}>Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((st, idx) => {
                      const m   = marks[st.id] || {};
                      const sba = [m.t1,m.t2,m.t3,m.t4].every(v=>v===undefined||v==="") ? "—"
                        : (Number(m.t1||0)+Number(m.t2||0)+Number(m.t3||0)+Number(m.t4||0));
                      const tot = calcWeightedTotal(m);
                      const g   = calcGrade(tot);
                      return (
                        <tr key={st.id}>
                          <td>{idx+1}</td>
                          <td style={{ textAlign:"left", fontWeight:500 }}>{st.name}</td>
                          <td>{m.t1 ?? "—"}</td>
                          <td>{m.t2 ?? "—"}</td>
                          <td>{m.t3 ?? "—"}</td>
                          <td>{m.t4 ?? "—"}</td>
                          <td style={{ fontFamily:"monospace", fontWeight:600 }}>{sba}</td>
                          <td>{m.ex ?? "—"}</td>
                          <td style={{ fontWeight:700, color:g?g.color:"var(--txt)" }}>{tot !== "" ? tot : "—"}</td>
                          <td>
                            {g ? (
                              <span className="grade-badge" style={{ background:g.bg, color:g.color }}>
                                {g.grade}
                              </span>
                            ) : "—"}
                          </td>
                          <td style={{ textAlign:"left", fontSize:10, color:g?g.color:"var(--mut)" }}>
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
