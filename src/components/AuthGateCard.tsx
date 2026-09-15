import { LockKeyhole } from 'lucide-react';
import { Link } from '@tanstack/react-router';

export function AuthGateCard({ title, description }: { title: string; description: string }) {
  return (
    <section className="mx-auto max-w-xl rounded-3xl border border-amber-300/15 bg-white/[.035] p-6 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-300/10 text-amber-300">
        <LockKeyhole className="h-6 w-6" />
      </div>
      <h1 className="mt-4 text-2xl font-black">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
      <Link to="/auth" className="mt-5 inline-flex rounded-xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950">
        Entrar ou criar conta
      </Link>
    </section>
  );
}
