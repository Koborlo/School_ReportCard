import { createContext, useContext, useState, useEffect } from 'react';
import { getSubjects } from '../utils/db';

const SubjectsContext = createContext(null);

export function SubjectsProvider({ children }) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSubjects()
      .then(data => setSubjects(data || []))
      .catch(err => {
        console.error('Failed to load subjects:', err);
        setSubjects([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <SubjectsContext.Provider value={{ subjects, loading }}>
      {children}
    </SubjectsContext.Provider>
  );
}

export function useSubjects() {
  const ctx = useContext(SubjectsContext);
  if (!ctx) throw new Error('useSubjects must be used inside SubjectsProvider');
  return ctx;
}
