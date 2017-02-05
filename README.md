# RaiPlay API
[![](https://www.versioneye.com/user/projects/57dd79db037c20002d0d9c4d/badge.svg)](https://www.versioneye.com/user/projects/57dd79db037c20002d0d9c4d) ![](https://img.shields.io/codeship/66534f50-5f28-0134-88b4-7a3a89611ccb/master.svg?maxAge=2592000) [![](https://img.shields.io/codeclimate/github/maxcanna/raiapi.svg?maxAge=2592000)](https://codeclimate.com/github/maxcanna/raiapi) [![Docker Pulls](https://img.shields.io/docker/pulls/maxcanna/raiapi.svg)](https://hub.docker.com/r/maxcanna/raiapi/) [![](https://img.shields.io/github/license/maxcanna/raiapi.svg?maxAge=2592000)](https://github.com/maxcanna/raiapi/blob/master/LICENSE)

This project provides a [RaiPlay](http://www.raiplay.it/) API to retrieve tv program information and files for the past seven days.

## How do I get set up?

You've several way to get raiapi running:

* You can easily create an Heroku application:

  [![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

* You can use `docker`:

  * Using Docker Cloud:

  [![Deploy to Docker Cloud](https://files.cloud.docker.com/images/deploy-to-dockercloud.svg)](https://cloud.docker.com/stack/deploy/)

  * Locally: `docker run -d -p 80:3000 maxcanna/raiapi:latest`.

* Or manually:

  `npm i --production`

  `npm start`

  raiapi will be available on port `3000`.

## Documentation

Available on [Apiary](http://docs.raiapi.apiary.io/)
