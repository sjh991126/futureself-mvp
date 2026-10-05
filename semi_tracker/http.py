"""HTTP 세션 (재시도·타임아웃·User-Agent)."""
from __future__ import annotations

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from . import config

BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)


def sec_user_agent() -> str:
    # SEC 공정접근 정책: "회사/앱 이름 연락처이메일" 형식의 UA 필수
    return f"semi-cycle-tracker/0.1 {config.CONTACT_EMAIL}"


def make_session(user_agent: str = BROWSER_UA, retries: int = 3) -> requests.Session:
    s = requests.Session()
    retry = Retry(
        total=retries,
        backoff_factor=1.0,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=frozenset(["GET", "POST"]),
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retry)
    s.mount("https://", adapter)
    s.mount("http://", adapter)
    s.headers.update({"User-Agent": user_agent, "Accept-Language": "ko,en;q=0.8"})
    return s


def get(session: requests.Session, url: str, **kwargs) -> requests.Response:
    kwargs.setdefault("timeout", config.REQUEST_TIMEOUT)
    resp = session.get(url, **kwargs)
    resp.raise_for_status()
    return resp
