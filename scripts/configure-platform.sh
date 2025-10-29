#!/bin/bash
# TurboX Platform Configuration Script
# Configures socket constants for target deployment platform

set -e

PLATFORM=${1:-}
SOCKET_FILE="turbox/net/socket.codon"
BACKUP_FILE="${SOCKET_FILE}.platform.bak"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

usage() {
    echo "Usage: $0 <platform>"
    echo ""
    echo "Platforms:"
    echo "  linux   - Configure for Linux production deployment"
    echo "  macos   - Configure for macOS development (default)"
    echo "  show    - Show current configuration"
    echo ""
    echo "Example:"
    echo "  $0 linux    # Before building for Linux"
    echo "  $0 macos    # Restore macOS defaults"
    exit 1
}

show_config() {
    echo -e "${YELLOW}Current platform configuration:${NC}"
    echo ""
    grep -E "SOL_SOCKET|SO_REUSEADDR|_IS_MACOS" "$SOCKET_FILE" | grep -v "^#"
    echo ""
    
    # Detect current platform
    if grep -q "SOL_SOCKET = 65535" "$SOCKET_FILE"; then
        echo -e "Configured for: ${GREEN}macOS (development)${NC}"
    elif grep -q "SOL_SOCKET = 1" "$SOCKET_FILE"; then
        echo -e "Configured for: ${GREEN}Linux (production)${NC}"
    else
        echo -e "${RED}Unknown configuration${NC}"
    fi
}

configure_linux() {
    echo -e "${YELLOW}Configuring for Linux production...${NC}"
    
    # Backup
    cp "$SOCKET_FILE" "$BACKUP_FILE"
    
    # Configure for Linux
    sed -i.tmp 's/SOL_SOCKET = 65535/SOL_SOCKET = 1/' "$SOCKET_FILE"
    sed -i.tmp 's/SO_REUSEADDR = 4/SO_REUSEADDR = 2/' "$SOCKET_FILE"
    sed -i.tmp 's/_IS_MACOS = True/_IS_MACOS = False/' "$SOCKET_FILE"
    
    # Update comments
    sed -i.tmp 's/# macOS: 65535 | Linux: 1$/# macOS: 65535 | Linux: 1 [LINUX]/' "$SOCKET_FILE"
    sed -i.tmp 's/# macOS: 4     | Linux: 2$/# macOS: 4     | Linux: 2 [LINUX]/' "$SOCKET_FILE"
    sed -i.tmp 's/# macOS: True  | Linux: False$/# macOS: True  | Linux: False [LINUX]/' "$SOCKET_FILE"
    
    # Clean up temp files
    rm -f "${SOCKET_FILE}.tmp"
    
    echo -e "${GREEN}✓ Configured for Linux${NC}"
    echo ""
    show_config
}

configure_macos() {
    echo -e "${YELLOW}Configuring for macOS development...${NC}"
    
    # Backup
    cp "$SOCKET_FILE" "$BACKUP_FILE"
    
    # Configure for macOS
    sed -i.tmp 's/SOL_SOCKET = 1$/SOL_SOCKET = 65535/' "$SOCKET_FILE"
    sed -i.tmp 's/SO_REUSEADDR = 2$/SO_REUSEADDR = 4/' "$SOCKET_FILE"
    sed -i.tmp 's/_IS_MACOS = False$/_IS_MACOS = True/' "$SOCKET_FILE"
    
    # Update comments  
    sed -i.tmp 's/# macOS: 65535 | Linux: 1.*$/# macOS: 65535 | Linux: 1/' "$SOCKET_FILE"
    sed -i.tmp 's/# macOS: 4     | Linux: 2.*$/# macOS: 4     | Linux: 2/' "$SOCKET_FILE"
    sed -i.tmp 's/# macOS: True  | Linux: False.*$/# macOS: True  | Linux: False/' "$SOCKET_FILE"
    
    # Clean up temp files
    rm -f "${SOCKET_FILE}.tmp"
    
    echo -e "${GREEN}✓ Configured for macOS${NC}"
    echo ""
    show_config
}

# Main
if [ -z "$PLATFORM" ]; then
    usage
fi

case "$PLATFORM" in
    linux)
        configure_linux
        ;;
    macos|darwin)
        configure_macos
        ;;
    show|status)
        show_config
        ;;
    *)
        echo -e "${RED}Error: Unknown platform '$PLATFORM'${NC}"
        echo ""
        usage
        ;;
esac

exit 0
