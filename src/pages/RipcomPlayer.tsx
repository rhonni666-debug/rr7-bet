import { useEffect } from 'react';
import { useParams } from '@tanstack/react-router';

export function RipcomPlayerPage() {
  const { token } = useParams({ from: '/ripcom/play/$token' });

  useEffect(() => {
    const base = import.meta.env.BASE_URL === './' ? '/' : import.meta.env.BASE_URL;
    const target = `${base}ripcom-provider/?play=${encodeURIComponent(token)}`;
    window.location.replace(target);
  }, [token]);

  return (
    <div className="grid min-h-dvh place-items-center bg-[#030807] p-6 text-center">
      <div>
        <p className="text-xs font-black uppercase tracking-[.25em] text-lime-300">RIPCOM PROVIDER</p>
        <h1 className="mt-3 text-2xl font-black">Abrindo player independente...</h1>
        <p className="mt-2 text-sm text-slate-500">Redirecionando a sessão para a infraestrutura RIPCOM.</p>
      </div>
    </div>
  );
}
