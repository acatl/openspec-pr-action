#!/usr/bin/env python3
"""Shellcheck every composite action's bash `run:` block.

Auto-discovers `<name>/action.yml` at the repo root, extracts each bash step's
`run:` script, and shellchecks it. Exits nonzero if any check fails. Single
source of truth for CI (.github/workflows/quality.yml) and local reproduction
(see CONTRIBUTING.md). Requires `shellcheck` and `pyyaml`.
"""
import pathlib
import subprocess
import sys
import tempfile

import yaml

failed = False
for path in sorted(pathlib.Path(".").glob("*/action.yml")):
    doc = yaml.safe_load(path.read_text())
    for i, step in enumerate(doc.get("runs", {}).get("steps", [])):
        if step.get("shell") != "bash" or "run" not in step:
            continue
        with tempfile.NamedTemporaryFile("w", suffix=".sh", delete=False) as fh:
            fh.write("#!/usr/bin/env bash\n" + step["run"])
            name = fh.name
        print(f"::group::shellcheck {path} step {i} ({step.get('name', '')})")
        # SC2016: single-quoted `node -e` payloads intentionally avoid shell expansion.
        if subprocess.run(["shellcheck", "-e", "SC2016", name]).returncode != 0:
            failed = True
        print("::endgroup::")

sys.exit(1 if failed else 0)
