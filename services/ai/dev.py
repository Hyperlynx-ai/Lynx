"""Local dev server for services/ai with auto-reload (`pnpm dev` runs this).

Why not `uvicorn --reload`: on Windows its reloader stops the worker with a
console Ctrl+C, which reaches every process in the terminal, so Turborepo
shut down the web app and the API on every Python file change. This
restarts uvicorn by terminating the process instead.
"""

import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
WATCH = [ROOT / "lynx_ai", ROOT / "prompts", ROOT / "config", ROOT / "main.py"]
PORT = "4500"


def snapshot() -> dict[Path, float]:
    files: list[Path] = []
    for target in WATCH:
        files.extend([target] if target.is_file() else target.rglob("*"))
    return {
        f: f.stat().st_mtime for f in files if f.is_file() and f.suffix in {".py", ".md", ".yaml"}
    }


def start() -> subprocess.Popen[bytes]:
    command = [sys.executable, "-m", "uvicorn", "main:app", "--port", PORT]
    return subprocess.Popen(command, cwd=ROOT)


def main() -> None:
    seen = snapshot()
    server = start()
    try:
        while True:
            time.sleep(1)
            current = snapshot()
            if current != seen:
                changed = sorted(str(f.relative_to(ROOT)) for f in current.keys() ^ seen.keys())
                changed += sorted(
                    str(f.relative_to(ROOT))
                    for f in current
                    if seen.get(f, current[f]) != current[f]
                )
                print(f"dev.py: {', '.join(changed) or 'files'} changed, restarting", flush=True)
                seen = current
                server.terminate()
                server.wait()
                server = start()
            elif server.poll() is not None:
                time.sleep(2)  # crashed (e.g. a syntax error): retry after the next save
    except KeyboardInterrupt:
        pass
    finally:
        server.terminate()


if __name__ == "__main__":
    main()
