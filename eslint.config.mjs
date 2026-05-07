import nextVitals from 'eslint-config-next/core-web-vitals'

export default [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      '.worktrees/**',
      'dist/**',
      'out/**',
      'coverage/**',
      'next-env.d.ts',
    ],
  },
  ...nextVitals,
]
