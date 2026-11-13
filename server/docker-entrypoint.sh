#!/bin/sh
set -e

# Pass signals (e.g. SIGTERM from Cloud Run) directly to the Node process (PID 1).
exec "$@"
