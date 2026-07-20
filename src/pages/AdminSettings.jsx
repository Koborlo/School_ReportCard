// src/pages/AdminSettings.jsx
import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import AppShell from "../components/shared/AppShell";
import { useAuth } from "../hooks/useAuth";
import { getSettings, saveSettings, saveTerm, getTerms, getSubjects, saveSubjects, getAllTeachers } from "../utils/db";
import { DEFAULT_SUBJECTS, CLASSES } from "../utils/constants";

const NUMERIC_FIELDS = ["days", "passmark"];
const TABS = [
  { key: "school", label: "School Info" },
  { key: "terms", label: "Terms" },
  { key: "teachers", label: "Teachers" },
  { key: "subjects", label: "Subjects" },
];

export default function AdminSettings() {
  const { createTeacher, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("school");
  const [loading, setLoading] = useState(true);

  // Settings
  const [settings, setSettings] = useState({
    schoolName: "", tel: "", circuit: "", postal: "", year: "2026",
    term: "Term 1", days: 65, passmark: 50, vacDate: "", nextTermDate: ""
  });
  const [originalSettings, setOriginalSettings] = useState(null);

  // Data
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [terms, setTerms] = useState([]);

  // Forms
  const [newTeacher, setNewTeacher] = useState({ name: "", email: "", password: "", subjects: [], classes: [] });
  const [newSubject, setNewSubject] = useState({ code: "", name: "", category: "" });
  const [newTerm, setNewTerm] = useState({ id: "", term: "Term 1", year: "2026", active: true, vacDate: "", nextTermDate: "" });

  const [saving, setSaving] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState("");
  const [creatingTeacher, setCreatingTeacher] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([getSettings(), getAllTeachers(), getSubjects(), getTerms()])
      .then(([s, t, sub, tr]) => {
        if (s) {
          setSettings(s);
          setOriginalSettings(s);
        }
        setTeachers(t.filter(u => u.role === "teacher"));
        setSubjects(sub || DEFAULT_SUBJECTS);
        setTerms(tr);
      })
      .catch(err => {
        console.error(err);
        toast.error("Failed to load settings");
      })
      .finally(() => setLoading(false));
  }, []);

  const settingsDirty = useMemo(() => 
    JSON.stringify(settings) !== JSON.stringify(originalSettings),
  [settings, originalSettings]);

  const handleSaveSettings = useCallback(async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveSettings(settings);
      setOriginalSettings(settings);
      toast.success("Settings saved!");
    } catch (err) {
      console.error(err);
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  }, [settings]);

  const validateTeacher = useCallback((data) => {
    const errors = [];
    if (!data.name.trim()) errors.push("Name is required");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push("Invalid email");
    if (data.password.length < 6) errors.push("Password must be at least 6 characters");
    if (data.classes.length === 0) errors.push("Select at least one class");
    if (data.subjects.length === 0) errors.push("Select at least one subject");
    return errors;
  }, []);

  const handleAddTeacher = useCallback(async (e) => {
    e.preventDefault();
    const errors = validateTeacher(newTeacher);
    if (errors.length) {
      errors.forEach(err => toast.error(err));
      return;
    }

    setCreatingTeacher(true);
    try {
      await createTeacher(newTeacher.email, newTeacher.password, {
        name: newTeacher.name.trim(),
        subjects: newTeacher.subjects,
        classes: newTeacher.classes
      });

      toast.success(`Teacher ${newTeacher.name} created! Please sign in again.`);
      setNewTeacher({ name: "", email: "", password: "", subjects: [], classes: [] });

      // Admin was logged out during teacher creation
      // Redirect to login after brief delay
      setTimeout(() => {
        logout();
        navigate("/login");
      }, 2500);

    } catch (err) {
      toast.error(err.message || "Failed to create teacher");
      setCreatingTeacher(false);
    }
  }, [newTeacher, createTeacher, validateTeacher, logout, navigate]);

  const handleAddSubject = useCallback(async (e) => {
    e.preventDefault();
    const code = newSubject.code.toUpperCase().trim();
    const name = newSubject.name.trim();

    if (!code || !name) {
      toast.error("Code and name are required");
      return;
    }
    if (subjects.some(s => s.code === code)) {
      toast.error(`Subject ${code} already exists`);
      return;
    }

    const updated = [...subjects, { code, name, category: newSubject.category }];
    await saveSubjects(updated);
    setSubjects(updated);
    setNewSubject({ code: "", name: "", category: "" });
    toast.success("Subject added!");
  }, [newSubject, subjects]);

  const handleActivateTerm = useCallback(async (termId) => {
    const term = terms.find(t => t.id === termId);
    const currentlyActive = terms.find(t => t.active);

    if (currentlyActive?.id === termId) return;

    if (!window.confirm(
      `Activate ${term.term} ${term.year}?${currentlyActive ? `\n\nThis will deactivate ${currentlyActive.term} ${currentlyActive.year}.` : ''}`
    )) return;

    const updates = [];
    if (currentlyActive) {
      updates.push(saveTerm(currentlyActive.id, { ...currentlyActive, active: false }));
    }
    updates.push(saveTerm(termId, { ...term, active: true }));

    try {
      await Promise.all(updates);
      const updated = await getTerms();
      setTerms(updated);
      toast.success("Term activated!");
    } catch (err) {
      toast.error("Failed to activate term");
      console.error(err);
    }
  }, [terms]);

  const handleCreateTerm = useCallback(async (e) => {
    e.preventDefault();
    const id = `${newTerm.year}-${newTerm.term.trim().replace(/\s+/g, "-").toLowerCase()}`;

    if (terms.some(t => t.id === id)) {
      toast.error("This term already exists");
      return;
    }

    try {
      await saveTerm(id, { ...newTerm, id });
      const updated = await getTerms();
      setTerms(updated);
      setNewTerm({ id: "", term: "Term 1", year: "2026", active: true, vacDate: "", nextTermDate: "" });
      toast.success("Term created!");
    } catch (err) {
      toast.error("Failed to create term");
      console.error(err);
    }
  }, [newTerm, terms]);

  const filteredSubjects = useMemo(() => 
    subjects.filter(s => 
      s.name.toLowerCase().includes(subjectFilter.toLowerCase()) ||
      s.code.toLowerCase().includes(subjectFilter.toLowerCase())
    ),
  [subjects, subjectFilter]);

  if (loading) return (
    <AppShell title="Settings">
      <div className="loading-center"><div className="spinner" /><span>Loading settings…</span></div>
    </AppShell>
  );

  return (
    <AppShell title="Settings">
      <div style={{display:"flex",gap:8,marginBottom:18,borderBottom:"1px solid var(--bdr)",paddingBottom:2}}>
        {TABS.map(t=>(
          <button key={t.key} className={`btn btn-sm ${tab===t.key?"btn-primary":"btn-secondary"}`}
            onClick={()=>setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {/* School Info */}
      {tab==="school" && (
        <div className="card" style={{maxWidth:560}}>
          <div className="card-head"><div className="card-title">School Information</div></div>
          <div className="card-body">
            <form onSubmit={handleSaveSettings}>
              {[["schoolName","School Name"],["tel","Telephone"],["circuit","Circuit"],["postal","Postal Address"]].map(([k,l])=>(
                <div className="form-group" key={k}>
                  <label className="form-label">{l}</label>
                  <input className="form-input" value={settings[k]||""} onChange={e=>setSettings(p=>({...p,[k]:e.target.value}))} />
                </div>
              ))}
              {[["year","Academic Year"],["term","Current Term"],["days","Total School Days"],["passmark","Pass Mark (/100)"],["vacDate","Vacation Date"],["nextTermDate","Next Term Date"]].map(([k,l])=>(
                <div className="form-group" key={k}>
                  <label className="form-label">{l}</label>
                  <input 
                    className="form-input" 
                    type={NUMERIC_FIELDS.includes(k) ? "number" : "text"}
                    value={settings[k]||""} 
                    onChange={e=>setSettings(p=>({...p,[k]: NUMERIC_FIELDS.includes(k) ? Number(e.target.value) : e.target.value}))} 
                  />
                </div>
              ))}
              <button className="btn btn-primary" type="submit" disabled={saving || !settingsDirty}>
                {saving ? "Saving…" : settingsDirty ? "Save Settings" : "Saved"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Terms */}
      {tab==="terms" && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,maxWidth:800}}>
          <div className="card">
            <div className="card-head"><div className="card-title">Create New Term</div></div>
            <div className="card-body">
              <form onSubmit={handleCreateTerm}>
                {[["term","Term Label (e.g. Term 1)"],["year","Academic Year"]].map(([k,l])=>(
                  <div className="form-group" key={k}>
                    <label className="form-label">{l}</label>
                    <input className="form-input" required value={newTerm[k]} onChange={e=>setNewTerm(p=>({...p,[k]:e.target.value}))} />
                  </div>
                ))}
                <button className="btn btn-primary btn-sm">Create Term</button>
              </form>
            </div>
          </div>
          <div className="card">
            <div className="card-head"><div className="card-title">All Terms</div></div>
            <div className="card-body">
              {terms.length===0 && <p style={{fontSize:12,color:"var(--mut)"}}>No terms yet.</p>}
              {terms.map(t=>(
                <div key={t.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid var(--bdr)"}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600}}>{t.term} {t.year}</div>
                    {t.active && <span className="chip chip-green" style={{fontSize:10}}>Active</span>}
                  </div>
                  {!t.active && <button className="btn btn-sm btn-secondary" onClick={()=>handleActivateTerm(t.id)}>Set Active</button>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Teachers */}
      {tab==="teachers" && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,maxWidth:900}}>
          <div className="card">
            <div className="card-head"><div className="card-title">Add Teacher</div></div>
            <div className="card-body">
              <form onSubmit={handleAddTeacher}>
                {[["name","Full Name"],["email","Email"],["password","Password"]].map(([k,l])=>(
                  <div className="form-group" key={k}>
                    <label className="form-label">{l}</label>
                    <input className="form-input" type={k==="password"?"password":"text"} required
                      value={newTeacher[k]} onChange={e=>setNewTeacher(p=>({...p,[k]:e.target.value}))} />
                  </div>
                ))}
                <div className="form-group">
                  <label className="form-label">Classes</label>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {CLASSES.map(c=>(
                      <label key={c.code} style={{display:"flex",alignItems:"center",gap:4,fontSize:12,cursor:"pointer"}}>
                        <input type="checkbox" checked={newTeacher.classes.includes(c.code)}
                          onChange={e=>setNewTeacher(p=>({...p,classes:e.target.checked?[...p.classes,c.code]:p.classes.filter(x=>x!==c.code)}))} />
                        {c.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Subjects</label>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {subjects.map(s=>(
                      <label key={s.code} style={{display:"flex",alignItems:"center",gap:4,fontSize:11,cursor:"pointer"}}>
                        <input type="checkbox" checked={newTeacher.subjects.includes(s.code)}
                          onChange={e=>setNewTeacher(p=>({...p,subjects:e.target.checked?[...p.subjects,s.code]:p.subjects.filter(x=>x!==s.code)}))} />
                        {s.code}
                      </label>
                    ))}
                  </div>
                </div>
                <button className="btn btn-primary btn-sm" type="submit" disabled={creatingTeacher}>
                  {creatingTeacher ? "Creating… (you will be signed out)" : "Create Teacher Account"}
                </button>
              </form>
            </div>
          </div>
          <div className="card">
            <div className="card-head"><div className="card-title">All Teachers ({teachers.length})</div></div>
            <div className="card-body">
              {teachers.map(t=>(
                <div key={t.uid} style={{padding:"8px 0",borderBottom:"1px solid var(--bdr)"}}>
                  <div style={{fontWeight:600,fontSize:13}}>{t.name}</div>
                  <div style={{fontSize:11,color:"var(--mut)"}}>{t.email}</div>
                  <div style={{fontSize:10,color:"var(--mg)",marginTop:2}}>
                    Subjects: {(t.subjects||[]).join(", ")} · Classes: {(t.classes||[]).join(", ")}
                  </div>
                </div>
              ))}
              {teachers.length===0 && <p style={{fontSize:12,color:"var(--mut)"}}>No teachers yet.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Subjects */}
      {tab==="subjects" && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,maxWidth:800}}>
          <div className="card">
            <div className="card-head"><div className="card-title">Add Custom Subject</div></div>
            <div className="card-body">
              <form onSubmit={handleAddSubject}>
                {[["code","Subject Code (e.g. ICT)"],["name","Full Subject Name"],["category","Category"]].map(([k,l])=>(
                  <div className="form-group" key={k}>
                    <label className="form-label">{l}</label>
                    <input className="form-input" required value={newSubject[k]}
                      onChange={e=>setNewSubject(p=>({...p,[k]:e.target.value}))} />
                  </div>
                ))}
                <button className="btn btn-primary btn-sm" type="submit">Add Subject</button>
              </form>
            </div>
          </div>
          <div className="card">
            <div className="card-head"><div className="card-title">All Subjects ({subjects.length})</div></div>
            <div className="card-body">
              <input
                placeholder="Filter subjects..."
                value={subjectFilter}
                onChange={e => setSubjectFilter(e.target.value)}
                style={{ marginBottom: 8, fontSize: 12, padding: "4px 8px", width: "100%", border: "1px solid var(--bdr)", borderRadius: 4 }}
              />
              {filteredSubjects.map(s=>(
                <div key={s.code} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid var(--bdr)",fontSize:12}}>
                  <span><b style={{color:"var(--mg)"}}>{s.code}</b> — {s.name}</span>
                  <span style={{fontSize:10,color:"var(--mut)"}}>{s.category}</span>
                </div>
              ))}
              {filteredSubjects.length === 0 && <p style={{fontSize:12,color:"var(--mut)"}}>No subjects match.</p>}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
