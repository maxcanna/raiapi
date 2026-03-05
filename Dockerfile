# Stage 1: Build backend
FROM golang:1.26-alpine AS backend-builder
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

# Stage 2: Final image
FROM alpine:3.21
LABEL org.opencontainers.image.authors="massi@massi.dev"
WORKDIR /var/www/raiapi

# Install ca-certificates (required for HTTPS) and tzdata
RUN apk --no-cache add ca-certificates tzdata

# Copy frontend assets built externally
COPY public ./public

# Copy backend binary
COPY --from=backend-builder /app/raiapi .

ENV PORT=3000
EXPOSE 3000

# Improved HEALTHCHECK
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ready || exit 1

CMD ["./raiapi"]
