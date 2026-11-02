# aegis

**Learn an insurance backend and its business features from a reference app — then integrate them into any stack and any state manager.**

[Tiếng Việt](README.md) · English

An **Agent Skills + CLI** kit for Claude Code, Codex, Cursor and other [Agent Skills](https://agentskills.io) hosts. It ships no company data: it teaches the agent *how to learn* from your existing app's source, *when to stop and ask*, and *how to verify* — before generating code on a new stack.

- **Protocol** (envelope, headers, request signing, response, session) → a JSON *profile* + profile-driven reference clients (TS, Dart) + adapters for React Native, Expo, React/Next, Vue/Nuxt, Flutter, Kotlin, Swift and Redux Toolkit, RTK Query, Zustand, TanStack Query, Jotai, MobX, Pinia, Riverpod, Bloc.
- **Business features** (feature → screens → fields → API flow → rules) → specs with `file:line` sources, extracted from the old app.

**Learn → Ask → Do.** `aegis scan` / `profile learn` / `feature` (redacted) → approval gates (profile, which app is canonical, secrets typed by the user into `.env`, feature spec) → generate the client, wire the store, verify signatures with vectors, compare requests byte-for-byte with the old app.

## Install

```bash
npx github:nvdhai2003mobiledev/aegis          # in the root of the project to integrate
aegis ref add ~/code/old-app    # or a git URL (read-only clone)
aegis scan && aegis doctor
```

Then tell your agent: *"integrate the insurance backend into this project"*.

## Security

The kit repo contains no real data (CI secret scan + a local maintainer denylist). The scanner redacts secrets on read and refuses to write anything that still looks like one. Secrets live only in the target project's `.env`; learned knowledge (`.aegis/`) lives in your private project. See [SECURITY.md](SECURITY.md).

Inspired by the *Learn → Ask → Do* harness of [pythia](https://github.com/thaildhe172591/pythia). MIT licensed.
