import { createContext, useContext, useState, useEffect } from 'react';
import { getSubjects } from '../utils/db';
import { DEFAULT_SUBJECTS } from '../utils/constants';

const SubjectsContext = createContext(null);

export function SubjectsProvider({ children }) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSubjects()
      .then(data => setSubjects(data || DEFAULT_SUBJECTS))
      .catch(err => {
        console.error('Failed to load subjects:', err);
        setSubjects(DEFAULT_SUBJECTS);
      })
      .finally(() => setLoading(false));
  }, []);

  const resolveSubjects = (subjectCodes) => {
    if (!Array.isArray(subjectCodes)) return [];
    return subjectCodes
      .map(code => subjects.find(s => s.code === code))
      .filter(s => s !== undefined);
  };

  return (
    <SubjectsContext.Provider value={{ subjects, loading, resolveSubjects }}>
      {children}
    </SubjectsContext.Provider>
  );
}

export function useSubjects() {
  const ctx = useContext(SubjectsContext);
  if (!ctx) throw new Error('useSubjects must be used inside SubjectsProvider');
  return ctx;
}
