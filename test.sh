#!/bin/bash
set -e

export NODE_ENV=test
export PORT=3333

if [ -z "$MONGO_URL" ]; then
    export MONGO_URL=mongodb://localhost/raiapi-test
fi

printf "\033[34m\n* Running tests with mongodb cache empty\n\033[0m\n"

yarn dredd

printf "\033[34m\n* Running tests with mongodb cache full\n\033[0m\n"

yarn dredd

printf "\033[34m\n* Running tests with mongodb cache not available\n\033[0m\n"

unset MONGO_URL

yarn dredd
