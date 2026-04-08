db-studio:
	doppler run -- pnpm --filter @sneakereco/db studio

db-migrate:
	doppler run -- pnpm --filter @sneakereco/db migrate

db-generate:
	doppler run -- pnpm --filter @sneakereco/db generate
