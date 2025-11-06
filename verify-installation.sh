#!/bin/bash

# Installation Verification Script
# Checks if all components are properly installed and configured

echo "🔍 Vehicle Management System - Installation Verification"
echo "========================================================"
echo ""

ERRORS=0
WARNINGS=0

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check Node.js
echo -n "Checking Node.js... "
if command -v node &> /dev/null; then
    VERSION=$(node -v)
    echo -e "${GREEN}✓${NC} $VERSION"
else
    echo -e "${RED}✗ Not found${NC}"
    ((ERRORS++))
fi

# Check npm
echo -n "Checking npm... "
if command -v npm &> /dev/null; then
    VERSION=$(npm -v)
    echo -e "${GREEN}✓${NC} v$VERSION"
else
    echo -e "${RED}✗ Not found${NC}"
    ((ERRORS++))
fi

# Check Docker
echo -n "Checking Docker... "
if command -v docker &> /dev/null; then
    VERSION=$(docker -v | cut -d' ' -f3 | cut -d',' -f1)
    echo -e "${GREEN}✓${NC} $VERSION"
else
    echo -e "${RED}✗ Not found${NC}"
    ((ERRORS++))
fi

# Check Docker Compose
echo -n "Checking Docker Compose... "
if command -v docker-compose &> /dev/null; then
    VERSION=$(docker-compose -v | cut -d' ' -f3 | cut -d',' -f1)
    echo -e "${GREEN}✓${NC} $VERSION"
else
    echo -e "${RED}✗ Not found${NC}"
    ((ERRORS++))
fi

echo ""
echo "Checking Project Files..."
echo "-------------------------"

# Check critical files
FILES=(
    "package.json"
    "tsconfig.json"
    "nest-cli.json"
    "docker-compose.yml"
    ".env"
    "src/main.ts"
    "src/app.module.ts"
)

for file in "${FILES[@]}"; do
    echo -n "Checking $file... "
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗ Missing${NC}"
        ((ERRORS++))
    fi
done

echo ""
echo "Checking Dependencies..."
echo "------------------------"

if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} node_modules exists"
    
    # Check key dependencies
    DEPS=("@nestjs/core" "@nestjs/common" "typeorm" "mqtt")
    for dep in "${DEPS[@]}"; do
        if [ -d "node_modules/$dep" ]; then
            echo -e "${GREEN}✓${NC} $dep installed"
        else
            echo -e "${YELLOW}⚠${NC} $dep not found"
            ((WARNINGS++))
        fi
    done
else
    echo -e "${YELLOW}⚠${NC} node_modules not found. Run: npm install"
    ((WARNINGS++))
fi

echo ""
echo "Checking Docker Containers..."
echo "------------------------------"

if command -v docker &> /dev/null; then
    # Check if containers are running
    CONTAINERS=("vehicle-postgres" "vehicle-timescaledb" "vehicle-emqx")
    
    for container in "${CONTAINERS[@]}"; do
        echo -n "Checking $container... "
        if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
            echo -e "${GREEN}✓ Running${NC}"
        else
            if docker ps -a --format '{{.Names}}' | grep -q "^${container}$"; then
                echo -e "${YELLOW}⚠ Exists but not running${NC}"
                ((WARNINGS++))
            else
                echo -e "${YELLOW}⚠ Not created${NC}"
                ((WARNINGS++))
            fi
        fi
    done
fi

echo ""
echo "Checking Environment Configuration..."
echo "--------------------------------------"

if [ -f ".env" ]; then
    echo -e "${GREEN}✓${NC} .env file exists"
    
    # Check for required variables
    VARS=("DB_HOST" "MQTT_BROKER_URL" "JWT_SECRET" "VEHICLE_JWT_SECRET")
    for var in "${VARS[@]}"; do
        if grep -q "^${var}=" .env; then
            echo -e "${GREEN}✓${NC} $var configured"
        else
            echo -e "${YELLOW}⚠${NC} $var not found in .env"
            ((WARNINGS++))
        fi
    done
else
    echo -e "${YELLOW}⚠${NC} .env file not found. Copy from .env.example"
    ((WARNINGS++))
fi

echo ""
echo "Checking Documentation..."
echo "-------------------------"

DOCS=(
    "README.md"
    "API_EXAMPLES.md"
    "ARCHITECTURE.md"
    "PROJECT_SUMMARY.md"
    "IMPLEMENTATION_NOTES.md"
    "FINAL_CHECKLIST.md"
)

for doc in "${DOCS[@]}"; do
    echo -n "Checking $doc... "
    if [ -f "$doc" ]; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${YELLOW}⚠${NC} Missing"
        ((WARNINGS++))
    fi
done

echo ""
echo "========================================================"
echo "Verification Summary"
echo "========================================================"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "Your system is ready. You can start the application with:"
    echo "  ./quick-start.sh"
    echo "  OR"
    echo "  docker-compose up -d && npm run start:dev"
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ Passed with $WARNINGS warning(s)${NC}"
    echo ""
    echo "Some optional components are missing, but you can proceed."
    echo "Review the warnings above for details."
else
    echo -e "${RED}✗ Failed with $ERRORS error(s) and $WARNINGS warning(s)${NC}"
    echo ""
    echo "Please fix the errors above before proceeding."
fi

echo ""
exit $ERRORS
