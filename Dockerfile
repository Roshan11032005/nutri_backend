# ---- 1. Base image ----
FROM node:18-alpine AS base

WORKDIR /usr/src/app

# ---- 2. Install dependencies ----
COPY package*.json ./
RUN npm install --production

# ---- 3. Copy app source ----
COPY . .

# ---- 4. Expose port ----
EXPOSE 8080

# ---- 5. Set environment ----
ENV NODE_ENV=production
ENV PORT=8080

# ---- 6. Start app ----
CMD [ "node", "index.js" ]
