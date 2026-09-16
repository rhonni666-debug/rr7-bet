import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, '.', '');
  const capacitorBuild = env.CAPACITOR_BUILD === '1';

  return {
    base: capacitorBuild ? './' : command === 'build' ? '/rr7-bet/' : '/',
    plugins: [react(), tailwindcss()],
  };
});
