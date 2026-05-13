import nextVitals from 'eslint-config-next/core-web-vitals'

const eslintConfig = [
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

export default eslintConfig

