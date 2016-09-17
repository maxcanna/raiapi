# RaiPlay API #

This project provides a [RaiPlay](http://www.raiplay.it/) API to retrieve tv program information and files for the past seven days.

### How do I get set up? ###

There are several options.

* You can run it locally (or in any `node` environment):

  * `npm i`
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
