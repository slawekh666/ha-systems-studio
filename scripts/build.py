#!/usr/bin/env python3
"""Build HACS-compatible Home Assistant Systems Studio.

The public build command remains: python3 scripts/build.py
Stage 03 only modularizes the existing fail-closed build; it does not replace
the upstream Warmwasser source or change the generated JavaScript bundle.
"""
from build_support.bundle import build


if __name__ == '__main__':
    build()
