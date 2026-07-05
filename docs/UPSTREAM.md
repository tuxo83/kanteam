# Upstream relationship & sync policy

Kanteam is an independent fork of **[Backlog.md](https://github.com/MrLesk/Backlog.md)** by
Alex Gavrilescu (MrLesk), MIT-licensed. See [NOTICE](../NOTICE).

**Posture:** build Kanteam as if upstream could disappear tomorrow. Upstream sync is a
**bonus, not a dependency** — Kanteam builds, tests, releases and patches on its own.

## Remotes

```
origin    https://github.com/tuxo83/kanteam.git      # this fork (primary)
upstream  https://github.com/MrLesk/Backlog.md.git   # source project (read-only)
```

Set up:

```bash
git remote set-url origin https://github.com/tuxo83/kanteam.git
git remote add upstream https://github.com/MrLesk/Backlog.md.git
```

## Sync policy (harvest, don't track)

We do **not** merge upstream wholesale. Each upstream release, review and **cherry-pick
selectively**:

- ✅ **Take:** bug fixes, security patches, platform/runtime compat (Bun/Node bumps), perf.
- ❌ **Skip:** features that don't fit Kanteam's roadmap, or that conflict with our additions.

```bash
git fetch upstream
git log --oneline main..upstream/main        # what's new upstream
git cherry-pick <sha>                         # take a specific fix
# resolve conflicts, run the test suite, commit
```

To keep merges cheap for as long as possible, **keep Kanteam additions modular** (in their
own files/dirs) rather than patching upstream files in place.

## When to cut the cord

Stop syncing when cherry-picking costs more than it's worth (routine, painful conflicts).
At that point Kanteam is fully independent — which is fine, because the safety nets below
already make it self-sufficient.

## Independence safety nets (must stay green/working)

1. **Own CI** (`.github/workflows/ci.yml`) — our regression net; must stay green.
2. **Own release pipeline** (`.github/workflows/release.yml`) — builds & publishes
   `@tuxo83/kanteam` + `kanteam-*` platform packages. Reproducible via `bun.lock`.
3. **Dependency/security upkeep** — `npm audit` / Dependabot, so we can patch vulns without
   upstream.
4. **Data-format compatibility** — keep the `backlog/` layout and `config.yml` stable even
   when fully independent: it's decoupled from the code, enables in/out migration, and costs
   nothing.

## What we always keep, regardless of divergence

- The **MIT attribution** to Backlog.md (see [NOTICE](../NOTICE)) — required as long as any
  upstream code remains.
- **Data compatibility** with Backlog.md projects (drop-in in/out).
