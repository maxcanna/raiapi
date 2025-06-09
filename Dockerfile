FROM node:18-alpine
LABEL org.opencontainers.image.authors="massi@massi.dev"
WORKDIR /var/www/raiapi
COPY ./ .
ENV NODE_ENV=production
HEALTHCHECK CMD wget -q -O /dev/stdout localhost:3000/api/canali | grep Rai1
EXPOSE 3000
CMD ["node", "index.js"]
