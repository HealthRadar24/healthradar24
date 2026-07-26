import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * Upstream keeps the generated /pro bundle in public/pro. HealthRadar builds
 * the deployable copy into dist/pro after the main Vite build so routine
 * production builds never depend on (or rewrite) the committed upstream
 * artifact.
 */
export const PRO_BUILD_OUTPUT = process.env.PRO_BUILD_OUT_DIR
  ? resolve(HERE, process.env.PRO_BUILD_OUT_DIR)
  : resolve(HERE, '../public/pro');

