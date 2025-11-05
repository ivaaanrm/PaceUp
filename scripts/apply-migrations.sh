#!/bin/bash

# Script to apply all database migrations from the migrations folder
# Usage: ./scripts/apply-migrations.sh

# Note: We don't use set -e here because we want to continue processing
# even if one migration fails, so we can report all failures at the end

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
MIGRATIONS_DIR="$PROJECT_ROOT/backend/migrations"

echo -e "${YELLOW}Applying database migrations...${NC}\n"

# Check if migrations directory exists
if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo -e "${RED}Error: Migrations directory not found at $MIGRATIONS_DIR${NC}"
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: docker-compose is not installed${NC}"
    exit 1
fi

# Check if database container is running
if ! docker-compose ps db | grep -q "Up"; then
    echo -e "${RED}Error: Database container is not running. Please start it with: docker-compose up -d db${NC}"
    exit 1
fi

# Get all SQL files and sort them alphabetically
MIGRATIONS=$(find "$MIGRATIONS_DIR" -name "*.sql" -type f | sort)

if [ -z "$MIGRATIONS" ]; then
    echo -e "${YELLOW}No migration files found in $MIGRATIONS_DIR${NC}"
    exit 0
fi

# Count total migrations
TOTAL=$(echo "$MIGRATIONS" | wc -l | tr -d ' ')
echo -e "Found ${GREEN}$TOTAL${NC} migration file(s)\n"

# Apply each migration
SUCCESS=0
FAILED=0

while IFS= read -r migration; do
    filename=$(basename "$migration")
    echo -e "${YELLOW}Applying: $filename${NC}"
    
    # Capture output and exit code
    OUTPUT=$(docker-compose exec -T db psql -U postgres -d paceup < "$migration" 2>&1)
    EXIT_CODE=$?
    
    if [ $EXIT_CODE -eq 0 ]; then
        echo -e "${GREEN}✓ Successfully applied: $filename${NC}\n"
        ((SUCCESS++))
    else
        echo -e "${RED}✗ Failed to apply: $filename${NC}"
        echo -e "${RED}Error output:${NC}"
        echo "$OUTPUT" | grep -i error || echo "$OUTPUT"
        echo ""
        ((FAILED++))
    fi
done <<< "$MIGRATIONS"

# Summary
echo -e "\n${YELLOW}Migration Summary:${NC}"
echo -e "  ${GREEN}Successful: $SUCCESS${NC}"
if [ $FAILED -gt 0 ]; then
    echo -e "  ${RED}Failed: $FAILED${NC}"
fi

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}All migrations applied successfully!${NC}"
    exit 0
else
    echo -e "\n${RED}Some migrations failed. Please check the errors above.${NC}"
    exit 1
fi

