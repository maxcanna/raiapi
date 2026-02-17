# Stage 1: Build frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

# Stage 2: Build backend
FROM golang:1.23-alpine AS backend-builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o raiapi ./cmd/server

# Stage 3: Final image
FROM alpine:latest
LABEL org.opencontainers.image.authors="massi@massi.dev"
WORKDIR /var/www/raiapi

# Install ca-certificates and curl/wget for healthcheck
RUN apk --no-cache add ca-certificates wget

COPY --from=frontend-builder /app/public ./public
COPY --from=backend-builder /app/raiapi .
COPY --from=backend-builder /app/web/templates ./web/templates

ENV PORT=3000
EXPOSE 3000

HEALTHCHECK CMD wget -q -O /dev/stdout http://localhost:3000/api/canali | grep Rai1

CMD ["./raiapi"]
