# RaiPlay API

[![CI Status](https://github.com/maxcanna/raiapi/workflows/CI/badge.svg)](https://github.com/maxcanna/raiapi/actions) [![Docker Pulls](https://img.shields.io/docker/pulls/maxcanna/raiapi.svg)](https://hub.docker.com/r/maxcanna/raiapi/) [![](https://img.shields.io/github/license/maxcanna/raiapi.svg?maxAge=2592000)](https://github.com/maxcanna/raiapi/blob/master/LICENSE)

This project provides a [RaiPlay](http://www.raiplay.it/) API to retrieve tv program information and files for the past seven days.

## How do I get set up?

You've several way to get raiapi running:

* You can use `docker`:

  `docker run -d -p 80:3000 maxcanna/raiapi:latest`.

* Or manually:

```bash
  $ npm i --production
  $ npm start
```
  raiapi will be available on port `3000`.

## Documentation

Available on [Apiary](http://docs.raiapi.apiary.io/)
