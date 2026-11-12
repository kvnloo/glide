// The session sidebar (⌥S, `/sidebar`): Tern's aside, a `prefs` sheet docked at the pane's right
// edge that narrows the chat beside it. It shows where the session works: the branch and how far it
// is from its upstream, the session's pull requests, and the changed files. It takes no keys; the
// composer keeps them. A PR opens in the PR aside (in its place); a file opens the Changes sheet on its diff.

import type { JSX } from '@stencil-hq/tern'

import type { ChatPorts } from '../app/ports.js'
import { copyToClipboard } from '../clipboard.js'
import type { Ticket } from '../core/epoch.js'
import { Flash } from '../core/flash.js'
import { type LiveSessionId, prKey } from '../core/ids.js'
import { Poller } from '../core/poller.js'
import { type GitState, gitState } from '../git/status.js'
import { checksState } from '../github/pullRequest.js'
import { type ChangesHost, openChanges } from '../overlays/changes.js'
import { openPullRequests, type PullRequestsSheetHost, stateLabel } from '../overlays/pullRequests.js'
import { prTone } from '../prs/look.js'

/** What the session sidebar reaches of the app. */
export type SidebarHost = Pick<ChatPorts, 'changed' | 'prs' | 'session'> & ChangesHost & PullRequestsSheetHost

const POLL_MS = 5000
/** The sheet's actions: its close, and each row button's `act`. */
const ACTS = ['close', 'page', 'copy-branch', 'open-pr', 'diff', 'all-files'] as const
/** The sidebar lists this many changed files; the Changes sheet has them all. */
const MAX_FILES = 40

export class Sidebar {
  readonly #host: SidebarHost
  readonly #read: (cwd: string) => Promise<GitState | undefined>
  #open = false
  #state: GitState | undefined
  #cwd: string | null = null
  /** The git read: every five seconds while the sidebar is open; another session's adopt drops a read in flight. */
  readonly #poller: Poller = new Poller({
    cadence: () => (this.#open ? POLL_MS : 'off'),
    run: ticket => this.#refresh(ticket),
    settled: () => this.#host.changed()
  })
  /** The branch was just copied: its button reads Copied. */
  readonly #copied = new Flash<true>(() => this.#host.changed())

  /** `read`: how a folder's git state is read (tests hold it). */
  constructor(host: SidebarHost, read: (cwd: string) => Promise<GitState | undefined> = gitState) {
    this.#host = host
    this.#read = read
  }

  get open(): boolean {
    return this.#open
  }

  get state(): GitState | undefined {
    return this.#state
  }

  toggle() {
    this.#open = !this.#open
    this.poke()
    this.#host.changed()
  }

  /** Reads git again now (a tool changed files, the turn ended); after the read in flight, if one is. */
  poke() {
    if (this.#open) {
      this.#poller.poke()
    }
  }

  /** Session `sid` is shown now: the last one's git state goes, and a read in flight for it drops its answer. */
  adopt(sid: LiveSessionId | null) {
    if (!this.#poller.adopt(sid)) {
      return
    }

    this.#state = undefined
    this.#cwd = null
    this.poke()
  }

  dispose() {
    this.#open = false
    this.#poller.dispose()
    this.#copied.dispose()
  }

  async #refresh(ticket: Ticket) {
    // Closed since the round was scheduled: nothing reads until it opens again.
    if (!this.#open) {
      return
    }

    const cwd = this.#host.session.info?.cwd || null
    const state = cwd ? await this.#read(cwd) : undefined

    if (ticket.isCurrent()) {
      this.#state = state
      this.#cwd = cwd
    }
  }

  node(id: string): JSX.Element | null {
    if (!this.#open) {
      return null
    }

    const git = this.#state
    const prs = this.#host.prs.entries().toReversed()
    const files = git?.files ?? []
    const added = files.reduce((n, f) => n + f.additions, 0)
    const removed = files.reduce((n, f) => n + f.deletions, 0)
    const upstream = git?.upstream?.replace(/^[^/]+\//, '')
    const distance = !git ? 'No folder'
      : !git.upstream ? 'No upstream'
      : upstream + (git.ahead ? ' +' + git.ahead : '') + (git.behind ? ' −' + git.behind : '')
    const branchStatus = !git ? 'NO GIT' : !git.branch ? 'DETACHED'
      : !git.upstream ? 'LOCAL' : git.ahead && git.behind ? 'DIVERGED'
      : git.behind ? 'BEHIND' : git.ahead ? 'AHEAD' : 'SYNCED'
    const branchTone = !git || !git.branch ? 'muted'
      : !git.upstream || git.behind ? 'warning'
      : git.ahead ? 'info' : 'success'
    // A single primary button carries the accent; the rest are quiet actions.
    const primary = prs.length ? 'pr' : files.length ? 'file' : 'branch'

    return (
      <prefs
        key="sidebar"
        role="glide.sidebar"
        title="Session"
        lead="Branch, pull requests and changed files"
        page="session"
        pages={[{ icon: 'branch', id: 'session', label: 'Session' }]}
        sections={[]}
        onAction={Object.fromEntries(ACTS.map(act => [act, (ev: { value?: unknown }) => this.#action(act, ev.value)]))}
      >
        <col key="content" gap="md" role="glide.sidebar.content">
          <col key="branch-group" gap="none">
            <text key="head" text="Branch" tone="muted" />
            <row key="branch" role="glide.sidebar.row" min={{ h: '3lines' }} gap="sm" align="center">
              <col key="name" grow={1} gap="none" min={{ w: 0 }}>
                <text key="label" spans={[{ s: 'strong', t: git?.branch ?? (git ? 'Detached HEAD' : 'No repository') }]}
                  wrap="none" truncate="end" />
                <badge key="distance" role="glide.sidebar.fact" text={distance} tone="muted" basis="content" />
              </col>
              <badge key="state" role="glide.sidebar.status" text={branchStatus} tone={branchTone} basis="content" />
              {git?.branch ? (
                <button key="copy" text={this.#copied.value ? 'Copied' : 'Copy'} size="sm"
                  min={{ h: '3lines' }} basis="content"
                  variant={primary === 'branch' ? 'primary' : 'default'}
                  onClick={() => this.#action('copy-branch', 'branch')} />
              ) : null}
            </row>
          </col>

          <col key="pr-group" gap="none">
            <text key="head" text={'Pull requests · ' + prs.length} tone="muted" />
            {prs.length ? prs.map((e, index) => {
              const key = 'pr:' + prKey(e.ref)
              const state = !e.pr ? (e.error ? 'ERROR' : 'READING')
                : e.pr.draft ? 'DRAFT' : stateLabel(e.pr).toUpperCase()
              const hint = e.pr
                ? (e.pr.checks.length ? 'Checks ' + checksState(e.pr.checks) + ' · ' : '') + e.ref.repository
                : (e.error ?? 'Reading GitHub')
              return (
                <row key={key} role="glide.sidebar.row" min={{ h: '3lines' }} gap="xs" align="center">
                  <col key="name" grow={1} gap="none" min={{ w: 0 }}>
                    <text key="label" spans={[{ s: 'strong', t: '#' + e.ref.number + ' ' + (e.pr?.title ?? e.ref.repository) }]}
                      truncate="end" wrap="none" title={e.pr?.title ?? e.ref.repository} />
                    <text key="meta" spans={[{ s: 'dim', t: hint }]} truncate="end" wrap="none" />
                  </col>
                  <badge key="state" role="glide.sidebar.status" text={state} tone={prTone(e)} basis="content" />
                  <button key="open" text="Open" size="sm" min={{ h: '3lines' }} basis="content"
                    variant={primary === 'pr' && index === 0 ? 'primary' : 'default'}
                    onClick={() => this.#action('open-pr', key)} />
                </row>
              )
            }) : (
              <row key="no-prs" role="glide.sidebar.row" min={{ h: '3lines' }} gap="sm">
                <text key="label" text="No linked pull requests" grow={1} />
                <badge key="state" role="glide.sidebar.status" text="NONE" tone="muted" basis="content" />
              </row>
            )}
          </col>

          <col key="file-group" gap="none">
            <text key="head" text={'Changes · ' + files.length + ' files · +' + added + ' −' + removed} tone="muted" />
            {files.length ? files.slice(0, MAX_FILES).map((file, index) => {
              const basename = file.path.slice(file.path.lastIndexOf('/') + 1)
              const folder = file.path.includes('/') ? file.path.slice(0, file.path.lastIndexOf('/')) : 'Working tree'
              const hint = folder + ' · +' + file.additions + ' −' + file.deletions + (file.staged ? ' · staged' : '')
              const status = file.staged ? 'STAGED' : file.status.toUpperCase()
              const tone = file.status === 'conflicted' || file.status === 'deleted' ? 'error'
                : file.status === 'added' || file.status === 'untracked' ? 'success'
                : file.staged ? 'info' : 'warning'
              const key = 'file:' + file.path
              return (
                <row key={key} role="glide.sidebar.row" min={{ h: '3lines' }} gap="xs" align="center">
                  <col key="name" grow={1} gap="none" min={{ w: 0 }}>
                    <text key="label" spans={[{ s: 'strong', t: basename }]} truncate="end"
                      wrap="none" title={file.path} />
                    <text key="meta" spans={[{ s: 'dim', t: hint }]} truncate="end" wrap="none" />
                  </col>
                  <badge key="state" role="glide.sidebar.status" text={status} tone={tone} basis="content" />
                  <button key="diff" text="Diff" size="sm" min={{ h: '3lines' }} basis="content"
                    variant={primary === 'file' && index === 0 ? 'primary' : 'default'}
                    onClick={() => this.#action('diff', key)} />
                </row>
              )
            }) : (
              <row key="no-files" role="glide.sidebar.row" min={{ h: '3lines' }} gap="sm">
                <text key="label" text={git ? 'Nothing changed' : 'No changes to show'} grow={1} />
                <badge key="state" role="glide.sidebar.status" text={git ? 'CLEAN' : 'IDLE'} tone="muted" basis="content" />
              </row>
            )}
            {files.length > MAX_FILES ? (
              <row key="more" role="glide.sidebar.row" min={{ h: '3lines' }} gap="sm">
                <text key="label" text={String(files.length - MAX_FILES) + ' more files'} grow={1} />
                <badge key="state" role="glide.sidebar.status" text="MORE" tone="muted" basis="content" />
                <button key="all" text="Show all" size="sm" min={{ h: '3lines' }} basis="content"
                  onClick={() => this.#action('all-files', '')} />
              </row>
            ) : null}
          </col>
        </col>
      </prefs>
    )
  }

  #action(act: string, value: unknown) {
    const row = typeof value === 'string' ? value : ''

    switch (act) {
      case 'close':
        // A row's `close` is an open menu closing; only the sheet's own close has no row.
        if (!row) {
          this.toggle()
        }

        return

      case 'copy-branch':
        if (this.#state?.branch) {
          copyToClipboard(this.#state.branch)
          this.#copied.set(true)
        }

        return

      case 'open-pr':
        return openPullRequests(this.#host, this.#host.prs.keyOf(row.replace(/^pr:/, '')))

      case 'diff':
        return openChanges(this.#host, row.replace(/^file:/, ''))

      case 'all-files':
        return openChanges(this.#host)
    }
  }
}
