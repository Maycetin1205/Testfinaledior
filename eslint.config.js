import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

const rootDir = import.meta.dirname

export default defineConfig([
  globalIgnores(['dist', 'src/export/generated']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        tsconfigRootDir: rootDir,
      },
    },
  },
  // Type-aware linting for this one rule only: a forgotten `.catch` on an
  // action chain swallows every error, and a `void` in front of it looks like
  // intent. The rule needs the type checker, hence `projectService`.
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: rootDir,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
  // src/core is the framework-free model: no lit, no react, and no import of
  // an outer layer. One rule for every depth under src/core.
  {
    files: ['src/core/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          { name: 'lit', message: 'src/core must stay framework free.' },
          { name: 'react', message: 'src/core must stay framework free.' },
          { name: 'react-dom', message: 'src/core must stay framework free.' },
        ],
        patterns: [
          {
            group: ['lit/*', 'react/*', 'react-dom/*'],
            message: 'src/core must stay framework free.',
          },
          {
            regex: '^(?:\\.\\./)+(?:blocks|design|editor|export|softengine)(?:/|$)',
            message: 'src/core must not import an outer application layer.',
          },
          {
            group: ['@/blocks/*', '@/design/*', '@/editor/*', '@/export/*', '@/softengine/*'],
            message: 'src/core must not import an outer application layer.',
          },
        ],
      }],
    },
  },
  // Only src/softengine knows the host globals. A block gets its data through
  // named functions (runtimeSources, commands, relations).
  {
    files: ['src/blocks/**/*.{ts,tsx}'],
    rules: {
      // A block takes the types of its properties from its own declaration
      // instead of writing them down a second time; the base class fills the
      // values in before anything reads them.
      '@typescript-eslint/no-empty-object-type': ['error', { allowInterfaces: 'with-single-extends' }],
      '@typescript-eslint/no-unsafe-declaration-merging': 'off',
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['**/softengine/bridge'],
          importNames: ['seFenster', 'hostCall'],
          message: 'Blocks touch SoftEngine only through the door.',
        }],
      }],
    },
  },
])
