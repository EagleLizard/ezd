
const bootstrap = require('./bootstrap-cmd');

module.exports = {
  init,
};

function init(program) {
  bootstrapCmd(program);
}

function bootstrapCmd(program) {
  let cmd = program
    .command('bootstrap <project_name>')
    .alias('b')
    .description('Bootstrap a new app');
  cmd = bootstrap.options(cmd)
    .action(bootstrap.command)
    .on('--help', bootstrap.help);
  return program;
}
