import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initBCareApp } from './app_logic.ts';

// Initialize BCare Application logic
initBCareApp();

const rootElement = document.getElementById('root');
if (rootElement) {
    createRoot(rootElement).render(<App />);
}
