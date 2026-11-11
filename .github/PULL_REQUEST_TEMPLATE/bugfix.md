<!-- Bugfix. First line = what no longer goes wrong. Media: `pr-media <owner/repo> <pr> <file...>` puts it between the pr-media markers. Public repo: no tailnet IPs, home paths or location in frames. -->
**Fixed:** 

<!-- pr-media:start -->
<!-- screenshot of the bug gone (or the red/green run) -->
<!-- pr-media:end -->

**Repro (before):**
```
<!-- command + the failing output -->
```

**Red -> green:**
```
<!-- new test on the old code: N failed ; with the fix: N passed -->
```

**Root cause:** 

**Closes** #

**Checked:** `cd frontend && bun run check`; glide suite in the pinned Hermes env; a real turn in Tern (or `tern serve`, labeled)
