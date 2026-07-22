// Backup of original TeacherViewMarks.jsx
import { useState, useEffect } from "react";
import AppShell from "../components/shared/AppShell";
import { useAuth } from "../hooks/useAuth";
import { getActiveTerm, getStudents, getMarks } from "../utils/db";
import { DEFAULT_SUBJECTS, calcWeightedTotal, calcGrade, GRADE_SCALE } from "../utils/constants";

const CLS_LABEL = { B7:"Basic 7", B8:"Basic 8", B9:"Basic 9" };
const CLS_COLOR = { B7:"var(--b7)", B8:"var(--b8)", B9:"var(--b9)" };

function ordinal(n) {
  if (!n) return "";
  const s = ["th","st","nd","rd"], v = n % 100;
  return n + (s[(v-20)%10] || s[v] || s[0]);
}

export default function TeacherViewMarks() {
  const { profile }       = useAuth();
  const [term,    setTerm]    = useState(null);
  const [selCls,  setSelCls]  = useState("");
  const [selSubj, setSelSubj] = useState("");
  const [students,setStudents]= useState([]);
  const [marks,   setMarks]   = useState({});
  const [loading, setLoading] = useState(false);

  const myClasses  = profile?.classes  || [];
  const mySubjects = (profile?.subjects || [])
    .map(sc => DEFAULT_SUBJECTS.find(s => s.code === sc))
    .filter(Boolean);

  useEffect(() => {
    getActiveTerm().then(t => {
      setTerm(t);
      if (myClasses[0])        setSelCls(myClasses[0]);
      if (mySubjects[0])       setSelSubj(mySubjects[0].code);
    });
  }, [myClasses, mySubjects]);

  useEffect(() => {
    if (!term || !selCls || !selSubj) return;
    setLoading(true);
    Promise.all([
      getStudents(term.id, selCls),
      getMarks(term.id, selCls, selSubj),
    ]).then(([sts, mks]) => {
      setStudents(sts || []);
      setMarks(mks || {});
      setLoading(false);
    }).catch(err => {
      console.error("Failed to load marks:", err);
      setStudents([]);
      setMarks({});
      setLoading(false);
    });
  }, [term, selCls, selSubj]);
  // Rest of the component...
}
