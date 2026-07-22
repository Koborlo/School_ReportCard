// src/pages/TeacherMarksPage.jsx
// FIX: Navigation guard — warns teacher before leaving with unsaved marks
import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate, useBlocker } from "react-router-dom";
import AppShell from "../components/shared/AppShell";
import MarkSheet from "../components/teacher/MarkSheet";
import { useAuth } from "../hooks/useAuth";
import { getActiveTerm } from "../utils/db";
import { DEFAULT_SUBJECTS } from "../utils/constants";

const CLS_LABEL = { B7:"Basic 7", B8:"Basic 8", B9:"Basic 9" };
const CLS_COLOR = { B7:"var(--b7)", B8:"var(--b8)", B9:"var(--b9)" };

export default function TeacherMarksPage() {
  const { profile }         = useAuth();
  const [params, setParams] = useSearchParams();
  const [term, setTerm]     = useState(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const pendingNav = useRef(null);

  useEffect(() => { getActiveTerm().then(setTerm); }, []);

  const cls      = params.get("cls")  || profile?.classes?.[0]  || "B7";
  const subj     = params.get("subj") || profile?.subjects?.[0] || "EN";
  const subjName = DEFAULT_SUBJECTS.find(s => s.code === subj)?.name || subj;
  const myC = profile?.classes  || [];
  const myS = profile?.subjects || [];

  return (
    <AppShell
      title="Enter Marks"
      crumb={`${CLS_LABEL[cls] || cls} · ${subjName}`}
      termLabel={term ? `${term.term} ${term.year}` : ""}
    >
      {/* Subject / Class switcher */}
      <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
        {myC.map(c => myS.map(s => {
          const sn     = DEFAULT_SUBJECTS.find(x => x.code === s)?.name || s;
          const active = c === cls && s === subj;
          return (
            <button
              key={`${c}-${s}`}
              onClick={() => setParams({ cls:c, subj:s })}
              className="btn btn-sm"
              style={{
                borderColor: active ? CLS_COLOR[c] || "var(--mg)" : "var(--bdr)",
                background:  active ? CLS_COLOR[c] || "var(--mg)" : "#fff",
                color:       active ? "#fff" : "var(--txt)",
              }}
            >
              {CLS_LABEL[c] || c} — {sn}
            </button>
          );
        }))}
      </div>

      {!term && (
        <div className="alert alert-warn">
          No active term found. Ask your administrator to set an active term in
          Settings → Terms.
        </div>
      )}

      {term && (
        <MarkSheet
          termId={term.id}
          classCode={cls}
          classLabel={CLS_LABEL[cls] || cls}
          subjectCode={subj}
          subjectName={subjName}
        />
      )}
    </AppShell>
  );
}
