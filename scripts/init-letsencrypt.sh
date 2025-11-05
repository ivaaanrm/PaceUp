#!/bin/bash
set -e

domains=(api.paceup.site)
email=""
staging=0
data_path="./data/certbot"

# Check if docker-compose.yaml uses initial nginx config
if ! grep -q "nginx.initial.conf" docker-compose.yaml; then
  echo "Warning: docker-compose.yaml should use nginx.initial.conf for initial setup"
  echo "Updating docker-compose.yaml to use nginx.initial.conf..."
  sed -i.bak 's|nginx.conf|nginx.initial.conf|g' docker-compose.yaml
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

echo "### Switching to production nginx configuration ..."
# Update docker-compose.yaml to use production nginx config
if grep -q "nginx.initial.conf" docker-compose.yaml; then
  sed -i.bak 's|nginx.initial.conf|nginx.conf|g' docker-compose.yaml
  echo "✓ Updated docker-compose.yaml to use production nginx config"
fi

echo "### Reloading nginx ..."
docker compose restart nginx

echo "### PaceUp API is now running with HTTPS! ###"
echo "Your API is available at: https://api.paceup.site"