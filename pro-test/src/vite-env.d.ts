/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PAYMENTS_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
