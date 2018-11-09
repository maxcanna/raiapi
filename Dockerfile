FROM node:alpine as builder
ADD ./ /var/www/raiapi/
WORKDIR /var/www/raiapi
RUN yarn --production --ignore-engines

FROM node:alpine
LABEL maintainer Massimiliano Cannarozzo <maxcanna@gmail.com>
WORKDIR /var/www/raiapi
COPY --from=builder /var/www/raiapi .
ENV NODE_ENV=production
EXPOSE 3000
CMD ["yarn", "start"]
