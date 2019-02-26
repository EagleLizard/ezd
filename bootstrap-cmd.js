
const bootstrapJs = require('./bootstrap/bootstrap-js');

const {DEFAULT_PROJECT_TYPE, DEFAULT_MAIN_FILE} = require('./constants');

module.exports = {
  command,
  help,
  options,
} 

function command(name, cmd) {
  let projectType, mainFile, force, bootstrapPromise;
  projectType = cmd.project || DEFAULT_PROJECT_TYPE;
  mainFile = cmd.mainFile;
  force = cmd.force;
  if(!name || typeof name === 'function'){
    throw new Error('--name is a required option');
  }
  switch(projectType) {
    case 'js':
      bootstrapPromise = bootstrapJs(name, mainFile, force);
  }
  bootstrapPromise.catch(err => {
    console.error(err);
  });
}

function help() {
  let helpText = [
    'Examples:',
    '',
    '   $ bootstrap --project=js',
    '   $ b -p=js',
  ];
  helpText = `\n${helpText.join('\n')}\n`;
  console.log(helpText);
}

function options(program) {
  return program
    .option(
      '-p, --project [type]',
      `specify project type (defaults to "${DEFAULT_PROJECT_TYPE}")`
    )
    // .option(
    //   '-n, --name <project-name>',
    //   `The project name (may be used in metadata like "package.json").`
    // )
    .option(
      '-m, --main-file [name]',
      `Generates mainfile. Default is "${DEFAULT_MAIN_FILE('[ext]')}"`
    )
    .option(
      '-f, --force',
      'Overrides certain erros (EG: Overwrite project dir if it exists). Use with caution.'
    );
}
