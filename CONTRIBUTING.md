# Contributing

Thanks for your interest in improving OpenSpec PR Actions.

## Repository layout

```text
openspec-merge-guard/   composite action + README
openspec-pr-linker/     composite action + README
.github/workflows/      quality.yml (lint) + release.yml (release-please)
```

Each action is a self-contained GitHub [composite action](https://docs.github.com/actions/creating-actions/creating-a-composite-action) defined entirely in its `action.yml`. There is no build step and no compiled output — the "toolchain" here is lint/spell/hooks only.

## Ground rules

- **Conventional Commits only** (`feat:` / `fix:` / `docs:` / `chore:` / `refactor:` / `test:` / `style:` / `ci:`). A non-conforming subject is a defect — enforced by a husky `commit-msg` hook running commitlint (`commitlint.config.cjs`); `npm install` wires it up via the `prepare` script. Commit type drives the release (see Versioning).
- **Never commit to `main`.** Work on a branch; land via a squashed PR.
- Keep the embedded bash POSIX-friendly and the inline Node scripts dependency-free — they run against whatever Node the consumer's `.nvmrc` pins.
- Update the affected action's README if you change inputs or behavior.

## Local checks

Requires **Node ≥ 22.12** (matches CI and commitlint 21.x). Check with `node -v`.

```bash
npm install      # one-time: installs markdownlint + cspell + husky/commitlint hook
npm run check    # markdown lint · spell check
```

CI (`quality.yml`) runs the same checks plus `actionlint`, `shellcheck` on every composite `run:` block, and an offline internal-link check (lychee). New domain terms flagged by the spell checker go in [`project-words.txt`](project-words.txt).

### Reproducing the composite shellcheck locally

```bash
python3 - <<'PY'
import subprocess, sys, tempfile, pathlib, yaml
failed = False
for path in sorted(pathlib.Path(".").glob("*/action.yml")):
    doc = yaml.safe_load(path.read_text())
    for step in doc.get("runs", {}).get("steps", []):
        if step.get("shell") == "bash" and "run" in step:
            with tempfile.NamedTemporaryFile("w", suffix=".sh", delete=False) as fh:
                fh.write("#!/usr/bin/env bash\n" + step["run"]); name = fh.name
            if subprocess.run(["shellcheck", "-e", "SC2016", name]).returncode != 0:
                failed = True
sys.exit(1 if failed else 0)
PY
```

Requires `shellcheck` and `pyyaml`.

## Testing against a real repo

Point a real OpenSpec repo's workflow at your branch:

```yaml
- uses: <your-fork>/openspec-pr-action/openspec-merge-guard@<your-branch>
```

## Versioning

Versioning follows [Semantic Versioning](https://semver.org/) and is **automated by
[release-please](https://github.com/googleapis/release-please)** — you never bump a version by hand:

- Merge normal PRs to `main`. release-please maintains a standing **Release PR** that accumulates
  the pending bump + changelog from the Conventional Commit types since the last release (patch for
  `fix:`, minor for `feat:`, major for a `!` / `BREAKING CHANGE:`).
- **Merging that Release PR** cuts the release: it stamps the version, regenerates
  [`CHANGELOG.md`](CHANGELOG.md), tags `vX.Y.Z`, and creates a GitHub Release. A follow-up step
  moves the floating major tag (`v1`) to that release so `uses: …@v1` consumers pick it up.

Config: [`release-please-config.json`](release-please-config.json) + [`.release-please-manifest.json`](.release-please-manifest.json).

> **One-time bootstrap — remove after the first release.** `release-please-config.json` sets
> `"release-as": "1.0.0"` so the first Release PR is cut as `v1.0.0` (the manifest starts at
> `0.0.0`). **After that first Release PR merges, delete the `release-as` line** — otherwise every
> subsequent release stays pinned to `1.0.0`.
