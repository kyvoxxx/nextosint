.PHONY: dev stop logs db-reset

dev:
	docker-compose up --build

stop:
	docker-compose down

logs:
	docker-compose logs -f

db-reset:
	@echo "Resetting PostgreSQL schema..."
	cd backend && npx prisma migrate reset --force
	@echo "Database reset complete."
