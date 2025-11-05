#!/bin/bash
set -e

domains=(api.paceup.site)
email=""
staging=0
data_path="./data/certbot"

# Check if nginx.conf contains initial config (HTTP only)
if ! grep -q "Initial nginx configuration" ./nginx/nginx.conf; then
  echo "Warning: nginx.conf should contain initial (HTTP-only) configuration for SSL setup"
  echo "Please ensure nginx.conf is the initial config before running this script"
  echo "If needed: cp nginx/nginx.initial.conf nginx/nginx.conf"
  exit 1
fi

if [ -d "$data_path" ]; then
  read -p "Existing data found for $domains. Continue and replace existing certificate? (y/N) " decision
  if [ "$decision" != "Y" ] && [ "$decision" != "y" ]; then
    exit
  fi
fi

# Ensure nginx is running with initial config (HTTP only)
echo "### Ensuring nginx is running with initial configuration ..."
docker compose up -d nginx
echo

echo "### Requesting Let's Encrypt certificate for $domains ..."
domain_args=""
for domain in "${domains[@]}"; do
  domain_args="$domain_args -d $domain"
done

case "$email" in
  "") email_arg="--register-unsafely-without-email" ;;
  *) email_arg="--email $email" ;;
esac

if [ $staging != "0" ]; then staging_arg="--staging"; fi

docker compose run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $staging_arg \
    $email_arg \
    $domain_args \
    --rsa-key-size 4096 \
    --agree-tos \
    --force-renewal" certbot
echo

echo ""
echo "=========================================="
echo "SSL Certificates Obtained Successfully!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Replace nginx.conf with production configuration:"
echo "   cp nginx/nginx.production.conf nginx/nginx.conf"
echo ""
echo "2. Restart nginx to apply HTTPS configuration:"
echo "   docker-compose restart nginx"
echo ""
echo "After completing these steps, your API will be available at:"
echo "  https://api.paceup.site"
echo ""