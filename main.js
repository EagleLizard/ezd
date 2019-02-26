
const program = require('commander');

const commands = require('./commands');

main(process.argv);

function main(argv) {
  commands.init(program);
  program.parse(argv);
}
