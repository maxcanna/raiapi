#!/bin/bash
set -e

export NODE_ENV=test

printf "\033[34m\n* Clearing Redis cache\n\033[0m\n"

node clear_redis.js

printf "\033[34m\n* Running tests with Redis cache empty\n\033[0m\n"

yarn dredd

printf "\033[34m\n* Running tests with Redis cache full\n\033[0m\n"

yarn dredd

printf "\033[34m\n* Running tests with Redis cache not available\n\033[0m\n"

unset REDISCLOUD_URL

yarn dredd
