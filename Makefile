# Database
db:studio:
	doppler run -- pnpm --filter @sneakereco/db studio

db:migrate:
	doppler run -- pnpm --filter @sneakereco/db migrate

db:generate:
	doppler run -- pnpm --filter @sneakereco/db generate

# Docker
docker:up:
	pnpm infra:up

docker:down
	pnpm infra:down

docker:reset
	pnpm infra:reset

docker:logs
	pnpm infra:logs