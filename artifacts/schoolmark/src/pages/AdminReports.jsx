// src/pages/AdminReports.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import AppShell from "../components/shared/AppShell";
import { ReportCardDownloadBtn } from "../components/shared/ReportCardPDF";
import { getActiveTerm, getStudents, getAllMarksForClass, getSettings } from "../utils/db";
import { CLASSES, DEFAULT_SUBJECTS } from "../utils/constants";
import { sendPasswordResetEmail } from 'firebase/auth';

const CLS_META = {
  B7: { label: "Basic 7", color: "var(--b7)" },
  B8: { label: "Basic 8", color: "var(--b8)" },
  B9: { label: "Basic 9", color: "var(--b9)" },
};

export default function AdminReports() {
  const [term, setTerm] = useState(null);
  const [selClass, setSelClass] = useState("B7");
  const [students, setStudents] = useState([]);
  const [allMarks, setAllMarks] = useState({});
  const [subjects, setSubjects] = useState(DEFAULT_SUBJECTS);
  const [settings, setSettings] = useState({
    year: "2026", term: "Term 1", vacDate: "", nextTermDate: "", schoolName: ""
  });
  const [loading, setLoading] = useState(false);
  const [batchDownloading, setBatchDownloading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  // Fetch active term + settings on mount
  useEffect(() => {
    Promise.all([getActiveTerm(), getSettings()]).then(([t, s]) => {
      if (t) {
        setTerm(t);
        setSettings(prev => ({
          ...prev,
          year: t.year,
          term: t.term,
          vacDate: t.vacDate || s?.vacDate || prev.vacDate,
          nextTermDate: t.nextTermDate || s?.nextTermDate || prev.nextTermDate,
          schoolName: s?.schoolName || "",
        }));
      }
      if (s?.subjects) setSubjects(s.subjects);
    });
  }, []);

  // Fetch students + marks when term/class changes
  useEffect(() => {
    if (!term) return;
    setLoading(true);
    Promise.all([
      getStudents(term.id, selClass),
      getAllMarksForClass(term.id, selClass, subjects.map(s => s.code)),
    ])
      .then(([sts, marks]) => {
        setStudents(sts);
        setAllMarks(marks);
      })
      .catch(err => {
        console.error(err);
        toast.error("Failed to load report card data");
      })
      .finally(() => setLoading(false));
  }, [term, selClass]); // Removed subjects from deps — fetched separately

  // Memoized stats
  const stats = useMemo(() => ({
    total: students.length,
    hasMarks: students.filter(s => allMarks[s.id] && Object.keys(allMarks[s.id]).length > 0).length,
  }), [students, allMarks]);

  // Batch download all report cards
const downloadAll = useCallback(async () => {
  if (!students.length || batchDownloading) return;
  setBatchDownloading(true);
  const toastId = toast.loading(`Preparing ${students.length} report cards...`);

  try {
    const results = await generateBatchPDFs({
      students,
      classLabel: CLS_META[selClass].label,
      term: settings.term,
      year: settings.year,
      subjects,
      allMarks,
      studentList: students, // same as students in this context
      vacDate: settings.vacDate,
      nextTermDate: settings.nextTermDate,
      schoolName: settings.schoolName,
      onProgress: (done, total) => {
        toast.loading(`Downloaded ${done} of ${total}...`, { id: toastId });
      },
    });

    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    if (failCount === 0) {
      toast.success(`All ${successCount} report cards downloaded!`, { id: toastId });
    } else {
      toast.error(`${failCount} failed, ${successCount} succeeded`, { id: toastId });
    }
  } catch (err) {
    console.error(err);
    toast.error("Batch download failed", { id: toastId });
  } finally {
    setBatchDownloading(false);
  }
}, [students, batchDownloading, settings, subjects, allMarks, selClass]);

  return (
    <AppShell title="Report Cards" termLabel={term ? `${term.term} ${term.year}` : ""}>
      {/* Class selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        {CLASSES.map(c => (
          <button
            key={c.code}
            className={`btn btn-sm ${selClass === c.code ? "btn-primary" : "btn-secondary"}`}
            style={selClass === c.code ? { background: CLS_META[c.code].color, borderColor: CLS_META[c.code].color } : {}}
            onClick={() => setSelClass(c.code)}
          >
            {c.label}
          </button>
        ))}

        {term && students.length > 0 && (
          <button
            className="btn btn-primary btn-sm"
            onClick={downloadAll}
            disabled={batchDownloading}
            style={{ marginLeft: "auto" }}
          >
            {batchDownloading ? "Generating…" : `Download All (${students.length})`}
          </button>
        )}
      </div>

      {!term && (
        <div className="alert alert-warn">
          No active term. Create a term in Settings first.
        </div>
      )}

      {term && (
        <div className="card">
          <div className="card-head">
            <div className="card-title">
              {CLS_META[selClass].label} — {stats.total} students
              {stats.hasMarks > 0 && (
                <span style={{ fontSize: 11, color: "var(--mut)", marginLeft: 8, fontWeight: 400 }}>
                  ({stats.hasMarks} with marks)
                </span>
              )}
            </div>
            <span style={{ fontSize: 11, color: "var(--mut)" }}>
              Click a student to download their report card PDF
            </span>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="loading-center"><div className="spinner" /></div>
            ) : students.length === 0 ? (
              <div className="alert alert-warn">
                No students in this class yet. Add students in the Students section.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
                {students.map((st, idx) => (
                  <div
                    key={st.id}
                    style={{
                      border: "1px solid var(--bdr)", borderRadius: 8,
                      padding: 12, background: "#fff",
                      opacity: downloadingId === st.id ? 0.6 : 1,
                      transition: "opacity 0.2s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: "50%",
                        background: CLS_META[selClass].color,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontWeight: 700, fontSize: 11, flexShrink: 0,
                      }}>
                        {st.name.split(" ").map(w => w[0]).slice(0, 2).join("")}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--dg)" }}>{st.name}</div>
                        <div style={{ fontSize: 10, color: "var(--mut)" }}>Student #{idx + 1}</div>
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
                      schoolName={settings.schoolName}
                      onStart={() => setDownloadingId(st.id)}
                      onEnd={() => setDownloadingId(null)}
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
