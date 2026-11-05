FROM docker.io/node:24.11.1-alpine3.22 AS deps

RUN apk add --no-cache gcompat github-cli python3 py3-setuptools g++ make && \
    npm install -g pnpm pm2@6.0.14 --no-fund --no-audit

ARG RELEASE
ARG REPOSITORY=git@github.com:wallride/froggo.git
ARG APP_NAME="mobile.api"

# download gh release package, unpack application
RUN --mount=type=secret,id=gh-token \
    --mount=type=secret,id=npm-token \
    export GH_TOKEN="$(tr -d '\n' < /run/secrets/gh-token)" && \
    echo "//registry.npmjs.org/:_authToken=$(cat /run/secrets/npm-token)" >> /home/node/.npmrc && \
    mkdir /apps && \
    GH_TOKEN=$(cat /run/secrets/gh-token) gh release download "$RELEASE" -R $REPOSITORY -O /tmp/app.tgz -p "$APP_NAME-v$RELEASE.tgz"

RUN tar -zxvf /tmp/app.tgz -C /tmp && \
    mv /tmp/package /app && \
    chown -R node:node /app

USER node

WORKDIR /app
RUN pnpm i --prod

# Production image, copy all the files and run
FROM docker.io/node:24.11.1-alpine3.22 AS runner

ARG APP_USER=app
ARG APP_GROUP=app
ARG APP_UID=999
ARG APP_GID=1001
RUN addgroup -g ${APP_GID} ${APP_USER} && \
    adduser -S -u ${APP_UID} -G ${APP_GROUP} ${APP_USER}

ENV TZ="Europe/Moscow"

RUN apk add --no-cache tzdata nano gcompat && \
    cp /usr/share/zoneinfo/$TZ /etc/localtime && \
    apk del tzdata && \
    npm i -g bunyan

COPY --from=deps /usr/local/lib/node_modules/pm2 /usr/local/lib/node_modules/pm2
RUN ln -s /usr/local/lib/node_modules/pm2/bin/pm2-runtime /usr/local/bin/pm2-runtime
RUN ln -s /usr/local/lib/node_modules/pm2/bin/pm2 /usr/local/bin/pm2

WORKDIR /app

COPY --chown=node:node --from=deps /app/node_modules ./node_modules
COPY --chown=node:node --from=deps /app .

USER ${APP_USER}

EXPOSE 8080

ENTRYPOINT ["pm2-runtime", "/app/cfg/pm2.json"]
