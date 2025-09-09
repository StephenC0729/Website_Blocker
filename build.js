const fs = require('fs');
const path = require('path');
require('dotenv').config();

function replaceEnvVariables(content) {
  // Replace environment variables in JavaScript files
  content = content.replace(/process\.env\.FIREBASE_API_KEY/g, `"${process.env.FIREBASE_API_KEY}"`);
  content = content.replace(/process\.env\.FIREBASE_AUTH_DOMAIN/g, `"${process.env.FIREBASE_AUTH_DOMAIN}"`);
  content = content.replace(/process\.env\.FIREBASE_PROJECT_ID/g, `"${process.env.FIREBASE_PROJECT_ID}"`);
  content = content.replace(/process\.env\.FIREBASE_STORAGE_BUCKET/g, `"${process.env.FIREBASE_STORAGE_BUCKET}"`);
  content = content.replace(/process\.env\.FIREBASE_MESSAGING_SENDER_ID/g, `"${process.env.FIREBASE_MESSAGING_SENDER_ID}"`);
  content = content.replace(/process\.env\.FIREBASE_APP_ID/g, `"${process.env.FIREBASE_APP_ID}"`);
  content = content.replace(/process\.env\.FIREBASE_MEASUREMENT_ID/g, `"${process.env.FIREBASE_MEASUREMENT_ID}"`);
  content = content.replace(/process\.env\.EMAILJS_SERVICE_ID/g, `"${process.env.EMAILJS_SERVICE_ID}"`);
  content = content.replace(/process\.env\.EMAILJS_TEMPLATE_ID/g, `"${process.env.EMAILJS_TEMPLATE_ID}"`);
  content = content.replace(/process\.env\.EMAILJS_PUBLIC_KEY/g, `"${process.env.EMAILJS_PUBLIC_KEY}"`);
  
  // Replace placeholders in manifest.json
  content = content.replace(/OAUTH2_CLIENT_ID/g, process.env.OAUTH2_CLIENT_ID);
  
  return content;
}

// Determine if a file should be treated as text for env var replacement.
function isTextFile(filePath) {
  const textExtensions = new Set([
    '.js', '.mjs', '.cjs', '.json', '.html', '.css', '.txt', '.md', '.svg'
  ]);
  return textExtensions.has(path.extname(filePath).toLowerCase());
}

function processFile(filePath, outputPath = null) {
  if (!isTextFile(filePath)) {
    // Binary file – copy verbatim.
    fs.copyFileSync(filePath, outputPath || filePath);
    return;
  }

    const content = fs.readFileSync(filePath, 'utf8');
    const processedContent = replaceEnvVariables(content);
    const outputFile = outputPath || filePath;
    fs.writeFileSync(outputFile, processedContent);
    console.log(`Processed (text): ${filePath}`);
}

function copyAndProcessDir(srcDir, destDir) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  for (const entry of fs.readdirSync(srcDir)) {
    const srcPath = path.join(srcDir, entry);
    const destPath = path.join(destDir, entry);
    const stats = fs.statSync(srcPath);

    if (stats.isDirectory()) {
      copyAndProcessDir(srcPath, destPath);
      continue;
    }

    if (isTextFile(srcPath)) {
      const content = fs.readFileSync(srcPath, 'utf8');
      const processedContent = replaceEnvVariables(content);
      fs.writeFileSync(destPath, processedContent);
      continue;
    }

    // Binary asset – copy without modification.
    fs.copyFileSync(srcPath, destPath);
  }
}

// Build the extension
console.log('Building extension with environment variables...');

// Create build directory
const buildDir = 'build';
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir);
}

// Copy and process all source files
copyAndProcessDir('src', path.join(buildDir, 'src'));

// Process manifest.json
processFile('manifest.json', path.join(buildDir, 'manifest.json'));

console.log('Build completed! Extension is ready in the build/ directory');
console.log('⚠️  Remember to add .env to .gitignore to keep your secrets safe!');