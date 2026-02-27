# Stage 1: Build backend
FROM golang:1.26-alpine AS backend-builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .

# Build for the target architecture
ARG TARGETOS
ARG TARGETARCH
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -o raiapi ./cmd/server

# Stage 2: Final image
FROM alpine:latest
LABEL org.opencontainers.image.authors="massi@massi.dev"
WORKDIR /var/www/raiapi

# Install ca-certificates (required for HTTPS)
RUN apk --no-cache add ca-certificates

# Copy frontend assets built externally
COPY public ./public

# Copy backend binary
COPY --from=backend-builder /app/raiapi .
COPY --from=backend-builder /app/web/templates ./web/templates

ENV PORT=3000
EXPOSE 3000

HEALTHCHECK CMD wget -q -O /dev/stdout http://localhost:3000/api/canali | grep Rai1

CMD ["./raiapi"]
