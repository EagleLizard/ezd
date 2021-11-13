
import { VALID_ARGS } from './lib/constants';
import {
  parseArgs,
  ParsedArg,
} from './lib/parse-args/parse-args';
import { executeRemoveDeps } from './lib/commands/remove-deps';
import { executeInstallDeps } from './lib/commands/install-dependencies';

export async function main(argv: string[]) {
  let parsedArgs: ParsedArg[];
  parsedArgs = await parseArgs(argv);
  for(let i = 0; i < parsedArgs.length; ++i) {
    await executeArg(parsedArgs[i]);
  }
}

async function executeArg(parsedArg: ParsedArg) {
  console.log(parsedArg.argType);
  switch(parsedArg.argType) {
    case VALID_ARGS.REMOVE_DEPENDENCIES:
      await executeRemoveDeps(parsedArg);
      break;
    case VALID_ARGS.BOOTSTRAP:
      break;
    case VALID_ARGS.INSTALL_DEPENDENCIES:
      await executeInstallDeps(parsedArg);
      break;
  }
}
