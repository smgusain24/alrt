#!/bin/bash
set -e

echo "=== alrt setup ==="
echo ""

if [ -f .env ]; then
  echo ".env already exists. Remove it first to regenerate."
  exit 0
fi

cp .env.example .env

# Generate random API secret
API_SECRET=$(openssl rand -hex 32)
sed -i.bak "s|API_SECRET_KEY=CHANGE_ME|API_SECRET_KEY=${API_SECRET}|" .env

# Generate Fernet encryption key
if command -v python3 &> /dev/null; then
  FERNET_KEY=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())" 2>/dev/null || echo "")
  if [ -z "$FERNET_KEY" ]; then
    FERNET_KEY=$(python3 -c "import base64, os; print(base64.urlsafe_b64encode(os.urandom(32)).decode())")
  fi
elif command -v python &> /dev/null; then
  FERNET_KEY=$(python -c "import base64, os; print(base64.urlsafe_b64encode(os.urandom(32)).decode())")
else
  FERNET_KEY=$(openssl rand -base64 32 | tr '+/' '-_')
fi
sed -i.bak "s|ENCRYPTION_KEY=CHANGE_ME|ENCRYPTION_KEY=${FERNET_KEY}|" .env

# Clean up backup files from sed -i
rm -f .env.bak

echo "Generated .env with random secrets."
echo ""
echo "Next steps:"
echo "  docker compose up"
echo ""
echo "Dashboard: http://localhost:3000"
echo "API:       http://localhost:8000"
