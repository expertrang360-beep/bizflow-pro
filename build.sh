#!/bin/bash

# BizFlow Pro Build Script
# Supports multiple environments and deployment targets

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
BUILD_ENV="production"
BUILD_TARGET="dist"
SKIP_LINT=false
SKIP_TEST=false
SKIP_TYPE_CHECK=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --env)
      BUILD_ENV="$2"
      shift 2
      ;;
    --skip-lint)
      SKIP_LINT=true
      shift
      ;;
    --skip-test)
      SKIP_TEST=true
      shift
      ;;
    --skip-type-check)
      SKIP_TYPE_CHECK=true
      shift
      ;;
    --help)
      echo -e "${BLUE}Usage: ./build.sh [options]${NC}"
      echo "Options:"
      echo "  --env <env>           Build environment (development|staging|production) [default: production]"
      echo "  --skip-lint           Skip linting step"
      echo "  --skip-test           Skip testing step"
      echo "  --skip-type-check     Skip TypeScript type checking"
      echo "  --help                Show this help message"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   BizFlow Pro Build Script${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo -e "Environment: ${GREEN}${BUILD_ENV}${NC}"
echo ""

# Step 1: Clean previous builds
echo -e "${YELLOW}[1/6]${NC} Cleaning previous builds..."
rm -rf dist build coverage .eslintcache
echo -e "${GREEN}✓${NC} Cleaned"

# Step 2: Install dependencies
echo -e "\n${YELLOW}[2/6]${NC} Installing dependencies..."
if command -v bun &> /dev/null; then
  bun install --frozen-lockfile
else
  npm install --ci
fi
echo -e "${GREEN}✓${NC} Dependencies installed"

# Step 3: Format check
echo -e "\n${YELLOW}[3/6]${NC} Checking code format..."
if command -v bun &> /dev/null; then
  bun run format:check || {
    echo -e "${RED}Format check failed!${NC}"
    echo "Run 'bun run format' to fix formatting"
    exit 1
  }
else
  npm run format:check || {
    echo -e "${RED}Format check failed!${NC}"
    echo "Run 'npm run format' to fix formatting"
    exit 1
  }
fi
echo -e "${GREEN}✓${NC} Format check passed"

# Step 4: Lint
if [ "$SKIP_LINT" = false ]; then
  echo -e "\n${YELLOW}[4/6]${NC} Running ESLint..."
  if command -v bun &> /dev/null; then
    bun run lint || {
      echo -e "${RED}Linting failed!${NC}"
      exit 1
    }
  else
    npm run lint || {
      echo -e "${RED}Linting failed!${NC}"
      exit 1
    }
  fi
  echo -e "${GREEN}✓${NC} Linting passed"
else
  echo -e "\n${YELLOW}[4/6]${NC} Skipping linter (--skip-lint)"
fi

# Step 5: Type check
if [ "$SKIP_TYPE_CHECK" = false ]; then
  echo -e "\n${YELLOW}[5/6]${NC} Running TypeScript type check..."
  if command -v bun &> /dev/null; then
    bun run type-check || {
      echo -e "${RED}Type check failed!${NC}"
      exit 1
    }
  else
    npm run type-check || {
      echo -e "${RED}Type check failed!${NC}"
      exit 1
    }
  fi
  echo -e "${GREEN}✓${NC} Type check passed"
else
  echo -e "\n${YELLOW}[5/6]${NC} Skipping type check (--skip-type-check)"
fi

# Step 6: Build
echo -e "\n${YELLOW}[6/6]${NC} Building for ${BUILD_ENV}..."
if [ "$BUILD_ENV" = "development" ]; then
  if command -v bun &> /dev/null; then
    bun run build:dev
  else
    npm run build:dev
  fi
else
  if command -v bun &> /dev/null; then
    bun run build
  else
    npm run build
  fi
fi
echo -e "${GREEN}✓${NC} Build completed"

# Print build info
echo -e "\n${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║      Build Completed Successfully!     ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo -e "Output directory: ${BUILD_TARGET}/"
echo -e "Build size: $(du -sh ${BUILD_TARGET} 2>/dev/null | cut -f1 || echo 'unknown')"

# Generate build info file
mkdir -p ${BUILD_TARGET}
cat > ${BUILD_TARGET}/BUILD_INFO.json <<EOF
{
  "buildTime": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "environment": "${BUILD_ENV}",
  "nodeVersion": "$(node --version)",
  "bunVersion": "$(bun --version 2>/dev/null || echo 'not installed')",
  "gitCommit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "gitBranch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')"
}
EOF

echo -e "${GREEN}✓${NC} Build info saved to ${BUILD_TARGET}/BUILD_INFO.json"
echo ""
