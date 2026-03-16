# Stage 1: Build frontend
FROM --platform=$BUILDPLATFORM node:24.14.0-alpine AS frontend-builder
WORKDIR /app
COPY . .
RUN corepack enable && yarn install --immutable && yarn build

# Stage 2: Build backend
FROM --platform=$BUILDPLATFORM golang:1.26.1-alpine AS backend-builder
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Build for the target architecture
ARG TARGETOS
ARG TARGETARCH
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -trimpath -ldflags="-s -w" -o raiapi ./cmd/server

# Stage 3: Final image
FROM alpine:3.23

ARG BUILD_DATE
ARG REVISION
ARG VERSION

LABEL org.opencontainers.image.created=$BUILD_DATE \
      org.opencontainers.image.authors="massi@massi.dev" \
      org.opencontainers.image.url="https://github.com/maxcanna/raiapi" \
      org.opencontainers.image.documentation="https://github.com/maxcanna/raiapi" \
      org.opencontainers.image.source="https://github.com/maxcanna/raiapi" \
      org.opencontainers.image.version=$VERSION \
      org.opencontainers.image.revision=$REVISION \
      org.opencontainers.image.vendor="massi.dev" \
      org.opencontainers.image.title="RaiPlay API" \
      org.opencontainers.image.description="RaiPlay API to retrieve tv program information and files for the past seven days"

WORKDIR /var/www/raiapi

# Install ca-certificates (required for HTTPS) and tzdata
RUN apk --no-cache add ca-certificates tzdata

# Copy frontend assets
COPY --from=frontend-builder /app/public ./public

# Copy backend binary
COPY --from=backend-builder /app/raiapi .

ENV PORT=3000
EXPOSE 3000

# Improved HEALTHCHECK
HEALTHCHECK CMD wget -q --spider --tries=1 http://localhost:3000/ready

CMD ["./raiapi"]
