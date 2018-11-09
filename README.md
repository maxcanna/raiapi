# RaiPlay API
[![Scrutinizer Code Quality](https://scrutinizer-ci.com/g/maxcanna/raiapi/badges/quality-score.png?b=master)](https://scrutinizer-ci.com/g/maxcanna/raiapi/?branch=master) [![Docker Pulls](https://img.shields.io/docker/pulls/maxcanna/raiapi.svg)](https://hub.docker.com/r/maxcanna/raiapi/) [![](https://img.shields.io/github/license/maxcanna/raiapi.svg?maxAge=2592000)](https://github.com/maxcanna/raiapi/blob/master/LICENSE)

This project provides a [RaiPlay](http://www.raiplay.it/) API to retrieve tv program information and files for the past seven days.

## How do I get set up?

You've several way to get raiapi running:

* You can easily create an Heroku application:

  [![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

* You can use `docker`:

  `docker run -d -p 80:3000 maxcanna/raiapi:latest`.

* You can use now:

  [![Deploy to now](https://deploy.now.sh/static/button.svg)](https://deploy.now.sh/?repo=https://github.com/maxcanna/raiapi)

* Or manually:

```bash
  $ npm i --production
  $ npm start
```
  raiapi will be available on port `3000`.

## Documentation

Available on [Apiary](http://docs.raiapi.apiary.io/)
