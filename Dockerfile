# Stage 1: Build backend
FROM golang:1.26-alpine AS backend-builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o raiapi ./cmd/server

# Stage 2: Final image
FROM alpine:latest
LABEL org.opencontainers.image.authors="massi@massi.dev"
<<<<<<< HEAD

WORKDIR /var/www/raiapi

# Enable Corepack to use the Yarn version specified in package.json
RUN corepack enable

# Copy dependency definitions
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

# Install production dependencies
# This ensures that native bindings are built for the target architecture (alpine)
RUN yarn workspaces focus --production

# Copy the rest of the application source code
# This includes the pre-built static assets (e.g. from a previous build step in CI)
COPY . .

ENV NODE_ENV=production
HEALTHCHECK CMD wget -q -O /dev/stdout localhost:3000/api/canali | grep Rai1
EXPOSE 3000

# Use the PnP loader to start the application
CMD ["node", "-r", "./.pnp.cjs", "index.js"]
=======
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
<<<<<<< HEAD
CMD ["node", "index.js"]
>>>>>>> fcc9ea6 (Merge pull request #178 from maxcanna/dependabot/npm_and_yarn/axios-1.13.5)
=======

HEALTHCHECK CMD wget -q -O /dev/stdout http://localhost:3000/api/canali | grep Rai1

CMD ["./raiapi"]
>>>>>>> c8fc6ac (Rewrite backend in Go)
