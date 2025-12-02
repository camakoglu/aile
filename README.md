# Çamakoğlu Sülalesi - Family Tree

Interactive family tree visualization built with D3.js and TypeScript.

## 🌐 Live Site

The family tree is deployed at: [https://camakoglu.github.io/aile/](https://camakoglu.github.io/aile/)

## 🛠️ Development

### Prerequisites

- Node.js (v18 or higher)
- npm

### Setup

```bash
npm install
```

### Running Locally

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Running Tests

```bash
npm test
```

## 📦 Deployment to GitHub Pages

### Automatic Deployment

Simply run the deployment script:

```bash
./deploy.sh
```

This will:
1. Create the `public` folder with all static assets (photos, CSS, favicon)
2. Build the production version with correct paths for GitHub Pages
3. Deploy to the `gh-pages` branch
4. Push to GitHub

### Manual Deployment

If you prefer to deploy manually:

```bash
# 1. Ensure public folder exists with assets
mkdir -p public
cp -r fotograf public/
cp -r css public/
cp favicon.ico public/

# 2. Build the project
npm run build

# 3. Deploy to gh-pages
git checkout gh-pages
find . -maxdepth 1 ! -name '.git' ! -name '.' ! -name '..' -exec rm -rf {} +
cp -r dist/* .
git add -A
git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M:%S')"
git push origin gh-pages
git checkout master
```

## 📁 Project Structure

```
soyagaci/
├── src/              # TypeScript source files
├── css/              # Stylesheets
├── fotograf/         # Family photos
├── public/           # Public assets (generated)
├── dist/             # Production build (generated)
├── index.html        # Main HTML file
├── vite.config.ts    # Vite configuration
└── deploy.sh         # Deployment script
```

## ⚙️ Configuration

The project is configured to deploy to GitHub Pages at `/aile/` base path. This is set in `vite.config.ts`:

```typescript
export default defineConfig({
  base: '/aile/',
  // ...
})
```

## 🔧 Important Notes

- The `public` folder is generated from source files and should not be committed to the master branch
- Static assets (photos, CSS, favicon) are automatically copied to `public` during deployment
- The `gh-pages` branch contains only the built files for deployment
- All paths in the production build are relative to `/aile/` for GitHub Pages compatibility

## 📝 License

ISC
