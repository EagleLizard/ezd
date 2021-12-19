
import { EzdArgs, parseEzdArgs } from './lib/parse-args/ezd-args';
import { executeInstallDeps } from './lib/commands/install-dependencies';
import { executeRemoveDeps } from './lib/commands/remove-deps';
import { executeScandir } from './lib/commands/scandir/scandir';

import {
  terminatePool,
} from './util/worker-pool';

export async function main(argv: string[]) {
  let ezdArgs: EzdArgs;

  ezdArgs = await parseEzdArgs(argv);
  await executeArgs(ezdArgs);

  terminatePool();
}

async function executeArgs(ezdArgs: EzdArgs) {
  if(ezdArgs.DIRSTAT !== undefined) {
    await executeScandir(ezdArgs);
  }
  if(ezdArgs.REMOVE_DEPENDENCIES !== undefined) {
    await executeRemoveDeps(ezdArgs.REMOVE_DEPENDENCIES.argParams);
  }
  if(ezdArgs.INSTALL_DEPENDENCIES !== undefined) {
    await executeInstallDeps(ezdArgs.INSTALL_DEPENDENCIES.argParams);
  }
}
