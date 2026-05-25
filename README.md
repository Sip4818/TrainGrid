# TrainGrid

TrainGrid is an ML orchestration platform for training, tracking, and deploying
models.

## Current Build Focus

The first implementation slice is a single end-to-end `RandomForestClassifier`
workflow for tabular classification data:

1. API starts a training run.
2. Worker picks up the job.
3. Trainer loads the dataset, trains the model, evaluates it, and saves the
   artifact.
4. Run status and metrics are persisted.
5. Frontend surfaces the run state and results.

The implementation should stay model-specific at first, then expand horizontally
to additional trainers once this path works reliably.
