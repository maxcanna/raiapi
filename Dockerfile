FROM node:18-alpine
LABEL org.opencontainers.image.authors="massi@massi.dev"
WORKDIR /var/www/raiapi
COPY ./ .
RUN npm install --global --force yarn@1.22.22
ENV NODE_ENV=production
EXPOSE 3000
CMD ["yarn", "start"]
