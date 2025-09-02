#!/bin/bash

echo "Cleaning build directory..."
rm -rf dist/
rm -rf node_modules/.vite/

echo "Installing dependencies..."
npm install

echo "Building with new configuration..."
npm run build

echo "Build complete! Check the dist/ directory for the new build files."