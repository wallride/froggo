# Build image

```shell
export GH_TOKEN=...
export NPM_TOKEN=...

export IMAGE_NAME="mobile-api"
export CONTAINER_NAME="$IMAGE_NAME-local"
# Last test release
export VERSION="1.0.1" 

docker buildx build ./ci/docker/mobile.api/ \
    --secret id=gh-token,env=GH_TOKEN \
    --secret id=npm-token,env=NPM_TOKEN \
    --build-arg RELEASE=$VERSION \
    --build-arg PORT=$PORT \
    --tag $IMAGE_NAME:$VERSION \
    --progress=plain
```

# Local dev run

```shell
docker stop $CONTAINER_NAME && docker rm $CONTAINER_NAME

docker run --restart=unless-stopped --name=$CONTAINER_NAME \
  -p $PORT:8080 \
  -v ./ci/docker/mobile.api/.mount/cfg:/app/cfg \
  -v ./.mount/assets:/app/storages/assets \
  --env-file ./ci/docker/mobile.api/.env \
  $IMAGE_NAME:$VERSION | bunyan
```
