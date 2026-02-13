#!/usr/bin/env bash
set -e

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BOLD='\033[1m'

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}    CODEBLACK - Competitive Coding Arena${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}Stopping CODEBLACK services...${NC}"
    
    # Kill background processes
    if [ ! -z "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
        kill "$SERVER_PID" 2>/dev/null
        echo "  Backend server stopped"
    fi
    if [ ! -z "$CLIENT_PID" ] && kill -0 "$CLIENT_PID" 2>/dev/null; then
        kill "$CLIENT_PID" 2>/dev/null
        echo "  Frontend client stopped"
    fi
    
    # Kill any child processes
    jobs -p | xargs -r kill 2>/dev/null
    
    echo -e "${GREEN}All services stopped.${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# ─── Check Prerequisites ─────────────────────────────────
echo -e "${CYAN}[*] Checking prerequisites...${NC}"
echo ""

# Check Node.js
if ! command -v node &>/dev/null; then
    echo -e "${RED}[X] Node.js not found! Install from https://nodejs.org${NC}"
    exit 1
fi
echo -e "    Node.js: $(node --version)"

# Check npm
if ! command -v npm &>/dev/null; then
    echo -e "${RED}[X] npm not found!${NC}"
    exit 1
fi
echo -e "    npm:     $(npm --version)"

# Check Python
PYTHON_CMD=""
if command -v python3 &>/dev/null; then
    PYTHON_CMD="python3"
elif command -v python &>/dev/null; then
    PYTHON_CMD="python"
fi

if [ -n "$PYTHON_CMD" ]; then
    echo -e "    Python:  $($PYTHON_CMD --version 2>&1)"
else
    echo -e "${YELLOW}[!] Python not found - AI service will not start${NC}"
fi

echo ""

# ─── Install Dependencies ─────────────────────────────────
echo -e "${CYAN}[*] Installing server dependencies...${NC}"
cd code_black/server
npm install --silent 2>/dev/null
echo "    Server dependencies OK"
cd ../..

echo -e "${CYAN}[*] Installing client dependencies...${NC}"
cd code_black/client
npm install --silent 2>/dev/null
echo "    Client dependencies OK"
cd ../..

if [ -n "$PYTHON_CMD" ]; then
    echo -e "${CYAN}[*] Installing AI service dependencies...${NC}"
    cd code_black/ai-service
    $PYTHON_CMD -m pip install -r requirements.txt --quiet 2>/dev/null || true
    echo "    AI dependencies OK"
    cd ../..
fi

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}   Starting CODEBLACK services...${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""

# ─── Start Backend Server (includes AI service auto-start) ──
echo -e "${CYAN}[*] Starting backend server (port 5000)...${NC}"
echo "    AI service will auto-start on port 8000"
cd code_black/server
node server.js &
SERVER_PID=$!
cd ../..

# Wait for server to initialize
echo -e "${CYAN}[*] Waiting for server to initialize...${NC}"
sleep 4

# Check if server is running
if kill -0 "$SERVER_PID" 2>/dev/null; then
    echo -e "    ${GREEN}Backend server running (PID: $SERVER_PID)${NC}"
else
    echo -e "    ${RED}Backend server failed to start!${NC}"
    exit 1
fi

# ─── Start Frontend Client ─────────────────────────────────
echo -e "${CYAN}[*] Starting frontend client (port 3000)...${NC}"
cd code_black/client
BROWSER=none npx react-scripts start &
CLIENT_PID=$!
cd ../..

# Wait for client to compile
echo -e "${CYAN}[*] Waiting for client to compile...${NC}"
sleep 10

# ─── Get Network Info ───────────────────────────────────────
# Get LAN IP
LAN_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || ifconfig 2>/dev/null | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}   ${BOLD}CODEBLACK is RUNNING!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "  Services:"
echo -e "    Backend:    ${CYAN}http://localhost:5000${NC}"
echo -e "    Frontend:   ${CYAN}http://localhost:3000${NC}"
echo -e "    AI Service: ${CYAN}http://localhost:8000${NC}"
echo ""
if [ -n "$LAN_IP" ]; then
    echo -e "  LAN Access:"
    echo -e "    Frontend:   ${CYAN}http://${LAN_IP}:3000${NC}"
    echo -e "    Backend:    ${CYAN}http://${LAN_IP}:5000${NC}"
    echo ""
fi
echo -e "  Credentials:"
echo -e "    Competitors: ${YELLOW}user1${NC} to ${YELLOW}user30${NC} / ${YELLOW}pass123${NC}"
echo -e "    Admin:       ${YELLOW}admin${NC} / ${YELLOW}admin123${NC}"
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "  Press ${BOLD}Ctrl+C${NC} to stop all services"
echo -e "${GREEN}============================================${NC}"
echo ""

# Wait for background processes
wait
