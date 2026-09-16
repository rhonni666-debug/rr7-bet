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

const params = new URLSearchParams(window.location.search);
const playerToken = params.get('play');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {playerToken ? <EclipsePlayer token={playerToken} /> : <><App /><GameVfxMount /></>}
  </React.StrictMode>,
);
