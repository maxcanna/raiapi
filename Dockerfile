FROM node:22-alpine
LABEL org.opencontainers.image.authors="massi@massi.dev"

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
