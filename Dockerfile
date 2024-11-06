FROM node:16.16.0-alpine AS be
ADD ./ /var/www/raiapi/
WORKDIR /var/www/raiapi
RUN rm -rf src
ENV NODE_ENV=production
RUN yarn

FROM node:16.16.0-alpine AS fe
ADD ./ /var/www/raiapi/
WORKDIR /var/www/raiapi
RUN yarn
ENV NODE_ENV=production
RUN yarn build

FROM node:16.16.0-alpine
LABEL org.opencontainers.image.authors="massi@massi.dev"
WORKDIR /var/www/raiapi
COPY --from=be /var/www/raiapi .
COPY --from=fe /var/www/raiapi/public public/
ENV NODE_ENV=production
EXPOSE 3000
CMD ["yarn", "start"]
