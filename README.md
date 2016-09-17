# RaiPlay API [![](https://www.versioneye.com/user/projects/57dd79db037c20002d0d9c4d/badge.svg)](https://www.versioneye.com/user/projects/57dd79db037c20002d0d9c4d) ![](https://img.shields.io/codeship/66534f50-5f28-0134-88b4-7a3a89611ccb/master.svg?maxAge=2592000) [![](https://img.shields.io/codeclimate/github/maxcanna/raiapi.svg?maxAge=2592000)](https://codeclimate.com/github/maxcanna/raiapi) [![](https://img.shields.io/github/license/maxcanna/raiapi.svg?maxAge=2592000)](https://github.com/maxcanna/bicineabbiamo/blob/master/LICENSE)

This project provides a [RaiPlay](http://www.raiplay.it/) API to retrieve tv program information and files for the past seven days.

### How do I get set up? ###

There are several options.

* You can run it locally (or in any `node` environment):

  * `npm i --production`
  * `npm start`

* You can use Heroku

  [![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

### Routes

* `/`
  
  Serves the web UI

* `/canali`
  
  Lists all the available channels

* `/canali/{channel ID}/programmi`

  Lists available programs given a channel

* `/canali/{channel ID}/programmi/{program ID}/qualita`

  Lists available quality for a given program

* `/canali/{channel ID}/programmi/{program ID}/qualita/{quality ID}/{action}`

  Gets video file using two available actions:
  * `url` returns file URL
  * `file` redirects to te file URL
