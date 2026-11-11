# Attention: `/glide focus`

Glide guards two scarce resources: your attention and the agent's context window. Memory recall and offload cover the context window. `/glide focus` covers attention. [Code](../attention.py) · [Cards](../../frontend/src/commands/glide.ts) · [Tests](../tests/test_attention.py)

## Commands

| Command | What it does |
| --- | --- |
| `/glide focus` | Card: phase, flow likelihood (when available), next deep-work window, bedtime, block status, asks held. Offers **Start block**. |
| `/glide focus start [min]` | Starts a deep-work block (default 50 min, 5–240). |
| `/glide focus stop` | Ends the block and shows everything held as one digest card. |
| `/glide focus wind-down` | Saves where you left off (last session's title and last three asks). |
| `/glide focus hours` | Your best deep-work hours, learned from your sessions. |

## Sources, each optional

1. **z0intelligence circadian** (`circadian show --json`): phase (PEAK, DIP, WIND_DOWN, SLEEP, ...), next peak, bedtime. Read-only; Glide never calls `circadian route`.
2. **Flowkit** (`GET http://127.0.0.1:8787/v1/state`, override with `GLIDE_FLOWKIT_URL`): used only when the status is `live` and the estimate has signal. Glide shows the flow likelihood and its confidence, never heart rate or HRV. Flowkit estimates a likelihood; it does not diagnose.
3. **Your local Hermes sessions** (always): an hour counts on a day when you sent three or more messages in it. The best window is the two-hour span worked on the most days in the last 30. The usual stop time is the median of each day's last active hour (days start at 05:00). Without circadian, phase comes from these: inside a learned window is PEAK, the hour before the usual stop is WIND_DOWN, after it is SLEEP.

## The guard

- During a block, the per-turn hook tells Hermes to keep replies short and hold non-critical questions. This works whether or not corrections memory is on.
- Agents, cron jobs, and other plugins route notices through `glide.route` (gateway method) or `/glide json route {"title": "...", "cls": "decision"}`. Classes are `critical`, `decision`, `report`, `digest`. During a block or a guarded circadian phase (PEAK, WIND_DOWN, PRE_SLEEP, SLEEP), everything except `critical` is held. A held notice is released as one digest when the block ends, or with the next notice after it runs out.
- [demo/hold.py](../demo/hold.py) routes three synthetic asks so you can watch it.

## Wind-down and the next morning

At most one wind-down note per night (the night runs until 05:00). It records the last local session's title and last three asks under `<profile>/glide/attention.json`. On the next day's first turn, the hook quotes that note once and clears it. Cues are events (a command or a turn), not clock timers, and Glide sends nothing outside Hermes.

## Data

Everything stays in `<profile>/glide/attention.json` and the read-only session database. No network calls except the optional loopback Flowkit read.
