// Synthetic intent cards for the AODL heroes (tests and the headless screenshot script).
export const DEMO_ASK = 'Make the voice orb feel alive, and ship it in the plugin by Friday.'

export const intentCards = {
  declare: {
    kind: 'intent-declare', app: 'ripple', title: 'One ask. Exact words.', summary: DEMO_ASK,
    rows: [{ label: 'acceptance', value: 'feel alive' }, { label: 'scope', value: 'plugin' }, { label: 'deadline', value: 'Friday' }]
  },
  contract: {
    kind: 'intent-contract', app: 'aodl', title: 'Review before execution',
    rows: [{ label: 'orb reacts to voice', value: 'observed' }, { label: 'ships in plugin', value: 'observed' }, { label: 'real-turn receipt', value: 'missing' }],
    approval: { label: 'Hold to approve', description: 'Approve this contract revision for execution. Nothing runs until approved.' }
  },
  work: {
    kind: 'intent-work', app: 'aodl', title: 'Implementation is not acceptance',
    rows: [{ label: 'H1', value: 'built · glide' }, { label: 'T1', value: 'running · thinking-orbs' }, { label: 'P1', value: 'blocked · glide' }]
  },
  proof: {
    kind: 'intent-proof', app: 'aodl', title: 'Show me the real-turn receipt',
    rows: [{ label: 'receipts', value: 1 }, { label: 'hash', value: '9f3c2a7be01d44c8' }]
  }
} as const
