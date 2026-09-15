// Startet den Editor im Browser.
import './design/editor.css'
import './design/maske.css'
import './editor/bausteinSymbole'

import { createRoot } from 'react-dom/client'
import { App } from './editor/App'
import { Providers } from './editor/providers'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('#root nicht gefunden in index.html')
createRoot(rootEl).render(
  <Providers>
    <App />
  </Providers>,
)
