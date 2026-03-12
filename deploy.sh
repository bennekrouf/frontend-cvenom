#!/bin/bash
# =============================================================================
# cvenom — frontend-only deploy
# Triggered by GitHub Actions on push to main.
# Run as root: sudo bash /opt/cvenom/src/frontend-cvenom/deploy.sh
# =============================================================================
set -euo pipefail

APP_DIR="/opt/cvenom"
SRC_DIR="$APP_DIR/src"
DEPLOY_USER="ubuntu"
DEPLOY_KEY="/var/www/.ssh/id_ed25519"
FRONTEND_SRC="$SRC_DIR/frontend-cvenom"
FRONT_ENV="$APP_DIR/frontend.env"

RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[X]${NC} $1"; exit 1; }
step() { echo -e "\n${CYAN}=== $1 ===${NC}\n"; }

[ "$EUID" -ne 0 ] && err "Run as root: sudo bash deploy.sh"
[ -f "$FRONT_ENV" ] || err "Missing $FRONT_ENV — cannot rebuild frontend"

# =============================================================================
step "1/3 — Pull latest frontend from git"
# =============================================================================

[ -d "$FRONTEND_SRC/.git" ] || err "$FRONTEND_SRC is not a git repo"

GIT_SSH_COMMAND="ssh -i $DEPLOY_KEY -o StrictHostKeyChecking=no" \
  git -c safe.directory='*' -C "$FRONTEND_SRC" fetch origin

BRANCH=$(git -C "$FRONTEND_SRC" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
git -c safe.directory='*' -C "$FRONTEND_SRC" reset --hard "origin/$BRANCH"
log "frontend-cvenom pulled (branch: $BRANCH)"

# Restore ownership so ubuntu can install packages and build
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$FRONTEND_SRC"
log "Ownership restored to $DEPLOY_USER"

# =============================================================================
step "2/3 — Rebuild frontend"
# =============================================================================

echo "  → Running yarn install + yarn build ..."
sudo -u "$DEPLOY_USER" HOME="/home/$DEPLOY_USER" \
  bash -c "
    set -a
    source '$FRONT_ENV'
    set +a
    cd '$FRONTEND_SRC'
    yarn install --legacy-peer-deps
    yarn build
  "

# Ensure the runtime env file is symlinked for Next.js
ln -sf "$FRONT_ENV" "$FRONTEND_SRC/.env.production"
chown -h "$DEPLOY_USER:$DEPLOY_USER" "$FRONTEND_SRC/.env.production"
log "Frontend built — .env.production symlinked"

# =============================================================================
step "3/3 — Restart cvenom-frontend"
# =============================================================================

PM2=$(which pm2)
sudo -u "$DEPLOY_USER" HOME="/home/$DEPLOY_USER" $PM2 restart cvenom-frontend
sudo -u "$DEPLOY_USER" HOME="/home/$DEPLOY_USER" $PM2 save

log "cvenom-frontend restarted"
echo ""
echo -e "${GREEN}Frontend deploy complete.${NC}"
sudo -u "$DEPLOY_USER" HOME="/home/$DEPLOY_USER" $PM2 list
