import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { useGameStore } from './store/gameStore';
import './index.css';

if (import.meta.env.DEV) {
  ;(window as unknown as { __gameStore?: typeof useGameStore }).__gameStore = useGameStore;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
