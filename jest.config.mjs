import nextJest from 'next/jest.js';

// next/jest auto-loads next.config.ts (for env), tsconfig.json paths (so
// `@/*` resolves the same as in src), and uses SWC for transforms.
const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['<rootDir>/tests/**/*.{test,spec}.{ts,tsx}'],
};

// next/jest sets its own `transformIgnorePatterns` that drops everything in
// node_modules. next-intl + use-intl ship as ESM (and pull in @formatjs +
// intl-messageformat, also ESM), so they need SWC. Resolve next/jest's
// merged config first and then override the pattern.
//
// Plain .mjs (rather than .ts) so CI doesn't need ts-node to load the
// config — Jest only natively parses TS configs when a TypeScript
// compiler is wired up just-so, and that path proved flaky on
// ubuntu-latest after `npm ci --legacy-peer-deps`.
const buildConfig = async () => {
  const nextConfig = await createJestConfig(config)();
  return {
    ...nextConfig,
    transformIgnorePatterns: [
      'node_modules/(?!(next-intl|use-intl|@formatjs|intl-messageformat)/)',
      '^.+\\.module\\.(css|sass|scss)$',
    ],
  };
};

export default buildConfig;
