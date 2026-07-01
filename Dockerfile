FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

FROM base AS build
WORKDIR /app
COPY . /app

RUN corepack enable
RUN apk add --no-cache python3 alpine-sdk git

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --prod --frozen-lockfile

RUN pnpm deploy --filter=@imput/cobalt-api --prod /prod/api

RUN GIT_COMMIT="$(git rev-parse HEAD 2>/dev/null || echo '')" && \
    GIT_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')" && \
    GIT_REMOTE="$(git config --get remote.origin.url 2>/dev/null || echo '')" && \
    printf '%s\n' "GIT_COMMIT=$GIT_COMMIT" "GIT_BRANCH=$GIT_BRANCH" "GIT_REMOTE=$GIT_REMOTE" > /prod/api/.git-env

FROM base AS api
WORKDIR /app

COPY --from=build --chown=node:node /prod/api /app

USER node

EXPOSE 9000
CMD [ "node", "src/cobalt" ]
