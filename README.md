# Moar Market SDK Workspace

A modern TypeScript monorepo for building the Moar Market SDK with modular 
packages, built on pnpm workspaces with cutting-edge tooling.


### Code Quality & Standards
This project enforces high code quality standards through:

- **ESLint + OxLint**: Dual-layer linting with Antfu's config + fast Rust-based OxLint
- **TypeScript Strict Mode**: Full type safety enforcement
- **Conventional Commits**: Commitlint ensures consistent commit messages
- **Pre-commit Hooks**: Husky + lint-staged for automated quality checks

### Available Scripts

**Root Workspace:**
```bash
pnpm build          # Build all packages
pnpm dev            # Development mode for all packages
pnpm lint           # Lint all packages in parallel
pnpm lint:fix       # Auto-fix linting issues
pnpm clean          # Clean build artifacts
pnpm clean:full     # Clean everything including node_modules & lockfiles
```

**Package-Specific:**
```bash
pnpm sdk <command>    # Run command in SDK package
```

**Individual Package Scripts:**
- `build` - Production build with TSDown
- `dev` - Watch mode development
- `typecheck` - TypeScript type checking
- `lint` - OxLint + ESLint validation
- `lint:fix` - Auto-fix linting issues

## 🔧 Configuration Systems

### PNPM Catalog System
Dependencies are managed through PNPM's catalog feature for consistent versioning:

- **blockchain**: Aptos ecosystem packages (@aptos-labs/ts-sdk, @thalalabs/surf)
- **dev**: Development tools (TypeScript, TSDown, build tools)
- **lint**: Code quality tools (ESLint, OxLint, Commitlint)
- **types**: TypeScript type definitions
- **utils**: Utility libraries

### Build Configuration
- **TSDown**: Modern TypeScript bundler with ESM Only output
- **Source Maps**: Enabled for debugging
- **External Dependencies**: Blockchain SDKs marked as externals
- **Multiple Entry Points**: Support for main exports and ABI exports

## 🏷️ SDK Usage Examples

See [examples](https://github.com/moar-market/sdk/blob/main/examples/README.md) for more detailed examples.


Built with ❤️ using modern TypeScript tooling and best practices. 
