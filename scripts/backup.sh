#!/bin/bash

# Father's Day Ticker - Backup Script
# Run via cron: 0 2 * * * /var/www/fathersday/app/scripts/backup.sh

set -e

DATA_DIR="/var/www/fathersday/data"
BACKUP_DIR="/var/backups/fathersday"
RETENTION_DAYS=7

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)

echo "Starting backup at $TIMESTAMP"

# Backup photos
if [ -d "$DATA_DIR/photos" ]; then
    echo "Backing up photos..."
    tar -czf "$BACKUP_DIR/photos-$TIMESTAMP.tar.gz" \
        -C "$DATA_DIR" photos
    echo "Photos backed up: photos-$TIMESTAMP.tar.gz"
fi

# Backup database
if [ -f "$DATA_DIR/db.sqlite" ]; then
    echo "Backing up database..."
    cp "$DATA_DIR/db.sqlite" "$BACKUP_DIR/db-$TIMESTAMP.sqlite"
    gzip "$BACKUP_DIR/db-$TIMESTAMP.sqlite"
    echo "Database backed up: db-$TIMESTAMP.sqlite.gz"
fi

# Backup atlas
if [ -d "$DATA_DIR/atlas" ]; then
    echo "Backing up atlas..."
    tar -czf "$BACKUP_DIR/atlas-$TIMESTAMP.tar.gz" \
        -C "$DATA_DIR" atlas
    echo "Atlas backed up: atlas-$TIMESTAMP.tar.gz"
fi

# Clean up old backups (keep last 7 days)
echo "Cleaning up old backups (retention: $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "photos-*.tar.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "db-*.sqlite.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "atlas-*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup complete!"
echo ""
echo "Backup location: $BACKUP_DIR"
echo "Files:"
ls -lh "$BACKUP_DIR" | tail -n 10
echo ""

# Log backup success
echo "$(date): Backup completed successfully" >> "$DATA_DIR/logs/backup.log"
