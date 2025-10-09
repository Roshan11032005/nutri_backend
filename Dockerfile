# ---- 1. Base image ----
FROM node:18-alpine AS base

WORKDIR /usr/src/app

# ---- 2. Install dependencies ----
COPY package*.json ./
RUN npm install --production

# ---- 3. Copy app source ----
COPY . .

# ---- 4. Generate RSA keys if missing ----
RUN mkdir -p keys && \
    if [ ! -f keys/private.key ] || [ ! -f keys/public.key ]; then \
    node generateKeys.js; \
    fi

# ---- 5. Expose port ----
EXPOSE 8080

# ---- 6. Set environment ----
ENV NODE_ENV=production
ENV PORT=8080

# ---- 7. Start app ----
CMD ["node", "index.js"]
