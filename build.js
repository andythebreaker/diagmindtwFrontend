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



const dataPath = path.join(__dirname, 'a0725v1');
if (!fs.existsSync(dataPath)) {
  console.error('a0725v1 directory not found');
  process.exit(1);
}

// Read sections from a0725v1 directory structure
function readSectionsFromDirectory(baseDir) {
  const sections = [];
  
  // Read all directories in a0725v1 (these are the main sections)
  const sectionDirs = fs.readdirSync(baseDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  sectionDirs.forEach(sectionName => {
    const sectionPath = path.join(baseDir, sectionName);
    const sectionPages = [];
    
    // Read all HTML files in this section directory (skip .mht files)
    const files = fs.readdirSync(sectionPath, { withFileTypes: true })
      .filter(dirent => dirent.isFile() && dirent.name.endsWith('.html') && !dirent.name.endsWith('.mht'))
      .map(dirent => dirent.name);
    
    files.forEach(fileName => {
      const filePath = path.join(sectionPath, fileName);
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
      sections.push({
        sectionInfo: {
          displayName: sectionName
        },
        sectionPages: sectionPages
      });
    }
  });
  
  return sections;
}

const sections = readSectionsFromDirectory(dataPath);
const jekyllSrc = path.join(__dirname, 'jekyll');
const pagesDir = path.join(jekyllSrc, 'pages');
const dataDir = path.join(jekyllSrc, '_data');

fs.rmSync(jekyllSrc, { recursive: true, force: true });
fs.mkdirSync(pagesDir, { recursive: true });
fs.mkdirSync(dataDir, { recursive: true });

// Deep copy sections and add URLs while generating page files
const sectionsForSite = JSON.parse(JSON.stringify(sections));

sectionsForSite.forEach((section, sIndex) => {
  // 過濾掉要略過的 page
  section.sectionPages = section.sectionPages.filter((page, pIndex) => {
    const fileName = `${sIndex}-${pIndex}.html`;
    const processedBody = processHtml(page.pageBody);

    if (!processedBody.trim()) {
      console.log(`Skipped file ${fileName} due to short body text`);
      return false; // 從 sectionPages 中剔除
    }

    page.url = `/pages/${fileName}`;
    const pageContent = `---\nlayout: default\ntitle: ${JSON.stringify(page.pageInfo.title)}\n---\n\n${processedBody}\n`;
    fs.writeFileSync(path.join(pagesDir, fileName), pageContent);
    return true;
  });
});

fs.writeFileSync(path.join(dataDir, 'sections.json'), JSON.stringify(sectionsForSite, null, 2));

const layoutContent = `{{ content }}`;

fs.mkdirSync(path.join(jekyllSrc, '_layouts'), { recursive: true });
fs.writeFileSync(path.join(jekyllSrc, '_layouts', 'default.html'), layoutContent);

const indexContent = `---\nlayout: default\ntitle: Home\n---\n\n{{ site.data.sections[0].sectionPages[0].pageBody }}`;
fs.writeFileSync(path.join(jekyllSrc, 'index.html'), indexContent);

fs.writeFileSync(path.join(jekyllSrc, '_config.yml'), 'title: OneNote Notebook\n');

// copy assets if directory exists
const assetsPath = path.join(__dirname, 'assets');
if (fs.existsSync(assetsPath)) {
  fs.cpSync(assetsPath, path.join(jekyllSrc, 'assets'), { recursive: true });
} else {
  console.log('Assets directory not found, skipping assets copy');
}

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


const srcDir = path.resolve(__dirname, '../');
const destDir = path.resolve(__dirname, './dist');

// Ensure the destination directory exists
fse.ensureDirSync(destDir);

// Copy 'fonts' directory
const fontsSrc = path.join(srcDir, 'fonts');
const fontsDest = path.join(destDir, 'fonts');

fse.copy(fontsSrc, fontsDest, { overwrite: true }, (err) => {
  if (err) {
    console.error('Error copying fonts:', err);
  } else {
    console.log('Fonts directory copied successfully.');
  }
});

// Copy 'shader.frag' file
const shaderSrc = path.join(srcDir, '/onenote/shader.frag');
const shaderDest = path.join(destDir, 'shader.frag');

fse.copyFile(shaderSrc, shaderDest, (err) => {
  if (err) {
    console.error('Error copying shader.frag:', err);
  } else {
    console.log('shader.frag file copied successfully.');
  }
});