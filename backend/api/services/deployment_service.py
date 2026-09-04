import time
from pathlib import Path
from typing import Any

import joblib  # type: ignore[import-untyped]
from sqlalchemy.orm import Session

from backend.api.core.logging import get_logger
from backend.api.schemas.deployment import (
    DeploymentCreate,
    DeploymentResponse,
    PredictionItem,
    PredictResponse,
)
from backend.infrastructure.database.models import DeploymentModel, RegisteredModel
from backend.infrastructure.storage.local_store import local_artifact_store
from backend.shared.enums import DeploymentStatus
from backend.shared.errors import (
    DeploymentAlreadyExistsError,
    DeploymentNotFoundError,
    DeploymentNotInProjectError,
    ModelNotDeployableError,
    PredictionError,
)

logger = get_logger(__name__)

# In-memory serving pool: key = "model_name:version", value = live model object
serving_pool: dict[str, Any] = {}


class DeploymentService:
    """Service for managing model deployments and serving predictions."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def deploy_model(self, payload: DeploymentCreate) -> DeploymentResponse:
        """Deploy a registered model: load artifact into serving pool, create DB row."""
        logger.info(
            "Deploying model name=%s version=%s project_id=%d",
            payload.model_name,
            payload.model_version,
            payload.project_id,
        )

        # Validate registered model exists and belongs to the project
        registered = (
            self.db.query(RegisteredModel)
            .filter(
                RegisteredModel.name == payload.model_name,
                RegisteredModel.version == payload.model_version,
            )
            .first()
        )
        if registered is None:
            raise ModelNotDeployableError(payload.model_name, payload.model_version)
        if registered.project_id != payload.project_id:
            raise DeploymentNotInProjectError(
                f"{payload.model_name}:{payload.model_version}", payload.project_id
            )

        # Check not already deployed
        existing = (
            self.db.query(DeploymentModel)
            .filter(
                DeploymentModel.model_name == payload.model_name,
                DeploymentModel.model_version == payload.model_version,
                DeploymentModel.status == DeploymentStatus.ACTIVE,
            )
            .first()
        )
        if existing is not None:
            raise DeploymentAlreadyExistsError(
                payload.model_name, payload.model_version
            )

        # Load model artifact into serving pool
        pool_key = f"{payload.model_name}:{payload.model_version}"
        if pool_key not in serving_pool:
            self._load_model(registered, pool_key)

        # Create deployment record
        from datetime import datetime

        deployment = DeploymentModel(
            model_name=payload.model_name,
            model_version=payload.model_version,
            registered_model_id=registered.id,
            status=DeploymentStatus.ACTIVE,
            started_at=datetime.utcnow(),
        )
        self.db.add(deployment)
        self.db.commit()
        self.db.refresh(deployment)

        logger.info(
            "Model deployed deployment_id=%d name=%s version=%s",
            deployment.id,
            payload.model_name,
            payload.model_version,
        )
        return DeploymentResponse.model_validate(deployment)

    def undeploy_model(self, deployment_id: int, project_id: int) -> DeploymentResponse:
        """Stop a deployment: remove from serving pool, update DB status."""
        logger.info(
            "Undeploying deployment_id=%d project_id=%d", deployment_id, project_id
        )

        deployment = self.db.get(DeploymentModel, deployment_id)
        if deployment is None:
            raise DeploymentNotFoundError(deployment_id)
        self._validate_deployment_scope(deployment, project_id)

        # Remove from serving pool
        pool_key = f"{deployment.model_name}:{deployment.model_version}"
        serving_pool.pop(pool_key, None)

        # Update DB
        from datetime import datetime

        deployment.status = DeploymentStatus.STOPPED  # type: ignore[assignment]
        deployment.stopped_at = datetime.utcnow()  # type: ignore[assignment]
        self.db.commit()
        self.db.refresh(deployment)

        logger.info("Model undeployed deployment_id=%d", deployment_id)
        return DeploymentResponse.model_validate(deployment)

    def predict(
        self,
        deployment_id: int,
        features: dict[str, Any] | list[dict[str, Any]],
        project_id: int,
    ) -> PredictResponse:
        """Run prediction on a deployed model."""
        logger.info(
            "Predicting on deployment_id=%d project_id=%d", deployment_id, project_id
        )

        deployment = self.db.get(DeploymentModel, deployment_id)
        if deployment is None:
            raise DeploymentNotFoundError(deployment_id)
        self._validate_deployment_scope(deployment, project_id)

        pool_key = f"{deployment.model_name}:{deployment.model_version}"

        # Lazy-load model if not in pool
        if pool_key not in serving_pool:
            registered = self.db.get(RegisteredModel, deployment.registered_model_id)
            if registered is None:
                raise PredictionError(
                    f"Registered model for deployment {deployment_id} not found"
                )
            self._load_model(registered, pool_key)

        model = serving_pool[pool_key]

        # Normalize to batch
        is_batch = isinstance(features, list)
        if is_batch:
            feature_list = features  # type: ignore[assignment]
        else:
            feature_list = [features]  # type: ignore[list-item]

        # Validate features against model config
        self._validate_features(feature_list, model)  # type: ignore[arg-type]

        # Run predictions
        start = time.perf_counter()
        try:
            results = [self._predict_single(model, f) for f in feature_list]  # type: ignore[arg-type]
        except PredictionError:
            raise
        except Exception as exc:
            raise PredictionError(f"Prediction failed: {exc}") from exc
        latency_ms = (time.perf_counter() - start) * 1000

        model_str = f"{deployment.model_name}:{deployment.model_version}"
        logger.info(
            "Prediction complete deployment_id=%d count=%d latency_ms=%.2f",
            deployment_id,
            len(results),
            latency_ms,
        )
        return PredictResponse(
            predictions=results,
            latency_ms=round(latency_ms, 2),
            model=model_str,
        )

    def predict_by_model_name(
        self,
        model_name: str,
        features: dict[str, Any] | list[dict[str, Any]],
        project_id: int,
    ) -> PredictResponse:
        """Find the latest deployment for a model name within a project and predict."""
        logger.info("Predicting by model_name=%s project_id=%d", model_name, project_id)

        deployment = (
            self.db.query(DeploymentModel)
            .join(
                RegisteredModel,
                DeploymentModel.registered_model_id == RegisteredModel.id,
            )
            .filter(
                DeploymentModel.model_name == model_name,
                DeploymentModel.status == DeploymentStatus.ACTIVE,
                RegisteredModel.project_id == project_id,
            )
            .order_by(DeploymentModel.id.desc())
            .first()
        )
        if deployment is None:
            raise DeploymentNotFoundError(0)
        return self.predict(int(deployment.id), features, project_id)

    def list_deployments(self, project_id: int) -> list[DeploymentResponse]:
        """List all deployments for a project (traced through registered model)."""
        logger.info("Listing deployments for project_id=%d", project_id)
        deployments = (
            self.db.query(DeploymentModel)
            .join(
                RegisteredModel,
                DeploymentModel.registered_model_id == RegisteredModel.id,
            )
            .filter(RegisteredModel.project_id == project_id)
            .order_by(DeploymentModel.id.desc())
            .all()
        )
        return [DeploymentResponse.model_validate(d) for d in deployments]

    def get_deployment(self, deployment_id: int, project_id: int) -> DeploymentResponse:
        """Get a single deployment by ID, scoped to a project."""
        logger.info("Getting deployment_id=%d project_id=%d", deployment_id, project_id)
        deployment = self.db.get(DeploymentModel, deployment_id)
        if deployment is None:
            raise DeploymentNotFoundError(deployment_id)
        self._validate_deployment_scope(deployment, project_id)
        return DeploymentResponse.model_validate(deployment)

    # --- Private helpers ---

    def _validate_deployment_scope(
        self, deployment: DeploymentModel, project_id: int
    ) -> None:
        """Verify the deployment's registered model belongs to the given project."""
        registered = self.db.get(RegisteredModel, deployment.registered_model_id)
        if registered is None or registered.project_id != project_id:
            raise DeploymentNotInProjectError(int(deployment.id), project_id)

    def _load_model(self, registered: RegisteredModel, pool_key: str) -> None:
        """Load a .joblib model artifact into the serving pool."""
        logger.info("Loading model into pool key=%s", pool_key)
        try:
            tmp_dir = Path("/tmp")
            loaded_path = local_artifact_store.load(
                str(registered.artifact_path), tmp_dir / pool_key.replace(":", "_")
            )
            model = joblib.load(loaded_path)  # type: ignore[no-untyped-call]
            serving_pool[pool_key] = model
        except Exception as exc:
            raise PredictionError(f"Failed to load model '{pool_key}': {exc}") from exc

    def _validate_features(
        self, feature_list: list[dict[str, Any]], model: Any
    ) -> None:
        """Validate input features against the model's expected schema."""
        # Get expected feature columns from the model's config
        # The model object is a scikit-learn/xgboost estimator — check for
        # feature_names_in_ attribute (set by sklearn when fitted on a DataFrame)
        if hasattr(model, "feature_names_in_"):
            expected = set(model.feature_names_in_)
        else:
            # If we can't introspect, skip validation
            return

        for features in feature_list:
            missing = expected - set(features.keys())
            if missing:
                raise PredictionError(
                    f"Missing required features: {', '.join(sorted(missing))}"
                )

    def _predict_single(self, model: Any, features: dict[str, Any]) -> PredictionItem:
        """Run prediction on a single input."""
        import numpy as np  # type: ignore[import-untyped]
        import pandas as pd  # type: ignore[import-untyped]

        input_df = pd.DataFrame([features])
        prediction = model.predict(input_df)[0]

        # Convert numpy types to native Python for JSON serialization
        if isinstance(prediction, (np.integer, np.floating)):
            prediction = prediction.item()

        confidence = None
        if hasattr(model, "predict_proba"):
            proba = model.predict_proba(input_df)
            confidence = float(np.max(proba))

        return PredictionItem(prediction=prediction, confidence=confidence)
