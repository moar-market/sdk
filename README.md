# Moar Market SDK Workspace

A modern TypeScript monorepo for building the Moar Market SDK with modular 
packages, built on pnpm workspaces with cutting-edge tooling.

## 🏗️ Architecture

This project uses a modular monorepo architecture with the following key components:

```
sdk/
├── packages/
│   ├── sdk/          # Main SDK package (@moar-market/sdk)
│   └── utils/        # Utility functions (@moar-market/utils)
├── package.json      # Root workspace configuration
├── pnpm-workspace.yaml # Workspace and catalog configuration
├── eslint.config.mjs # Shared ESLint configuration
├── commitlint.config.js # Conventional commit rules
└── tsconfig.json     # Root TypeScript configuration
```

## 📦 Packages

### @moar-market/sdk
The main SDK package providing core functionality for interacting with the Moar Market on Aptos blockchain.

### @moar-market/utils
Common utility functions shared across SDK packages and available for integration.

## 🚀 Quick Start

### Prerequisites
- Node.js ≥20.10
- pnpm ≥10.12.1

### Installation & Development

1. **Clone and install dependencies:**
   ```bash
   git clone <your-repo>
   cd sdk
   pnpm install
   ```

2. **Start development mode:**
   ```bash
   # Watch mode for all packages
   pnpm dev
   
   # Watch mode for specific package
   pnpm sdk dev
   pnpm utils dev
   ```

3. **Build for production:**
   ```bash
   # Build all packages
   pnpm build
   
   # Build specific package
   pnpm sdk build
   ```

## 🛠️ Development Workflow

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
pnpm clean:full     # Clean everything including node_modules
```

**Package-Specific:**
```bash
pnpm sdk <command>    # Run command in SDK package
pnpm utils <command>  # Run command in utils package
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

## 🏷️ SDK Usage Example

[TODO]


Built with ❤️ using modern TypeScript tooling and best practices. 
