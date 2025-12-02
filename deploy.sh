#!/bin/bash
set -e

echo "🚀 Deploying to GitHub Pages..."

# Ensure we're on master branch
git checkout master

# Ensure public folder exists with latest assets
echo "📁 Preparing public assets..."
mkdir -p public
cp -r fotograf public/ 2>/dev/null || true
cp -r css public/ 2>/dev/null || true
cp favicon.ico public/ 2>/dev/null || true

# Build the project
echo "🔨 Building project..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
  echo "❌ Build failed - dist folder not found"
  exit 1
fi

# Switch to gh-pages branch
echo "📤 Deploying to gh-pages branch..."
git checkout gh-pages

# Remove old files but keep .git
find . -maxdepth 1 ! -name '.git' ! -name '.' ! -name '..' -exec rm -rf {} +

# Copy new build files
cp -r dist/* .

# Add all files
git add -A

# Commit
git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M:%S')" || echo "No changes to commit"

# Push to GitHub
echo "⬆️  Pushing to GitHub..."
git push origin gh-pages

# Switch back to master
git checkout master

echo "✅ Deployment complete!"
echo "🌐 Your site will be available at: https://camakoglu.github.io/aile/"
