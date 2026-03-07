#!/usr/bin/env python3
"""Generate VAPID keys for Web Push. Run: pip install py_vapid && python scripts/gen_vapid.py"""
try:
    from py_vapid import vapid
    k = vapid.Vapid()
    k.generate_keys()
    print("Add to .env:")
    print(f"VAPID_PUBLIC_KEY={k.public_key.decode()}")
    print(f"VAPID_PRIVATE_KEY={k.private_key.decode()}")
except ImportError:
    print("Install: pip install py_vapid")
