// OMP's native composer hairline, with a named native button rather than a second status pill.
// The meter/report entry pattern comes from Can Bölük / Stencil's ui-tsp and downstream Hermes ui-tsp.
import type { JSX } from '@stencil-hq/tern'

import { contextPercent, contextShare, CONTEXT_THRESHOLDS, type ContextWindow } from '../session/context.js'

import { compact } from './time.js'

/** omp's hairline above the text box. Nothing until a model call measures the window: a bare `?` read as a stray glyph. */
export function contextMeter(context: ContextWindow | undefined, onOpen: () => void): JSX.Element | null {
  if (!context) {
    return null
  }

  const percent = `${contextPercent(context)}%`
  const label = `${percent} context`

  return (
    <el
      aria={`Show context window: ${label}`}
      attrs={{ 'aria-haspopup': 'dialog' }}
      key="context"
      onClick={onOpen}
      role="omp.composer.context.action"
      tag="button"
      title={`${context.used.toLocaleString()} of ${context.max.toLocaleString()} tokens · Show context window`}
    >
      <meter
        key="meter"
        label={percent}
        role="omp.composer.context"
        style="bar"
        thresholds={CONTEXT_THRESHOLDS}
        total={compact(context.max)}
        value={contextShare(context)}
      />
    </el>
  )
}
