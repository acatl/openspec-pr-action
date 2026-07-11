# Security Policy

This repo is a pair of GitHub composite actions — bash and inline Node embedded in each
`action.yml`, plus CI config. The realistic attack surface is: a step running something it
shouldn't (shell injection via inputs), or `openspec-pr-linker`'s PR-body write being abused
from an untrusted branch.

## Reporting a Vulnerability

Please **do not** open a public issue for a security concern.

- Preferred: on this repo's **Security** tab, choose **"Report a vulnerability"** (GitHub private
  vulnerability reporting). Navigation-based so it survives a repo rename/transfer.
- Fallback: email [acatl.pacheco@gmail.com](mailto:acatl.pacheco@gmail.com) with a description and,
  if possible, reproduction steps.

You should expect an initial response within 5 business days.

## Scope

- The composite action definitions (`openspec-merge-guard/action.yml`,
  `openspec-pr-linker/action.yml`) — embedded bash and inline Node.
- CI workflows (`.github/workflows/*.yml`).

Notes on the trust model:

- The `openspec-version` input is validated to `N.N.N` before use, so it can't inject shell.
- `openspec-pr-linker` requires `pull-requests: write`. Restrict it to same-repo, non-Dependabot
  PRs (see its README) so an untrusted fork can't leverage the write token.

Out of scope: vulnerabilities in upstream dependencies — report those upstream (e.g.
[OpenSpec](https://github.com/Fission-AI/OpenSpec/security)) — or in GitHub Actions itself.
