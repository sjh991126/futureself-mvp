"""판정 변화 시 Slack/Telegram 알림 (환경변수가 있을 때만)."""
from __future__ import annotations

import os

import requests


def build_message(snapshot: dict, changes: list[str]) -> str:
    ph = snapshot["phase"]
    lines = [f"[반도체 사이클 트래커 {snapshot['today']}] {ph['label']} (신뢰도 {ph['confidence']:.0%})", ph["summary"], ""]
    if changes:
        lines.append("변화:")
        lines += [f"• {c}" for c in changes]
        lines.append("")
    for s in snapshot["signals"]:
        lines.append(f"{s['status_label']} {s['name']}: {s['headline']}")
    return "\n".join(lines)


def send(snapshot: dict, changes: list[str], force: bool = False) -> list[str]:
    """보낸 채널 이름 목록을 돌려준다. 변화가 없고 force 가 아니면 보내지 않는다."""
    if not changes and not force:
        return []
    text = build_message(snapshot, changes)
    sent = []
    slack = os.environ.get("SLACK_WEBHOOK_URL")
    if slack:
        requests.post(slack, json={"text": text}, timeout=15).raise_for_status()
        sent.append("slack")
    token, chat = os.environ.get("TELEGRAM_BOT_TOKEN"), os.environ.get("TELEGRAM_CHAT_ID")
    if token and chat:
        requests.post(f"https://api.telegram.org/bot{token}/sendMessage",
                      json={"chat_id": chat, "text": text}, timeout=15).raise_for_status()
        sent.append("telegram")
    return sent
