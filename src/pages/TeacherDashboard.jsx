// src/pages/TeacherDashboard.jsx — with full guards + timeout
import{useState,useEffect}from"react";
import{useNavigate}from"react-router-dom";
import AppShell from"../components/shared/AppShell";
import{useAuth}from"../hooks/useAuth";
import{getActiveTerm,getStudents,getMarks}from"../utils/db";
import{DEFAULT_SUBJECTS}from"../utils/constants";

const CLS_LABEL={B7:"Basic 7",B8:"Basic 8",B9:"Basic 9"};
const CLS_COLOR={B7:"var(--b7)",B8:"var(--b8)",B9:"var(--b9)"};

export default function TeacherDashboard(){
  const{profile}=useAuth();
  const navigate=useNavigate();
  const[term,setTerm]=useState(null);
  const[stats,setStats]=useState({});
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState("");
  const[timedOut,setTimedOut]=useState(false);

  useEffect(()=>{
    const t=setTimeout(()=>{if(loading)setTimedOut(true);},10000);
    return()=>clearTimeout(t);
  },[loading]);

  useEffect(()=>{
    async function load(){
      try{
        if(!profile){setError("Profile not found. Contact your administrator.");setLoading(false);return;}
        const myC=profile.classes||[];
        const myS=profile.subjects||[];
        if(!myC.length){setError("No classes assigned. Ask your administrator to assign classes in Settings → Teachers.");setLoading(false);return;}
        if(!myS.length){setError("No subjects assigned. Ask your administrator to assign subjects in Settings → Teachers.");setLoading(false);return;}
        const t=await getActiveTerm();
        setTerm(t);
        if(!t){setLoading(false);return;}
        const s={};
        for(const c of myC){
          s[c]={};
          const students=await getStudents(t.id,c);
          for(const sc of myS){
            const marks=await getMarks(t.id,c,sc);
            const filled=students.filter(st=>{const m=marks[st.id]||{};return m.t1!==undefined&&m.t1!==""&&m.ex!==undefined&&m.ex!==""}).length;
            s[c][sc]={filled,total:students.length};
          }
        }
        setStats(s);
      }catch(e){
        console.error("TeacherDashboard:",e);
        setError(e.message);
      }finally{
        setLoading(false);
      }
    }
    load();
  },[profile]);

  const mySubjects=(profile?.subjects||[]).map(sc=>DEFAULT_SUBJECTS.find(s=>s.code===sc)).filter(Boolean);
  const myClasses=profile?.classes||[];
  let tf=0,ta=0;
  myClasses.forEach(c=>mySubjects.forEach(s=>{const st=stats[c]?.[s.code];if(st){tf+=st.filled;ta+=st.total;}}));

  if(loading) return(
    <AppShell title="My Dashboard">
      <div className="loading-center">
        <div className="spinner"/>
        <span>Loading your dashboard…</span>
        {timedOut&&(
          <div className="alert alert-warn" style={{maxWidth:440,marginTop:12}}>
            <div style={{fontWeight:600,marginBottom:6}}>Still loading after 10 seconds</div>
            <ul style={{paddingLeft:16,lineHeight:2,fontSize:12}}>
              <li>Ask admin to go to <strong>Settings → Terms</strong> and click <strong>Set Active</strong></li>
              <li>Check your Firestore security rules are published</li>
              <li>Try a hard refresh: <strong>Ctrl+Shift+R</strong></li>
            </ul>
            <button className="btn btn-secondary btn-sm" style={{marginTop:8}}
              onClick={()=>window.location.reload()}>Retry</button>
          </div>
        )}
      </div>
    </AppShell>
  );

  if(error) return(
    <AppShell title="My Dashboard">
      <div className="alert alert-danger" style={{maxWidth:520}}>
        <div><strong>⚠ Cannot load dashboard</strong><br/><br/>{error}</div>
      </div>
    </AppShell>
  );

  return(
    <AppShell title="My Dashboard" termLabel={term?`${term.term} ${term.year}`:""}>
      {!term&&(
        <div className="alert alert-warn" style={{marginBottom:16}}>
          ⚠ <strong>No active term.</strong> Ask your administrator to set an active term in Settings → Terms.
          You cannot enter marks until this is done.
        </div>
      )}
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-label">My Classes</div><div className="stat-value">{myClasses.length}</div><div className="stat-sub">{myClasses.map(c=>CLS_LABEL[c]||c).join(", ")}</div></div>
        <div className="stat-card"><div className="stat-label">My Subjects</div><div className="stat-value">{mySubjects.length}</div><div className="stat-sub">{mySubjects.map(s=>s.code).join(", ")}</div></div>
        <div className="stat-card"><div className="stat-label">Marks Entered</div><div className="stat-value">{ta?Math.round(tf/ta*100):0}%</div><div className="stat-sub">{tf} of {ta} rows</div></div>
        <div className="stat-card"><div className="stat-label">Status</div>
          <div className="stat-value" style={{fontSize:14,marginTop:6,color:tf===ta&&ta>0?"var(--mg)":"var(--gd)"}}>
            {tf===ta&&ta>0?"✓ Complete":"In Progress"}
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-head">
          <div className="card-title">My Mark Sheets — click to open</div>
          {!term&&<span style={{fontSize:10,color:"#B71C1C",background:"#FFEBEE",padding:"2px 8px",borderRadius:4}}>No active term</span>}
        </div>
        <div className="card-body">
          {myClasses.length===0?(
            <div className="alert alert-warn">No classes assigned. Contact your administrator.</div>
          ):(
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
              {myClasses.map(cls=>mySubjects.map(subj=>{
                const st=stats[cls]?.[subj.code]||{filled:0,total:0};
                const pct=st.total?Math.round(st.filled/st.total*100):0;
                return(
                  <div key={`${cls}-${subj.code}`}
                    onClick={()=>term&&navigate(`/teacher/marks?cls=${cls}&subj=${subj.code}`)}
                    style={{border:"1.5px solid var(--bdr)",borderRadius:8,padding:14,cursor:term?"pointer":"not-allowed",transition:"all .15s",background:"#fff",opacity:term?1:0.6}}
                    onMouseEnter={e=>term&&(e.currentTarget.style.borderColor=CLS_COLOR[cls]||"var(--mg)")}
                    onMouseLeave={e=>(e.currentTarget.style.borderColor="var(--bdr)")}>
                    <div style={{fontSize:10,fontWeight:600,color:CLS_COLOR[cls]||"var(--mg)",marginBottom:4}}>{CLS_LABEL[cls]||cls}</div>
                    <div style={{fontSize:13,fontWeight:600,color:"var(--dg)"}}>{subj.name}</div>
                    <div style={{fontSize:10,color:"var(--mut)",margin:"4px 0"}}>{st.filled}/{st.total} students filled</div>
                    <div className="progress-bar"><div className="progress-fill" style={{width:`${pct}%`,background:CLS_COLOR[cls]||"var(--mg)"}}/></div>
                    {!term&&<div style={{fontSize:10,color:"#B71C1C",marginTop:4}}>Waiting for active term</div>}
                  </div>
                );
              }))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
