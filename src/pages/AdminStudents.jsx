// src/pages/AdminStudents.jsx — with student name cleaner (strips -- A / -- B suffixes)
import{useState,useEffect}from"react";
import toast from"react-hot-toast";
import AppShell from"../components/shared/AppShell";
import{getActiveTerm,getStudents,saveStudents,deleteStudent,deleteAllStudents}from"../utils/db";
import{CLASSES}from"../utils/constants";

const CM={
  B7:{label:"Basic 7",color:"var(--b7)"},
  B8:{label:"Basic 8",color:"var(--b8)"},
  B9:{label:"Basic 9",color:"var(--b9)"},
};

// Strips common suffixes like " -- A", " -- B", " - A", " -A" from pasted names
function cleanName(raw){
  return raw
    .replace(/\s*[-–]+\s*[ABab]\s*$/,"")  // trailing " -- A" or " -- B"
    .replace(/\s+/g," ")
    .trim();
}

export default function AdminStudents(){
  const[term,setTerm]=useState(null);
  const[cls,setCls]=useState("B7");
  const[students,setStudents]=useState([]);
  const[bulk,setBulk]=useState("");
  const[loading,setLoading]=useState(false);
  const[deleting,setDeleting]=useState(false);
  const[preview,setPreview]=useState([]);

  useEffect(()=>{getActiveTerm().then(setTerm);},[]);

  useEffect(()=>{
    if(!term)return;
    setLoading(true);
    getStudents(term.id,cls).then(s=>{setStudents(s);setLoading(false);});
  },[term,cls]);

  // Live preview of cleaned names as user types
  useEffect(()=>{
    const names=bulk.split("\n").map(cleanName).filter(Boolean);
    setPreview(names);
  },[bulk]);

  async function handleAdd(e){
    e.preventDefault();
    if(!term)return;
    const names=bulk.split("\n").map(cleanName).filter(Boolean);
    if(!names.length){toast.error("No names found");return;}
    const newSt=names.map((name,i)=>({
      id:`${cls}-${Date.now()}-${i}`,
      name,
      index:students.length+i,
    }));
    await saveStudents(term.id,cls,newSt);
    const updated=await getStudents(term.id,cls);
    setStudents(updated);setBulk("");setPreview([]);
    toast.success(`${newSt.length} students added to ${CM[cls].label}!`);
  }

  async function handleDel(id){
    if(!window.confirm("Remove this student?"))return;
    await deleteStudent(term.id,cls,id);
    setStudents(s=>s.filter(x=>x.id!==id));
    toast.success("Student removed");
  }

  async function handleDeleteAll(){
    if(!window.confirm(`Delete ALL ${students.length} students in ${CM[cls].label}? This cannot be undone!`))return;
    if(!term)return;
    setDeleting(true);
    try{
      const success=await deleteAllStudents(term.id,cls);
      if(success){
        setStudents([]);
        toast.success("All students deleted");
      }else{
        toast.error("Failed to delete students");
      }
    }catch(err){
      console.error("Delete error:",err);
      toast.error("Error deleting students");
    }finally{
      setDeleting(false);
    }
  }

  return(
    <AppShell title="Students" termLabel={term?`${term.term} ${term.year}`:""}>
      <div style={{display:"flex",gap:8,marginBottom:14,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {CLASSES.map(c=>(
            <button key={c.code}
              className={`btn btn-sm ${cls===c.code?"btn-primary":"btn-secondary"}`}
              style={cls===c.code?{background:CM[c.code].color,borderColor:CM[c.code].color}:{}}
              onClick={()=>setCls(c.code)}>{c.label}</button>
          ))}
        </div>
         
        {students.length>0&&(
          <button
            className="btn btn-sm"
            onClick={handleDeleteAll}
            disabled={deleting}
            style={{background:"#B71C1C",color:"#fff",border:"none"}}
            title="Delete all students in this class"
          >
            {deleting?"Deleting…":"Delete All"}
          </button>
        )}
      </div>

      {!term&&<div className="alert alert-warn">Create an active term in Settings → Terms first.</div>}

      {term&&(
        <div style={{display:"grid",gridTemplateColumns:"340px 1fr",gap:14}}>
          {/* Add students panel */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">Add Students — {CM[cls].label}</div>
            </div>
            <div className="card-body">
              <form onSubmit={handleAdd}>
                <div className="form-group">
                  <label className="form-label">Paste names (one per line)</label>
                  <textarea className="form-input" rows={10} value={bulk}
                    onChange={e=>setBulk(e.target.value)}
                    placeholder={"Ama Mensah\nKofi Asante\nAkua Boateng"}
                    style={{resize:"vertical",fontFamily:"monospace",fontSize:12}}/>
                  <div className="form-hint">
                    Names like "JOHN DOE -- B" are automatically cleaned to "JOHN DOE"
                  </div>
                </div>

                {/* Live preview */}
                {preview.length>0&&(
                  <div style={{background:"var(--lg)",borderRadius:6,padding:"8px 10px",marginBottom:12,fontSize:11,color:"var(--mg)"}}>
                    <div style={{fontWeight:600,marginBottom:4}}>Preview ({preview.length} names):</div>
                    {preview.slice(0,5).map((n,i)=><div key={i}>• {n}</div>)}
                    {preview.length>5&&<div style={{color:"var(--mut)"}}>…and {preview.length-5} more</div>}
                  </div>
                )}

                <button className="btn btn-primary btn-sm" type="submit">
                  Add {preview.length>0?preview.length:""} Students
                </button>
              </form>
            </div>
          </div>

          {/* Student list */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">{CM[cls].label} — {students.length} students</div>
            </div>
            <div className="card-body" style={{padding:0}}>
              {loading?(
                <div className="loading-center"><div className="spinner"/></div>
              ):students.length===0?(
                <div style={{padding:16}}>
                  <div className="alert alert-info">No students yet. Paste names in the form and click Add Students.</div>
                </div>
              ):(
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead><tr>
                    <th style={{textAlign:"left",padding:"8px 14px",background:"var(--dg)",color:"#fff",fontSize:11,width:40}}>#</th>
                    <th style={{textAlign:"left",padding:"8px 14px",background:"var(--dg)",color:"#fff",fontSize:11}}>Name</th>
                    <th style={{padding:"8px 14px",background:"var(--dg)",color:"#fff",fontSize:11,width:80}}>Action</th>
                  </tr></thead>
                  <tbody>
                    {students.map((st,i)=>(
                      <tr key={st.id} style={{borderBottom:"1px solid var(--bdr)",background:i%2===0?"#fff":"var(--pg)"}}>
                        <td style={{padding:"6px 14px",color:"var(--mut)"}}>{i+1}</td>
                        <td style={{padding:"6px 14px",fontWeight:500}}>{st.name}</td>
                        <td style={{padding:"6px 14px",textAlign:"center"}}>
                          <button className="btn btn-danger btn-sm" onClick={()=>handleDel(st.id)}>Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
