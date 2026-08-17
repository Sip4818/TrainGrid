# API Reference

## First Vertical Slice — Training Runs

### `POST /runs/`

Create a new training run with the given configuration.

**Request body (JSON):**

```json
{
  "experiment_id": 1,
  "trainer_name": "random_forest",
  "config": {
    "dataset_path": "dataset.csv",
    "target_column": "target",
    "feature_columns": ["feature1", "feature2"],
    "n_estimators": 100,
    "max_depth": null
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `experiment_id` | int | Yes | Links the run to an existing experiment |
| `trainer_name` | string | Yes | Trainer to use (must be registered, e.g. `random_forest`) |
| `config.dataset_path` | string | Yes | Path to the CSV file (e.g. `dataset.csv`) |
| `config.target_column` | string | Yes | Name of the target/label column |
| `config.feature_columns` | list[string] | Yes | Names of the feature columns |
| `config.n_estimators` | int | No | Number of trees in the forest (default: `100`) |
| `config.max_depth` | int / null | No | Max tree depth (`null` = unlimited, default: `null`) |

**cURL example:**

```bash
curl -X POST http://localhost:8000/runs/ \
  -H "Content-Type: application/json" \
  -d '{
    "experiment_id": 1,
    "trainer_name": "random_forest",
    "config": {
      "dataset_path": "dataset.csv",
      "target_column": "target",
      "feature_columns": ["feature1", "feature2"],
      "n_estimators": 100,
      "max_depth": null
    }
  }'
```

**Error responses:**

| Status | `detail.code` | When |
|---|---|---|
| 422 | `TRAINER_NOT_FOUND` | `trainer_name` is not registered |
| 404 | `NOT_FOUND` | `experiment_id` does not exist |

### `GET /runs/{run_id}`

Track a run by its ID. Returns status, metrics, and timestamps.

### `GET /runs/`

List all training runs in the database.

### `GET /runs/compare`

Compare multiple training runs side-by-side within a single experiment.

**Query parameters:**

| Field | Type | Required | Description |
|---|---|---|---|
| `experiment_id` | int | Yes | Experiment that all compared runs must belong to |
| `run_ids` | list[int] | Yes | Comma-separated run IDs to compare (e.g. `1,2,3`) |

**Example:**

```bash
curl "http://localhost:8000/runs/compare?experiment_id=1&run_ids=1,2"
```

**Response body (JSON):**

```json
{
  "runs": [
    {
      "id": 1,
      "experiment_id": 1,
      "trainer_name": "random_forest",
      "status": "completed",
      "config": { "dataset_path": "dataset.csv", "n_estimators": 100 },
      "metrics": { "accuracy": 0.95 }
    },
    {
      "id": 2,
      "experiment_id": 1,
      "trainer_name": "xgboost",
      "status": "completed",
      "config": { "dataset_path": "dataset.csv", "learning_rate": 0.1 },
      "metrics": { "accuracy": 0.97 }
    }
  ],
  "metrics": ["accuracy"]
}
```

`runs` holds one entry per requested run; `metrics` is the ordered union of metric keys across all compared runs (the rows of the comparison table).

**Error responses:**

| Status | `detail.code` | When |
|---|---|---|
| 422 | (validation) | `run_ids` missing, empty, or not valid integers |
| 404 | `NOT_FOUND` | `experiment_id` does not exist, or a `run_id` does not exist |
| 422 | `RUN_NOT_IN_EXPERIMENT` | A run exists but belongs to a different experiment |

### `GET /runs/?experiment_id={id}`

List training runs, optionally scoped to one experiment.

| Field | Type | Required | Description |
|---|---|---|---|
| `experiment_id` | int | No | When provided, only runs in that experiment are returned |

## Project & Experiment Hierarchy

### `POST /projects/`

Create a project. Body: `{"name": "...", "description": "..."}` (description optional).

**Error responses:**

| Status | `detail.code` | When |
|---|---|---|
| 422 | (validation) | `name` missing |

### `GET /projects/`

List all projects. Each project includes its nested `experiments` array.

```json
[
  {
    "id": 1,
    "name": "Default Project",
    "description": "Default project for existing runs",
    "created_at": "...",
    "experiments": []
  }
]
```

### `GET /projects/{project_id}`

Retrieve one project with its nested experiments.

**Error responses:**

| Status | `detail.code` | When |
|---|---|---|
| 404 | `NOT_FOUND` | `project_id` does not exist |

### `PATCH /projects/{project_id}`

Partially update a project (`name` and/or `description`).

### `DELETE /projects/{project_id}`

Delete a project. **Cascades** to its experiments and, through them, their runs.

### `POST /experiments/`

Create an experiment within a project. Body: `{"project_id": 1, "name": "..."}`.

**Error responses:**

| Status | `detail.code` | When |
|---|---|---|
| 404 | `NOT_FOUND` | `project_id` does not exist |
| 422 | (validation) | `name` or `project_id` missing |

### `GET /experiments/`

List experiments. Use `?project_id={id}` to scope the list to one project.

```json
[
  {
    "id": 1,
    "project_id": 1,
    "name": "Default",
    "created_at": "...",
    "run_count": 0
  }
]
```

### `GET /experiments/{experiment_id}`

Retrieve one experiment.

**Error responses:**

| Status | `detail.code` | When |
|---|---|---|
| 404 | `NOT_FOUND` | `experiment_id` does not exist |

### `PATCH /experiments/{experiment_id}`

Partially update an experiment (`name` and/or `project_id`).

### `DELETE /experiments/{experiment_id}`

Delete an experiment. **Cascades** to its runs.
