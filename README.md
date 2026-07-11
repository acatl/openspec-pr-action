# OpenSpec PR Actions

Reusable GitHub composite actions for repositories that use [OpenSpec](https://github.com/Fission-AI/OpenSpec). They keep spec, implementation, and archive traveling together through the pull-request lifecycle.

| Action | What it does |
| ------ | ------------ |
| [`openspec-merge-guard`](./openspec-merge-guard) | Fails a PR while it still carries an unarchived OpenSpec change. |
| [`openspec-pr-linker`](./openspec-pr-linker) | Prepends a managed "OpenSpec Changes" section to the PR body, linking each change's proposal / design / tasks. |

Both actions no-op on repositories without an `openspec/config.yaml`, so they are safe to add before OpenSpec adoption is complete.

## Quick start

```yaml
# .github/workflows/openspec.yml
name: OpenSpec
on: pull_request

jobs:
  merge-guard:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: acatl/openspec-pr-action/openspec-merge-guard@v1

  pr-linker:
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

To block merges, add the merge-guard job as a **required status check** in branch protection. Both actions read the Node version from the consuming repo's `.nvmrc`.

## Versioning

Actions are referenced by the repo tag. Pin to a major (`@v1`) for automatic patch/minor updates, or to an exact tag (`@v1.0.0`) for full immutability.

See each action's README for inputs and details.

## License

[MIT](./LICENSE)
