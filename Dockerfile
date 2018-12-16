FROM node:alpine as be
ADD ./ /var/www/raiapi/
WORKDIR /var/www/raiapi
RUN apk add python make g++
RUN rm -rf src
ENV NODE_ENV=production
RUN yarn

FROM node:alpine as fe
ADD ./ /var/www/raiapi/
WORKDIR /var/www/raiapi
RUN yarn
ENV NODE_ENV=production
RUN yarn build

FROM node:alpine
LABEL maintainer Massimiliano Cannarozzo <maxcanna@gmail.com>
WORKDIR /var/www/raiapi
COPY --from=be /var/www/raiapi .
COPY --from=fe /var/www/raiapi/public public/
ENV NODE_ENV=production
EXPOSE 3000
CMD ["yarn", "start"]
