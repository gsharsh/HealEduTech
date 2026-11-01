import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { resolvePublicEnvironment } from './src/lib/environmentValidation.ts';

export default defineConfig(({ command, mode }) => {
  const values = loadEnv(mode, '.', 'VITE_');
  resolvePublicEnvironment(values, command === 'build');
  return { plugins: [react()] };
});
