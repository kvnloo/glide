// The session's quiet opening lockup, without a transcript card.

import type { JSX } from '@stencil-hq/tern'

import { TYPE } from '../../../glide/frontend/tokens.js'

export const WELCOME_CSS = `
[data-role='omp.welcome']{align-items:center;justify-content:center;gap:14px;min-height:280px;padding:48px 14px;background:none;border:none;box-shadow:none}
[data-role='omp.welcome.lockup']{align-items:center;gap:12px}
[data-role='omp.welcome.wordmark']{font-family:var(--sans);font-size:${TYPE.title}px;font-weight:500;line-height:1.2;color:var(--t1)}
[data-role='omp.welcome.version']{font-family:var(--mono);font-size:${TYPE.meta}px;color:var(--t3)}
[data-role='omp.welcome.tip']{font-family:var(--sans);font-size:${TYPE.small}px;color:var(--t3);text-align:center}
`

/** What the welcome card shows. */
export interface WelcomeContext {
  /** Blob id of the uploaded logo, when the terminal took it. */
  logo?: string
  version: string
}

/** The session's opening card: logo lockup and version. */
export function welcomeNode(key: string, cx: WelcomeContext): JSX.Element {
  return (
    <col key={key} role="omp.welcome">
      <row align="center" gap="md" key="lockup" role="omp.welcome.lockup">
        {cx.logo ? <image alt="Hermes" blob={cx.logo} h={32} key="logo" role="omp.welcome.logo" w={32} /> : null}
        <col key="mark" role="omp.welcome.mark">
          <text key="wordmark" role="omp.welcome.wordmark" spans={[{ s: 'strong', t: 'hermes' }]} wrap="none" />
          {cx.version ? (
            <text key="version" role="omp.welcome.version" spans={[{ s: 'dim mono', t: cx.version }]} wrap="none" />
          ) : null}
        </col>
      </row>
      <text key="tip" role="omp.welcome.tip" text="Ask anything, or type / for commands." wrap="word" />
    </col>
  )
}
