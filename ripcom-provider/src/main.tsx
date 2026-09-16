import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { GameVfxMount } from './game/GameVfxMount';
import './styles.css';
import './game-vfx.css';
import './cinematic-vfx.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <GameVfxMount />
  </React.StrictMode>,
);
