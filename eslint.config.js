import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['node_modules/', 'dist/', 'coverage/', '.flaky-runs/'],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];
