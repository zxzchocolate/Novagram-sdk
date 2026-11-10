#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
    echo "Novagram needs Node.js 18 or newer and npm."
    echo "Install Node.js from https://nodejs.org/ and run this again."
    exit 1
fi

NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
if [ "$NODE_MAJOR" -lt 18 ]; then
    echo "Novagram needs Node.js 18 or newer (found $(node --version))."
    exit 1
fi

if [ ! -d node_modules ]; then
    echo "Installing dependencies..."
    npm install
fi

exec npm start
