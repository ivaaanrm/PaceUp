#!/bin/bash

# SSL Certificate Setup Script
# This script helps set up SSL certificates for paceup.site
# Usage: ./scripts/setup-ssl.sh

set -e

DOMAIN="paceup.site"
EMAIL="${CERTBOT_EMAIL:-your-email@example.com}"

echo "=========================================="
echo "SSL Certificate Setup for $DOMAIN"
echo "=========================================="
echo ""

# Check if docker-compose is running
if ! docker-compose ps | grep -q "paceup_nginx"; then
    echo "Error: nginx container is not running."
    echo "Please start the services first: docker-compose up -d"
    exit 1
fi

# Check if nginx is using initial config
if docker exec paceup_nginx cat /etc/nginx/conf.d/default.conf | grep -q "nginx.initial.conf"; then
    echo "✓ Using initial nginx configuration"
else
    echo "Warning: nginx might not be using initial configuration"
    echo "Make sure docker-compose.yaml uses nginx.initial.conf"
fi

echo ""
echo "Step 1: Obtaining SSL certificates..."
echo "This will use Let's Encrypt to generate certificates for $DOMAIN"

read -p "Enter your email for Let's Encrypt notifications: " email
if [ -z "$email" ]; then
    email="$EMAIL"
fi

echo ""
echo "Requesting certificates for $DOMAIN and www.$DOMAIN..."
docker-compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$email" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN" \
    -d "www.$DOMAIN"

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ SSL certificates obtained successfully!"
    echo ""
    echo "Step 2: Switching to production nginx configuration..."
    
    # Update docker-compose.yaml to use production nginx config
    if grep -q "nginx.initial.conf" docker-compose.yaml; then
        sed -i.bak 's|nginx.initial.conf|nginx.conf|g' docker-compose.yaml
        echo "✓ Updated docker-compose.yaml to use production nginx config"
    fi
    
    echo ""
    echo "Step 3: Restarting nginx with HTTPS configuration..."
    docker-compose restart nginx
    
    echo ""
    echo "=========================================="
    echo "SSL Setup Complete!"
    echo "=========================================="
    echo ""
    echo "Your site is now available at:"
    echo "  - https://$DOMAIN"
    echo "  - https://www.$DOMAIN"
    echo ""
    echo "HTTP traffic will automatically redirect to HTTPS"
    echo ""
    echo "Certificates will be automatically renewed by the certbot service"
    echo "running in docker-compose."
    echo ""
else
    echo ""
    echo "✗ Failed to obtain SSL certificates"
    echo "Please check:"
    echo "  1. DNS is pointing to your server"
    echo "  2. Port 80 is accessible from the internet"
    echo "  3. nginx is using nginx.initial.conf"
    exit 1
fi

