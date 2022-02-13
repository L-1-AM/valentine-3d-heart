#!/bin/bash

# http://redsymbol.net/articles/unofficial-bash-strict-mode/
set -euo pipefail
IFS=$'\n\t'

npx tsc

if [[ "$ENV" == 'prod' ]]; then
   npx esbuild \
      build/index.js \
      --bundle \
      --minify \
      --target=chrome98 \
      --outfile=public/index.js
else
   npx esbuild \
      build/index.js \
      --bundle \
      --minify \
      --sourcemap \
      --target=chrome98 \
      --outfile=public/index.js
fi
