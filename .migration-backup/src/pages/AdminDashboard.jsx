// src/pages/AdminDashboard.jsx — fixed with error boundaries + loading timeout
import{useState,useEffect}from"react";
import AppShell from"../components/shared/AppShell";
import{getActiveTerm,getCompletionStats,getAllTeachers}from"../utils/db";
import{CLASSES,DEFAULT_SUBJECTS}from"../utils/constants";

function heatColor(p){
  if(p>=90)return{bg:"#C8E6C9",col:"#1B5E20"};
  if(p>=70)return{bg:"#DCEDC8",col:"#33691E"};
  if(p>=50)return{bg:"#FFF9C4",col:"#827717"};
  if(p>=20)return{bg:"#FFE0B2",col:"#E65100"};
  return{bg:"#FFCDD2",col:"#B71C1C"};
}
const ACC={B7:"var(--b7)",B8:"var(--b8)",B9:"var(--b9)"};

export default function AdminDashboard(){
  const[term,setTerm]=useState(null);
  const[stats,setStats]=useState({});
  const[teachers,setTeachers]=useState([]);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState("");
  const[timedOut,setTimedOut]=useState(false);

  useEffect(()=>{
    const t=setTimeout(()=>{ if(loading) setTimedOut(true); },10000);
    return()=>clearTimeout(t);
  },[loading]);

  useEffect(()=>{
    async function load(){
      try{
        const[t,tch]=await Promise.all([getActiveTerm(),getAllTeachers()]);
        setTerm(t);
        setTeachers(tch.filter(u=>u.role==="teacher"));
        if(t){
          const s=await getCompletionStats(t.id,DEFAULT_SUBJECTS,CLASSES);
          setStats(s);
        }
      }catch(e){
        console.error("AdminDashboard:",e);
        setError(e.message);
      }finally{
        setLoading(false);
      }
    }
    load();
  },[]);

  let gf=0,gt=0;
  CLASSES.forEach(c=>DEFAULT_SUBJECTS.forEach(s=>{
    const st=stats[c.code]?.[s.code];
    if(st){gf+=st.filled;gt+=st.total;}
  }));

  if(loading) return(
    <AppShell title="Admin Dashboard">
      <div className="loading-center">
        <div className="spinner"/>
        <span>Loading dashboard…</span>
        {timedOut&&(
          <div className="alert alert-warn" style={{maxWidth:420,marginTop:12}}>
            <div style={{fontWeight:600,marginBottom:6}}>Still loading after 10 seconds</div>
            <ul style={{paddingLeft:16,lineHeight:2,fontSize:12}}>
              <li>Go to <strong>Settings → Terms</strong> and make sure a term is set <strong>Active</strong></li>
              <li>Check your Firestore <strong>Rules</strong> tab — make sure you published the rules from the README</li>
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
    <AppShell title="Admin Dashboard">
      <div className="alert alert-danger">
        <div><strong>Error loading dashboard:</strong> {error}</div>
        <div style={{marginTop:6,fontSize:11}}>Check the browser console for details.</div>
      </div>
    </AppShell>
  );

  return(
    <AppShell title="Admin Dashboard" termLabel={term?`${term.term} ${term.year}`:""}>
      {!term&&(
        <div className="alert alert-warn" style={{marginBottom:16}}>
          ⚠ <strong>No active term.</strong> Go to <strong>Settings → Terms</strong> → create a term → click <strong>Set Active</strong>.
          Nothing will work until a term is active.
        </div>
      )}
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-label">Classes</div><div className="stat-value">3</div><div className="stat-sub">Basic 7, 8 &amp; 9</div></div>
        <div className="stat-card"><div className="stat-label">Subjects</div><div className="stat-value">{DEFAULT_SUBJECTS.length}</div></div>
        <div className="stat-card"><div className="stat-label">Teachers</div><div className="stat-value">{teachers.length}</div></div>
        <div className="stat-card"><div className="stat-label">Overall Progress</div><div className="stat-value">{gt?Math.round(gf/gt*100):0}%</div><div className="stat-sub">{gf} of {gt} rows</div></div>
      </div>

      <div className="card" style={{marginBottom:14}}>
        <div className="card-head">
          <div className="card-title">Marks Completion Heatmap</div>
          <span className="chip chip-green"><span className="live-dot"/> Live</span>
        </div>
        <div className="card-body">
          {!term?(
            <div className="alert alert-warn" style={{marginBottom:0}}>No active term — heatmap unavailable.</div>
          ):(
            <>
              <div style={{display:"flex",gap:3,marginBottom:4,paddingLeft:70}}>
                {DEFAULT_SUBJECTS.map(s=>(
                  <div key={s.code} style={{flex:1,textAlign:"center",fontSize:9,fontWeight:600,color:"var(--mut)"}}>{s.code}</div>
                ))}
              </div>
              {CLASSES.map(cls=>(
                <div key={cls.code} className="hm-row">
                  <div className="hm-label">{cls.label}</div>
                  {DEFAULT_SUBJECTS.map(subj=>{
                    const st=stats[cls.code]?.[subj.code]||{filled:0,total:0};
                    const pct=st.total?Math.round(st.filled/st.total*100):0;
                    const{bg,col}=heatColor(pct);
                    return(
                      <div key={subj.code} className="hm-cell" style={{background:bg,color:col}}
                        title={`${cls.label} ${subj.code}: ${pct}% (${st.filled}/${st.total})`}>
                        {pct}%
                      </div>
                    );
                  })}
                </div>
              ))}
              <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
                {[["#FFCDD2","#B71C1C","0–20%"],["#FFE0B2","#E65100","20–50%"],["#FFF9C4","#827717","50–70%"],["#C8E6C9","#1B5E20","90%+"]].map(([bg,col,lbl])=>(
                  <span key={lbl} style={{background:bg,color:col,padding:"2px 10px",borderRadius:4,fontSize:10,fontWeight:600}}>{lbl}</span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-head"><div className="card-title">Class Summary</div></div>
        <div className="tbl-wrap">
          <table>
            <thead><tr>
              <th style={{textAlign:"left"}}>Class</th>
              <th>Subjects</th><th>Rows Filled</th>
              <th style={{minWidth:120}}>Progress</th><th>%</th>
            </tr></thead>
            <tbody>
              {CLASSES.map(cls=>{
                let cf=0,ct=0;
                DEFAULT_SUBJECTS.forEach(s=>{const st=stats[cls.code]?.[s.code]||{filled:0,total:0};cf+=st.filled;ct+=st.total;});
                const pct=ct?Math.round(cf/ct*100):0;
                return(
                  <tr key={cls.code}>
                    <td style={{textAlign:"left"}}>
                      <span className="chip" style={{background:ACC[cls.code]+"22",color:ACC[cls.code]}}>{cls.label}</span>
                    </td>
                    <td>{DEFAULT_SUBJECTS.length}</td>
                    <td>{cf}/{ct}</td>
                    <td><div className="progress-bar" style={{margin:0}}><div className="progress-fill" style={{width:`${pct}%`,background:ACC[cls.code]}}/></div></td>
                    <td style={{fontWeight:700,color:pct===100?"var(--mg)":"var(--gd)"}}>{pct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
