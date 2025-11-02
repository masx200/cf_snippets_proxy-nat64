# Build System Guide

This project uses Pnpm and Rollup for building and optimizing the Cloudflare Workers proxy scripts.

## Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [Pnpm](https://pnpm.io/)

## Installation

```bash
# Install dependencies
pnpm install
```

## Build Commands

### Development Build

```bash
# Build with source maps
pnpm run build

# Alternative alias
pnpm run build:dev
```

### Production Build

```bash
# Build with Terser compression (no source maps)
pnpm run build:prod
```

### Development Mode

```bash
# Watch mode for development
pnpm run dev
```

### Utilities

```bash
# Clean build directory
pnpm run clean

# Analyze build sizes
pnpm run analyze
```

## Build Outputs

The build process creates the following files in the `dist/` directory:

### For `snippets.js`

- `dist/snippets.js` - Development version with source maps
- `dist/snippets.min.js` - Production minified version

### For `worker.js`

- `dist/worker.js` - Development version with source maps
- `dist/worker.min.js` - Production minified version

## Size Comparison

| File          | Original | Minified | Gzipped  | Reduction |
| ------------- | -------- | -------- | -------- | --------- |
| `snippets.js` | ~19.6 KB | ~5.6 KB  | ~2.5 KB  | 71%       |
| `worker.js`   | ~64.3 KB | ~31.1 KB | ~11.3 KB | 52%       |

## Deployment to Cloudflare Workers

### Using Development Files

```bash
# Copy the development version
cat dist/snippets.js | pbcopy  # macOS
# or use dist/snippets.js directly
```

### Using Production Files (Recommended)

```bash
# Copy the production minified version
cat dist/snippets.min.js | pbcopy  # macOS
# or use dist/snippets.min.js directly
```

## Rollup Configuration

The `rollup.config.js` file includes:

- **ES Module Format**: Cloudflare Workers compatible
- **External Dependencies**: `cloudflare:sockets` is treated as external
- **Node Resolution**: Resolves import statements
- **CommonJS Support**: Handles CommonJS modules
- **Terser Compression**: Production builds with code minification
- **File Size Reporting**: Shows bundle statistics
- **Source Maps**: Development builds include source maps

## Environment Variables

The build system uses `NODE_ENV` to control build behavior:

- `NODE_ENV=production`: Enables Terser compression, disables source maps
- `NODE_ENV=development` (default): Includes source maps, no compression

## Customization

### Terser Configuration

To customize compression settings, modify the `terser()` options in `rollup.config.js`:

```javascript
terser({
  compress: {
    drop_console: false, // Keep console logs
    drop_debugger: true,
    pure_funcs: ["console.debug"],
  },
  mangle: {
    keep_classnames: true,
    keep_fnames: false,
  },
});
```

### Build Targets

To add additional build targets or modify existing ones, edit the configuration arrays in `rollup.config.js`.
