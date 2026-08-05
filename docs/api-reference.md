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
