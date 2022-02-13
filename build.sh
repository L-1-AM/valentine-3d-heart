#!/bin/bash

# http://redsymbol.net/articles/unofficial-bash-strict-mode/
set -euo pipefail
IFS=$'\n\t'

npx tsc

npx esbuild \
   build/index.js \
   --bundle \
   --minify \
   --sourcemap \
   --target=chrome98 \
   --outfile=public/index.js
