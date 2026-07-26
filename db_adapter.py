from abc import ABC, abstractmethod
import sqlite3
import os
import contextlib

class DatabaseAdapter(ABC):
    @abstractmethod
    def get_connection(self):
        """Context manager yielding a database connection."""
        pass

    @abstractmethod
    def get_info(self) -> dict:
        """Return basic database info."""
        pass

    @abstractmethod
    def get_schema(self) -> list[dict]:
        """Return list of table schemas (name, sql)."""
        pass

    @abstractmethod
    def get_indexes(self) -> list[dict]:
        """Return list of index definitions (name, sql)."""
        pass

    @abstractmethod
    def get_stats(self) -> dict:
        """Return total rows, size, etc."""
        pass


class SQLiteAdapter(DatabaseAdapter):
    def __init__(self, db_path: str):
        self.db_path = db_path

    @contextlib.contextmanager
    def get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    def get_info(self) -> dict:
        return {
            "type": "SQLite",
            "host": "localhost (local file)",
            "path": os.path.abspath(self.db_path),
            "username": "N/A",
            "password": "***",
            "db_name": os.path.basename(self.db_path)
        }

    def get_schema(self) -> list[dict]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
            rows = cursor.fetchall()
            return [{"name": r["name"], "sql": r["sql"]} for r in rows if r["sql"]]

    def get_indexes(self) -> list[dict]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT name, sql FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'")
            rows = cursor.fetchall()
            return [{"name": r["name"], "sql": r["sql"]} for r in rows if r["sql"]]

    def get_stats(self) -> dict:
        stats = {}
        try:
            size_bytes = os.path.getsize(self.db_path)
            stats["file_size_mb"] = round(size_bytes / (1024 * 1024), 2)
        except OSError:
            stats["file_size_mb"] = "Unknown"
            
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) as count FROM PRED_info")
            stats["total_rows"] = cursor.fetchone()["count"]
            
        return stats
