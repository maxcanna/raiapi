#!/bin/bash
set -e

export NODE_ENV=test
export PORT=3333

if [ -z "$MONGO_URL" ]; then
    export MONGO_URL=mongodb://localhost/raiapi-test
fi

printf "\033[34m\n* Running tests with mongodb cache empty\n\033[0m\n"

nyc --reporter=none dredd

mv .nyc_output{,-empty}

pkill -f index.js

printf "\033[34m\n* Running tests with mongodb cache full\n\033[0m\n"

nyc --reporter=none dredd

mv .nyc_output{,-full}

pkill -f index.js

printf "\033[34m\n* Running tests with mongodb cache not available\n\033[0m\n"

unset MONGO_URL

nyc --reporter=none dredd

cp .nyc_output-empty/* .nyc_output/
cp .nyc_output-full/* .nyc_output/
rm -rf .nyc_output-empty
rm -rf .nyc_output-full

nyc report --reporter=clover