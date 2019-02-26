const DEFAULT_PROJECT_TYPE = 'js';
const DEFAULT_MAIN_FILE = (ext) => `main.${ext}`;
const EXTS = {
  js: 'js',
};
const PACKAGE_JSON = (opts) => `{
  "name": "${opts.name}",
  "version": "1.0.0",
  "description": "",
  "main": "${opts.mainFile}",
  "scripts": {
    "test": "echo \\"Error: no test specified\\" && exit 1"
  },
  "author": "",
  "license": "ISC"
}`;

const GIT_IGNORE = `
node_modules
.DS_Store
package-lock.json
`;

module.exports = {
  DEFAULT_MAIN_FILE,
  DEFAULT_PROJECT_TYPE,
  EXTS,
  PACKAGE_JSON,
  GIT_IGNORE,
};
