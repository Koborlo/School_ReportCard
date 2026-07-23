// src/pages/AdminTeachers.jsx
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import AppShell from "../components/shared/AppShell";
import { useAuth } from "../hooks/useAuth";
import { getAllTeachers, saveUser, deleteUser, getSubjects, saveDeletedAuth } from "../utils/db";
import { CLASSES, DEFAULT_SUBJECTS } from "../utils/constants";

export default function AdminTeachers() {
  const { createTeacher, updateTeacher } = useAuth();
  const [teachers,  setTeachers]  = useState([]);
  const [subjects,  setSubjects]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [editMode,  setEditMode]  = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [form, setForm] = useState({
    name:"", email:"", password:"", subjects:[], classes:[],
  });

  useEffect(() => {
    Promise.all([getAllTeachers(), getSubjects()]).then(([t, s]) => {
      setTeachers(t.filter(u => u.role === "teacher"));
      setSubjects(s || DEFAULT_SUBJECTS);
      setLoading(false);
    });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim())      { toast.error("Name is required");               return; }
    if (!form.email.trim())     { toast.error("Email is required");              return; }
    if (!editMode && !form.password){ toast.error("Password is required");       return; }
    if (!editMode && form.password.length < 6){ toast.error("Password must be at least 6 characters"); return; }
    if (!form.classes.length)   { toast.error("Assign at least one class");      return; }
    if (!form.subjects.length)  { toast.error("Assign at least one subject");    return; }

    setSaving(true);
    try {
      if (editMode) {
        // Edit — update Firestore only (no auth changes)
        await updateTeacher(editMode, {
          name:     form.name.trim(),
          subjects: form.subjects,
          classes:  form.classes,
          role:     "teacher",
          email:    form.email.trim().toLowerCase(),
        });
        toast.success(`${form.name} updated successfully!`);
      } else {
        // Create — uses REST API so admin stays logged in
        const result = await createTeacher(form.email.trim(), form.password, {
          name:     form.name.trim(),
          subjects: form.subjects,
          classes:  form.classes,
        });
        if (result.passwordReset) {
          toast.success(
            `${form.name} re-added. A password reset link has been sent to their email — they must use it to set a new password before logging in.`,
            { duration: 8000 }
          );
        } else {
          toast.success(`Teacher ${form.name} created successfully!`);
        }
      }
      const updated = await getAllTeachers();
      setTeachers(updated.filter(u => u.role === "teacher"));
      resetForm();
    } catch (err) {
      console.error("Teacher save error:", err);
      toast.error(err.message || "Failed to save teacher");
    }
    setSaving(false);
  }

  async function handleDelete(uid, name) {
    if (!window.confirm(`Remove ${name}? This will remove their profile. If you re-add them later with the same email, a password reset link will be sent automatically.`)) return;
    try {
      const teacher = teachers.find(t => t.uid === uid);
      // Save tombstone so the email can be safely reused later
      if (teacher?.email) await saveDeletedAuth(uid, teacher.email);
      await deleteUser(uid);
      setTeachers(t => t.filter(x => x.uid !== uid));
      toast.success(`${name} removed`);
    } catch (err) {
      toast.error(err.message);
    }
  }

  function startEdit(teacher) {
    setForm({
      name:     teacher.name     || "",
      email:    teacher.email    || "",
      password: "",
      subjects: teacher.subjects || [],
      classes:  teacher.classes  || [],
    });
    setEditMode(teacher.uid);
    setShowForm(true);
    window.scrollTo({ top:0, behavior:"smooth" });
  }

  function resetForm() {
    setForm({ name:"", email:"", password:"", subjects:[], classes:[] });
    setEditMode(null);
    setShowForm(false);
  }

  function toggleSubj(code) {
    setForm(p => ({
      ...p,
      subjects: p.subjects.includes(code)
        ? p.subjects.filter(x => x !== code)
        : [...p.subjects, code],
    }));
  }

  function toggleCls(code) {
    setForm(p => ({
      ...p,
      classes: p.classes.includes(code)
        ? p.classes.filter(x => x !== code)
        : [...p.classes, code],
    }));
  }

  const ACC = { B7:"var(--b7)", B8:"var(--b8)", B9:"var(--b9)" };

  return (
    <AppShell title="Teachers">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={{ fontSize:13, color:"var(--mut)" }}>
          {teachers.length} teacher{teachers.length !== 1 ? "s" : ""} registered
        </div>
        <button className="btn btn-primary btn-sm"
          onClick={() => { resetForm(); setShowForm(true); }}>
          + Add Teacher
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card" style={{ marginBottom:16 }}>
          <div className="card-head">
            <div className="card-title">{editMode ? "Edit Teacher" : "Add New Teacher"}</div>
            <button className="btn btn-secondary btn-sm" onClick={resetForm}>Cancel</button>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <div className="form-group">
                  <label className="form-label">Full Name ✱</label>
                  <input className="form-input" required value={form.name}
                    placeholder="e.g. Ama Mensah"
                    onChange={e => setForm(p => ({ ...p, name:e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address ✱</label>
                  <input className="form-input" type="email" required
                    value={form.email} disabled={!!editMode}
                    placeholder="teacher@school.edu.gh"
                    onChange={e => setForm(p => ({ ...p, email:e.target.value }))} />
                  {editMode && <div className="form-hint">Email cannot be changed after creation</div>}
                </div>
                {!editMode && (
                  <div className="form-group">
                    <label className="form-label">Password ✱</label>
                    <input className="form-input" type="password" required
                      minLength={6} value={form.password}
                      placeholder="Minimum 6 characters"
                      onChange={e => setForm(p => ({ ...p, password:e.target.value }))} />
                    <div className="form-hint">Must be at least 6 characters</div>
                  </div>
                )}
              </div>

              {/* Classes */}
              <div className="form-group">
                <label className="form-label">Assign Classes ✱</label>
                <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginTop:4 }}>
                  {CLASSES.map(c => {
                    const sel = form.classes.includes(c.code);
                    return (
                      <label key={c.code} style={{
                        display:"flex", alignItems:"center", gap:6,
                        padding:"7px 14px", borderRadius:6, cursor:"pointer",
                        border:`1.5px solid ${sel ? ACC[c.code] : "var(--bdr)"}`,
                        background: sel ? ACC[c.code]+"18" : "#fff",
                        fontSize:13, fontWeight: sel ? 600 : 400,
                        color: sel ? ACC[c.code] : "var(--txt)",
                        userSelect:"none",
                      }}>
                        <input type="checkbox" style={{ display:"none" }}
                          checked={sel} onChange={() => toggleCls(c.code)} />
                        {c.label}
                        <span style={{ fontSize:10, color:"var(--mut)" }}>({c.alias})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Subjects */}
              <div className="form-group">
                <label className="form-label">Assign Subjects ✱</label>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:4 }}>
                  {subjects.map(s => {
                    const sel = form.subjects.includes(s.code);
                    return (
                      <label key={s.code} style={{
                        display:"flex", alignItems:"center", gap:5,
                        padding:"4px 12px", borderRadius:20, cursor:"pointer",
                        border:`1.5px solid ${sel ? "var(--mg)" : "var(--bdr)"}`,
                        background: sel ? "var(--mg)" : "#fff",
                        fontSize:11, fontWeight:600,
                        color: sel ? "#fff" : "var(--mut)",
                        userSelect:"none",
                      }}>
                        <input type="checkbox" style={{ display:"none" }}
                          checked={sel} onChange={() => toggleSubj(s.code)} />
                        {s.code}
                        <span style={{ fontSize:10, fontWeight:400, opacity:.8 }}>
                          {" "}{s.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ display:"flex", gap:8, marginTop:4 }}>
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving
                    ? (editMode ? "Updating…" : "Creating…")
                    : (editMode ? "Update Teacher" : "Create Teacher Account")}
                </button>
                <button className="btn btn-secondary" type="button" onClick={resetForm}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Teacher list */}
      {loading ? (
        <div className="loading-center"><div className="spinner"/><span>Loading teachers…</span></div>
      ) : teachers.length === 0 ? (
        <div className="card">
          <div className="card-body" style={{ textAlign:"center", padding:40 }}>
            <div style={{ fontSize:32, marginBottom:12 }}>👩‍🏫</div>
            <div style={{ fontSize:14, fontWeight:600, color:"var(--dg)", marginBottom:6 }}>
              No teachers yet
            </div>
            <div style={{ fontSize:12, color:"var(--mut)", marginBottom:16 }}>
              Add your first teacher using the button above.
            </div>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              + Add Teacher
            </button>
          </div>
        </div>
      ) : (
        <div style={{
          display:"grid",
          gridTemplateColumns:"repeat(auto-fill, minmax(300px,1fr))",
          gap:12,
        }}>
          {teachers.map(t => {
            const missingCls = !(t.classes  || []).length;
            const missingSubj= !(t.subjects || []).length;
            return (
              <div key={t.uid} className="card">
                <div className="card-body">
                  {/* Header */}
                  <div style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:12 }}>
                    <div style={{
                      width:40, height:40, borderRadius:"50%",
                      background:"var(--dg)", color:"var(--gd)",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:14, fontWeight:700, flexShrink:0,
                    }}>
                      {(t.name||"?").split(" ").map(w=>w[0]).slice(0,2).join("")}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:600, color:"var(--dg)" }}>{t.name}</div>
                      <div style={{ fontSize:11, color:"var(--mut)", wordBreak:"break-all" }}>{t.email}</div>
                    </div>
                    <div style={{ display:"flex", gap:5, flexShrink:0 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => startEdit(t)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.uid, t.name)}>Remove</button>
                    </div>
                  </div>

                  {/* Classes */}
                  <div style={{ marginBottom:8 }}>
                    <div style={{ fontSize:10, color:"var(--mut)", marginBottom:4, textTransform:"uppercase", letterSpacing:.5 }}>Classes</div>
                    <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                      {(t.classes||[]).length ? t.classes.map(c => (
                        <span key={c} style={{
                          background:ACC[c]+"18", color:ACC[c],
                          border:`1px solid ${ACC[c]}`,
                          padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:600,
                        }}>{CLASSES.find(x=>x.code===c)?.label||c}</span>
                      )) : (
                        <span style={{ fontSize:11, color:"#B71C1C", background:"#FFEBEE", padding:"2px 8px", borderRadius:20 }}>
                          ⚠ None assigned
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Subjects */}
                  <div>
                    <div style={{ fontSize:10, color:"var(--mut)", marginBottom:4, textTransform:"uppercase", letterSpacing:.5 }}>Subjects</div>
                    <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                      {(t.subjects||[]).length ? t.subjects.map(s => (
                        <span key={s} style={{
                          background:"var(--lg)", color:"var(--mg)",
                          padding:"2px 8px", borderRadius:20, fontSize:10, fontWeight:600,
                        }}>{s}</span>
                      )) : (
                        <span style={{ fontSize:11, color:"#B71C1C", background:"#FFEBEE", padding:"2px 8px", borderRadius:20 }}>
                          ⚠ None assigned
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Warning */}
                  {(missingCls || missingSubj) && (
                    <div style={{
                      marginTop:10, padding:"6px 10px",
                      background:"#FFF8E7", border:"1px solid #FFE082",
                      borderRadius:6, fontSize:11, color:"#92600A",
                    }}>
                      ⚠ This teacher will see a blank dashboard until you assign
                      {missingCls && missingSubj ? " classes and subjects"
                        : missingCls ? " classes" : " subjects"}.
                      Click <strong>Edit</strong> to fix.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
