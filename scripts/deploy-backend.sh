#!/bin/bash

# Backend deployment script for Linux VM
# Usage: ./scripts/deploy-backend.sh [start|stop|restart|update|logs|status|backup]

set -e

ACTION=${1:-start}

case "$ACTION" in
  start)
    echo "Starting PaceUp backend services..."
    docker-compose up -d
    echo "Services started. Use './scripts/deploy-backend.sh status' to check status."
    ;;
  stop)
    echo "Stopping PaceUp backend services..."
    docker-compose down
    echo "Services stopped."
    ;;
  restart)
    echo "Restarting PaceUp backend services..."
    docker-compose restart
    echo "Services restarted."
    ;;
  update)
    echo "Updating PaceUp backend services..."
    git pull
    docker-compose build
    docker-compose up -d
    echo "Services updated and restarted."
    ;;
  logs)
    docker-compose logs -f
    ;;
  status)
    docker-compose ps
    ;;
  backup)
    echo "Creating database backup..."
    BACKUP_FILE="backup-$(date +%Y%m%d-%H%M%S).sql"
    docker exec paceup_db pg_dump -U ${POSTGRES_USER:-postgres} ${POSTGRES_DB:-paceup} > "$BACKUP_FILE"
    echo "Backup created: $BACKUP_FILE"
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|update|logs|status|backup}"
    exit 1
    ;;
esac

