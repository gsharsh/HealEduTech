import { resolvePublicEnvironment, type PublicEnvironment } from './environmentValidation';

export type PublicEnv = PublicEnvironment;

export function getPublicEnv(): PublicEnv | null {
  return resolvePublicEnvironment(import.meta.env, import.meta.env.PROD);
}
