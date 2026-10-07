.PHONY: up up-s3 down logs

up:
	sudo docker compose up --build

up-s3:
	sudo COMPOSE_PROFILES=s3 STORAGE_BACKEND=s3 docker compose up --build

down:
	sudo docker compose down -v

logs:
	sudo docker compose logs -f
