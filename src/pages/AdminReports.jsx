// src/pages/AdminReports.jsx
import { useState, useEffect } from "react";
import AppShell from "../components/shared/AppShell";
import { ReportCardDownloadBtn } from "../components/shared/ReportCardPDF";
import { getActiveTerm, getStudents, getAllMarksForClass } from "../utils/db";
import { CLASSES, DEFAULT_SUBJECTS } from "../utils/constants";

export default function AdminReports() {
  const [term,      setTerm]     = useState(null);
  const [selClass,  setSelClass] = useState("B7");
  const [students,  setStudents] = useState([]);
  const [allMarks,  setAllMarks] = useState({});
  const [subjects,  setSubjects] = useState(DEFAULT_SUBJECTS);
  const [settings,  setSettings] = useState({ year:"2026", term:"Term 1", vacDate:"19th December 2026", nextTermDate:"13th January 2027" });
  const [loading,   setLoading]  = useState(false);

  useEffect(() => { getActiveTerm().then(t => { setTerm(t); if(t) setSettings(s=>({...s,year:t.year,term:t.term,vacDate:t.vacDate||s.vacDate,nextTermDate:t.nextTermDate||s.nextTermDate})); }); }, []);

  useEffect(() => {
    if (!term) return;
    setLoading(true);
    Promise.all([
      getStudents(term.id, selClass),
      getAllMarksForClass(term.id, selClass, subjects.map(s=>s.code))
    ]).then(([sts, marks]) => {
      setStudents(sts);
      setAllMarks(marks);
      setLoading(false);
    });
  }, [term, selClass, subjects]);

  const CLS_META = { B7:{label:"Basic 7",color:"var(--b7)"}, B8:{label:"Basic 8",color:"var(--b8)"}, B9:{label:"Basic 9",color:"var(--b9)"} };

  return (
    <AppShell title="Report Cards" termLabel={term?`${term.term} ${term.year}`:""}>
      <div style={{display:"flex",gap:8,marginBottom:14}}>
        {CLASSES.map(c=>(
          <button key={c.code} className={`btn btn-sm ${selClass===c.code?"btn-primary":"btn-secondary"}`}
            style={selClass===c.code?{background:CLS_META[c.code].color,borderColor:CLS_META[c.code].color}:{}}
            onClick={()=>setSelClass(c.code)}>{c.label}</button>
        ))}
      </div>

      {!term && <div className="alert alert-warn">No active term. Create a term in Settings first.</div>}

      {term && (
        <div className="card">
          <div className="card-head">
            <div className="card-title">
              {CLS_META[selClass].label} — {students.length} students
            </div>
            <span style={{fontSize:11,color:"var(--mut)"}}>Click a student to download their report card PDF</span>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="loading-center"><div className="spinner"/></div>
            ) : students.length === 0 ? (
              <div className="alert alert-warn">No students in this class yet. Add students in the Students section.</div>
            ) : (
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:10}}>
                {students.map((st,idx)=>(
                  <div key={st.id} style={{border:"1px solid var(--bdr)",borderRadius:8,padding:12,background:"#fff"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                      <div style={{width:32,height:32,borderRadius:"50%",background:CLS_META[selClass].color,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:11,flexShrink:0}}>
                        {st.name.split(" ").map(w=>w[0]).slice(0,2).join("")}
                      </div>
                      <div>
                        <div style={{fontSize:13,fontWeight:600,color:"var(--dg)"}}>{st.name}</div>
                        <div style={{fontSize:10,color:"var(--mut)"}}>Student #{idx+1}</div>
                      </div>
                    </div>
                    <ReportCardDownloadBtn
                      student={st}
                      classLabel={CLS_META[selClass].label}
                      term={settings.term}
                      year={settings.year}
                      subjects={subjects}
                      allMarks={allMarks}
                      studentList={students}
                      vacDate={settings.vacDate}
                      nextTermDate={settings.nextTermDate}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
