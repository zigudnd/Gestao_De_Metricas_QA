#!/bin/bash
# ── Cria o usuário admin padrão via GoTrue Admin API ─────────────────────────
# Execute UMA VEZ após `supabase start` e `supabase db push --local`.
#
# Credenciais padrão:
#   E-mail : admin@tostatos.com
#   Senha  : Admin@123
#
# EM PRODUÇÃO: troque a senha imediatamente após o primeiro login.

set -e

SUPABASE_URL="${VITE_SUPABASE_URL:-http://127.0.0.1:54321}"
JWT_SECRET="super-secret-jwt-token-with-at-least-32-characters-long"

# Gera service_role JWT
SERVICE_KEY=$(node -e "
const { createHmac } = require('crypto');
const header  = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
const payload = Buffer.from(JSON.stringify({role:'service_role',iss:'supabase',iat:1,exp:9999999999})).toString('base64url');
const sig     = createHmac('sha256','$JWT_SECRET').update(header+'.'+payload).digest('base64url');
console.log(header+'.'+payload+'.'+sig);
")

echo "→ Criando usuário admin..."

RESULT=$(curl -s -X POST "$SUPABASE_URL/auth/v1/admin/users" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -d '{
    "email": "admin@tostatos.com",
    "password": "Admin@123",
    "email_confirm": true,
    "user_metadata": {"display_name": "Admin"}
  }')

EMAIL=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('email', d.get('msg','erro')))" 2>/dev/null)

if [ "$EMAIL" = "admin@tostatos.com" ]; then
  echo "✓ Usuário criado: admin@tostatos.com"
elif echo "$RESULT" | grep -q "already"; then
  echo "→ Usuário já existe, atualizando role..."
else
  echo "Erro: $RESULT"
  exit 1
fi

# Garante global_role = admin
docker exec -i supabase_db_$(basename "$PWD") psql -U postgres -c \
  "UPDATE public.profiles SET global_role = 'admin' WHERE email = 'admin@tostatos.com';" 2>/dev/null || \
  echo "  (atualize global_role manualmente se necessário)"

echo ""
echo "─────────────────────────────────────────────"
echo "  Admin criado com sucesso!"
echo "  E-mail : admin@tostatos.com"
echo "  Senha  : Admin@123"
echo "  ⚠️  Troque a senha após o primeiro login."
echo "─────────────────────────────────────────────"
