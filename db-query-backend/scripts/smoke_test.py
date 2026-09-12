#!/usr/bin/env python3
"""
End-to-end smoke test for the FastAPI port. Hits all 6 endpoints against a
real Postgres database and prints PASS/FAIL for each step, so you can sanity
check the FastAPI backend against a real PostgreSQL database.

Usage:
    pip install httpx
    python scripts/smoke_test.py \
        --base-url http://localhost:3000 \
        --host localhost --port 5432 --database mydb \
        --username postgres --password postgres \
        --question "show me 5 rows from <a real table in your db>"

If --question is omitted, the NL step is skipped (it needs a live LLM
provider configured — GROQ_API_KEY / Ollama running / OPENROUTER_API_KEY).
"""
import argparse
import sys

import httpx

PASS = "\033[92mPASS\033[0m"
FAIL = "\033[91mFAIL\033[0m"


def step(name):
    def decorator(fn):
        def wrapper(*args, **kwargs):
            print(f"\n--- {name} ---")
            try:
                result = fn(*args, **kwargs)
                print(f"[{PASS}] {name}")
                return result
            except Exception as e:
                print(f"[{FAIL}] {name}: {e}")
                sys.exit(1)
        return wrapper
    return decorator


@step("GET /  (health check)")
def check_root(client: httpx.Client):
    r = client.get("/")
    r.raise_for_status()
    print("Response:", r.json())


@step("POST /connections/connect  (postgres)")
def connect(client: httpx.Client, args) -> str:
    body = {
        "dbType": "postgres",
        "host": args.host,
        "port": args.port,
        "database": args.database,
        "username": args.username,
        "password": args.password,
        "ssl": args.ssl,
    }
    r = client.post("/connections/connect", json=body)
    r.raise_for_status()
    connection_id = r.json()["connectionId"]
    print("connectionId:", connection_id)
    return connection_id


@step("GET /schema/tables")
def get_tables(client: httpx.Client, connection_id: str) -> list[str]:
    r = client.get("/schema/tables", params={"connectionId": connection_id})
    r.raise_for_status()
    tables = r.json()
    print(f"Found {len(tables)} table(s):", tables[:10], "..." if len(tables) > 10 else "")
    if not tables:
        raise RuntimeError("No tables found — can't continue with columns/query/nl steps")
    return tables


@step("GET /schema/columns")
def get_columns(client: httpx.Client, connection_id: str, table: str):
    r = client.get("/schema/columns", params={"connectionId": connection_id, "table": table})
    r.raise_for_status()
    cols = r.json()
    print(f"Columns for '{table}':", cols)


@step("POST /query/execute")
def execute_query(client: httpx.Client, connection_id: str, table: str):
    r = client.post(
        "/query/execute",
        params={"connectionId": connection_id},
        json={"query": f"SELECT * FROM {table} LIMIT 3"},
    )
    r.raise_for_status()
    data = r.json()
    print(f"Got {data['count']} row(s):", data["rows"])


@step("POST /nl/query")
def nl_query(client: httpx.Client, connection_id: str, question: str):
    r = client.post(
        "/nl/query",
        params={"connectionId": connection_id},
        json={"question": question, "dbType": "postgres", "mode": "auto"},
    )
    r.raise_for_status()
    data = r.json()
    print("Generated SQL:", data["sql"])
    print("Provider used:", data["provider"])
    print(f"Got {len(data['rows'])} row(s)")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://localhost:3000")
    parser.add_argument("--host", required=True)
    parser.add_argument("--port", type=int, default=5432)
    parser.add_argument("--database", required=True)
    parser.add_argument("--username", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--ssl", action="store_true")
    parser.add_argument("--question", default=None, help="NL question to test /nl/query (optional)")
    args = parser.parse_args()

    with httpx.Client(base_url=args.base_url, timeout=30) as client:
        check_root(client)
        connection_id = connect(client, args)
        tables = get_tables(client, connection_id)
        first_table = tables[0]
        get_columns(client, connection_id, first_table)
        execute_query(client, connection_id, first_table)
        if args.question:
            nl_query(client, connection_id, args.question)
        else:
            print("\n(--question not given, skipping /nl/query step)")

    print(f"\nAll steps {PASS}. FastAPI port looks functionally equivalent for this DB.")


if __name__ == "__main__":
    main()
