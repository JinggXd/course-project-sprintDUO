"""Public deployment smoke checks for SprintDUO. Credentials/tokens are never printed.

Called by .github/workflows/deploy.yml after a deployment:
    python3 deploy/smoke_test.py SERVICE_URL

Checks (in order):
  1. GET /api/health -> {"status": "ok"}
  2. GET /api/ready  -> {"db": "connected"}   (proves Cloud SQL connectivity)
  3. GET /           -> HTML page (built React SPA served)
  4. OPTIONAL login  -> POST /api/auth/login (HttpOnly sprintduo_session cookie),
                        GET /api/auth/me, POST /api/auth/logout.
                        Runs only if BOTH env vars SMOKE_EMAIL and SMOKE_PASSWORD
                        are set (set both or neither). Always logs out in finally.
"""
import http.cookiejar
import json
import os
import sys
import time
import urllib.error
import urllib.request

_COOKIE_JAR = http.cookiejar.CookieJar()
_OPENER = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(_COOKIE_JAR))


def request(base, path, data=None):
    headers = {}
    if data is not None:
        headers['Content-Type'] = 'application/json'
    req = urllib.request.Request(
        base + path,
        headers=headers,
        data=json.dumps(data).encode() if data is not None else None,
    )
    with _OPENER.open(req, timeout=30) as response:
        return response.read()


def check(base):
    for path, predicate in (
        ('/api/health', lambda b: json.loads(b).get('status') == 'ok'),
        ('/api/ready', lambda b: json.loads(b).get('db') == 'connected'),
        ('/', lambda b: b'<html' in b.lower()),
    ):
        for attempt in range(5):
            try:
                if not predicate(request(base, path)):
                    raise ValueError('Unexpected response')
                break
            except (urllib.error.URLError, TimeoutError, ValueError):
                if attempt == 4:
                    raise RuntimeError('Smoke check failed: ' + path) from None
                time.sleep(3)
        print('PASS ' + path)

    email, password = os.getenv('SMOKE_EMAIL'), os.getenv('SMOKE_PASSWORD')
    if bool(email) != bool(password):
        raise RuntimeError('Set both SMOKE_EMAIL and SMOKE_PASSWORD, or neither.')
    if not email:
        print('SKIP login: optional smoke credentials not configured')
        return

    logged_in = False
    try:
        login = json.loads(request(base, '/api/auth/login', {'email': email, 'password': password}))
        user = login.get('user')
        if not isinstance(user, dict) or not user.get('email'):
            raise ValueError('Invalid login response')
        logged_in = True
        me = json.loads(request(base, '/api/auth/me'))
        me_user = me.get('user')
        if not isinstance(me_user, dict) or me_user.get('email') != user.get('email'):
            raise ValueError('Invalid /api/auth/me response')
        print('PASS login and authenticated /api/auth/me')
    except (urllib.error.URLError, TimeoutError, ValueError, KeyError):
        raise RuntimeError('Login smoke check failed') from None
    finally:
        if logged_in:
            request(base, '/api/auth/logout', data={})
            print('PASS logout')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit('Usage: python3 deploy/smoke_test.py SERVICE_URL')
    check(sys.argv[1].rstrip('/'))
