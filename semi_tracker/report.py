"""스냅샷 → 마크다운 리포트."""
from __future__ import annotations

from .config import INDICATOR_BY_KEY, PHASES
from .models import FRESHNESS_LABEL


def _esc(s) -> str:
    return str(s if s is not None else "").replace("|", "\\|").replace("\n", " ")


def render(snapshot: dict) -> str:
    ph = snapshot["phase"]
    lines = [
        f"# 반도체 사이클 국면 트래커 — {snapshot['today']}",
        "",
        f"**종합 국면: {ph['label']}** (신뢰도 {ph['confidence']:.0%}, 지표 {ph['coverage']}/{len(snapshot['signals'])}개 반영)",
        "",
        ph["summary"],
        "",
    ]
    if ph.get("guide"):
        lines += [f"> 다음 확인 포인트: {ph['guide']}", ""]
    votes = ph.get("votes", {})
    lines += ["| 국면 | 투표 합계 |", "|---|---|"]
    for k in (1, 2, 3, 4):
        lines.append(f"| {PHASES[k]} | {float(votes.get(str(k), votes.get(k, 0))):.1f} |")
    lines.append("")
    if snapshot.get("changes"):
        lines += ["## 이전 실행 대비 변화", ""] + [f"- {c}" for c in snapshot["changes"]] + [""]

    lines += ["## 지표별 판정", "", "| # | 지표 | 현재값 | 판정 | 근거 | 선행/동행 | 기준일 | 상태 |", "|---|---|---|---|---|---|---|---|"]
    for i, s in enumerate(snapshot["signals"], start=1):
        lines.append(f"| {i} | {_esc(s['name'])} | {_esc(s['headline'])} | {s['status_label']} | {_esc(s['rationale'])} | "
                     f"{_esc(s['lead_lag'])} | {s.get('as_of') or '—'} | {FRESHNESS_LABEL.get(s['freshness'], s['freshness'])} |")
    lines.append("")

    todo = [(s["name"], n) for s in snapshot["signals"] for n in s.get("needs_manual", [])]
    if todo:
        lines += ["## 수동 입력 필요", ""] + [f"- **{n}**: {t}" for n, t in todo] + ["", "`data/manual_inputs.yaml` 을 수정한 뒤 커밋하면 다음 실행부터 반영됩니다.", ""]

    if ph.get("dissenters"):
        lines += ["## 반대 신호", ""] + [f"- {d['name']} → {d['phase_label']} (가중치 {d['weight']}): {d['rationale']}" for d in ph["dissenters"]] + [""]

    lines += ["## 다음 발표 일정", "", "| 날짜 | D-day | 이벤트 |", "|---|---|---|"]
    for e in snapshot.get("calendar", [])[:12]:
        lines.append(f"| {e['date']}{' (예상)' if e['est'] else ''} | D-{e['days']} | {_esc(e['label'])} |")
    lines.append("")

    lines += ["## 수집 상태", "", "| 소스 | 결과 | 모드 | 메시지 |", "|---|---|---|---|"]
    for st in snapshot.get("sources", []):
        lines.append(f"| {st['key']} | {'OK' if st['ok'] else 'FAIL'} | {st['mode']} | {_esc(st['message'])} |")
    lines.append("")

    if snapshot.get("news"):
        lines += ["## TrendForce 관련 헤드라인", ""] + [f"- [{_esc(n['title'])}]({n['url']})" for n in snapshot["news"][:8]] + [""]

    lines += ["## 지표 정의 (원문)", "", "| 지표 | 어디서 보나 | 해석 | 선행/동행 | 자동화 |", "|---|---|---|---|---|"]
    for s in snapshot["signals"]:
        m = INDICATOR_BY_KEY[s["key"]]
        lines.append(f"| {m['name']} | {_esc(m['where'])} | {_esc(m['interpretation'])} | {m['lead_lag']} | {_esc(m['auto'])} |")
    lines += ["", f"_생성: {snapshot['generated_at']} · 투자 판단의 참고용이며 데이터 오류 가능성이 있습니다._", ""]
    return "\n".join(lines)
