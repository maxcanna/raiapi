FROM node:18-alpine AS be
ADD ./ /var/www/raiapi/
WORKDIR /var/www/raiapi
RUN rm -rf src
ENV NODE_ENV=production
RUN npm install --global --force yarn@1.22.22
RUN yarn install --network-timeout 1000000000

FROM node:18-alpine AS fe
ADD ./ /var/www/raiapi/
WORKDIR /var/www/raiapi
RUN npm install --global --force yarn@1.22.22
RUN yarn install --network-timeout 1000000000
ENV NODE_ENV=production
RUN yarn build

FROM node:18-alpine
LABEL org.opencontainers.image.authors="massi@massi.dev"
WORKDIR /var/www/raiapi
COPY --from=be /var/www/raiapi .
COPY --from=fe /var/www/raiapi/public public/
RUN npm install --global --force yarn@1.22.22
ENV NODE_ENV=production
EXPOSE 3000
CMD ["yarn", "start"]
