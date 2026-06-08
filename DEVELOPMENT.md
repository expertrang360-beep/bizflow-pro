# BizFlow Pro - Development Guide

## Quick Start

### Prerequisites
- **Bun** 1.3.4 or higher (or Node.js 20+)
- **Docker** (optional, for containerized development)

### Installation

```bash
# Install dependencies
bun install

# Or with npm
npm install

# Update browserslist data
npm run update-browserslist
```

### Development Server

```bash
# Start development server
bun run dev

# Or with npm
npm run dev

# Server runs on http://localhost:8080
```

### Docker Development

```bash
# Start dev environment with Docker
docker-compose up dev

# Preview production build
docker-compose --profile production up prod

# Start with API service
docker-compose --profile with-api up
```

## Available Scripts

### Code Quality

```bash
# Run linter
bun run lint

# Fix linting issues automatically
bun run lint:fix

# Format code with Prettier
bun run format

# Check code format without changes
bun run format:check

# Type check with TypeScript
bun run type-check
```

### Testing

```bash
# Run tests once
bun run test

# Watch mode for development
bun run test:watch

# Open interactive UI for tests
bun run test:ui

# Generate coverage report
bun run test:coverage
```

### Building

```bash
# Build for production
bun run build

# Build for development
bun run build:dev

# Preview production build locally
bun run preview

# Build with shell script (includes all checks)
./build.sh --env production
```

## Build Script Usage

The `build.sh` script provides automated building with quality checks:

```bash
# Standard production build
./build.sh

# Build for development environment
./build.sh --env development

# Skip linting
./build.sh --skip-lint

# Skip tests
./build.sh --skip-test

# Skip type checking
./build.sh --skip-type-check

# Show help
./build.sh --help
```

## Code Style

### ESLint Configuration
- TypeScript support
- React and React Hooks rules
- Import ordering
- Accessibility checks (jsx-a11y)

### Prettier Configuration
- 100 character line width
- 2-space indentation
- Semicolons enabled
- Single quotes disabled

### Browserslist Support
Modern browser support configured:
- Last 2 versions of major browsers
- > 1% market share
- Not dead browsers
- Not IE 11

## CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/build-deploy.yml`):

1. **Lint** - ESLint and Prettier checks
2. **Type Check** - TypeScript type validation
3. **Test** - Unit tests with coverage
4. **Build** - Production build
5. **Docker** - Build and push container images (main/develop only)
6. **Deploy** - Deploy to staging/production

### Deployment
- **Develop branch** → Staging environment
- **Main branch** → Production environment

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

```env
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ENABLE_DEBUG_MODE=false
```

## Performance Optimization

### Build Optimization
- Code splitting for vendors, UI components, and forms
- Gzip compression enabled
- Terser minification with console removal in production
- Tree-shaking enabled

### Vite Configuration
- SWC for fast transpilation
- Optimized dependencies pre-bundling
- Source maps in development only

## Troubleshooting

### Browserslist Warning
If you see "browsers data is old" warning:
```bash
npm run update-browserslist
```

### Port Already in Use
Change the dev port in `vite.config.ts`:
```typescript
server: {
  port: 8081,  // Change from 8080
}
```

### Dependencies Issues
Clear cache and reinstall:
```bash
rm -rf node_modules bun.lockb
bun install --frozen-lockfile
```

### Docker Issues
Clean Docker volumes:
```bash
docker-compose down -v
docker-compose up dev
```

## Git Workflow

1. Create feature branch from `develop`
2. Make changes and commit
3. Push to remote and create Pull Request
4. CI/CD pipeline runs automatically
5. After review, merge to `develop`
6. Periodically merge `develop` to `main` for releases

## Additional Resources

- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Shadcn/ui Component Library](https://ui.shadcn.com/)
- [Bun Runtime](https://bun.sh/)

## Support

For issues or questions:
1. Check existing GitHub issues
2. Review development logs: `docker-compose logs dev`
3. Run `bun run type-check` to validate code
4. Check browser console for runtime errors
