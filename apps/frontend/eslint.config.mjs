// Lint inicial do frontend: regras TypeScript com foco em erros comuns e imports locais sem uso.
// Regras de template Angular entram quando o plugin dedicado estiver no workspace.
import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['eslint.config.mjs'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jasmine,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Existing Angular code has intentional control-character regexes,
      // optional empty payload types, and localized whitespace. Keep these visible
      // without making the initial frontend lint rollout fail on legacy patterns.
      'no-control-regex': 'off',
      'no-irregular-whitespace': 'warn',
      'no-extra-semi': 'warn',
      'prefer-const': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
    },
  },
);
