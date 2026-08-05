import pytest

from backend.infrastructure.storage.local_store import LocalArtifactStore


def test_save_copies_to_root_and_returns_key(tmp_path):
    store = LocalArtifactStore(root=tmp_path / "artifacts")
    source = tmp_path / "model.joblib"
    source.write_bytes(b"model-bytes")

    key = store.save(source, "runs/1/model.joblib")

    assert key == "runs/1/model.joblib"
    stored = tmp_path / "artifacts" / "runs" / "1" / "model.joblib"
    assert stored.exists()
    assert stored.read_bytes() == b"model-bytes"


def test_load_restores_artifact_to_destination(tmp_path):
    store = LocalArtifactStore(root=tmp_path / "artifacts")
    source = tmp_path / "model.joblib"
    source.write_bytes(b"model-bytes")
    store.save(source, "runs/1/model.joblib")

    destination = tmp_path / "restored" / "model.joblib"
    restored = store.load("runs/1/model.joblib", destination)

    assert restored == destination
    assert destination.read_bytes() == b"model-bytes"


def test_save_creates_nested_directories(tmp_path):
    store = LocalArtifactStore(root=tmp_path / "artifacts")
    source = tmp_path / "model.joblib"
    source.write_bytes(b"model-bytes")

    store.save(source, "runs/2/nested/model.joblib")

    assert (tmp_path / "artifacts" / "runs" / "2" / "nested" / "model.joblib").is_file()


def test_save_missing_source_raises_file_not_found(tmp_path):
    store = LocalArtifactStore(root=tmp_path / "artifacts")
    missing_source = tmp_path / "missing.joblib"

    with pytest.raises(FileNotFoundError):
        store.save(missing_source, "runs/1/model.joblib")


def test_load_missing_artifact_raises_file_not_found(tmp_path):
    store = LocalArtifactStore(root=tmp_path / "artifacts")

    with pytest.raises(FileNotFoundError):
        store.load("runs/1/model.joblib", tmp_path / "restored" / "model.joblib")
