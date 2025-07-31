# GitHub Pages Deployment Guide

This guide explains how to deploy your azKPI application to GitHub Pages for free hosting and easy sharing.

## Overview

The GitHub Pages deployment workflow automatically builds and deploys your azKPI application whenever you push changes to the main branch. The application will be accessible at `https://yourusername.github.io/azkpi/`.

## Setup Instructions

### 1. Enable GitHub Pages

1. Go to your GitHub repository
2. Navigate to **Settings** → **Pages**
3. Under **Source**, select **GitHub Actions**
4. The workflow will automatically deploy when configured

### 2. Workflow Configuration

The workflow (`.github/workflows/deploy-github-pages.yml`) is already configured and will:

- **Trigger automatically** on pushes to `main` branch when source files change
- **Support manual deployment** via the Actions tab
- **Build the application** using pnpm and Vite
- **Configure proper base path** for GitHub Pages
- **Deploy to GitHub Pages** environment

### 3. Repository Settings

No additional secrets or variables are required for GitHub Pages deployment. The workflow uses the built-in `GITHUB_TOKEN` for authentication.

## Usage

### Automatic Deployment

The workflow automatically triggers when you push changes to the `main` branch that affect:
- Source code (`src/**`)
- Package configuration (`package.json`, `pnpm-lock.yaml`)
- Build configuration (`vite.config.mts`, `tsconfig.json`)
- Entry point (`index.html`)

### Manual Deployment

1. Go to your GitHub repository
2. Navigate to **Actions** tab
3. Select **"Deploy azKPI to GitHub Pages"** workflow
4. Click **"Run workflow"**
5. Click **"Run workflow"** (confirm)

## Monitoring Deployments

1. Go to the **Actions** tab in your GitHub repository
2. Click on the latest workflow run to see detailed logs
3. Monitor the build and deployment progress
4. Once complete, the site will be available at your GitHub Pages URL

## Build Configuration

### Base Path Configuration

The workflow automatically configures the correct base path for GitHub Pages:

```bash
# The base path is set to your repository name
VITE_BASE_PATH: ${{ github.event.repository.name }}
```

This ensures that all assets and routes work correctly when deployed to GitHub Pages.

### Vite Configuration

The `vite.config.mts` file has been updated to support GitHub Pages deployment:

```typescript
export default defineConfig({
  plugins: [react()],
  // Set base path for GitHub Pages deployment
  base: process.env.VITE_BASE_PATH ? `/${process.env.VITE_BASE_PATH}/` : "/",
  // ... rest of configuration
});
```

## Accessing Your Deployed Application

Once deployed, your application will be available at:
```
https://[your-username].github.io/[repository-name]/
```

For example:
- Username: `myusername`
- Repository: `azkpi`
- URL: `https://myusername.github.io/azkpi/`

## Limitations and Considerations

### GitHub Pages Limitations

1. **Static Site Only**: GitHub Pages only serves static files, so all API calls must be to external services
2. **HTTPS Only**: GitHub Pages enforces HTTPS, which is good for security
3. **Custom Domain**: You can configure a custom domain in repository settings if needed

### Wallet and API Considerations

1. **Sui Network**: The application will connect to Sui testnet/mainnet as configured
2. **Walrus Services**: Ensure Walrus aggregators/publishers are accessible from GitHub Pages
3. **CORS**: Some services may require CORS configuration for GitHub Pages domain

### Performance Considerations

1. **CDN**: GitHub Pages uses a global CDN for fast loading
2. **Caching**: Static assets are cached automatically
3. **Build Size**: Keep bundle size optimized for better loading times

## Troubleshooting

### Common Issues

1. **404 on Refresh**: Single-page applications may need additional configuration
2. **Asset Loading**: Ensure all assets use relative paths or correct base path
3. **API Connectivity**: Verify external services are accessible from GitHub Pages

### Checking Deployment Status

1. Go to **Settings** → **Pages** to see deployment status
2. Check **Actions** tab for workflow execution logs
3. Use browser developer tools to debug loading issues

### Local Testing

Test your build locally before deploying:

```bash
# Build the application
pnpm build

# Preview the built application (tests the production build)
pnpm preview
```

## Customization

### Custom Domain

To use a custom domain:

1. Go to **Settings** → **Pages**
2. Enter your custom domain in the **Custom domain** field
3. Add a `CNAME` file to your repository root with your domain name

### Build Optimization

You can optimize the build by:

1. **Analyzing bundle size**: Use `pnpm build --analyze`
2. **Lazy loading**: Implement code splitting for larger components
3. **Asset optimization**: Compress images and optimize assets

### Deployment Frequency

The workflow is configured to deploy on every push to main. You can modify this by:

1. **Changing branch**: Update the `branches` field in the workflow
2. **Adding conditions**: Use `if` statements to conditionally deploy
3. **Scheduled deployments**: Add cron triggers for regular deployments

## Security

### Safe for Public Deployment

- **No server-side code**: Everything runs in the browser
- **No secrets exposed**: GitHub Pages only serves static files
- **Wallet security**: Private keys remain in user's wallet, never exposed

### HTTPS by Default

GitHub Pages enforces HTTPS, providing:
- **Encrypted connections**: All traffic is encrypted
- **Wallet compatibility**: Modern wallets require HTTPS
- **SEO benefits**: Search engines prefer HTTPS sites

## Support

For issues related to:
- **GitHub Pages**: Check [GitHub Pages documentation](https://docs.github.com/en/pages)
- **GitHub Actions**: Check [GitHub Actions documentation](https://docs.github.com/en/actions)
- **Vite Build Issues**: Check [Vite documentation](https://vitejs.dev/guide/build.html)
