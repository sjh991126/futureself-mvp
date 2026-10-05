"""DART OpenAPI: 삼성전자·SK하이닉스 분기 재무(재고·매출원가·CAPEX)와 장비주 단일판매·공급계약 공시.

무료 API 키(https://opendart.fss.or.kr) 가 필요하며 환경변수 DART_API_KEY 로 전달한다.
"""
from __future__ import annotations

import io
import re
import xml.etree.ElementTree as ET
import zipfile
from datetime import date
from typing import Iterable, Optional

from .. import config
from ..http import get, make_session

BASE = "https://opendart.fss.or.kr/api"
REPORT_CODES = [("11013", "Q1", "03-31"), ("11012", "H1", "06-30"), ("11014", "Q3", "09-30"), ("11011", "FY", "12-31")]
ACCOUNT_IDS = {
    "revenue": ("ifrs-full_Revenue",),
    "cogs": ("ifrs-full_CostOfSales",),
    "inventory": ("ifrs-full_Inventories",),
    "capex": ("ifrs-full_PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities",),
}
ACCOUNT_NAME_RE = {
    "revenue": re.compile(r"^(매출액|수익\(매출액\)|매출|영업수익)$"),
    "cogs": re.compile(r"^매출원가$"),
    "inventory": re.compile(r"^재고자산$"),
    "capex": re.compile(r"유형자산의\s*취득"),
}
SUPPLY_CONTRACT_RE = re.compile(r"단일판매|공급계약")
DISCLOSURE_LINK = "https://dart.fss.or.kr/dsaf001/main.do?rcpNo={rcept_no}"


class DartError(RuntimeError):
    pass


def _amount(text: Optional[str]) -> Optional[float]:
    if text is None:
        return None
    t = str(text).replace(",", "").strip()
    if t in ("", "-"):
        return None
    try:
        return float(t)
    except ValueError:
        return None


def pick_account(rows: Iterable[dict], metric: str, sj_div: Optional[str] = None) -> Optional[dict]:
    """재무제표 행 목록에서 metric 에 해당하는 행을 account_id 우선, 이름 정규식 차선으로 고른다."""
    rows = [r for r in rows if sj_div is None or r.get("sj_div") == sj_div]
    for r in rows:
        if r.get("account_id") in ACCOUNT_IDS[metric]:
            return r
    for r in rows:
        name = (r.get("account_nm") or "").replace(" ", "")
        if ACCOUNT_NAME_RE[metric].search(name):
            return r
    return None


def ytd_value(row: dict) -> Optional[float]:
    """누적(YTD) 금액: 분기·반기 보고서는 thstrm_add_amount, 없으면 thstrm_amount."""
    v = _amount(row.get("thstrm_add_amount"))
    if v is None:
        v = _amount(row.get("thstrm_amount"))
    return v


def quarters_from_ytd(ytd: dict[str, float]) -> dict[str, float]:
    """{'Q1': ytd, 'H1': ytd, 'Q3': ytd, 'FY': ytd} → 분기별 3개월 값."""
    order = ["Q1", "H1", "Q3", "FY"]
    out = {}
    prev = 0.0
    prev_ok = True
    for i, k in enumerate(order):
        if k not in ytd:
            prev_ok = False
            continue
        if i == 0 or prev_ok:
            out[k] = ytd[k] - prev
        prev = ytd[k]
        prev_ok = True
    return out


class DartClient:
    def __init__(self, api_key: Optional[str] = None, session=None):
        self.api_key = api_key or config.DART_API_KEY
        if not self.api_key:
            raise DartError("DART_API_KEY 환경변수가 없습니다 (https://opendart.fss.or.kr 에서 무료 발급)")
        self.session = session or make_session()

    def _json(self, endpoint: str, **params) -> dict:
        params["crtfc_key"] = self.api_key
        resp = get(self.session, f"{BASE}/{endpoint}", params=params)
        data = resp.json()
        status = data.get("status")
        if status == "013":  # 조회 결과 없음
            return {"status": status, "list": []}
        if status != "000":
            raise DartError(f"DART {endpoint} 오류 {status}: {data.get('message')}")
        return data

    # ── 재무제표 ─────────────────────────────────────────────────────
    def statements(self, corp_code: str, year: int, reprt_code: str, fs_div: str = "CFS") -> list[dict]:
        data = self._json("fnlttSinglAcntAll.json", corp_code=corp_code, bsns_year=str(year),
                          reprt_code=reprt_code, fs_div=fs_div)
        rows = data.get("list", [])
        if not rows and fs_div == "CFS":
            data = self._json("fnlttSinglAcntAll.json", corp_code=corp_code, bsns_year=str(year),
                              reprt_code=reprt_code, fs_div="OFS")
            rows = data.get("list", [])
        return rows

    def quarterly_metrics(self, corp_code: str, years: Iterable[int]) -> dict[str, list[dict]]:
        """연도별 4개 보고서를 읽어 {metric: [{end, value}]} 로 정리.

        revenue/cogs/capex 는 누적값 차감으로 분기 3개월 값을, inventory 는 기말 잔액을 쓴다.
        """
        series: dict[str, dict[str, float]] = {m: {} for m in ("revenue", "cogs", "capex", "inventory")}
        for year in years:
            ytd: dict[str, dict[str, float]] = {m: {} for m in ("revenue", "cogs", "capex")}
            for code, label, mmdd in REPORT_CODES:
                try:
                    rows = self.statements(corp_code, year, code)
                except DartError:
                    rows = []
                if not rows:
                    continue
                end = f"{year}-{mmdd}"
                for metric, sj in (("revenue", "IS"), ("cogs", "IS"), ("capex", "CF")):
                    row = pick_account(rows, metric, sj) or pick_account(rows, metric)
                    v = ytd_value(row) if row else None
                    if v is not None:
                        ytd[metric][label] = abs(v) if metric == "capex" else v
                inv = pick_account(rows, "inventory", "BS") or pick_account(rows, "inventory")
                if inv is not None:
                    iv = _amount(inv.get("thstrm_amount"))
                    if iv is not None:
                        series["inventory"][end] = iv
            for metric in ("revenue", "cogs", "capex"):
                q = quarters_from_ytd(ytd[metric])
                for code, label, mmdd in REPORT_CODES:
                    if label in q:
                        series[metric][f"{year}-{mmdd}"] = q[label]
        return {m: [{"end": k, "value": v} for k, v in sorted(d.items())] for m, d in series.items()}

    # ── 공시 목록 ─────────────────────────────────────────────────────
    def disclosures(self, corp_code: str, bgn_de: str, end_de: str, pblntf_ty: str = "I") -> list[dict]:
        data = self._json("list.json", corp_code=corp_code, bgn_de=bgn_de, end_de=end_de,
                          pblntf_ty=pblntf_ty, page_count="100", page_no="1")
        return data.get("list", [])

    def supply_contracts(self, corp_codes: dict[str, str], bgn: date, end: date) -> list[dict]:
        """corp_codes: {stock_code: corp_code}. 단일판매·공급계약 공시만 추려 반환."""
        out = []
        for stock_code, corp_code in corp_codes.items():
            try:
                items = self.disclosures(corp_code, bgn.strftime("%Y%m%d"), end.strftime("%Y%m%d"))
            except DartError:
                continue
            for it in items:
                if SUPPLY_CONTRACT_RE.search(it.get("report_nm", "")):
                    out.append({
                        "stock_code": stock_code,
                        "corp_name": it.get("corp_name"),
                        "report_nm": it.get("report_nm"),
                        "rcept_no": it.get("rcept_no"),
                        "rcept_dt": it.get("rcept_dt"),
                        "url": DISCLOSURE_LINK.format(rcept_no=it.get("rcept_no")),
                    })
        out.sort(key=lambda r: r["rcept_dt"], reverse=True)
        return out

    def document_text(self, rcept_no: str) -> str:
        resp = get(self.session, f"{BASE}/document.xml", params={"crtfc_key": self.api_key, "rcept_no": rcept_no})
        with zipfile.ZipFile(io.BytesIO(resp.content)) as zf:
            name = zf.namelist()[0]
            raw = zf.read(name)
        for enc in ("utf-8", "cp949"):
            try:
                return raw.decode(enc)
            except UnicodeDecodeError:
                continue
        return raw.decode("utf-8", errors="replace")

    # ── 고유번호 ─────────────────────────────────────────────────────
    def corp_codes(self, stock_codes: Iterable[str]) -> dict[str, str]:
        resp = get(self.session, f"{BASE}/corpCode.xml", params={"crtfc_key": self.api_key})
        with zipfile.ZipFile(io.BytesIO(resp.content)) as zf:
            raw = zf.read(zf.namelist()[0])
        return parse_corp_codes(raw, stock_codes)


def parse_corp_codes(xml_bytes: bytes, stock_codes: Iterable[str]) -> dict[str, str]:
    wanted = set(stock_codes)
    out: dict[str, str] = {}
    for _, el in ET.iterparse(io.BytesIO(xml_bytes)):
        if el.tag != "list":
            continue
        sc = (el.findtext("stock_code") or "").strip()
        if sc in wanted:
            out[sc] = (el.findtext("corp_code") or "").strip()
        el.clear()
    return out


_CONTRACT_AMOUNT_RE = re.compile(r"계약금액[^0-9]{0,60}?([\d,]{6,})")
_SALES_RATIO_RE = re.compile(r"매출액\s*대비[^0-9]{0,30}?([\d]+(?:\.\d+)?)")


def parse_contract_details(text: str) -> dict:
    """공시 원문에서 계약금액(원)·매출액 대비(%) 추출 (베스트 에포트)."""
    plain = re.sub(r"<[^>]+>", " ", text)
    plain = re.sub(r"\s+", " ", plain)
    out: dict = {}
    m = _CONTRACT_AMOUNT_RE.search(plain)
    if m:
        out["amount_krw"] = _amount(m.group(1))
    m = _SALES_RATIO_RE.search(plain)
    if m:
        out["sales_ratio_pct"] = _amount(m.group(1))
    return out
