// Assembled into the Hermes Desktop runtime plugin by install.py.
function Timer({ widget, now }) {
  const remaining = Math.max(0, widget.end - now)
  const seconds = Math.ceil(remaining / 1000)
  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
  return h('section', {
    'aria-label': 'Glide focus timer', style: {
      display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, width: '100%',
      padding: '5px 10px', fontSize: 'max(12px, 0.875rem)',
      border: '1px solid var(--ui-border, #727780)', borderRadius: 10,
    },
  }, h('strong', null, 'Glide focus timer'),
  ...widget.parts.map(part => {
    if (part === 'Hero') return h('span', { key: part }, time)
    if (part === 'Meter') return h('progress', { key: part, value: Math.min(widget.duration, remaining),
      max: widget.duration, 'aria-label': 'Focus time remaining', style: { maxWidth: '100%' } })
    if (part === 'Badges') return h('span', { key: part }, remaining ? 'In focus' : 'Complete')
    return null
  }))
}

function ScopedWidgets({ mounts, clock }) {
  const widgets = useValue(mounts)
  const now = useValue(clock)
  const profile = useValue(host.state.profile)
  const connection = useValue(host.state.connectionId)
  const key = JSON.stringify([connection, profile])
  const active = useValue(host.state.activeSessionId)
  const { sessionId } = useComposerSession()
  if (widgets.key !== key || sessionId !== active) return null
  return widgets.values.map(widget => h(Timer, { key: widget.id, widget, now }))
}

function register(ctx) {
  const mounts = atom({ key: null, values: [] })
  const clock = atom(Date.now())
  let disposed = false
  let busy = false
  function tick() {
    clock.set(Date.now())
    if (busy) return
    busy = true
    const key = JSON.stringify([host.state.connectionId.get(), host.state.profile.get()])
    ctx.rest('/desktop/widgets', { timeoutMs: 3000 }).then(result => {
      if (!disposed) mounts.set({ key, values: Array.isArray(result?.widgets) ? result.widgets : [] })
    }).catch(() => {
      if (!disposed) mounts.set({ key, values: [] })
    }).finally(() => { busy = false })
  }
  // Only query while a composer contribution is mounted, with one shared timer across slots.
  let consumers = 0
  let stop
  function Widgets() {
    useEffect(() => {
      if (++consumers === 1) {
        tick()
        stop = ctx.setInterval(tick, 1000)
      }
      return () => { if (--consumers === 0) stop?.() }
    }, [])
    return h(ScopedWidgets, { mounts, clock })
  }
  ctx.onDispose(() => { disposed = true })
  ctx.register({ id: 'widgets-top', area: 'composer.top', render: Widgets })
}
