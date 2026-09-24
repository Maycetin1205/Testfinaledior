import './design/editor.css'
import './design/mask.css'
import './editor/blockIcons'

import { createRoot } from 'react-dom/client'
import { App } from './editor/App'
import { Providers } from './editor/providers'
import { maskState } from './runtime/maskState'
import { previewHost } from './runtime/previewHost'

// The editor draws the blocks of the mask, but without SoftEngine behind them.
maskState.host = previewHost

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('#root nicht gefunden in index.html')
createRoot(rootEl).render(
  <Providers>
    <App />
  </Providers>,
)
