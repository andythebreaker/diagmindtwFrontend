const fs = require('fs');
const path = require('path');
const child_process = require('child_process');
const fse = require('fs-extra'); // fs-extra makes recursive copy easier
const { processHtml } = require('./processHtml');

/**
 * 讀取文本文件的同步函數
 * @param {string} fileName - 文件名
 * @returns {string} - 文件內容或錯誤信息
 */



const dataPath = path.join(__dirname, 'b0729m1');
if (!fs.existsSync(dataPath)) {
  console.error('a0725v1 directory not found');
  process.exit(1);
}

// Read sections from a0725v1 directory structure
function readSectionsFromDirectory(baseDir) {
  const sections = [];
  
  function traverseDirectory(currentDir, relativePath = '') {
    const items = fs.readdirSync(currentDir, { withFileTypes: true });
    
    // First, collect all HTML files in current directory
    const htmlFiles = items
      .filter(item => item.isFile() && item.name.endsWith('.html') && !item.name.endsWith('.mht'))
      .map(item => item.name);
    
    if (htmlFiles.length > 0) {
      const sectionPages = [];
      
      htmlFiles.forEach(fileName => {
        const filePath = path.join(currentDir, fileName);
        try {
          const pageBody = fs.readFileSync(filePath, 'utf8');
          const pageTitle = fileName.replace('.html', '');
          
          sectionPages.push({
            pageInfo: {
              title: pageTitle
            },
            pageBody: pageBody
          });
        } catch (err) {
          console.warn(`Failed to read file ${filePath}:`, err.message);
        }
      });
      
      if (sectionPages.length > 0) {
        const sectionName = relativePath || path.basename(currentDir);
        sections.push({
          sectionInfo: {
            displayName: sectionName
          },
          sectionPages: sectionPages
        });
      }
    }
    
    // Then, recursively traverse subdirectories
    const subDirs = items.filter(item => item.isDirectory());
    subDirs.forEach(subDir => {
      const subDirPath = path.join(currentDir, subDir.name);
      const newRelativePath = relativePath ? `${relativePath}/${subDir.name}` : subDir.name;
      traverseDirectory(subDirPath, newRelativePath);
    });
  }
  
  traverseDirectory(baseDir);
  return sections;
}

const sections = readSectionsFromDirectory(dataPath);
const jekyllSrc = path.join(__dirname, 'jekyll');
const pagesDir = path.join(jekyllSrc, 'pages');
const dataDir = path.join(jekyllSrc, '_data');

fs.rmSync(jekyllSrc, { recursive: true, force: true });
fs.mkdirSync(pagesDir, { recursive: true });
fs.mkdirSync(dataDir, { recursive: true });

// Copy image files from a0725v1 directories to dist/pages, preserving structure
function copyImageFiles(sourceDir, destDir) {
  function copyImagesRecursively(currentSourceDir, currentDestDir) {

console.log(`Copying images from ${currentSourceDir} to ${currentDestDir}`);

    const items = fs.readdirSync(currentSourceDir, { withFileTypes: true });
    
    items.forEach(item => {
      const sourcePath = path.join(currentSourceDir, item.name);
      const destPath = path.join(currentDestDir, item.name);
      
      if (item.isDirectory()) {
        // Recursively copy subdirectories
        copyImagesRecursively(sourcePath, destPath);
      } else if (item.isFile() && /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(item.name)) {
        // Copy image files
        fs.mkdirSync(currentDestDir, { recursive: true });
        fs.copyFileSync(sourcePath, destPath);
        console.log(`Copied image: ${item.name} to ${currentDestDir}`);
      }
    });
  }
  
  copyImagesRecursively(sourceDir, destDir);
}

// Copy images to dist/pages preserving directory structure
// This will be done after Jekyll generates the site

// Deep copy sections and add URLs while generating page files
const sectionsForSite = JSON.parse(JSON.stringify(sections));

sectionsForSite.forEach((section, sIndex) => {
  // 过滤掉要略过的 page
  section.sectionPages = section.sectionPages.filter((page, pIndex) => {
    const processedBody = processHtml(page.pageBody);

    if (!processedBody.trim()) {
      console.log(`Skipped file ${page.pageInfo.title}.html due to short body text`);
      return false; // 从 sectionPages 中剔除
    }

    // Create directory structure in pages folder matching a0725v1
    const sectionPath = section.sectionInfo.displayName;

    console.log(`Processing section: ${sectionPath}, page: ${page.pageInfo.title}`);

    const pageDirPath =pagesDir;// path.join(pagesDir, sectionPath);
    fs.mkdirSync(pageDirPath, { recursive: true });
    
    // Use original filename
    const fileName = `${page.pageInfo.title}.html`;
    const filePath = path.join(pageDirPath, fileName);

    console.log(`Creating file: ${filePath}`);
    
    page.url = `/pages/${sectionPath}/${fileName}`;
    const pageContent = `---\nlayout: default\ntitle: ${JSON.stringify(page.pageInfo.title)}\n---\n\n${processedBody}\n`;
    fs.writeFileSync(filePath, pageContent);
    return true;
  });
});

fs.writeFileSync(path.join(dataDir, 'sections.json'), JSON.stringify(sectionsForSite, null, 2));

const layoutContent = `{{ content }}`;

fs.mkdirSync(path.join(jekyllSrc, '_layouts'), { recursive: true });
fs.writeFileSync(path.join(jekyllSrc, '_layouts', 'default.html'), layoutContent);

const indexContent = `---
layout: default
title: Home
---

{% for section in site.data.sections %}
  {% if section.sectionPages.size > 0 %}
    {{ section.sectionPages[0].pageBody }}
    {% break %}
  {% endif %}
{% endfor %}`;
fs.writeFileSync(path.join(jekyllSrc, 'index.html'), indexContent);

fs.writeFileSync(path.join(jekyllSrc, '_config.yml'), 'title: OneNote Notebook\n');

const tmpBatPath = path.join(__dirname, 'run_jekyll_build.bat');
const batContent = `@echo off
jekyll build -s "${jekyllSrc}" -d "dist"
`;

fs.writeFileSync(tmpBatPath, batContent);

// Run the .bat file
try {
  child_process.execFileSync(tmpBatPath, { stdio: 'inherit', shell: true });
  console.log('Static site generated in ./dist');
} catch (err) {
  console.error('Jekyll build failed:', err.message);
  process.exit(1);
} finally {
  // Clean up the .bat file
  fs.unlinkSync(tmpBatPath);
}

console.log('Static site generated in ./dist');

// Copy images to dist/pages preserving directory structure
copyImageFiles(dataPath, path.join(__dirname, 'dist', 'pages'));

const destDir = path.resolve(__dirname, './dist');

// Ensure the destination directory exists
fse.ensureDirSync(destDir);

/*
// Copy 'fonts' directory (same directory as build.js)
const fontsSrc = path.join(__dirname, 'fonts');
const fontsDest = path.join(destDir, 'fonts');

fse.copy(fontsSrc, fontsDest, { overwrite: true }, (err) => {
  if (err) {
    console.error('Error copying fonts:', err);
  } else {
    console.log('Fonts directory copied successfully.');
  }
});
*/

// Copy 'shader.frag' file (same directory as build.js)
const shaderSrc = path.join(__dirname, 'shader.frag');
const shaderDest = path.join(destDir, 'shader.frag');

fse.copyFile(shaderSrc, shaderDest, (err) => {
  if (err) {
    console.error('Error copying shader.frag:', err);
  } else {
    console.log('shader.frag file copied successfully.');
  }
});