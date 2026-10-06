import os
import sys

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

FIXTURES = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixtures")


@pytest.fixture
def fixture_text():
    def _load(name: str) -> str:
        with open(os.path.join(FIXTURES, name), encoding="utf-8") as f:
            return f.read()
    return _load
