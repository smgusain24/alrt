"""Tests for the psycopg3 placeholder/JSONB translation shim in workers.db."""
from psycopg.types.json import Jsonb

from alrt_workers.db import _prepare


def test_translates_and_remaps_repeated_placeholders():
    """$N -> %s, with params rebuilt in appearance order (repeats bind correctly)."""
    sql, params = _prepare("SELECT * FROM t WHERE a = $1 OR b = $1 AND c = $2", ["x", "y"])
    assert sql == "SELECT * FROM t WHERE a = %s OR b = %s AND c = %s"
    assert params == ["x", "x", "y"]


def test_handles_out_of_order_placeholders():
    sql, params = _prepare("SELECT $2, $1", ["first", "second"])
    assert sql == "SELECT %s, %s"
    assert params == ["second", "first"]


def test_multi_digit_placeholders():
    src = [f"v{i}" for i in range(1, 13)]
    sql, params = _prepare("VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)", src)
    assert sql == "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)"
    assert params == src  # $10..$12 map correctly, not $1+'0'


def test_wraps_dict_and_list_as_jsonb():
    sql, params = _prepare("INSERT INTO t (doc, arr, n) VALUES ($1, $2, $3)", [{"k": 1}, [1, 2], 5])
    assert isinstance(params[0], Jsonb)   # dict -> jsonb
    assert isinstance(params[1], Jsonb)   # list -> jsonb
    assert params[2] == 5                 # scalar untouched


def test_no_placeholders_runs_raw():
    """A query with no $N binds nothing (psycopg3 leaves any literal % alone)."""
    sql, params = _prepare("SELECT tablename FROM pg_tables WHERE schemaname = 'public'", None)
    assert params is None
    assert sql == "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"


def test_literal_percent_is_doubled_when_binding():
    sql, params = _prepare("SELECT * FROM t WHERE name LIKE '%x%' AND id = $1", ["a"])
    assert sql == "SELECT * FROM t WHERE name LIKE '%%x%%' AND id = %s"
    assert params == ["a"]
