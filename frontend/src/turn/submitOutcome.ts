// What a failed prompt.submit proves. Only the gateway's own error frame (or a request refused
// before it was written) shows the prompt was not admitted; a local timeout, a dropped socket or
// anything else leaves admission unknown, since the gateway may have taken it before the reply was
// lost. Either way the text goes back only to the session it was sent from: a failure that comes
// after the view moved waits for that session to be shown again. Nothing is ever resent.

import { JsonRpcGatewayError } from '@hermes/shared/json-rpc-channel'

import type { LiveSessionId } from '../core/ids.js'
import { errorText } from '../core/errors.js'
import type { NoticeEntry } from '../model.js'

import type { Prompt } from './prompt.js'

/** `refused`: the gateway answered no; `unknown`: the prompt may or may not have been admitted. */
export type SubmitFailure = 'refused' | 'unknown'

/** Which failures prove non-admission: an error frame from the gateway, or no transport to write to. */
export function submitFailure(error: unknown): SubmitFailure {
  if (error instanceof JsonRpcGatewayError || (error instanceof Error && error.name === 'JsonRpcGatewayError')) {
    return 'refused'
  }

  // The channel raises this before the request frame is written: the gateway never saw it.
  return error instanceof Error && /^gateway not connected\b/.test(error.message) ? 'refused' : 'unknown'
}

/** How the failure is told: `sent` for a prompt sent now, `queued` for an admission into the gateway's queue. */
export function submitFailureNotice(error: unknown, how: 'sent' | 'queued'): { text: string; tone: NoticeEntry['tone'] } {
  const why = errorText(error)

  if (submitFailure(error) === 'refused') {
    return { text: `${how === 'sent' ? 'Not sent' : 'Not queued'}: ${why}. Your message is back in the composer.`, tone: 'error' }
  }

  return {
    text: `Unknown whether Hermes received your message (${why}). It was not resent and may still run; it is back in the composer, so check the transcript before sending it again.`,
    tone: 'warning'
  }
}

/** A prompt whose submission failed after the view left its session, with what to say once it is back. */
export interface Parked {
  readonly sid: LiveSessionId
  readonly prompt: Prompt
  readonly notice: { text: string; tone: NoticeEntry['tone'] }
}
