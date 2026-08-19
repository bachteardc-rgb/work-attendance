// DEPRECATED: superseded by prisma/seed.js, which prisma.config.ts's
// `migrations.seed` command actually runs (`node prisma/seed.js`).
// This file is kept only because automated deletion was blocked in this
// session — please delete it manually (`git rm prisma/seed.ts`) once you've
// confirmed prisma/seed.js covers what you need.
//
// It used to construct a PrismaClient with the removed
// @prisma/adapter-better-sqlite3 package against a local dev.db, which no
// longer matches the project's Postgres datasource and would crash on
// `require`. Do not run this file directly; run `npx prisma db seed` instead.
export {};
