# Database Backup and Restore Procedures

## Automated Backup Script

```bash
#!/bin/bash
# backup.sh - PostgreSQL backup script for Kutunza POS

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="${DB_NAME:-kutunza_pos}"
DB_USER="${DB_USER:-kutunza}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
RETENTION_DAYS=30

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Backup filename
BACKUP_FILE="$BACKUP_DIR/kutunza_pos_${TIMESTAMP}.sql"

echo "Starting backup: $BACKUP_FILE"

# Create backup with compression
PGPASSWORD=$DB_PASSWORD pg_dump \
  -h $DB_HOST \
  -p $DB_PORT \
  -U $DB_USER \
  -d $DB_NAME \
  -F c \
  -b \
  -v \
  -f "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "Backup completed successfully"
    
    # Compress backup
    gzip "$BACKUP_FILE"
    echo "Backup compressed: ${BACKUP_FILE}.gz"
    
    # Remove old backups
    find "$BACKUP_DIR" -name "kutunza_pos_*.sql.gz" -mtime +$RETENTION_DAYS -delete
    echo "Old backups cleaned (older than $RETENTION_DAYS days)"
    
    # Upload to cloud storage (optional)
    # aws s3 cp "${BACKUP_FILE}.gz" s3://your-bucket/backups/
    
    exit 0
else
    echo "Backup failed!"
    exit 1
fi
```

## Restore from Backup

```bash
#!/bin/bash
# restore.sh - Restore PostgreSQL database

BACKUP_FILE=$1
DB_NAME="${DB_NAME:-kutunza_pos}"
DB_USER="${DB_USER:-kutunza}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: ./restore.sh <backup-file.sql.gz>"
    exit 1
fi

echo "Restoring from: $BACKUP_FILE"

# Decompress if needed
if [[ $BACKUP_FILE == *.gz ]]; then
    gunzip -c "$BACKUP_FILE" > /tmp/restore.sql
    RESTORE_FILE=/tmp/restore.sql
else
    RESTORE_FILE=$BACKUP_FILE
fi

# Drop and recreate database (CAUTION!)
echo "WARNING: This will drop the existing database!"
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Restore cancelled"
    exit 0
fi

PGPASSWORD=$DB_PASSWORD psql \
  -h $DB_HOST \
  -p $DB_PORT \
  -U $DB_USER \
  -c "DROP DATABASE IF EXISTS $DB_NAME;"

PGPASSWORD=$DB_PASSWORD psql \
  -h $DB_HOST \
  -p $DB_PORT \
  -U $DB_USER \
  -c "CREATE DATABASE $DB_NAME;"

# Restore
PGPASSWORD=$DB_PASSWORD pg_restore \
  -h $DB_HOST \
  -p $DB_PORT \
  -U $DB_USER \
  -d $DB_NAME \
  -v \
  "$RESTORE_FILE"

if [ $? -eq 0 ]; then
    echo "Restore completed successfully"
    rm -f /tmp/restore.sql
    exit 0
else
    echo "Restore failed!"
    exit 1
fi
```

## Windows PowerShell Backup Script

```powershell
# backup.ps1 - PostgreSQL backup script for Windows

$BackupDir = "C:\backups"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$DbName = $env:DB_NAME ?? "kutunza_pos"
$DbUser = $env:DB_USER ?? "kutunza"
$DbHost = $env:DB_HOST ?? "localhost"
$DbPort = $env:DB_PORT ?? "5432"
$DbPassword = $env:DB_PASSWORD
$RetentionDays = 30

# Create backup directory
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

$BackupFile = "$BackupDir\kutunza_pos_$Timestamp.sql"

Write-Host "Starting backup: $BackupFile"

# Set password for pg_dump
$env:PGPASSWORD = $DbPassword

# Create backup
& pg_dump -h $DbHost -p $DbPort -U $DbUser -d $DbName -F c -b -v -f $BackupFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "Backup completed successfully" -ForegroundColor Green
    
    # Compress backup
    Compress-Archive -Path $BackupFile -DestinationPath "$BackupFile.zip"
    Remove-Item $BackupFile
    
    Write-Host "Backup compressed: $BackupFile.zip" -ForegroundColor Green
    
    # Remove old backups
    Get-ChildItem -Path $BackupDir -Filter "kutunza_pos_*.zip" | 
        Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$RetentionDays) } |
        Remove-Item -Force
    
    Write-Host "Old backups cleaned" -ForegroundColor Green
} else {
    Write-Host "Backup failed!" -ForegroundColor Red
    exit 1
}
```

## Automated Backup with Cron

Add to crontab for daily backups at 2 AM:

```bash
0 2 * * * /path/to/backup.sh >> /var/log/kutunza-backup.log 2>&1
```

## Docker Compose Backup Service

Add to docker-compose.yml:

```yaml
  backup:
    image: prodrigestivill/postgres-backup-local
    restart: unless-stopped
    depends_on:
      - postgres
    environment:
      POSTGRES_HOST: postgres
      POSTGRES_DB: ${DB_NAME:-kutunza_pos}
      POSTGRES_USER: ${DB_USER:-kutunza}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      SCHEDULE: "@daily"
      BACKUP_KEEP_DAYS: 30
      BACKUP_KEEP_WEEKS: 4
      BACKUP_KEEP_MONTHS: 6
    volumes:
      - ./backups:/backups
```

## Testing Backups

Always test your backups regularly:

```bash
# Test backup integrity
pg_restore --list backup_file.sql | head -20

# Test restore to temporary database
createdb test_restore
pg_restore -d test_restore backup_file.sql
psql -d test_restore -c "SELECT COUNT(*) FROM \"Sale\";"
dropdb test_restore
```

## Point-in-Time Recovery (PITR)

For production, enable WAL archiving in postgresql.conf:

```conf
wal_level = replica
archive_mode = on
archive_command = 'cp %p /path/to/archive/%f'
```

## Cloud Backup Integration

### AWS S3

```bash
# Install AWS CLI
aws configure

# Upload to S3
aws s3 cp backup_file.sql.gz s3://your-bucket/backups/
```

### Google Cloud Storage

```bash
# Install gsutil
gcloud auth login

# Upload to GCS
gsutil cp backup_file.sql.gz gs://your-bucket/backups/
```

## Monitoring Backup Status

Create a monitoring script to verify backups:

```bash
#!/bin/bash
# check-backup.sh

BACKUP_DIR="/backups"
MAX_AGE_HOURS=25  # Should have backup from last 24h + 1h buffer

LATEST_BACKUP=$(find "$BACKUP_DIR" -name "kutunza_pos_*.sql.gz" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -f2- -d" ")

if [ -z "$LATEST_BACKUP" ]; then
    echo "ERROR: No backups found!"
    exit 1
fi

BACKUP_AGE_SECONDS=$(( $(date +%s) - $(stat -c %Y "$LATEST_BACKUP") ))
BACKUP_AGE_HOURS=$(( $BACKUP_AGE_SECONDS / 3600 ))

if [ $BACKUP_AGE_HOURS -gt $MAX_AGE_HOURS ]; then
    echo "WARNING: Latest backup is $BACKUP_AGE_HOURS hours old"
    exit 1
else
    echo "OK: Latest backup is $BACKUP_AGE_HOURS hours old"
    exit 0
fi
```
