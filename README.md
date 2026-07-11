# OpenSpec PR Actions

Reusable GitHub composite actions for repositories that use [OpenSpec](https://github.com/Fission-AI/OpenSpec) — a spec-driven workflow where a change's proposal, design, and tasks live in the repo and are archived once the change ships.

These actions wire OpenSpec into the pull-request lifecycle: one **guards** the merge, the other **annotates** the PR. They are independent — adopt either, or both.

| Action | One-line |
| ------ | -------- |
| [`openspec-pr-linker`](./openspec-pr-linker) | Maintains an "OpenSpec Changes" section in the PR body, linking each change's artifacts. |
| [`openspec-merge-guard`](./openspec-merge-guard) | Fails a PR that still carries an unarchived OpenSpec change. |

Each subdirectory has its own README with the full input reference and edge-case behavior. This page is the overview plus the branch-protection guidance.

## Shared behavior

Both actions:

- **No-op when there is no `openspec/config.yaml`.** They detect it and exit success, so they are safe to add before (or without) full OpenSpec adoption.
- **Install the OpenSpec CLI** (`@fission-ai/openspec`) at a pinned, format-validated version. The default is set in each action's `action.yml`; override it with the `openspec-version` input.
- **Read the Node version from the consuming repo's `.nvmrc`** when they run. A repo with `openspec/config.yaml` needs one; repos without it skip before this step, so no `.nvmrc` is required pre-adoption.

They are consumed by path, since this repository hosts more than one action:

```yaml
- uses: acatl/openspec-pr-action/openspec-pr-linker@v1
- uses: acatl/openspec-pr-action/openspec-merge-guard@v1
```

See [Versioning](#versioning) for how to pin.

---

## `openspec-pr-linker`

### What it is

A step that maintains a marker-delimited **"OpenSpec Changes"** block in the pull request description — prepended to the top when first created, then rewritten in place on later runs.

### What it does

Detects the change(s) on the branch and writes a section listing each one with its task progress and links to `proposal.md` / `design.md` / `tasks.md`. Updates are idempotent — the block is rewritten in place, only artifacts that exist on disk are linked, and an already-correct body triggers no edit. When a change is archived mid-PR, the links flip to the archive location.

### What to expect

- On a PR that carries an active change: the section appears/updates automatically on each run.
- On a PR with no active change and no existing block: nothing happens.
- The managed region is bounded by HTML comment markers; text you write outside it is left untouched.

### What it is **not**

- **Not a commenter.** It edits the PR *body*, not a comment thread.
- **Not a spec generator or validator.** It only links artifacts that already exist.
- **Not for forks.** Fork and Dependabot PRs receive a read-only token, so the body update would fail. Guard the job to same-repo PRs (below).

### Usage

Requires `pull-requests: write` and a same-repo guard:

```yaml
jobs:
  openspec-pr-linker:
    if: >
      github.event_name == 'pull_request' &&
      github.event.pull_request.head.repo.full_name == github.repository &&
      github.actor != 'dependabot[bot]'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: acatl/openspec-pr-action/openspec-pr-linker@v1
```

Full inputs and the section format: [openspec-pr-linker/README.md](./openspec-pr-linker/README.md).

---

## `openspec-merge-guard`

### What it is

A status check that reports whether the branch still has an **active (unarchived)** OpenSpec change.

### What it does

Runs `openspec list` and fails if any change is still active, printing the offending change names and how to resolve them. Passes when every change has been archived (or when there are none).

### What to expect

| Situation | Result |
| --------- | ------ |
| No `openspec/config.yaml` | Skips (success) |
| One or more unarchived changes | **Fails** — lists them in the log |
| All changes archived / no changes | Passes |

### What it is **not**

- **Not a merge blocker on its own.** It only produces a pass/fail signal. Enforcement comes from branch protection — see [Blocking a PR](#blocking-or-not-blocking-a-pr).
- **Not an archiver.** It won't archive anything for you; it tells you that you still need to.
- **Not a spec-quality check.** It says nothing about whether a spec is good, complete, or correct — only whether it has been archived.

### Usage

```yaml
jobs:
  openspec-merge-guard:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: acatl/openspec-pr-action/openspec-merge-guard@v1
```

Full inputs: [openspec-merge-guard/README.md](./openspec-merge-guard/README.md).

---

## Blocking (or not blocking) a PR

`openspec-merge-guard` only *reports* a status. Whether a failing guard actually **prevents merge** is decided by your repository's branch settings, not by this action. This separation is deliberate: it lets you adopt the guard in advisory mode first, then enforce it when ready.

**Advisory (does not block).** Just run the workflow. Contributors see the check pass or fail on the PR, but merge is still allowed. Good while a team is learning the archive-before-merge habit.

**Enforcing (blocks).** Mark the guard job as a **required status check** on your protected branch, via a branch protection rule or a repository ruleset. Once required, a failing guard prevents merge until the change is archived and the check goes green.

Notes that make this reliable:

- The check appears in branch protection as **`<workflow name> / <job name>`** (both of which you choose), and it becomes selectable as a required check only *after* the workflow has run on a PR at least once.
- Because the guard skips (passes) in repositories without `openspec/config.yaml`, requiring it is safe there. In a repo that *has* OpenSpec configured, the guard evaluates every active change on the branch — regardless of which files a given PR touches — so a PR can fail it even without touching any spec.
- Requiring the check does not stop anyone from archiving; it only holds the merge until they do.

GitHub owns this configuration and its UI changes over time — follow the current official docs rather than a fixed click-path:

- [About protected branches / required status checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [About rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)

## Versioning

Reference an action by a Git ref on this repository:

- **`@v1`** — floating major tag; picks up backward-compatible fixes and features automatically.
- **`@v1.2.3`** — an exact release tag; more stable than a floating tag, though a tag can be re-pointed unless the repository protects it.
- **A commit SHA** — content-addressed and immutable; maximum supply-chain hardening.

Releases follow [Semantic Versioning](https://semver.org/) and are recorded in [CHANGELOG.md](./CHANGELOG.md).

## Further reading

- [OpenSpec](https://github.com/Fission-AI/OpenSpec) — the spec workflow and CLI these actions drive.
- [Creating a composite action](https://docs.github.com/en/actions/creating-actions/creating-a-composite-action) — how these actions are built.
- [CONTRIBUTING.md](./CONTRIBUTING.md) · [SECURITY.md](./SECURITY.md) · [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)

## License

[MIT](./LICENSE)
