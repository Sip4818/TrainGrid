- currently the model and deployment options in sidebar only appears after i select a project even though they are global things i.e not scoped to particular project.
- registering new model in model registery gives an error -> pi-1       | 2026-09-15 13:53:04,373 | INFO     | backend.api.routers.model_registry | model_registry.py:36 | Listing all models
api-1       | 2026-09-15 13:53:04,373 | INFO     | backend.api.services.model_service | model_service.py:128 | Listing all models
api-1       | INFO:     172.18.0.1:57298 - "GET /models/ HTTP/1.1" 200 OK
api-1       | 2026-09-15 13:53:23,676 | INFO     | backend.api.routers.model_registry | model_registry.py:27 | Registering model name=default version=v1.0.0
api-1       | 2026-09-15 13:53:23,676 | INFO     | backend.api.services.model_service | model_service.py:66 | Registering model name=default version=v1.0.0 run_id=1
postgres-1  | 2026-09-15 13:53:23.705 UTC [76] ERROR:  null value in column "project_id" of relation "registered_models" violates not-null constraint
postgres-1  | 2026-09-15 13:53:23.705 UTC [76] DETAIL:  Failing row contains (1, default, v1.0.0, 1, null, null, NONE, null, runs/1/model.joblib, ecb8f56842fadb8b8b59f36d020ae065c39bc9b368e8948c2ecf9039e9bb262e, null, {"target_column": "target", "dataset_path": "datasets/1/dataset...., {"accuracy": 1.0}, 2026-09-15 13:53:23.704386, 2026-09-15 13:53:23.704392).
postgres-1  | 2026-09-15 13:53:23.705 UTC [76] STATEMENT:  INSERT INTO registered_models (name, version, run_id, stage, description, artifact_path, artifact_checksum, dataset_hash, config, metrics, created_at, updated_at) VALUES ('default', 'v1.0.0', 1, 'NONE', NULL, 'runs/1/model.joblib', 'ecb8f56842fadb8b8b59f36d020ae065c39bc9b368e8948c2ecf9039e9bb262e', NULL, '{"target_column": "target", "dataset_path": "datasets/1/dataset.csv", "feature_columns": ["feature1", "feature2"], "n_estimators": 100, "trainer_name": "random_forest"}'::JSON, '{"accuracy": 1.0}'::JSON, '2026-09-15T13:53:23.704386'::timestamp, '2026-09-15T13:53:23.704392'::timestamp) RETURNING registered_models.id
api-1       | INFO:     172.18.0.1:39748 - "POST /models/ HTTP/1.1" 500 Internal Server Error
api-1       | ERROR:    Exception in ASGI application
api-1       | Traceback (most recent call last):
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/engine/base.py", line 1969, in _exec_single_context
api-1       |     self.dialect.do_execute(
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/engine/default.py", line 952, in do_execute
api-1       |     cursor.execute(statement, parameters)
api-1       | psycopg2.errors.NotNullViolation: null value in column "project_id" of relation "registered_models" violates not-null constraint
api-1       | DETAIL:  Failing row contains (1, default, v1.0.0, 1, null, null, NONE, null, runs/1/model.joblib, ecb8f56842fadb8b8b59f36d020ae065c39bc9b368e8948c2ecf9039e9bb262e, null, {"target_column": "target", "dataset_path": "datasets/1/dataset...., {"accuracy": 1.0}, 2026-09-15 13:53:23.704386, 2026-09-15 13:53:23.704392).
api-1       | 
api-1       | 
api-1       | The above exception was the direct cause of the following exception:
api-1       | 
api-1       | Traceback (most recent call last):
api-1       |   File "/usr/local/lib/python3.11/site-packages/uvicorn/protocols/http/httptools_impl.py", line 422, in run_asgi
api-1       |     result = await app(  # type: ignore[func-returns-value]
api-1       |              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
api-1       |   File "/usr/local/lib/python3.11/site-packages/uvicorn/middleware/proxy_headers.py", line 63, in __call__
api-1       |     return await self.app(scope, receive, send)
api-1       |            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
api-1       |   File "/usr/local/lib/python3.11/site-packages/fastapi/applications.py", line 1163, in __call__
api-1       |     await super().__call__(scope, receive, send)
api-1       |   File "/usr/local/lib/python3.11/site-packages/starlette/applications.py", line 96, in __call__
api-1       |     await self.middleware_stack(scope, receive, send)
api-1       |   File "/usr/local/lib/python3.11/site-packages/starlette/middleware/errors.py", line 186, in __call__
api-1       |     raise exc
api-1       |   File "/usr/local/lib/python3.11/site-packages/starlette/middleware/errors.py", line 164, in __call__
api-1       |     await self.app(scope, receive, _send)
api-1       |   File "/usr/local/lib/python3.11/site-packages/starlette/middleware/cors.py", line 96, in __call__
api-1       |     await self.simple_response(scope, receive, send, request_headers=headers)
api-1       |   File "/usr/local/lib/python3.11/site-packages/starlette/middleware/cors.py", line 154, in simple_response
api-1       |     await self.app(scope, receive, send)
api-1       |   File "/usr/local/lib/python3.11/site-packages/starlette/middleware/exceptions.py", line 63, in __call__
api-1       |     await wrap_app_handling_exceptions(self.app, conn)(scope, receive, send)
api-1       |   File "/usr/local/lib/python3.11/site-packages/starlette/_exception_handler.py", line 53, in wrapped_app
api-1       |     raise exc
api-1       |   File "/usr/local/lib/python3.11/site-packages/starlette/_exception_handler.py", line 42, in wrapped_app
api-1       |     await app(scope, receive, sender)
api-1       |   File "/usr/local/lib/python3.11/site-packages/fastapi/middleware/asyncexitstack.py", line 18, in __call__
api-1       |     await self.app(scope, receive, send)
api-1       |   File "/usr/local/lib/python3.11/site-packages/starlette/routing.py", line 670, in __call__
api-1       |     await self.middleware_stack(scope, receive, send)
api-1       |   File "/usr/local/lib/python3.11/site-packages/fastapi/routing.py", line 2734, in app
api-1       |     await route.handle(scope, receive, send)
api-1       |   File "/usr/local/lib/python3.11/site-packages/fastapi/routing.py", line 1780, in handle
api-1       |     await self.original_router.handle(scope, receive, send)
api-1       |   File "/usr/local/lib/python3.11/site-packages/fastapi/routing.py", line 2789, in handle
api-1       |     await included_router._handle_selected(scope, receive, send)
api-1       |   File "/usr/local/lib/python3.11/site-packages/fastapi/routing.py", line 1800, in _handle_selected
api-1       |     await original_route.handle(scope, receive, send)
api-1       |   File "/usr/local/lib/python3.11/site-packages/fastapi/routing.py", line 1279, in handle
api-1       |     await app(scope, receive, send)
api-1       |   File "/usr/local/lib/python3.11/site-packages/fastapi/routing.py", line 158, in app
api-1       |     await wrap_app_handling_exceptions(app, request)(scope, receive, send)
api-1       |   File "/usr/local/lib/python3.11/site-packages/starlette/_exception_handler.py", line 53, in wrapped_app
api-1       |     raise exc
api-1       |   File "/usr/local/lib/python3.11/site-packages/starlette/_exception_handler.py", line 42, in wrapped_app
api-1       |     await app(scope, receive, sender)
api-1       |   File "/usr/local/lib/python3.11/site-packages/fastapi/routing.py", line 144, in app
api-1       |     response = await f(request)
api-1       |                ^^^^^^^^^^^^^^^^
api-1       |   File "/usr/local/lib/python3.11/site-packages/fastapi/routing.py", line 706, in app
api-1       |     raw_response = await run_endpoint_function(
api-1       |                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
api-1       |   File "/usr/local/lib/python3.11/site-packages/fastapi/routing.py", line 354, in run_endpoint_function
api-1       |     return await run_in_threadpool(dependant.call, **values)
api-1       |            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
api-1       |   File "/usr/local/lib/python3.11/site-packages/starlette/concurrency.py", line 34, in run_in_threadpool
api-1       |     return await anyio.to_thread.run_sync(func)
api-1       |            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
api-1       |   File "/usr/local/lib/python3.11/site-packages/anyio/to_thread.py", line 65, in run_sync
api-1       |     return await get_async_backend().run_sync_in_worker_thread(
api-1       |            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
api-1       |   File "/usr/local/lib/python3.11/site-packages/anyio/_backends/_asyncio.py", line 2706, in run_sync_in_worker_thread
api-1       |     return await future
api-1       |            ^^^^^^^^^^^^
api-1       |   File "/usr/local/lib/python3.11/site-packages/anyio/_backends/_asyncio.py", line 1100, in run
api-1       |     result = context.run(func, *args)
api-1       |              ^^^^^^^^^^^^^^^^^^^^^^^^
api-1       |   File "/app/backend/api/routers/model_registry.py", line 28, in register_model
api-1       |     return ModelService(db).register_model(payload)
api-1       |            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
api-1       |   File "/app/backend/api/services/model_service.py", line 115, in register_model
api-1       |     self.db.commit()
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/orm/session.py", line 2035, in commit
api-1       |     trans.commit(_to_root=True)
api-1       |   File "<string>", line 2, in commit
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/orm/state_changes.py", line 137, in _go
api-1       |     ret_value = fn(self, *arg, **kw)
api-1       |                 ^^^^^^^^^^^^^^^^^^^^
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/orm/session.py", line 1316, in commit
api-1       |     self._prepare_impl()
api-1       |   File "<string>", line 2, in _prepare_impl
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/orm/state_changes.py", line 137, in _go
api-1       |     ret_value = fn(self, *arg, **kw)
api-1       |                 ^^^^^^^^^^^^^^^^^^^^
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/orm/session.py", line 1290, in _prepare_impl
api-1       |     self.session.flush()
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/orm/session.py", line 4353, in flush
api-1       |     self._flush(objects)
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/orm/session.py", line 4488, in _flush
api-1       |     with util.safe_reraise():
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/util/langhelpers.py", line 122, in __exit__
api-1       |     raise exc_value.with_traceback(exc_tb)
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/orm/session.py", line 4449, in _flush
api-1       |     flush_context.execute()
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/orm/unitofwork.py", line 465, in execute
api-1       |     rec.execute(self)
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/orm/unitofwork.py", line 641, in execute
api-1       |     util.preloaded.orm_persistence.save_obj(
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/orm/persistence.py", line 94, in save_obj
api-1       |     _emit_insert_statements(
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/orm/persistence.py", line 1234, in _emit_insert_statements
api-1       |     result = connection.execute(
api-1       |              ^^^^^^^^^^^^^^^^^^^
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/engine/base.py", line 1421, in execute
api-1       |     return meth(
api-1       |            ^^^^^
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/sql/elements.py", line 526, in _execute_on_connection
api-1       |     return connection._execute_clauseelement(
api-1       |            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/engine/base.py", line 1643, in _execute_clauseelement
api-1       |     ret = self._execute_context(
api-1       |           ^^^^^^^^^^^^^^^^^^^^^^
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/engine/base.py", line 1848, in _execute_context
api-1       |     return self._exec_single_context(
api-1       |            ^^^^^^^^^^^^^^^^^^^^^^^^^^
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/engine/base.py", line 1988, in _exec_single_context
api-1       |     self._handle_dbapi_exception(
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/engine/base.py", line 2365, in _handle_dbapi_exception
api-1       |     raise sqlalchemy_exception.with_traceback(exc_info[2]) from e
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/engine/base.py", line 1969, in _exec_single_context
api-1       |     self.dialect.do_execute(
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/engine/default.py", line 952, in do_execute
api-1       |     cursor.execute(statement, parameters)
api-1       | sqlalchemy.exc.IntegrityError: (psycopg2.errors.NotNullViolation) null value in column "project_id" of relation "registered_models" violates not-null constraint
api-1       | DETAIL:  Failing row contains (1, default, v1.0.0, 1, null, null, NONE, null, runs/1/model.joblib, ecb8f56842fadb8b8b59f36d020ae065c39bc9b368e8948c2ecf9039e9bb262e, null, {"target_column": "target", "dataset_path": "datasets/1/dataset...., {"accuracy": 1.0}, 2026-09-15 13:53:23.704386, 2026-09-15 13:53:23.704392).
api-1       | 
api-1       | [SQL: INSERT INTO registered_models (name, version, run_id, stage, description, artifact_path, artifact_checksum, dataset_hash, config, metrics, created_at, updated_at) VALUES (%(name)s, %(version)s, %(run_id)s, %(stage)s, %(description)s, %(artifact_path)s, %(artifact_checksum)s, %(dataset_hash)s, %(config)s::JSON, %(metrics)s::JSON, %(created_at)s, %(updated_at)s) RETURNING registered_models.id]
api-1       | [parameters: {'name': 'default', 'version': 'v1.0.0', 'run_id': 1, 'stage': 'NONE', 'description': None, 'artifact_path': 'runs/1/model.joblib', 'artifact_checksum': 'ecb8f56842fadb8b8b59f36d020ae065c39bc9b368e8948c2ecf9039e9bb262e', 'dataset_hash': None, 'config': '{"target_column": "target", "dataset_path": "datasets/1/dataset.csv", "feature_columns": ["feature1", "feature2"], "n_estimators": 100, "trainer_name": "random_forest"}', 'metrics': '{"accuracy": 1.0}', 'created_at': datetime.datetime(2026, 9, 15, 13, 53, 23, 704386), 'updated_at': datetime.datetime(2026, 9, 15, 13, 53, 23, 704392)}]
api-1       | (Background on this error at: https://sqlalche.me/e/20/gkpj)
api-1       | 2026-09-15 13:53:42,943 | INFO     | backend.api.routers.model_registry | model_registry.py:27 | Registering model name=default version=v1.0.0
api-1       | 2026-09-15 13:53:42,943 | INFO     | backend.api.services.model_service | model_service.py:66 | Registering model name=default version=v1.0.0 run_id=2
postgres-1  | 2026-09-15 13:53:42.960 UTC [41] ERROR:  null value in column "project_id" of relation "registered_models" violates not-null constraint
postgres-1  | 2026-09-15 13:53:42.960 UTC [41] DETAIL:  Failing row contains (2, default, v1.0.0, 2, null, null, NONE, null, runs/2/model.joblib, 20c26a0e8c1aaea81d8021ba913e0239ae4bcaa41ef60e80347ea67c6d3e7771, null, {"target_column": "target", "dataset_path": "datasets/1/dataset...., {"accuracy": 1.0}, 2026-09-15 13:53:42.959245, 2026-09-15 13:53:42.959255).
postgres-1  | 2026-09-15 13:53:42.960 UTC [41] STATEMENT:  INSERT INTO registered_models (name, version, run_id, stage, description, artifact_path, artifact_checksum, dataset_hash, config, metrics, created_at, updated_at) VALUES ('default', 'v1.0.0', 2, 'NONE', NULL, 'runs/2/model.joblib', '20c26a0e8c1aaea81d8021ba913e0239ae4bcaa41ef60e80347ea67c6d3e7771', NULL, '{"target_column": "target", "dataset_path": "datasets/1/dataset.csv", "feature_columns": ["feature1", "feature2"], "n_estimators": 100, "max_depth": 6, "learning_rate": 0.3, "trainer_name": "xgboost"}'::JSON, '{"accuracy": 1.0}'::JSON, '2026-09-15T13:53:42.959245'::timestamp, '2026-09-15T13:53:42.959255'::timestamp) RETURNING registered_models.id
api-1       | INFO:     172.18.0.1:37086 - "POST /models/ HTTP/1.1" 500 Internal Server Error
api-1       | ERROR:    Exception in ASGI application
api-1       | Traceback (most recent call last):
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/engine/base.py", line 1969, in _exec_single_context
api-1       |     self.dialect.do_execute(
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/engine/default.py", line 952, in do_execute
api-1       |     cursor.execute(statement, parameters)
api-1       | psycopg2.errors.NotNullViolation: null value in column "project_id" of relation "registered_models" violates not-null constraint
api-1       | DETAIL:  Failing row contains (2, default, v1.0.0, 2, null, null, NONE, null, runs/2/model.joblib, 20c26a0e8c1aaea81d8021ba913e0239ae4bcaa41ef60e80347ea67c6d3e7771, null, {"target_column": "target", "dataset_path": "datasets/1/dataset...., {"accuracy": 1.0}, 2026-09-15 13:53:42.959245, 2026-09-15 13:53:42.959255).
api-1       | 
api-1       | 
api-1       | The above exception was the direct cause of the following exception:
api-1       | 
api-1       | Traceback (most recent call last):
api-1       |   File "/usr/local/lib/python3.11/site-packages/uvicorn/protocols/http/httptools_impl.py", line 422, in run_asgi
api-1       |     result = await app(  # type: ignore[func-returns-value]
api-1       |              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
api-1       |   File "/usr/local/lib/python3.11/site-packages/uvicorn/middleware/proxy_headers.py", line 63, in __call__
api-1       |     return await self.app(scope, receive, send)
api-1       |            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
api-1       |   File "/usr/local/lib/python3.11/site-packages/fastapi/applications.py", line 1163, in __call__
api-1       |     await super().__call__(scope, receive, send)
api-1       |   File "/usr/local/lib/python3.11/site-packages/starlette/applications.py", line 96, in __call__
api-1       |     await self.middleware_stack(scope, receive, send)
api-1       |   File "/usr/local/lib/python3.11/site-packages/starlette/middleware/errors.py", line 186, in __call__
api-1       |     raise exc
api-1       |   File "/usr/local/lib/python3.11/site-packages/starlette/middleware/errors.py", line 164, in __call__
api-1       |     await self.app(scope, receive, _send)
api-1       |   File "/usr/local/lib/python3.11/site-packages/starlette/middleware/cors.py", line 96, in __call__
api-1       |     await self.simple_response(scope, receive, send, request_headers=headers)
api-1       |   File "/usr/local/lib/python3.11/site-packages/starlette/middleware/cors.py", line 154, in simple_response
api-1       |     await self.app(scope, receive, send)
api-1       |   File "/usr/local/lib/python3.11/site-packages/starlette/middleware/exceptions.py", line 63, in __call__
api-1       |     await wrap_app_handling_exceptions(self.app, conn)(scope, receive, send)
api-1       |   File "/usr/local/lib/python3.11/site-packages/starlette/_exception_handler.py", line 53, in wrapped_app
api-1       |     raise exc
api-1       |   File "/usr/local/lib/python3.11/site-packages/starlette/_exception_handler.py", line 42, in wrapped_app
api-1       |     await app(scope, receive, sender)
api-1       |   File "/usr/local/lib/python3.11/site-packages/fastapi/middleware/asyncexitstack.py", line 18, in __call__
api-1       |     await self.app(scope, receive, send)
api-1       |   File "/usr/local/lib/python3.11/site-packages/starlette/routing.py", line 670, in __call__
api-1       |     await self.middleware_stack(scope, receive, send)
api-1       |   File "/usr/local/lib/python3.11/site-packages/fastapi/routing.py", line 2734, in app
api-1       |     await route.handle(scope, receive, send)
api-1       |   File "/usr/local/lib/python3.11/site-packages/fastapi/routing.py", line 1780, in handle
api-1       |     await self.original_router.handle(scope, receive, send)
api-1       |   File "/usr/local/lib/python3.11/site-packages/fastapi/routing.py", line 2789, in handle
api-1       |     await included_router._handle_selected(scope, receive, send)
api-1       |   File "/usr/local/lib/python3.11/site-packages/fastapi/routing.py", line 1800, in _handle_selected
api-1       |     await original_route.handle(scope, receive, send)
api-1       |   File "/usr/local/lib/python3.11/site-packages/fastapi/routing.py", line 1279, in handle
api-1       |     await app(scope, receive, send)
api-1       |   File "/usr/local/lib/python3.11/site-packages/fastapi/routing.py", line 158, in app
api-1       |     await wrap_app_handling_exceptions(app, request)(scope, receive, send)
api-1       |   File "/usr/local/lib/python3.11/site-packages/starlette/_exception_handler.py", line 53, in wrapped_app
api-1       |     raise exc
api-1       |   File "/usr/local/lib/python3.11/site-packages/starlette/_exception_handler.py", line 42, in wrapped_app
api-1       |     await app(scope, receive, sender)
api-1       |   File "/usr/local/lib/python3.11/site-packages/fastapi/routing.py", line 144, in app
api-1       |     response = await f(request)
api-1       |                ^^^^^^^^^^^^^^^^
api-1       |   File "/usr/local/lib/python3.11/site-packages/fastapi/routing.py", line 706, in app
api-1       |     raw_response = await run_endpoint_function(
api-1       |                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
api-1       |   File "/usr/local/lib/python3.11/site-packages/fastapi/routing.py", line 354, in run_endpoint_function
api-1       |     return await run_in_threadpool(dependant.call, **values)
api-1       |            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
api-1       |   File "/usr/local/lib/python3.11/site-packages/starlette/concurrency.py", line 34, in run_in_threadpool
api-1       |     return await anyio.to_thread.run_sync(func)
api-1       |            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
api-1       |   File "/usr/local/lib/python3.11/site-packages/anyio/to_thread.py", line 65, in run_sync
api-1       |     return await get_async_backend().run_sync_in_worker_thread(
api-1       |            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
api-1       |   File "/usr/local/lib/python3.11/site-packages/anyio/_backends/_asyncio.py", line 2706, in run_sync_in_worker_thread
api-1       |     return await future
api-1       |            ^^^^^^^^^^^^
api-1       |   File "/usr/local/lib/python3.11/site-packages/anyio/_backends/_asyncio.py", line 1100, in run
api-1       |     result = context.run(func, *args)
api-1       |              ^^^^^^^^^^^^^^^^^^^^^^^^
api-1       |   File "/app/backend/api/routers/model_registry.py", line 28, in register_model
api-1       |     return ModelService(db).register_model(payload)
api-1       |            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
api-1       |   File "/app/backend/api/services/model_service.py", line 115, in register_model
api-1       |     self.db.commit()
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/orm/session.py", line 2035, in commit
api-1       |     trans.commit(_to_root=True)
api-1       |   File "<string>", line 2, in commit
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/orm/state_changes.py", line 137, in _go
api-1       |     ret_value = fn(self, *arg, **kw)
api-1       |                 ^^^^^^^^^^^^^^^^^^^^
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/orm/session.py", line 1316, in commit
api-1       |     self._prepare_impl()
api-1       |   File "<string>", line 2, in _prepare_impl
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/orm/state_changes.py", line 137, in _go
api-1       |     ret_value = fn(self, *arg, **kw)
api-1       |                 ^^^^^^^^^^^^^^^^^^^^
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/orm/session.py", line 1290, in _prepare_impl
api-1       |     self.session.flush()
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/orm/session.py", line 4353, in flush
api-1       |     self._flush(objects)
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/orm/session.py", line 4488, in _flush
api-1       |     with util.safe_reraise():
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/util/langhelpers.py", line 122, in __exit__
api-1       |     raise exc_value.with_traceback(exc_tb)
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/orm/session.py", line 4449, in _flush
api-1       |     flush_context.execute()
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/orm/unitofwork.py", line 465, in execute
api-1       |     rec.execute(self)
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/orm/unitofwork.py", line 641, in execute
api-1       |     util.preloaded.orm_persistence.save_obj(
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/orm/persistence.py", line 94, in save_obj
api-1       |     _emit_insert_statements(
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/orm/persistence.py", line 1234, in _emit_insert_statements
api-1       |     result = connection.execute(
api-1       |              ^^^^^^^^^^^^^^^^^^^
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/engine/base.py", line 1421, in execute
api-1       |     return meth(
api-1       |            ^^^^^
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/sql/elements.py", line 526, in _execute_on_connection
api-1       |     return connection._execute_clauseelement(
api-1       |            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/engine/base.py", line 1643, in _execute_clauseelement
api-1       |     ret = self._execute_context(
api-1       |           ^^^^^^^^^^^^^^^^^^^^^^
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/engine/base.py", line 1848, in _execute_context
api-1       |     return self._exec_single_context(
api-1       |            ^^^^^^^^^^^^^^^^^^^^^^^^^^
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/engine/base.py", line 1988, in _exec_single_context
api-1       |     self._handle_dbapi_exception(
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/engine/base.py", line 2365, in _handle_dbapi_exception
api-1       |     raise sqlalchemy_exception.with_traceback(exc_info[2]) from e
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/engine/base.py", line 1969, in _exec_single_context
api-1       |     self.dialect.do_execute(
api-1       |   File "/usr/local/lib/python3.11/site-packages/sqlalchemy/engine/default.py", line 952, in do_execute
api-1       |     cursor.execute(statement, parameters)
api-1       | sqlalchemy.exc.IntegrityError: (psycopg2.errors.NotNullViolation) null value in column "project_id" of relation "registered_models" violates not-null constraint
api-1       | DETAIL:  Failing row contains (2, default, v1.0.0, 2, null, null, NONE, null, runs/2/model.joblib, 20c26a0e8c1aaea81d8021ba913e0239ae4bcaa41ef60e80347ea67c6d3e7771, null, {"target_column": "target", "dataset_path": "datasets/1/dataset...., {"accuracy": 1.0}, 2026-09-15 13:53:42.959245, 2026-09-15 13:53:42.959255).
api-1       | 
api-1       | [SQL: INSERT INTO registered_models (name, version, run_id, stage, description, artifact_path, artifact_checksum, dataset_hash, config, metrics, created_at, updated_at) VALUES (%(name)s, %(version)s, %(run_id)s, %(stage)s, %(description)s, %(artifact_path)s, %(artifact_checksum)s, %(dataset_hash)s, %(config)s::JSON, %(metrics)s::JSON, %(created_at)s, %(updated_at)s) RETURNING registered_models.id]
api-1       | [parameters: {'name': 'default', 'version': 'v1.0.0', 'run_id': 2, 'stage': 'NONE', 'description': None, 'artifact_path': 'runs/2/model.joblib', 'artifact_checksum': '20c26a0e8c1aaea81d8021ba913e0239ae4bcaa41ef60e80347ea67c6d3e7771', 'dataset_hash': None, 'config': '{"target_column": "target", "dataset_path": "datasets/1/dataset.csv", "feature_columns": ["feature1", "feature2"], "n_estimators": 100, "max_depth": 6, "learning_rate": 0.3, "trainer_name": "xgboost"}', 'metrics': '{"accuracy": 1.0}', 'created_at': datetime.datetime(2026, 9, 15, 13, 53, 42, 959245), 'updated_at': datetime.datetime(2026, 9, 15, 13, 53, 42, 959255)}]
api-1       | (Background on this error at: https://sqlalche.me/e/20/gkpj)

