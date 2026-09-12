# F1KD Database Recovery Guide

This project includes a database recreation script and a backup workflow so the system can be restored quickly if the database is lost or deleted.

## 1) Best backup method for live data

Use a real database dump from MySQL whenever the DB is still available:

```bash
mkdir -p backups
mysqldump --single-transaction --routines --events --add-drop-database -u root -p f1kd > backups/f1kd_backup_YYYYMMDD.sql
```

This creates a SQL file containing the structure and data for the current database, which is the safest backup for a live app.

## 2) Restore from that backup

```bash
mysql -u root -p < backups/f1kd_backup_YYYYMMDD.sql
```

If the database was deleted, you can also recreate it with the project schema script:

```bash
mysql -u root -p < server/f1kd_recreate.sql
```

## 3) Recovery script included in the repo

A schema snapshot is stored here:

- [server/f1kd_recreate.sql](f1kd_recreate.sql)

This script creates the application database and the tables the backend currently expects, including the core tables used by users, mothers, children, programs, and monitoring.

> Important: the application runtime schema is defined in [server/db.js](db.js). This schema file is intended as a recovery fallback when a database is missing, while mysqldump remains the best full backup for real data.

## 4) Recommended practice

1. Back up the database before any schema change or major migration.
2. Keep daily SQL backups in the `backups/` folder.
3. Store at least one recent copy in a secure external backup location.
4. If the database is missing, recover using `server/f1kd_recreate.sql` first, then restore the latest data dump.

## 5) Notes

The application can add missing columns automatically when the server starts, but that does not replace a proper data backup. For real recovery, the safest method is always:

- make a MySQL dump first
- restore the dump to a fresh database
- then re-run the app
