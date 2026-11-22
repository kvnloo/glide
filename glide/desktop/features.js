// Assembled into the Hermes Desktop runtime plugin by install.py.
const card = { border: '1px solid var(--ui-border, #727780)', borderRadius: 12, padding: 14, marginBlock: 10 }
const row = { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }
const control = { ...card, padding: '4px 10px', marginBlock: 0, font: 'inherit' }

function Card({ title, children }) {
  return h('section', { style: card, 'aria-label': title }, h('h3', null, title), children)
}

function Features({ pluginContext }) {
  const [data, setData] = useState(null)
  const [hits, setHits] = useState(null)
  const [digest, setDigest] = useState(null)
  const [scanned, setScanned] = useState(null)
  const [query, setQuery] = useState('')
  const [minutes, setMinutes] = useState(50)
  const [pending, setPending] = useState(true)
  const [error, setError] = useState('')
  const path = '/desktop/features'

  function request(command) {
    setPending(true)
    setError('')
    const opts = command ? { method: 'POST', body: command } : undefined
    return pluginContext.rest(path, opts).then(result => {
      setData(result)
      if (result.hits) setHits(result.hits)
      if (result.digest) setDigest(result.digest)
      if (typeof result.scanned === 'number') setScanned(result.scanned)
    }).catch(() => setError(command
      ? 'Glide could not complete that action. Build the index before recall; refresh to check current state.'
      : 'Glide backend unavailable. Install and enable the agent plugin for this profile, then refresh.'
    )).finally(() => setPending(false))
  }

  useEffect(() => { void request() }, [])
  const button = (label, command, disabled = pending) =>
    h('button', { type: 'button', style: control, disabled, onClick: () => void request(command) }, label)
  const memory = data?.memory
  const focus = data?.focus

  return h('div', { style: { maxWidth: 680, padding: 12 }, 'aria-busy': pending },
    h('h2', null, 'Glide'),
    button('Refresh'),
    pending && h('p', { role: 'status' }, 'Working…'),
    error && h('p', { role: 'alert' }, error),
    memory && h(Card, { title: 'Corrections memory' },
      h('p', null, `${memory.corrections} corrections · ${memory.sessions} indexed sessions · automatic recall ${memory.on ? 'on' : 'off'}`),
      h('div', { style: row },
        button('Build local index', { action: 'sync' }),
        button(memory.on ? 'Turn automatic recall off' : 'Turn automatic recall on', { action: memory.on ? 'disable' : 'enable' })
      ),
      scanned !== null && h('p', { role: 'status' }, `Scanned ${scanned} session(s).`),
      h('form', { style: row, onSubmit: event => {
        event.preventDefault()
        if (!pending && query.trim()) void request({ action: 'recall', query })
      } },
        h('input', { style: control, value: query, maxLength: 512, placeholder: 'Search corrections',
          'aria-label': 'Search corrections', onChange: event => setQuery(event.target.value) }),
        h('button', { style: control, type: 'submit', disabled: pending || !query.trim() }, 'Recall')
      ),
      hits && (hits.length ? h('ul', null, hits.map((hit, index) => h('li', { key: index }, hit)))
        : h('p', { role: 'status' }, 'No matching corrections.'))
    ),
    focus && h(Card, { title: 'Focus' },
      h('p', null, focus.block ? `Deep-work block until ${focus.block.until}` : 'No active deep-work block'),
      h('div', { style: row },
        h('label', null, 'Minutes ', h('input', { style: control, type: 'number', min: 5, max: 240,
          value: minutes, onChange: event => setMinutes(event.target.value) })),
        button('Start block', { action: 'start', minutes: Number(minutes) },
          pending || !Number.isInteger(Number(minutes)) || Number(minutes) < 5 || Number(minutes) > 240),
        button('Stop and release digest', { action: 'stop' }, pending || (!focus.block && !focus.queued))
      )
    ),
    focus && h(Card, { title: 'Attention card' },
      h('p', null, `${focus.phase} · ${focus.guarded ? 'Guarded' : 'Open'} · ${focus.queued} held`),
      focus.next_window && h('p', null, `Next focus window: ${focus.next_window}`),
      focus.bedtime && h('p', null, `Wind-down target: ${focus.bedtime}`),
      digest && h('div', { role: 'status' }, digest.length
        ? h('ul', null, digest.map((entry, index) => h('li', { key: index }, entry.title, entry.body && ` — ${entry.body}`)))
        : 'Nothing held to release.')
    )
  )
}

function ScopedFeatures({ pluginContext }) {
  const profile = useValue(host.state.profile)
  const connection = useValue(host.state.connectionId)
  return h(Features, { key: JSON.stringify([connection, profile]), pluginContext })
}

function register(ctx) {
  ctx.registerSettingsPage({ id: 'features', title: 'Glide', icon: 'zap', render: () => h(ScopedFeatures, { pluginContext: ctx }) })
}
