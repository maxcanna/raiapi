FROM node:18-alpine
LABEL org.opencontainers.image.authors="massi@massi.dev"
WORKDIR /var/www/raiapi
COPY ./ .
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "index.js"]
