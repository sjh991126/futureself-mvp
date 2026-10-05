"""실행 파이프라인: 자동 수집 → 수동 입력 병합 → 지표 판정 → 국면 추정 → 저장·리포트·알림.

사용법:
    python -m semi_tracker.run                 # 전체 실행 (data/ 에 저장)
    python -m semi_tracker.run --offline       # 네트워크 없이 저장된 데이터·수동 입력만으로 판정
    python -m semi_tracker.run --only fx,naver # 일부 소스만
"""
from __future__ import annotations

import argparse
import sys
from datetime import date, datetime, timedelta, timezone
from typing import Callable, Optional

from . import __version__, config
from . import calendar as cal
from .fetchers import dart as dart_mod
from .fetchers import dramexchange, edgar, fx, mops, naver
from .http import make_session
from .models import Point, SourceStatus
from .phase import assess, diff_snapshots
from .report import render
from .store import Store, now_iso
from .signals import compute_all


def kst_today() -> date:
    return (datetime.now(timezone.utc) + timedelta(hours=9)).date()


def _quarter_days(end: str) -> int:
    e = date.fromisoformat(end)
    start_month = ((e.month - 1) // 3) * 3 + 1
    return (e - date(e.year, start_month, 1)).days + 1


class Pipeline:
    def __init__(self, data_dir: str = "data", today: Optional[date] = None, offline: bool = False,
                 only: Optional[list[str]] = None, backfill_months: int = 2, verbose: bool = True):
        self.store = Store(data_dir)
        self.manual = self.store.load_manual()
        self.today = today or kst_today()
        self.offline = offline
        self.only = set(only) if only else None
        self.backfill_months = backfill_months
        self.verbose = verbose
        self.statuses: list[SourceStatus] = []
        self.news: list[dict] = []
        self.session = make_session()
        self.dart_available = bool(config.DART_API_KEY)

    # ── 공통 ──────────────────────────────────────────────────────────
    def _log(self, msg: str) -> None:
        if self.verbose:
            print(msg, flush=True)

    def _run(self, key: str, fn: Callable[[], tuple[str, int]]) -> None:
        if self.only and key not in self.only:
            return
        if self.offline:
            self.statuses.append(SourceStatus(key, False, "skipped", "offline 모드", now_iso()))
            return
        try:
            msg, count = fn()
            self.statuses.append(SourceStatus(key, True, "auto", msg, now_iso(), count))
            self._log(f"  ✓ {key}: {msg}")
        except Exception as e:  # noqa: BLE001 - 소스 하나의 실패가 전체를 멈추지 않게
            msg = f"{type(e).__name__}: {e}"[:300]
            self.statuses.append(SourceStatus(key, False, "error", msg, now_iso()))
            self._log(f"  ✗ {key}: {msg}")

    # ── 소스별 수집 ───────────────────────────────────────────────────
    def step_dramexchange(self) -> tuple[str, int]:
        records = dramexchange.fetch_prices(self.session, self.today)
        if not records:
            raise RuntimeError("공개 페이지에서 가격 표를 찾지 못했습니다 (수동 입력으로 대체)")
        n = 0
        kinds = set()
        for r in records:
            if r["kind"] == "spot":
                d = self.today.isoformat()
            else:
                d = r.get("period") or self.today.replace(day=1).isoformat()
            self.store.upsert_points(f"{r['kind']}_{r['product']}", [Point(d, r["price"], f"dramexchange {r['item']}")])
            kinds.add(r["kind"])
            n += 1
        return f"{n}개 가격 ({', '.join(sorted(kinds))})", n

    def step_trendforce_news(self) -> tuple[str, int]:
        news = dramexchange.fetch_news(self.session)
        for item in news:
            item.setdefault("seen", self.today.isoformat())
        self.store.upsert_records("news", news, key="url", sort_key="seen", keep=60)
        self.news = news
        return f"헤드라인 {len(news)}건", len(news)

    def step_fx(self) -> tuple[str, int]:
        source, rows = fx.fetch_usdkrw(self.session, days=90, today=self.today)
        if not rows:
            raise RuntimeError("환율 데이터 없음")
        self.store.upsert_points("usdkrw", [Point(r["date"], r["rate"], source) for r in rows])
        return f"{source} {len(rows)}일 (최근 {rows[-1]['rate']:.1f})", len(rows)

    def _step_naver(self, code: str) -> Callable[[], tuple[str, int]]:
        def _fn() -> tuple[str, int]:
            rows = naver.fetch_foreign_flows(self.session, code, pages=3)
            if not rows:
                raise RuntimeError("외국인 순매매 표를 찾지 못함")
            self.store.upsert_points(f"foreign_net_{code}", [Point(r["date"], r["frgn_net"], "naver") for r in rows])
            self.store.upsert_points(f"foreign_net_value_{code}",
                                     [Point(r["date"], r["frgn_net"] * r["close"] / 1e8, "억원") for r in rows if r.get("close")])
            self.store.upsert_points(f"price_{code}", [Point(r["date"], r["close"], "naver") for r in rows if r.get("close")])
            main = naver.fetch_main(self.session, code)
            msg = f"순매매 {len(rows)}일"
            if main.get("pbr") is not None:
                self.store.upsert_points(f"pbr_{code}", [Point(self.today.isoformat(), main["pbr"], "naver")])
                msg += f", PBR {main['pbr']:.2f}"
            return msg, len(rows)
        return _fn

    def step_edgar_micron(self) -> tuple[str, int]:
        client = edgar.EdgarClient()
        cik = config.SEC_CIK["MU"]
        rev = client.quarterly(cik, edgar.REVENUE_TAGS)
        if not rev:
            raise RuntimeError("매출 데이터 없음")
        self.store.upsert_points("micron_revenue_usd_bn", [Point(r["end"], r["value"] / 1e9, "edgar") for r in rev])
        gp = {r["end"]: r["value"] for r in client.quarterly(cik, edgar.GROSS_PROFIT_TAGS)}
        gm = [Point(r["end"], gp[r["end"]] / r["value"] * 100, "edgar") for r in rev if r["end"] in gp and r["value"]]
        self.store.upsert_points("micron_gross_margin_pct", gm)
        cogs = client.quarterly(cik, edgar.COGS_TAGS)
        inv = client.instants(cik, edgar.INVENTORY_TAGS)
        dio = edgar.days_inventory(cogs, inv)
        self.store.upsert_points("dio_weeks_micron", [Point(r["end"], r["weeks"], "edgar") for r in dio])
        capex = client.quarterly(cik, edgar.CAPEX_TAGS)
        self.store.upsert_points("micron_capex_usd_bn", [Point(r["end"], r["value"] / 1e9, "edgar") for r in capex])
        return f"분기 {len(rev)}개 (최근 {rev[-1]['end']} 매출 ${rev[-1]['value'] / 1e9:.2f}B)", len(rev)

    def step_edgar_nvidia(self) -> tuple[str, int]:
        client = edgar.EdgarClient()
        rev = client.quarterly(config.SEC_CIK["NVDA"], edgar.REVENUE_TAGS)
        if not rev:
            raise RuntimeError("매출 데이터 없음")
        self.store.upsert_points("nvidia_revenue_usd_bn", [Point(r["end"], r["value"] / 1e9, "edgar") for r in rev])
        return f"분기 {len(rev)}개 (최근 {rev[-1]['end']} ${rev[-1]['value'] / 1e9:.1f}B)", len(rev)

    def step_mops_tsmc(self) -> tuple[str, int]:
        rows = mops.fetch_recent(self.session, months=self.backfill_months, today=self.today)
        if not rows:
            raise RuntimeError("MOPS 월매출 표에서 2330 행을 찾지 못함")
        self.store.upsert_points("tsmc_monthly_revenue_ntd_bn", [Point(r["date"], r["revenue"] / 1e6, "mops") for r in rows])
        self.store.upsert_points("tsmc_monthly_yoy_pct", [Point(r["date"], r["yoy_pct"], "mops") for r in rows if r.get("yoy_pct") is not None])
        latest = max(rows, key=lambda r: r["date"])
        return f"{latest['date'][:7]} NT${latest['revenue'] / 1e6:.1f}B (YoY {latest.get('yoy_pct')}%)", len(rows)

    def _dart_client(self) -> dart_mod.DartClient:
        return dart_mod.DartClient(session=self.session)

    def step_dart_financials(self) -> tuple[str, int]:
        client = self._dart_client()
        years = [self.today.year - 2, self.today.year - 1, self.today.year]
        parts = []
        for code, name in config.KR_STOCKS.items():
            cid = "samsung" if code == "005930" else "hynix"
            corp = config.DART_CORP_CODES[code]
            m = client.quarterly_metrics(corp, years)
            self.store.upsert_points(f"capex_{cid}_krw_tn", [Point(r["end"], r["value"] / 1e12, "dart") for r in m["capex"]])
            self.store.upsert_points(f"revenue_{cid}_krw_tn", [Point(r["end"], r["value"] / 1e12, "dart") for r in m["revenue"]])
            inv = {r["end"]: r["value"] for r in m["inventory"]}
            dio = [Point(r["end"], inv[r["end"]] / r["value"] * _quarter_days(r["end"]) / 7.0, "dart")
                   for r in m["cogs"] if r["end"] in inv and r["value"] > 0]
            self.store.upsert_points(f"dio_weeks_{cid}", dio)
            parts.append(f"{name} 분기 {len(m['cogs'])}개")
        return ", ".join(parts), len(parts)

    def step_dart_equipment(self) -> tuple[str, int]:
        client = self._dart_client()
        cache = self.store.cache_get("dart_corp_codes") or {}
        missing = [c for c in config.EQUIPMENT_STOCKS if c not in cache]
        if missing:
            cache.update(client.corp_codes(missing))
            self.store.cache_set("dart_corp_codes", cache)
        codes = {c: cache[c] for c in config.EQUIPMENT_STOCKS if cache.get(c)}
        items = client.supply_contracts(codes, self.today - timedelta(days=180), self.today)
        known = {r.get("rcept_no") for r in self.store.load_records("equipment_orders")}
        parsed = 0
        for it in items:
            if it["rcept_no"] in known or parsed >= 10:
                continue
            try:
                it.update(dart_mod.parse_contract_details(client.document_text(it["rcept_no"])))
            except Exception:  # noqa: BLE001 - 상세 파싱은 선택 사항
                pass
            parsed += 1
        n_new = self.store.upsert_records("equipment_orders", items, key="rcept_no", sort_key="rcept_dt")
        return f"공시 {len(items)}건 (신규 {n_new})", len(items)

    # ── 수동 입력 병합 ────────────────────────────────────────────────
    def apply_manual(self) -> None:
        m = self.manual
        for product, entries in (m.get("contract_price") or {}).items():
            pts = [Point(f"{e['month']}-01", float(e["price"]), f"manual {e.get('note', '')}".strip())
                   for e in entries or [] if isinstance(e, dict) and e.get("month") and e.get("price") is not None]
            if pts:
                self.store.upsert_points(f"contract_{product}", pts)
        for product, entries in (m.get("spot_price") or {}).items():
            pts = [Point(str(e["date"]), float(e["price"]), f"manual {e.get('note', '')}".strip())
                   for e in entries or [] if isinstance(e, dict) and e.get("date") and e.get("price") is not None]
            if pts:
                self.store.upsert_points(f"spot_{product}", pts)
        inv = (m.get("inventory_weeks") or {}).get("customer") or []
        pts = [Point(str(e["date"]), float(e["weeks"]), str(e.get("note", ""))) for e in inv
               if isinstance(e, dict) and e.get("date") and e.get("weeks") is not None]
        if pts:
            self.store.upsert_points("customer_inventory_weeks", pts)
        dc = (m.get("nvidia") or {}).get("data_center_revenue_usd_bn") or []
        pts = [Point(str(e["date"]), float(e["value"]), f"manual {e.get('quarter', '')}".strip()) for e in dc
               if isinstance(e, dict) and e.get("date") and e.get("value") is not None]
        if pts:
            self.store.upsert_points("nvidia_dc_revenue_usd_bn", pts)
        for e in m.get("pbr") or []:
            if not isinstance(e, dict) or not e.get("date"):
                continue
            for name, code in (("samsung", "005930"), ("hynix", "000660")):
                if e.get(name) is not None:
                    self.store.upsert_points(f"pbr_{code}", [Point(str(e["date"]), float(e[name]), "manual")])
        for e in m.get("usdkrw") or []:
            if isinstance(e, dict) and e.get("date") and e.get("rate") is not None:
                self.store.upsert_points("usdkrw", [Point(str(e["date"]), float(e["rate"]), "manual")])

    # ── 실행 ──────────────────────────────────────────────────────────
    def run(self, notify: bool = True) -> dict:
        self._log(f"semi_tracker v{__version__} · {self.today} · data={self.store.root} · offline={self.offline}")
        self._run("dramexchange", self.step_dramexchange)
        self._run("trendforce_news", self.step_trendforce_news)
        self._run("fx", self.step_fx)
        for code in config.KR_STOCKS:
            self._run(f"naver_{code}", self._step_naver(code))
        self._run("edgar_micron", self.step_edgar_micron)
        self._run("edgar_nvidia", self.step_edgar_nvidia)
        self._run("mops_tsmc", self.step_mops_tsmc)
        if self.dart_available:
            self._run("dart_financials", self.step_dart_financials)
            self._run("dart_equipment", self.step_dart_equipment)
        else:
            for key in ("dart_financials", "dart_equipment"):
                if not self.only or key in self.only:
                    self.statuses.append(SourceStatus(key, False, "needs_key", "DART_API_KEY 미설정 (무료 발급: opendart.fss.or.kr)", now_iso()))
        self.apply_manual()
        if not self.news:
            self.news = self.store.load_records("news")[:12]

        signals = compute_all(self.store, self.manual, self.today, dart_available=self.dart_available)
        phase = assess(signals)
        prev = self.store.load_latest()
        snapshot = {
            "version": __version__,
            "generated_at": now_iso(),
            "today": self.today.isoformat(),
            "phase": phase.to_dict(),
            "signals": [s.to_dict() for s in signals],
            "sources": [s.to_dict() for s in self.statuses],
            "calendar": cal.events(self.today),
            "news": self.news,
        }
        snapshot["changes"] = diff_snapshots(prev, snapshot)
        self.store.save_latest(snapshot)
        self.store.append_signal_history(snapshot)
        report_path = self.store.save_report(render(snapshot))
        self._log("")
        self._log(f"종합 국면: {phase.label} (신뢰도 {phase.confidence:.0%}) — {phase.summary}")
        for s in signals:
            self._log(f"  {s.status_label:<10} {s.name}: {s.headline}")
        if snapshot["changes"]:
            self._log("변화: " + "; ".join(snapshot["changes"]))
        self._log(f"리포트: {report_path}")
        if notify and not self.offline:
            try:
                from . import notify as notify_mod
                sent = notify_mod.send(snapshot, snapshot["changes"])
                if sent:
                    self._log(f"알림 전송: {', '.join(sent)}")
            except Exception as e:  # noqa: BLE001
                self._log(f"알림 실패: {e}")
        return snapshot


def main(argv: Optional[list[str]] = None) -> int:
    ap = argparse.ArgumentParser(description="반도체 사이클 국면 지표 트래커")
    ap.add_argument("--data-dir", default="data")
    ap.add_argument("--offline", action="store_true", help="네트워크 수집 없이 저장 데이터·수동 입력만으로 판정")
    ap.add_argument("--only", help="실행할 소스 키 (쉼표 구분): dramexchange,trendforce_news,fx,naver_005930,naver_000660,edgar_micron,edgar_nvidia,mops_tsmc,dart_financials,dart_equipment")
    ap.add_argument("--backfill-months", type=int, default=2, help="TSMC 월매출 소급 개월 수")
    ap.add_argument("--today", help="기준일 YYYY-MM-DD (테스트용)")
    ap.add_argument("--no-notify", action="store_true")
    ap.add_argument("--strict", action="store_true", help="소스 하나라도 실패하면 종료 코드 1")
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args(argv)
    today = date.fromisoformat(args.today) if args.today else None
    p = Pipeline(args.data_dir, today=today, offline=args.offline,
                 only=args.only.split(",") if args.only else None,
                 backfill_months=args.backfill_months, verbose=not args.quiet)
    p.run(notify=not args.no_notify)
    failed = [s for s in p.statuses if s.mode == "error"]
    if args.strict and failed:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
