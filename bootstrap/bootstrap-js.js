
const path = require('path');

const files = require('../files');

const {
  DEFAULT_MAIN_FILE,
  EXTS,
  PACKAGE_JSON,
  GIT_IGNORE,
} = require('../constants');

module.exports = async function bootstrapJs(name, mainFile, force) {
  let projectPath, dirExists, packageJson, packageJsonPath, gitignore, gitignorePath;
  mainFile = mainFile || DEFAULT_MAIN_FILE(EXTS.js);
  projectPath = path.join(process.cwd(), name);
  dirExists = await files.exists(projectPath);
  if(dirExists && !force) {
    throw new Error(`Project directory "${projectPath}" already exists (use --force to remove existing directory)`);
  }
  try {
    if(force && dirExists) {
      console.log(`Deleting existing directory ${projectPath} ...`);
      await files.clearDir(projectPath);
    }
    console.log(`Creating project directory ${projectPath} ...`);
    await files.mkdir(projectPath);
  } catch(e) {
    throw e;
  }
  packageJsonPath = path.join(projectPath, 'package.json');
  packageJson = PACKAGE_JSON({ name, mainFile });
  gitignorePath = path.join(projectPath, '.gitignore');
  gitignore = GIT_IGNORE;
  await makeFile(packageJsonPath, packageJson);
  await makeFile(gitignorePath, gitignore);
}

async function makeFile(path, data) {
  console.log(`Writing ${path} ...`);
  try {
    await files.writeFile(path, data);
  } catch(e) {
    throw e;
  }
}
