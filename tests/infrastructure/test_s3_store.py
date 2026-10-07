import boto3
import pytest
from moto import mock_aws

from backend.infrastructure.storage import _cached_s3_store, get_artifact_store
from backend.infrastructure.storage.local_store import LocalArtifactStore
from backend.infrastructure.storage.s3_store import S3ArtifactStore


@pytest.fixture
def s3_client():
    with mock_aws():
        yield boto3.client("s3", region_name="us-east-1")


def _store(s3_client, **kwargs):
    kwargs.setdefault("create_bucket_on_init", True)
    return S3ArtifactStore(
        bucket="test-bucket", region="us-east-1", client=s3_client, **kwargs
    )


def test_save_uploads_to_bucket(s3_client, tmp_path):
    store = _store(s3_client)
    source = tmp_path / "model.joblib"
    source.write_bytes(b"model-bytes")

    key = store.save(source, "runs/1/model.joblib")

    assert key == "runs/1/model.joblib"
    body = s3_client.get_object(Bucket="test-bucket", Key="runs/1/model.joblib")[
        "Body"
    ].read()
    assert body == b"model-bytes"


def test_load_downloads_from_bucket(s3_client, tmp_path):
    store = _store(s3_client)
    source = tmp_path / "model.joblib"
    source.write_bytes(b"model-bytes")
    store.save(source, "runs/1/model.joblib")

    destination = tmp_path / "restored" / "model.joblib"
    restored = store.load("runs/1/model.joblib", destination)

    assert restored == destination
    assert destination.read_bytes() == b"model-bytes"


def test_save_creates_nested_keys(s3_client, tmp_path):
    store = _store(s3_client)
    source = tmp_path / "model.joblib"
    source.write_bytes(b"model-bytes")

    store.save(source, "runs/2/nested/model.joblib")

    keys = [
        obj["Key"] for obj in s3_client.list_objects(Bucket="test-bucket")["Contents"]
    ]
    assert "runs/2/nested/model.joblib" in keys


def test_save_missing_source_raises(s3_client, tmp_path):
    store = _store(s3_client)

    with pytest.raises(Exception):
        store.save(tmp_path / "missing.joblib", "runs/1/model.joblib")


def test_load_missing_key_raises(s3_client, tmp_path):
    store = _store(s3_client)

    with pytest.raises(Exception):
        store.load("runs/1/model.joblib", tmp_path / "restored" / "model.joblib")


def test_init_creates_bucket_when_missing(s3_client):
    _store(s3_client)

    buckets = [b["Name"] for b in s3_client.list_buckets()["Buckets"]]
    assert "test-bucket" in buckets


def test_init_skips_create_when_disabled(s3_client):
    store = _store(s3_client, create_bucket_on_init=False)

    # Bucket was not auto-created; save surfaces the missing bucket.
    with pytest.raises(Exception):
        import tempfile

        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            from pathlib import Path

            store.save(Path(tmp.name), "runs/1/model.joblib")


def test_factory_returns_local_by_default(monkeypatch):
    from backend.api.core import config

    monkeypatch.setattr(config.settings, "storage_backend", "local")
    _cached_s3_store.cache_clear()
    try:
        assert isinstance(get_artifact_store(), LocalArtifactStore)
    finally:
        _cached_s3_store.cache_clear()


def test_factory_returns_s3_when_configured(monkeypatch, s3_client):
    from backend.api.core import config

    monkeypatch.setattr(config.settings, "storage_backend", "s3")
    monkeypatch.setattr(config.settings, "s3_create_bucket_on_init", False)
    s3_client.create_bucket(Bucket=config.settings.s3_bucket_name)
    monkeypatch.setattr(
        "backend.infrastructure.storage._build_s3_store",
        lambda: S3ArtifactStore(
            bucket=config.settings.s3_bucket_name,
            region="us-east-1",
            create_bucket_on_init=False,
            client=s3_client,
        ),
    )
    _cached_s3_store.cache_clear()
    try:
        assert isinstance(get_artifact_store(), S3ArtifactStore)
    finally:
        _cached_s3_store.cache_clear()


def test_factory_falls_back_to_local_on_s3_failure(monkeypatch):
    from backend.api.core import config

    monkeypatch.setattr(config.settings, "storage_backend", "s3")
    monkeypatch.setattr(config.settings, "s3_strict", False)
    monkeypatch.setattr(
        "backend.infrastructure.storage._build_s3_store",
        lambda: (_ for _ in ()).throw(RuntimeError("S3 down")),
    )
    _cached_s3_store.cache_clear()
    try:
        assert isinstance(get_artifact_store(), LocalArtifactStore)
    finally:
        _cached_s3_store.cache_clear()


def test_factory_strict_raises_instead_of_fallback(monkeypatch):
    from backend.api.core import config

    monkeypatch.setattr(config.settings, "storage_backend", "s3")
    monkeypatch.setattr(config.settings, "s3_strict", True)
    monkeypatch.setattr(
        "backend.infrastructure.storage._build_s3_store",
        lambda: (_ for _ in ()).throw(RuntimeError("S3 down")),
    )
    _cached_s3_store.cache_clear()
    try:
        with pytest.raises(RuntimeError, match="S3 down"):
            get_artifact_store()
    finally:
        _cached_s3_store.cache_clear()


def test_factory_recovers_when_s3_comes_back(monkeypatch, s3_client):
    """A failed S3 init must not be cached: the next call retries S3."""
    from backend.api.core import config

    monkeypatch.setattr(config.settings, "storage_backend", "s3")
    monkeypatch.setattr(config.settings, "s3_strict", False)
    monkeypatch.setattr(config.settings, "s3_create_bucket_on_init", False)
    s3_client.create_bucket(Bucket=config.settings.s3_bucket_name)
    monkeypatch.setattr(
        "backend.infrastructure.storage._build_s3_store",
        lambda: (_ for _ in ()).throw(RuntimeError("S3 down")),
    )
    _cached_s3_store.cache_clear()
    try:
        assert isinstance(get_artifact_store(), LocalArtifactStore)

        monkeypatch.setattr(
            "backend.infrastructure.storage._build_s3_store",
            lambda: S3ArtifactStore(
                bucket=config.settings.s3_bucket_name,
                region="us-east-1",
                create_bucket_on_init=False,
                client=s3_client,
            ),
        )
        assert isinstance(get_artifact_store(), S3ArtifactStore)
    finally:
        _cached_s3_store.cache_clear()
