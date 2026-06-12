// src/pages/AdminClasses.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/shared/AppShell";
import { getActiveTerm, getStudents, getCompletionStats } from "../utils/db";
import { CLASSES, DEFAULT_SUBJECTS } from "../utils/constants";

export default function AdminClasses() {
  const navigate = useNavigate();
  const [term,    setTerm]    = useState(null);
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);

  const ACC   = { B7:"var(--b7)", B8:"var(--b8)", B9:"var(--b9)" };
  const LIGHT = { B7:"var(--b7l)", B8:"var(--b8l)", B9:"var(--b9l)" };

  useEffect(() => {
    async function load() {
      const t = await getActiveTerm();
      setTerm(t);
      if (!t) { setLoading(false); return; }

      const results = await Promise.all(
        CLASSES.map(async cls => {
          const students = await getStudents(t.id, cls.code);
          const stats    = await getCompletionStats(t.id, DEFAULT_SUBJECTS, [cls]);
          let filled = 0, total = 0;
          DEFAULT_SUBJECTS.forEach(s => {
            const st = stats[cls.code]?.[s.code] || { filled:0, total:0 };
            filled += st.filled;
            total  += st.total;
          });
          return { ...cls, students, filled, total };
        })
      );
      setData(results);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <AppShell title="Classes" termLabel={term ? `${term.term} ${term.year}` : ""}>
      {!term && (
        <div className="alert alert-warn">
          No active term. Go to <strong>Settings → Terms</strong> and set a term active first.
        </div>
      )}

      {loading ? (
        <div className="loading-center"><div className="spinner"/><span>Loading classes…</span></div>
      ) : (
        <>
          {/* Summary stat cards */}
          <div className="stats-grid" style={{ gridTemplateColumns:"repeat(3,1fr)", marginBottom:20 }}>
            {data.map(cls => (
              <div key={cls.code} className="stat-card" style={{
                borderTop:`4px solid ${ACC[cls.code]}`,
              }}>
                <div className="stat-label">{cls.label} ({cls.alias})</div>
                <div className="stat-value" style={{ color:ACC[cls.code] }}>{cls.students.length}</div>
                <div className="stat-sub">students enrolled</div>
                <div style={{ marginTop:8 }}>
                  <div style={{ fontSize:10, color:"var(--mut)", marginBottom:3 }}>
                    Marks completion: {cls.total ? Math.round(cls.filled/cls.total*100) : 0}%
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{
                      width: `${cls.total ? cls.filled/cls.total*100 : 0}%`,
                      background: ACC[cls.code],
                    }}/>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Per-class detail cards */}
          {data.map(cls => (
            <div key={cls.code} className="card" style={{ marginBottom:14 }}>
              <div className="card-head" style={{ borderLeft:`4px solid ${ACC[cls.code]}` }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div>
                    <div className="card-title">{cls.label}</div>
                    <div style={{ fontSize:10, color:"var(--mut)" }}>{cls.alias}</div>
                  </div>
                  <span style={{
                    background:ACC[cls.code]+"18", color:ACC[cls.code],
                    border:`1px solid ${ACC[cls.code]}`,
                    padding:"2px 10px", borderRadius:20, fontSize:11, fontWeight:600,
                  }}>
                    {cls.students.length} students
                  </span>
                </div>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => navigate(`/admin/students?cls=${cls.code}`)}>
                  Manage Students →
                </button>
              </div>

              {/* Subject completion per class */}
              <div className="card-body">
                <div style={{ fontSize:11, fontWeight:600, color:"var(--mut)", marginBottom:10,
                  textTransform:"uppercase", letterSpacing:.5 }}>
                  Subject completion
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(140px,1fr))", gap:8 }}>
                  {DEFAULT_SUBJECTS.map(subj => {
                    // We don't have per-subject stats here without another query,
                    // so show a placeholder directing to marks overview
                    return (
                      <div key={subj.code} style={{
                        border:"1px solid var(--bdr)", borderRadius:6,
                        padding:"8px 10px", background:"#fafffe",
                      }}>
                        <div style={{ fontSize:10, fontWeight:600, color:ACC[cls.code] }}>{subj.code}</div>
                        <div style={{ fontSize:11, color:"var(--txt)" }}>{subj.name}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop:12, fontSize:11, color:"var(--mut)" }}>
                  For detailed marks breakdown → <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => navigate("/admin/overview")}>
                    Marks Overview
                  </button>
                </div>
              </div>

              {/* Student list preview */}
              {cls.students.length > 0 && (
                <div style={{ borderTop:"1px solid var(--bdr)", padding:"12px 16px" }}>
                  <div style={{ fontSize:11, fontWeight:600, color:"var(--mut)", marginBottom:8,
                    textTransform:"uppercase", letterSpacing:.5 }}>
                    Students ({cls.students.length})
                  </div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {cls.students.slice(0, 20).map((st, i) => (
                      <span key={st.id} style={{
                        background:"var(--lg)", color:"var(--txt)",
                        padding:"2px 10px", borderRadius:20, fontSize:11,
                      }}>
                        {i+1}. {st.name}
                      </span>
                    ))}
                    {cls.students.length > 20 && (
                      <span style={{ fontSize:11, color:"var(--mut)", padding:"2px 10px" }}>
                        …and {cls.students.length - 20} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </AppShell>
  );
}
