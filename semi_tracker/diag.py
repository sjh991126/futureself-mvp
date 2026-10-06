"""소스 진단: 각 페이지의 구조를 요약 출력해 파서가 깨졌을 때 원인을 CI 로그에서 바로 볼 수 있게 한다.

사용법: python -m semi_tracker.diag [--data-dir data]
"""
from __future__ import annotations

import argparse
import json
import os
import re
from datetime import date

from bs4 import BeautifulSoup

from .fetchers.dramexchange import HOME_URL, match_product
from .fetchers.mops import MOPS_URL, TWSE_OPENAPI_URL
from .http import BROWSER_UA, make_session

NAVER_HEADERS = {"Referer": "https://finance.naver.com/", "Accept": "text/html,application/json;q=0.9,*/*;q=0.8"}


def _targets(today: date) -> list[tuple[str, str, dict]]:
    y, m = (today.year, today.month - 1) if today.month > 1 else (today.year - 1, 12)
    return [
        ("naver_frgn", "https://finance.naver.com/item/frgn.naver?code=005930&page=1", NAVER_HEADERS),
        ("naver_main", "https://finance.naver.com/item/main.naver?code=005930", NAVER_HEADERS),
        ("naver_m_integration", "https://m.stock.naver.com/api/stock/005930/integration", NAVER_HEADERS),
        ("naver_m_trend", "https://m.stock.naver.com/api/stock/005930/trend?pageSize=5&page=1", NAVER_HEADERS),
        ("naver_fx", "https://finance.naver.com/marketindex/exchangeDailyQuote.naver?marketindexCd=FX_USDKRW&page=1", NAVER_HEADERS),
        ("twse_openapi", TWSE_OPENAPI_URL, {"Accept": "application/json"}),
        ("mops", MOPS_URL.format(roc_year=y - 1911, month=m), {}),
        ("dramexchange", HOME_URL, {}),
    ]


def _decode(content: bytes, ctype: str) -> str:
    for enc in ("utf-8", "cp949", "cp950"):
        try:
            text = content.decode(enc)
            if enc == "utf-8" or "charset" not in ctype.lower():
                return text
            return text
        except UnicodeDecodeError:
            continue
    return content.decode("utf-8", errors="replace")


def summarize_html(text: str, interest: re.Pattern) -> list[str]:
    soup = BeautifulSoup(text, "lxml")
    lines = [f"  title={soup.title.get_text(strip=True)[:80] if soup.title else None!r} tables={len(soup.find_all('table'))}"]
    shown = 0
    for i, table in enumerate(soup.find_all("table")):
        ttext = table.get_text(" ", strip=True)
        if not interest.search(ttext):
            continue
        ths = [th.get_text(" ", strip=True)[:14] for th in table.find_all("th")][:10]
        first_row = None
        for tr in table.find_all("tr"):
            tds = [td.get_text(" ", strip=True)[:14] for td in tr.find_all("td")]
            if len(tds) >= 2:
                first_row = tds[:10]
                break
        lines.append(f"  table[{i}] summary={str(table.get('summary', ''))[:30]!r} class={table.get('class')} th={ths} row={first_row}")
        shown += 1
        if shown >= 4:
            break
    if shown == 0:
        snippet = re.sub(r"\s+", " ", soup.get_text(" ", strip=True))[:300]
        lines.append(f"  (관심 표 없음) text[:300]={snippet!r}")
    return lines


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data-dir", default="data")
    args = ap.parse_args(argv)
    session = make_session(user_agent=BROWSER_UA)
    interest = re.compile(r"외국인|2330|DDR|TLC|매매기준율|Contract|Spot", re.I)
    for key, url, headers in _targets(date.today()):
        print(f"\n== {key}: {url}")
        try:
            resp = session.get(url, headers=headers, timeout=25, allow_redirects=True)
        except Exception as e:  # noqa: BLE001
            print(f"  ERROR {type(e).__name__}: {str(e)[:200]}")
            continue
        ctype = resp.headers.get("content-type", "")
        print(f"  status={resp.status_code} final={resp.url[:120]} type={ctype[:60]} bytes={len(resp.content)}")
        text = _decode(resp.content, ctype)
        if "json" in ctype or text.lstrip().startswith(("{", "[")):
            try:
                data = resp.json()
                if isinstance(data, list):
                    print(f"  json list len={len(data)} first={json.dumps(data[0], ensure_ascii=False)[:400] if data else None}")
                    hit = [r for r in data if isinstance(r, dict) and str(r.get('公司代號', '')).strip() == '2330']
                    if hit:
                        print(f"  2330 row={json.dumps(hit[0], ensure_ascii=False)[:500]}")
                else:
                    print(f"  json keys={list(data)[:20]} head={json.dumps(data, ensure_ascii=False)[:500]}")
            except ValueError:
                print(f"  json parse 실패 text[:300]={text[:300]!r}")
        else:
            for line in summarize_html(text, interest):
                print(line)
            if key == "naver_main":
                m = re.search(r'id="_pbr"[^>]*>\s*([\d.,]+)', text)
                print(f"  _pbr={m.group(1) if m else None}")
            if key == "dramexchange":
                prods = sorted({match_product(td.get_text(' ', strip=True)) for td in BeautifulSoup(text, 'lxml').find_all('td')} - {None})
                print(f"  products={prods}")
    print("\n== series tails")
    sdir = os.path.join(args.data_dir, "series")
    for name in ("micron_revenue_usd_bn", "micron_gross_margin_pct", "nvidia_revenue_usd_bn", "spot_dram_ddr4_8gb",
                 "tsmc_monthly_revenue_ntd_bn", "foreign_net_005930", "pbr_005930"):
        path = os.path.join(sdir, f"{name}.csv")
        if os.path.exists(path):
            with open(path, encoding="utf-8") as f:
                rows = f.read().strip().splitlines()
            print(f"  {name}: {len(rows) - 1} rows, tail={rows[-4:]}")
        else:
            print(f"  {name}: 없음")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
