import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { EclipsePlayer } from './game/EclipsePlayer';
import { GameVfxMount } from './game/GameVfxMount';
import './styles.css';
import './game-vfx.css';
import './cinematic-vfx.css';
import './bonus-mode.css';
import './juice.css';
import './symbol-vfx.css';
import './mobile-stage8.css';
import './depth-stage9.css';
import './premium-symbols-stage10.css';
import './symbol-pay-stage11.css';
import './stage12-polish.css';
import './ways-stage13.css';
import './paylines-stage14.css';

const params = new URLSearchParams(window.location.search);
const playerToken = params.get('play');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {playerToken ? <EclipsePlayer token={playerToken} /> : <><App /><GameVfxMount /></>}
  </React.StrictMode>,
);
