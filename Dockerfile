FROM alpine as builder
ADD ./ /var/www/raiapi/
WORKDIR /var/www/raiapi
RUN apk update && apk add yarn git
RUN yarn --production --ignore-engines

FROM node:alpine
LABEL mantainer Massimiliano Cannarozzo <maxcanna@gmail.com>
WORKDIR /var/www/raiapi
COPY --from=builder /var/www/raiapi .
EXPOSE 3000
CMD ["yarn", "start"]
