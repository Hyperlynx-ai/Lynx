"""Create a GitHub milestone per roadmap phase and an issue per open chunk.

Usage (from the repo root): python scripts/roadmap-issues.py docs/roadmap.md [--dry-run]
Re-run it after adding chunks to the roadmap. Needs the GitHub CLI (gh), logged in.
Idempotent: skips milestones/issues whose titles already exist.
"""

import json
import re
import subprocess
import sys

REPO = "Hyperlynx-ai/Lynx"
roadmap_path = sys.argv[1]
dry = "--dry-run" in sys.argv
with open(roadmap_path, encoding="utf-8") as f:
    text = f.read()


def gh(*args: str) -> str:
    out = subprocess.run(["gh", *args], capture_output=True, text=True, encoding="utf-8")
    if out.returncode != 0:
        raise RuntimeError(f"gh {' '.join(args[:3])} failed: {out.stderr.strip()[:300]}")
    return out.stdout


phases = []  # (num, title, goal, [(chunk, branch, what, status)])
for m in re.finditer(r"^## Phase (\d+): (.+)$", text, re.M):
    num, title = int(m.group(1)), m.group(2).strip()
    start = m.end()
    nxt = re.search(r"^## ", text[start:], re.M)
    body = text[start : start + nxt.start()] if nxt else text[start:]
    goal = re.search(r"\*\*Goal:\*\*\s*(.+?)(?:\n\n|\n\|)", body, re.S)
    chunks = []
    row_re = r"^\| (\d+\.\d+) \| `([^`]+)`(?: \(optional\))? \| (.+?) \|(?: (.+?) \|)?$"  # noqa: E501
    for row in re.finditer(row_re, body, re.M):
        chunks.append(
            (row.group(1), row.group(2), row.group(3).strip(), (row.group(4) or "").strip())
        )
    phases.append((num, title, goal.group(1).replace("\n", " ").strip() if goal else "", chunks))

existing_ms = {
    m["title"]: m["number"]
    for m in json.loads(gh("api", f"repos/{REPO}/milestones?state=all&per_page=100"))
}
existing_issues = {
    i["title"]
    for i in json.loads(
        gh("issue", "list", "-R", REPO, "--state", "all", "--limit", "500", "--json", "title")
    )
}
existing_labels = {
    lbl["name"]
    for lbl in json.loads(gh("label", "list", "-R", REPO, "--limit", "200", "--json", "name"))
}

created = 0
for num, title, goal, chunks in phases:
    label = f"phase-{num}"
    if label not in existing_labels and not dry:
        gh(
            "label",
            "create",
            label,
            "-R",
            REPO,
            "--color",
            "34D59A",
            "--description",
            f"Roadmap phase {num}: {title}",
        )
    ms_title = f"Phase {num}: {title}"
    if ms_title not in existing_ms and not dry:
        res = json.loads(
            gh(
                "api",
                f"repos/{REPO}/milestones",
                "-f",
                f"title={ms_title}",
                "-f",
                f"description={goal}",
            )
        )
        existing_ms[ms_title] = res["number"]
    for chunk, branch, what, status in chunks:
        if status.startswith("Done"):
            continue
        slug = re.sub(r"^[a-z]+/p\d+-", "", branch).replace("-", " ")
        issue_title = f"{chunk} {slug}"
        if issue_title in existing_issues:
            continue
        body = (
            f"**Roadmap chunk {chunk}** · Phase {num}: {title}\n\n"
            f"**Branch:** `{branch}`\n\n"
            f"**What:** {what}\n\n"
            f"**Phase goal:** {goal}\n\n"
            "---\n"
            "Before starting: read `AGENTS.md` and `docs/roadmap.md`, assign yourself, "
            "and check this chunk's dependencies are done. Definition of done: "
            "`docs/policies/06-testing-and-definition-of-done.md`. "
            'Copy-paste prompt: `docs/playbooks/prompt-templates.md` → "Start a chunk".'
        )
        if dry:
            print("would create:", issue_title, "|", ms_title)
        else:
            gh(
                "issue",
                "create",
                "-R",
                REPO,
                "--title",
                issue_title,
                "--body",
                body,
                "--label",
                label,
                "--milestone",
                ms_title,
            )
            created += 1
print(f"phases: {len(phases)}, issues created: {created}")
