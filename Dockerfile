FROM node:14.16.1-alpine as be
ADD ./ /var/www/raiapi/
WORKDIR /var/www/raiapi
RUN rm -rf src
ENV NODE_ENV=production
RUN yarn

FROM node:14.16.1-alpine as fe
ADD ./ /var/www/raiapi/
WORKDIR /var/www/raiapi
RUN yarn
ENV NODE_ENV=production
RUN yarn build

FROM node:14.16.1-alpine
LABEL maintainer Massimiliano Cannarozzo <massi@massi.dev>
WORKDIR /var/www/raiapi
COPY --from=be /var/www/raiapi .
COPY --from=fe /var/www/raiapi/public public/
ENV NODE_ENV=production
EXPOSE 3000
CMD ["yarn", "start"]
