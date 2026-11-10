#!/usr/bin/env bash
set -o errexit

mkdir -p bin
cd bin
curl -s -L https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz | tar xJ --strip-components 1
cd ..

export PATH="$PWD/bin:$PATH"

if [ -f requirements.txt ]; then
    pip install -r requirements.txt
fi
