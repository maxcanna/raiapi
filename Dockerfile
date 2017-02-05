FROM node:alpine
MAINTAINER Massimiliano Cannarozzo <maxcanna@gmail.com>

EXPOSE 3000
ADD ./ /var/www/raiapi/
RUN cd /var/www/raiapi/ && npm i --production

WORKDIR /var/www/raiapi

CMD ["node", "index.js"]
