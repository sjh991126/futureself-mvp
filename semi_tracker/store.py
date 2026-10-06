"""파일 저장소: 시계열 CSV, 최신 스냅샷 JSON, 수동 입력 YAML, 캐시."""
from __future__ import annotations

import csv
import json
import os
from datetime import datetime, timezone
from typing import Iterable, Optional

import yaml

from .models import Point


class Store:
    def __init__(self, root: str = "data"):
        self.root = root
        self.series_dir = os.path.join(root, "series")
        self.cache_dir = os.path.join(root, "cache")
        self.reports_dir = os.path.join(root, "reports")
        for d in (self.series_dir, self.cache_dir, self.reports_dir):
            os.makedirs(d, exist_ok=True)

    # ── 시계열 ────────────────────────────────────────────────────────
    def series_path(self, key: str) -> str:
        return os.path.join(self.series_dir, f"{key}.csv")

    def load_series(self, key: str) -> list[Point]:
        path = self.series_path(key)
        if not os.path.exists(path):
            return []
        out: list[Point] = []
        with open(path, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                try:
                    out.append(Point(row["date"], float(row["value"]), row.get("note", "") or ""))
                except (KeyError, ValueError):
                    continue
        out.sort(key=lambda p: p.date)
        return out

    def upsert_points(self, key: str, points: Iterable[Point]) -> int:
        """같은 날짜는 덮어쓰고(최신 수집 우선) 날짜순으로 저장. 저장된 총 점 수를 돌려준다."""
        existing = {p.date: p for p in self.load_series(key)}
        n_new = 0
        for p in points:
            if p.date not in existing:
                n_new += 1
            existing[p.date] = p
        rows = sorted(existing.values(), key=lambda p: p.date)
        with open(self.series_path(key), "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=["date", "value", "note"])
            w.writeheader()
            for p in rows:
                w.writerow(p.to_row())
        return n_new

    def list_series(self) -> list[str]:
        return sorted(f[:-4] for f in os.listdir(self.series_dir) if f.endswith(".csv"))

    # ── 수동 입력 ─────────────────────────────────────────────────────
    @property
    def manual_path(self) -> str:
        return os.path.join(self.root, "manual_inputs.yaml")

    def load_manual(self) -> dict:
        if not os.path.exists(self.manual_path):
            return {}
        with open(self.manual_path, encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
        return data if isinstance(data, dict) else {}

    def save_manual(self, data: dict) -> None:
        with open(self.manual_path, "w", encoding="utf-8") as f:
            yaml.safe_dump(data, f, allow_unicode=True, sort_keys=False)

    # ── 스냅샷·리포트 ─────────────────────────────────────────────────
    @property
    def latest_path(self) -> str:
        return os.path.join(self.root, "latest.json")

    def load_latest(self) -> Optional[dict]:
        if not os.path.exists(self.latest_path):
            return None
        with open(self.latest_path, encoding="utf-8") as f:
            return json.load(f)

    def save_latest(self, snapshot: dict) -> None:
        with open(self.latest_path, "w", encoding="utf-8") as f:
            json.dump(snapshot, f, ensure_ascii=False, indent=2)

    def save_report(self, markdown: str) -> str:
        path = os.path.join(self.reports_dir, "latest.md")
        with open(path, "w", encoding="utf-8") as f:
            f.write(markdown)
        return path

    def append_signal_history(self, snapshot: dict) -> None:
        """날짜별 국면·지표 판정 기록(변화 추적용)."""
        path = os.path.join(self.root, "signal_history.csv")
        keys = [s["key"] for s in snapshot["signals"]]
        row = {"date": snapshot["generated_at"][:10], "phase": snapshot["phase"].get("phase") or ""}
        for s in snapshot["signals"]:
            row[s["key"]] = s["status"]
        existing: list[dict] = []
        if os.path.exists(path):
            with open(path, newline="", encoding="utf-8") as f:
                existing = [r for r in csv.DictReader(f) if r.get("date") != row["date"]]
        existing.append(row)
        with open(path, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=["date", "phase"] + keys)
            w.writeheader()
            for r in existing:
                w.writerow({k: r.get(k, "") for k in w.fieldnames})

    # ── 레코드(JSON 목록) ─────────────────────────────────────────────
    def records_path(self, name: str) -> str:
        return os.path.join(self.root, f"{name}.json")

    def load_records(self, name: str) -> list[dict]:
        path = self.records_path(name)
        if not os.path.exists(path):
            return []
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, list) else []

    def upsert_records(self, name: str, records: Iterable[dict], key: str, sort_key: Optional[str] = None,
                       keep: int = 500) -> int:
        """key 필드 기준으로 중복을 합치고 저장. 새로 추가된 개수를 돌려준다."""
        existing = {r.get(key): r for r in self.load_records(name) if r.get(key) is not None}
        n_new = 0
        for r in records:
            k = r.get(key)
            if k is None:
                continue
            if k not in existing:
                n_new += 1
            existing[k] = {**existing.get(k, {}), **r}
        rows = list(existing.values())
        if sort_key:
            rows.sort(key=lambda r: str(r.get(sort_key, "")), reverse=True)
        rows = rows[:keep]
        with open(self.records_path(name), "w", encoding="utf-8") as f:
            json.dump(rows, f, ensure_ascii=False, indent=2)
        return n_new

    # ── 캐시 ──────────────────────────────────────────────────────────
    def cache_get(self, name: str) -> Optional[dict]:
        path = os.path.join(self.cache_dir, f"{name}.json")
        if not os.path.exists(path):
            return None
        with open(path, encoding="utf-8") as f:
            return json.load(f)

    def cache_set(self, name: str, data: dict) -> None:
        path = os.path.join(self.cache_dir, f"{name}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)


def now_iso() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")
