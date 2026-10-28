import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/source-serif-4/opsz.css';
import '@fontsource-variable/source-serif-4/opsz-italic.css';
import '@fontsource-variable/instrument-sans';
import './styles.css';
import { App } from './App.tsx';
import { startTimer } from './lib/timer.ts';
import { startVisit } from './lib/visits.ts';

startVisit();
startTimer();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
