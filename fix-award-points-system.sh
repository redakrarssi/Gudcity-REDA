#!/bin/bash

echo "==================================="
echo "Award Points System Fix Script"
echo "==================================="
echo

echo "Installing required dependencies..."
npm install --no-save open

echo
echo "Running fix script..."
node fix-award-points-system.js

echo
echo "If the script didn't open a browser automatically, please open:"
echo "http://localhost:3000/verify-award-points.html"
echo
echo "Press Ctrl+C when you're done testing to continue with the update process."
echo 