# OpenSpec Merge Guard

A CI check that **fails a pull request** while it still carries an unarchived [OpenSpec](https://github.com/Fission-AI/OpenSpec) change.

> **To actually block merge**, add this job as a **required status check** (branch protection / ruleset on your default branch). Without that, the job reports red but GitHub still permits the merge. This action provides the signal; branch protection enforces it.

## What it does

Enforces OpenSpec workflow discipline: spec, implementation, and archive travel and land together. If a PR branch still has an active (unarchived) OpenSpec change, the job fails — flagging that the change needs archiving before the PR merges.

If the repository has no `openspec/config.yaml`, the check skips (it is not an OpenSpec repo).

## Usage

```yaml
jobs:
  openspec-merge-guard:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: acatl/openspec-pr-action/openspec-merge-guard@v1
```

The action reads the Node version from your repo's `.nvmrc`, so make sure one exists.

## Inputs

| Input              | Required | Default | Description                                              |
| ------------------ | -------- | ------- | -------------------------------------------------------- |
| `openspec-version` | No       | `1.3.1` | Version of the `@fission-ai/openspec` CLI to install (must be `N.N.N`) |

```yaml
- uses: acatl/openspec-pr-action/openspec-merge-guard@v1
  with:
    openspec-version: "1.3.1"
```

## How it works

```text
1. openspec/config.yaml missing? → skip (not an OpenSpec repo)
2. Install the OpenSpec CLI, run `openspec list --json`
3. changes[] empty     → pass
   changes[] non-empty → fail, list the unarchived changes
```

Run it as a `pull_request`-only job. It has no reason to run on direct pushes to the default branch.

## Resolving a failure

1. Archive the completed change (`openspec archive <name>`).
2. Commit the moved files.
3. Push to update the PR — the guard re-runs and passes.
