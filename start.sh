#!/bin/bash

# http://redsymbol.net/articles/unofficial-bash-strict-mode/
set -euo pipefail
IFS=$'\n\t'

cd public

npx live-server \
   --port=6969 \
   &

cd ..

nodemon \
   --exec 'bash' build.sh \
   --watch src \
   --ext ts
