#!/bin/bash
set -e
if ! command -v aws > /dev/null 2>&1; then
    printf "\033[34m* AWS CLI missing. Installing...\n\033[0m"
    curl -SLO https://s3.amazonaws.com/aws-cli/awscli-bundle.zip
    unzip awscli-bundle.zip
    ./awscli-bundle/install -b /usr/local/bin/aws
    rm -rf awscli-bundle*
fi

printf "\033[34m* Creating AWS Lambda function package\n\033[0m"
rm -rf node_modules
npm i --production > /dev/null

zip -r9q lambda.zip lambda.js raiapi.js node_modules
ls -lh lambda.zip
printf "\033[34m* Done\n\033[0m"