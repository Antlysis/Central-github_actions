const fs = require('fs');
const path = require('path');
const glob = require('glob');
const jsdoc2md = require('jsdoc-to-markdown');

const inputGlob = process.env.INPUT_FUNCTION_PATH || 'config/function/*.js';
const outputDir = path.join(process.cwd(), 'docs', 'function', 'md');
//const outputDir = path.join(__dirname, 'md');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const files = glob.sync(inputGlob);

(async () => {
  for (const file of files) {
    const outputFileName = path.basename(file, '.js') + '.md';
    const outputPath = path.join(outputDir, outputFileName);
    const markdown = await jsdoc2md.render({ files: file });

    console.log(`Generating ${outputFileName}`);
    fs.writeFileSync(outputPath, markdown);
  }
})();