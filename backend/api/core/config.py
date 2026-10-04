from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "TrainGrid"
    environment: str = "development"
    database_url: str = "sqlite:///./traingrid.db"
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/0"
    redis_url: str = "redis://localhost:6379/0"
    artifact_root: str = "artifacts"
    log_format: str = "text"
    storage_backend: str = "local"
    s3_bucket_name: str = "traingrid-artifacts"
    s3_endpoint_url: str | None = None
    s3_region: str = "us-east-1"
    s3_access_key_id: str | None = None
    s3_secret_access_key: str | None = None
    s3_create_bucket_on_init: bool = True
    s3_strict: bool = False

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
