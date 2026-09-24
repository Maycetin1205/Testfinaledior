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
        patterns: [
          {
            group: ['lit', 'lit/*', 'react', 'react/*', 'react-dom', 'react-dom/*'],
            message: 'src/core must stay framework free.',
          },
          {
            regex: '^(?:(?:\\.\\./)+|@/)(?:blocks|design|editor|export|runtime|softengine)(?:/|$)',
            message: 'src/core must not import an outer application layer.',
          },
        ],
      }],
    },
  },
  // Only src/softengine knows the host globals. A block asks the mask host in
  // src/runtime and never SoftEngine itself. What runs in the mask never pulls
  // in the editor or the export.
  {
    files: ['src/blocks/**/*.{ts,tsx}'],
    rules: {
      // A block takes the types of its properties from its own declaration
      // instead of writing them down a second time; the base class fills the
      // values in before anything reads them.
      '@typescript-eslint/no-empty-object-type': ['error', { allowInterfaces: 'with-single-extends' }],
      '@typescript-eslint/no-unsafe-declaration-merging': 'off',
      'no-restricted-imports': ['error', {
        patterns: [
          {
            regex: '^(?:(?:\\.\\./)+|@/)softengine(?:/|$)',
            message: 'Blocks reach SoftEngine only through the mask host.',
          },
          {
            regex: '^(?:(?:\\.\\./)+|@/)(?:editor|export)(?:/|$)',
            message: 'Blocks must not import the editor or the export.',
          },
        ],
      }],
    },
  },
  // The runtime of the mask knows blocks only through the registry and their
  // elements, and SoftEngine only through the one host that fills the door.
  {
    files: ['src/runtime/**/*.{ts,tsx}'],
    ignores: ['src/runtime/softEngineHost.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            regex: '^(?:(?:\\.\\./)+|@/)softengine(?:/|$)',
            message: 'The runtime reaches SoftEngine only through softEngineHost.',
          },
          {
            regex: '^(?:(?:\\.\\./)+|@/)(?:blocks|editor|export)(?:/|$)',
            message: 'src/runtime must not import a block, the editor or the export.',
          },
        ],
      }],
    },
  },
  {
    files: ['src/runtime/softEngineHost.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['**/softengine/bridge'],
            importNames: ['hostCall'],
            message: 'The host passes on what src/softengine offers, it calls no host function itself.',
          },
          {
            regex: '^(?:(?:\\.\\./)+|@/)(?:blocks|editor|export)(?:/|$)',
            message: 'src/runtime must not import a block, the editor or the export.',
          },
        ],
      }],
    },
  },
  // The door itself reaches back into nothing that uses it.
  {
    files: ['src/softengine/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          regex: '^(?:(?:\\.\\./)+|@/)(?:blocks|editor|export|runtime)(?:/|$)',
          message: 'src/softengine must not import a block, the runtime, the editor or the export.',
        }],
      }],
    },
  },
])
