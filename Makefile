.PHONY: up up-s3 down logs

up:
	docker compose up --build

up-s3:
	COMPOSE_PROFILES=s3 STORAGE_BACKEND=s3 docker compose up --build

down:
	docker compose down -v

logs:
	docker compose logs -f
