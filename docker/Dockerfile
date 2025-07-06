# Use a Node.js 20 base image
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package.json and pnpm-lock.yaml to leverage Docker cache
COPY package.json pnpm-lock.yaml* turbo.json ./ 
COPY apps/demo/package.json apps/demo/
COPY packages/editor-core/package.json packages/editor-core/
COPY packages/react-editor/package.json packages/react-editor/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Build the applications and packages
RUN pnpm turbo run build

# --- Production Stage ---
FROM node:20-alpine AS runner
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy necessary files from the build stage
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/demo/.next apps/demo/.next
COPY --from=base /app/apps/demo/public apps/demo/public
COPY --from=base /app/apps/demo/package.json apps/demo/package.json

# Expose the port Next.js runs on
EXPOSE 3000

# Set the command to run the Next.js app
CMD ["pnpm", "--filter", "demo", "start"]
