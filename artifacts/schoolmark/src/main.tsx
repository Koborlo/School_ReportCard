import { createRoot } from 'react-dom/client';
import './index.css';
// @ts-ignore — migrated CRA app, JSX entry point
import App from './App.jsx';

createRoot(document.getElementById('root')!).render(<App />);
