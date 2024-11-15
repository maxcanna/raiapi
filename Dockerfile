FROM node:16.20.2-alpine AS be
ADD ./ /var/www/raiapi/
WORKDIR /var/www/raiapi
RUN rm -rf src
ENV NODE_ENV=production
RUN yarn install --network-timeout 1000000000

FROM node:16.20.2-alpine AS fe
ADD ./ /var/www/raiapi/
WORKDIR /var/www/raiapi
RUN yarn install --network-timeout 1000000000
ENV NODE_ENV=production
RUN yarn build

FROM node:16.20.2-alpine
LABEL org.opencontainers.image.authors="massi@massi.dev"
WORKDIR /var/www/raiapi
COPY --from=be /var/www/raiapi .
COPY --from=fe /var/www/raiapi/public public/
ENV NODE_ENV=production
EXPOSE 3000
CMD ["yarn", "start"]
