
import { EzdArgs, parseEzdArgs } from './lib/parse-args/ezd-args';
import { executeInstallDeps } from './lib/commands/install-dependencies';
import { executeRemoveDeps } from './lib/commands/remove-deps';
import { executeDirstat } from './lib/commands/dirstat/dirstat';
import { MemLogger } from './util/mem-logger';

import {
  terminatePool,
} from './util/worker-pool';

export async function main(argv: string[]) {
  let ezdArgs: EzdArgs;
  let memLogger: MemLogger;

  memLogger = await MemLogger.start();

  ezdArgs = await parseEzdArgs(argv);
  await executeArgs(ezdArgs);

  memLogger.stop();
  terminatePool();
}

async function executeArgs(ezdArgs: EzdArgs) {
  if(ezdArgs.DIRSTAT !== undefined) {
    await executeDirstat(ezdArgs);
  }
  if(ezdArgs.REMOVE_DEPENDENCIES !== undefined) {
    await executeRemoveDeps(ezdArgs.REMOVE_DEPENDENCIES.argParams);
  }
  if(ezdArgs.INSTALL_DEPENDENCIES !== undefined) {
    await executeInstallDeps(ezdArgs.INSTALL_DEPENDENCIES.argParams);
  }
}
