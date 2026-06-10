// src/pages/TeacherMarksPage.jsx
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import AppShell from "../components/shared/AppShell";
import MarkSheet from "../components/teacher/MarkSheet";
import { useAuth } from "../hooks/useAuth";
import { getActiveTerm } from "../utils/db";
import { DEFAULT_SUBJECTS } from "../utils/constants";

const CLS = { B7:"Basic 7", B8:"Basic 8", B9:"Basic 9" };

export default function TeacherMarksPage() {
  const { profile }        = useAuth();
  const [params, setParams]= useSearchParams();
  const [term, setTerm]    = useState(null);
  const cls   = params.get("cls")  || profile?.classes?.[0]  || "B7";
  const subj  = params.get("subj") || profile?.subjects?.[0] || "EN";
  const subjName = DEFAULT_SUBJECTS.find(s=>s.code===subj)?.name || subj;

  useEffect(() => { getActiveTerm().then(setTerm); }, []);

  const myClasses  = profile?.classes  || [];
  const mySubjects = profile?.subjects || [];

  return (
    <AppShell title="Enter Marks" crumb={`${CLS[cls]} · ${subjName}`}
      termLabel={term ? `${term.term} ${term.year}` : ""}>
      {/* Class + Subject selector */}
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        {myClasses.map(c => mySubjects.map(s => {
          const sn = DEFAULT_SUBJECTS.find(x=>x.code===s)?.name||s;
          const active = c===cls && s===subj;
          const accentColor = c==="B7"?"var(--b7)":c==="B8"?"var(--b8)":"var(--b9)";
          return (
            <button key={`${c}-${s}`}
              onClick={() => setParams({cls:c,subj:s})}
              className="btn btn-sm"
              style={{
                borderColor: active ? accentColor : "var(--bdr)",
                background:  active ? accentColor : "#fff",
                color:       active ? "#fff" : "var(--txt)",
              }}
            >{CLS[c]} — {sn}</button>
          );
        }))}
      </div>

      {term ? (
        <MarkSheet
          termId={term.id} classCode={cls} classLabel={CLS[cls]}
          subjectCode={subj} subjectName={subjName}
        />
      ) : (
        <div className="alert alert-warn">
          No active term found. Ask your administrator to set up a term first.
        </div>
      )}
    </AppShell>
  );
}
