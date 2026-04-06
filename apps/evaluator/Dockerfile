FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/evaluator/package.json apps/evaluator/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm install

COPY . .

RUN npm --workspace packages/shared run build \
  && npm --workspace apps/evaluator run build

ENV NODE_ENV=production
ENV PORT=4030

CMD ["npm", "--workspace", "apps/evaluator", "run", "start"]
