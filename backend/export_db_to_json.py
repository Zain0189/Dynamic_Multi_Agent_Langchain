"""Export every table in the configured database to database_dump.json."""

from __future__ import annotations

import base64
import json
import os
from datetime import date, datetime, time
from decimal import Decimal
from pathlib import Path
from typing import Any
from uuid import UUID

from dotenv import load_dotenv
from sqlalchemy import MetaData, create_engine, select


BACKEND_DIR = Path(__file__).resolve().parent
OUTPUT_PATH = BACKEND_DIR / "database_dump.json"

load_dotenv(BACKEND_DIR / ".env")


def get_database_url() -> str:
    """Return DATABASE_URL or the project's existing SQLite database path."""
    configured_url = os.getenv("DATABASE_URL")
    if configured_url:
        return configured_url
    return f"sqlite:///{(BACKEND_DIR / 'company.db').as_posix()}"


def serialize_value(value: Any) -> Any:
    """Convert database values into JSON-compatible values."""
    if isinstance(value, (datetime, date, time)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, bytes):
        return base64.b64encode(value).decode("ascii")
    return value


def export_database() -> dict[str, list[dict[str, Any]]]:
    """Reflect and export every table from the configured database."""
    database_url = get_database_url()
    engine = create_engine(database_url)
    metadata = MetaData()
    metadata.reflect(bind=engine)

    dump: dict[str, list[dict[str, Any]]] = {}
    with engine.connect() as connection:
        for table in metadata.sorted_tables:
            rows = connection.execute(select(table)).mappings().all()
            records = [
                {
                    column: serialize_value(value)
                    for column, value in row.items()
                }
                for row in rows
            ]
            dump[table.name] = records
            print(f"Exported {len(records)} row(s) from {table.name}")

    return dump


def main() -> None:
    dump = export_database()
    with OUTPUT_PATH.open("w", encoding="utf-8") as output_file:
        json.dump(dump, output_file, indent=2, ensure_ascii=False)
        output_file.write("\n")
    print(f"Database dump written to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
