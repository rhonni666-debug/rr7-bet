import { EclipseScene } from './EclipseScene';

export function BonusTeaseOverlay() {
  return (
    <div className="bonus-tease-overlay cinematic-bonus-tease" role="presentation">
      <EclipseScene mode="tease" />
      <div className="cinematic-tease-vignette" />
      <div className="bonus-tease-card cinematic-tease-card">
        <strong>O ECLIPSE ESTÁ SE FORMANDO</strong>
        <span>2 SCATTERS ATIVOS • ÚLTIMO ROLO EM SUSPENSE</span>
      </div>
      <div className="cinematic-tease-pulse pulse-one" />
      <div className="cinematic-tease-pulse pulse-two" />
    </div>
  );
}
