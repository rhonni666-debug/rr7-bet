type EclipseSceneProps = {
  mode?: 'ambient' | 'tease' | 'bonus';
};

export function EclipseScene({ mode = 'ambient' }: EclipseSceneProps) {
  return (
    <div className={`cinematic-eclipse cinematic-eclipse-${mode}`} aria-hidden="true">
      <div className="cinematic-eclipse-corona" />
      <div className="cinematic-eclipse-sun" />
      <div className="cinematic-eclipse-moon" />
      <div className="cinematic-eclipse-ring ring-one" />
      <div className="cinematic-eclipse-ring ring-two" />
      <div className="cinematic-eclipse-flare flare-one" />
      <div className="cinematic-eclipse-flare flare-two" />
    </div>
  );
}
