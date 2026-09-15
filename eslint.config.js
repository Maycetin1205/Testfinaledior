import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// tsconfigRootDir explizit setzen, damit der Typpruefer nur dieses Projekt als
// Wurzel nimmt.
const rootDir = import.meta.dirname

const coreOuterLayers = '(?:app|blocks|design|editor|export|softengine|state|test|ui)'

function restrictCoreImports(files, parentSegments) {
  return {
    files,
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          { name: 'lit', message: 'Der fachliche Core muss frameworkfrei bleiben.' },
          { name: 'react', message: 'Der fachliche Core muss frameworkfrei bleiben.' },
          { name: 'react-dom', message: 'Der fachliche Core muss frameworkfrei bleiben.' },
        ],
        patterns: [
          {
            group: ['lit/*', 'react/*', 'react-dom/*'],
            message: 'Der fachliche Core muss frameworkfrei bleiben.',
          },
          {
            regex: `^(?:\\.\\./){${parentSegments}}${coreOuterLayers}(?:/|$)`,
            message: 'Der fachliche Core darf keine aeussere Anwendungsschicht importieren.',
          },
        ],
      }],
    },
  }
}

export default defineConfig([
  globalIgnores(['dist']),
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
  // Typ-gestuetztes Linten NUR fuer diese eine Regel: ein vergessenes `.catch`
  // an einer Aktionskette verschluckt jeden Fehler, und ein `void` davor sieht
  // aus wie Absicht. Die Regel braucht den Typpruefer, darum `projectService`.
  // Bewusst nicht der ganze `recommendedTypeChecked`-Satz, der bringt hunderte
  // Funde ohne Nutzen.
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
  // Regel 4: nur src/softengine kennt die Globals. Ein Baustein bekommt Daten
  // ueber benannte Funktionen (laufzeitQuellen, befehle, relations).
  {
    files: ['src/blocks/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['**/softengine/bridge'],
          importNames: ['seGlobal'],
          message: 'Bausteine fassen SoftEngine nur durch die Tuer an.',
        }],
      }],
    },
  },
  restrictCoreImports(['src/core/*.{ts,tsx}'], 1),
  restrictCoreImports(['src/core/*/*.{ts,tsx}'], 2),
  restrictCoreImports(['src/core/*/*/*.{ts,tsx}'], 3),
  restrictCoreImports(['src/core/*/*/*/*.{ts,tsx}'], 4),
])
