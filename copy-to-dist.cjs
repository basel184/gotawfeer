const fs = require('fs');
const path = require('path');

const sourceDir = '.output';
const targetDir = 'dist';

try {
  // Check if .output exists
  if (!fs.existsSync(sourceDir)) {
    console.error('Error: .output directory not found. Run "npm run build" first.');
    process.exit(1);
  }

  // Remove dist if it exists
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
    console.log('Removed existing dist directory');
  }

  // Copy .output to dist
  fs.cpSync(sourceDir, targetDir, { recursive: true });
  console.log('✅ Successfully copied .output to dist');
  
} catch (error) {
  console.error('Error copying files:', error.message);
  process.exit(1);
}

