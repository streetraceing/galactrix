import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: ['dist/**', 'src-tauri/**', '.heroui-docs/**'],
  },
  {
    files: ['src/**/*.{js,jsx,ts,tsx}', 'scripts/**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
  },
);
