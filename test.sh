#!/bin/bash
set -e

printf "\033[34m\n* Clearing Redis cache\n\033[0m\n"

node clear_redis.js
