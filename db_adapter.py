import sqlite3
import os
import contextlib
from abc import ABC, abstractmethod
import urllib.parse

class BaseCursor(ABC):
    @abstractmethod
    def execute(self, query, params=None):
        pass

    @abstractmethod
    def executemany(self, query, params_seq):
        pass

    @abstractmethod
    def fetchall(self):
        pass

    @abstractmethod
    def fetchone(self):
        pass

class SQLiteCursorWrapper(BaseCursor):
    def __init__(self, cursor):
        self.cursor = cursor

    def execute(self, query, params=None):
        return self.cursor.execute(query, params or [])

    def executemany(self, query, params_seq):
        return self.cursor.executemany(query, params_seq)

    def fetchall(self):
        return [dict(r) for r in self.cursor.fetchall()]

    def fetchone(self):
        row = self.cursor.fetchone()
        return dict(row) if row else None

class PostgresCursorWrapper(BaseCursor):
    def __init__(self, cursor):
        self.cursor = cursor

    def _convert_query(self, query):
        # Convert standard '?' placeholders to Postgres '%s'
        query = query.replace('?', '%s')
        
        # Convert SQLite GROUP_CONCAT to Postgres STRING_AGG
        import re
        query = re.sub(r'GROUP_CONCAT\(([^)]+)\)', r"STRING_AGG(\1::text, ',')", query, flags=re.IGNORECASE)
        
        return query

    def execute(self, query, params=None):
        return self.cursor.execute(self._convert_query(query), params or [])

    def executemany(self, query, params_seq):
        return self.cursor.executemany(self._convert_query(query), params_seq)

    def fetchall(self):
        return self.cursor.fetchall()

    def fetchone(self):
        return self.cursor.fetchone()

class DatabaseAdapter(ABC):
    @abstractmethod
    def get_connection(self):
        """Context manager yielding a database connection wrapper."""
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
            class ConnectionWrapper:
                def __init__(self, c):
                    self.c = c
                def cursor(self):
                    return SQLiteCursorWrapper(self.c.cursor())
                def close(self):
                    self.c.close()
                def commit(self):
                    self.c.commit()
            yield ConnectionWrapper(conn)
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
            row = cursor.fetchone()
            stats["total_rows"] = row["count"] if row else 0
            
        return stats


class PostgresAdapter(DatabaseAdapter):
    def __init__(self, connection_string: str):
        self.connection_string = connection_string
        parsed = urllib.parse.urlparse(self.connection_string)
        self.host = parsed.hostname
        self.db_name = parsed.path.lstrip('/')
        self.username = parsed.username

    @contextlib.contextmanager
    def get_connection(self):
        import psycopg2
        import psycopg2.extras
        conn = psycopg2.connect(self.connection_string)
        try:
            class ConnectionWrapper:
                def __init__(self, c):
                    self.c = c
                def cursor(self):
                    return PostgresCursorWrapper(self.c.cursor(cursor_factory=psycopg2.extras.RealDictCursor))
                def close(self):
                    self.c.close()
                def commit(self):
                    self.c.commit()
            yield ConnectionWrapper(conn)
        finally:
            conn.close()

    def get_info(self) -> dict:
        return {
            "type": "PostgreSQL",
            "host": self.host,
            "path": "N/A",
            "username": self.username,
            "password": "***",
            "db_name": self.db_name
        }

    def get_schema(self) -> list[dict]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT table_name, column_name, data_type, character_maximum_length
                FROM information_schema.columns
                WHERE table_schema = 'public' 
                  AND table_name NOT IN ('geography_columns', 'geometry_columns', 'spatial_ref_sys')
                ORDER BY table_name, ordinal_position
            """)
            columns = cursor.fetchall()
            
            tables = {}
            for col in columns:
                t = col['table_name']
                if t not in tables:
                    tables[t] = []
                type_str = col['data_type']
                if col['character_maximum_length']:
                    type_str += f"({col['character_maximum_length']})"
                tables[t].append(f"{col['column_name']} {type_str}")
            
            return [
                {
                    "name": t_name, 
                    "sql": f"CREATE TABLE {t_name} (\n  " + ",\n  ".join(cols) + "\n);"
                }
                for t_name, cols in tables.items()
            ]

    def get_indexes(self) -> list[dict]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT indexname as name, indexdef as sql 
                FROM pg_indexes 
                WHERE schemaname = 'public'
            """)
            return cursor.fetchall()

    def get_stats(self) -> dict:
        stats = {}
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("SELECT pg_database_size(%s) as bytes", [self.db_name])
            row = cursor.fetchone()
            if row and row["bytes"]:
                stats["file_size_mb"] = round(row["bytes"] / (1024 * 1024), 2)
            else:
                stats["file_size_mb"] = "Unknown"
                
            cursor.execute("SELECT COUNT(*) as count FROM PRED_info")
            row = cursor.fetchone()
            stats["total_rows"] = row["count"] if row else 0
            
        return stats
