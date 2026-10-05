FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg fonts-dejavu-core ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --legacy-peer-deps && npx prisma generate
COPY lib ./lib
COPY worker ./worker
COPY public ./public
COPY tsconfig.json ./
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
CMD ["node","--import","tsx","worker/video-worker.ts"]
