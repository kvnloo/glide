import { describe, expect, it } from 'vitest'

import { compactCommand } from '../overlays/agents.js'

describe('compactCommand', () => {
  it('ends a row on what was run, not on the worktree path', () => {
    expect(compactCommand('sed -n 1,80p /mnt/zer0models/worktrees/glide-demo-polish/README.md')).toBe('sed -n 1,80p …/glide-demo-polish/README.md')
    expect(compactCommand('cd /mnt/zer0models/worktrees/glide && git log --oneline -5\n&& wc -l a b')).toBe('git log --oneline -5 && wc -l a b')
    expect(compactCommand('ls src/a.ts')).toBe('ls src/a.ts')
  })
})
