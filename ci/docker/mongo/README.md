# MongoDB (docker compose)

Runs a MongoDB container with persistent storage, plus mongo-express as a
web-based admin console for it.

All commands below are run from the monorepo root.

## Usage

```bash
cp ci/docker/mongo/.env.example ci/docker/mongo/.env   
docker compose -f ci/docker/mongo/docker-compose.yaml up -d
```

## Configuration

All variables are read from `ci/docker/mongo/.env` (see
`ci/docker/mongo/.env.example`). Everything has a default except
`MONGO_ROOT_PASSWORD` and `MONGO_EXPRESS_PASSWORD`, which must be set
explicitly.

| Variable                 | Default      | Description                                    |
| ------------------------ | ------------ | ----------------------------------------------- |
| `MONGO_IMAGE_TAG`        | `7`          | MongoDB image tag to run                        |
| `MONGO_ROOT_USERNAME`    | `admin`      | Mongo root user                                 |
| `MONGO_ROOT_PASSWORD`    | _(required)_ | Mongo root password                             |
| `MONGO_DATABASE`         | `deadLinesInc` | Database created on first boot                  |
| `MONGO_PORT`             | `27017`      | Host port mapped to Mongo's `27017`             |
| `MONGO_EXPRESS_IMAGE_TAG`| `1`          | mongo-express image tag to run                  |
| `MONGO_EXPRESS_USERNAME` | `admin`      | Basic-auth user for the mongo-express web UI    |
| `MONGO_EXPRESS_PASSWORD` | _(required)_ | Basic-auth password for the mongo-express web UI|
| `MONGO_EXPRESS_PORT`     | `8081`       | Host port mapped to mongo-express's `8081`      |

## Connecting

```
mongodb://<MONGO_ROOT_USERNAME>:<MONGO_ROOT_PASSWORD>@localhost:<MONGO_PORT>/<MONGO_DATABASE>?authSource=admin
```

## Admin console

Once the stack is up, the mongo-express web UI is available at
`http://localhost:<MONGO_EXPRESS_PORT>` (defaults to
`http://localhost:8081`), protected by `MONGO_EXPRESS_USERNAME` /
`MONGO_EXPRESS_PASSWORD` basic auth. It connects to the `mongo` service
using the same root credentials.

## Data persistence

Data is stored in the `mongo-data` named volume.

```bash
docker compose -f ci/docker/mongo/docker-compose.yaml down        # stop the container, keep the volume
docker compose -f ci/docker/mongo/docker-compose.yaml down -v     # stop the container and delete the volume/data
```
