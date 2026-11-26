"""Prints a Postgres URL for a Supabase project, for GitHub Actions jobs.

GitHub's runners can't reach Supabase's direct database host (IPv6 only), so
this asks the Supabase Management API for the project's connection pooler and
builds the URL with the database password. Both secrets are read from the
environment; the URL is masked in the log and written to $GITHUB_ENV.

    SUPABASE_ACCESS_TOKEN=... DB_PASSWORD=... python scripts/ci/supabase-db-url.py <project-ref>
"""

import json
import os
import sys
import urllib.parse
import urllib.request


def main() -> int:
    ref = sys.argv[1]
    token = os.environ["SUPABASE_ACCESS_TOKEN"]
    password = os.environ["DB_PASSWORD"]
    request = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{ref}/config/database/pooler",
        headers={"Authorization": f"Bearer {token}", "User-Agent": "lynx-ci"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        poolers = json.load(response)
    poolers = poolers if isinstance(poolers, list) else [poolers]
    primary = next(
        (p for p in poolers if p.get("database_type", "PRIMARY") == "PRIMARY"), poolers[0]
    )
    host, port, user = primary["db_host"], primary["db_port"], primary["db_user"]
    url = (
        f"postgresql://{user}:{urllib.parse.quote(password, safe='')}"
        f"@{host}:{port}/postgres?sslmode=require"
    )
    print(f"::add-mask::{password}")
    print(f"::add-mask::{url}")
    with open(os.environ["GITHUB_ENV"], "a", encoding="utf-8") as env:
        env.write(f"DATABASE_URL={url}\n")
    print(f"Database: pooler {host}:{port} (project {ref})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
