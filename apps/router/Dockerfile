FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/router/package.json apps/router/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/agent-sdk/package.json packages/agent-sdk/package.json

RUN npm install

COPY . .

RUN npm --workspace packages/shared run build \
  && npm --workspace packages/agent-sdk run build \
  && npm --workspace apps/router run build

ENV NODE_ENV=production
ENV PORT=4020

CMD ["npm", "--workspace", "apps/router", "run", "start"]
