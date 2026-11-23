import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const { UNICIRCLE_API_ORIGIN } = loadEnv(mode, process.cwd(), 'UNICIRCLE_');
  const proxy = UNICIRCLE_API_ORIGIN ? { '/api/v1': UNICIRCLE_API_ORIGIN } : undefined;
  return { server: { proxy }, preview: { proxy } };
});
