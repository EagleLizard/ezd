
import { Command } from 'commander';
import pkg from '../../../package.json';
import { checkDir, getPathRelativeToCwd } from '../../util/files';
import { VALID_ARGS } from '../constants';
import {
  isString,
} from '../models/type-validation/primative-validation';
import { EzdArg } from './ezd-arg';

export interface EzdArgs extends Partial<Record<VALID_ARGS, EzdArg>> {
  [VALID_ARGS.DEfAULT_DIR]?: EzdArg<string>,
  [VALID_ARGS.INSTALL_DEPENDENCIES]?: EzdArg<string>;
  [VALID_ARGS.REMOVE_DEPENDENCIES]?: EzdArg<string>;
}

export {
  parseEzdArgs,
};

async function parseEzdArgs(argv: string[]) {
  let ezdProgram: Command, ezdArgs: EzdArgs;

  ezdProgram = new Command();
  ezdArgs = {};

  ezdProgram
    .version(pkg.version, '-v, --versions', 'output the current version')
  ;
  ezdProgram
    .argument('[file]', 'optional path. If specified this will be used for all path-based commands')
    .option('-i --install-deps [installPath]', 'run npm install at path, or current working directory')
    .option('-r --remove-deps [removePath]', 'remove package-lock and node_modules at path')
  ;

  ezdProgram.action(async (rawDirPath: unknown, options: Record<string, unknown>) => {
    let rawInstallDirPath: unknown, rawRemoveDepsDirPath: unknown;
    rawInstallDirPath = options?.installDeps;
    rawRemoveDepsDirPath = options?.removeDeps;
    if(rawDirPath !== undefined) {
      await parseDefaultDirArg(rawDirPath, ezdArgs);
    }
    if(rawInstallDirPath !== undefined) {
      await parseInstallsDepsArg(rawInstallDirPath, ezdArgs);
    }
    if(rawRemoveDepsDirPath !== undefined) {
      await parseRemoveDepsArg(rawRemoveDepsDirPath, ezdArgs);
    }
  });

  await ezdProgram.parseAsync(argv);
  return ezdArgs;
}

async function getCwdDirArg(rawDirPath: unknown) {
  let dirPath: string, cwdPath: string, isDir: boolean;
  if(!isString(rawDirPath)) {
    throw new Error(`Invalid path argument type, expected 'string', got: ${typeof rawDirPath}`);
  }
  dirPath = rawDirPath as string;
  cwdPath = getPathRelativeToCwd(dirPath);
  isDir = await checkDir(cwdPath);

  if(!isDir) {
    throw new Error(`Supplied path is not a valid directory: ${cwdPath}`);
  }
  return cwdPath;
}

async function parseDefaultDirArg(rawDirPath: unknown, ezdArgs: EzdArgs) {
  let dirPath: string;
  console.log(rawDirPath);
  if(rawDirPath === undefined) {
    return;
  }
  dirPath = await getCwdDirArg(rawDirPath);
  ezdArgs[VALID_ARGS.DEfAULT_DIR] = {
    argType: VALID_ARGS.DEfAULT_DIR,
    argParams: dirPath,
  };
}

async function parseInstallsDepsArg(rawInstallDirPath: unknown, ezdArgs: EzdArgs) {
  let hasDirArg: boolean, isDefaultDirSet: boolean, dirPath: string;
  hasDirArg = isString(rawInstallDirPath);
  isDefaultDirSet = ezdArgs.DEfAULT_DIR !== undefined;
  if(hasDirArg) {
    dirPath = await getCwdDirArg(rawInstallDirPath);
    if(isDefaultDirSet) {
      throw new Error(`Cannot invoke --install-deps with path parameter when using a default path parameter. Specified path: ${dirPath}`);
    }
  } else {
    dirPath = isDefaultDirSet
      ? ezdArgs.DEfAULT_DIR.argParams
      : await getCwdDirArg('.')
    ;
  }
  ezdArgs[VALID_ARGS.INSTALL_DEPENDENCIES] = {
    argType: VALID_ARGS.INSTALL_DEPENDENCIES,
    argParams: dirPath,
  };
}

async function parseRemoveDepsArg(rawRemoveDepsDir: unknown, ezdArgs: EzdArgs) {
  let hasDirArg: boolean, isDefaultDirSet: boolean, dirPath: string;
  hasDirArg = isString(rawRemoveDepsDir);
  isDefaultDirSet = ezdArgs.DEfAULT_DIR !== undefined;
  if(hasDirArg) {
    dirPath = await getCwdDirArg(rawRemoveDepsDir);
    if(isDefaultDirSet) {
      throw new Error(`Cannot invoke --remove-deps with path parameter when using a default path parameter. Specified path: ${dirPath}`);
    }
  } else {
    dirPath = isDefaultDirSet
      ? ezdArgs.DEfAULT_DIR.argParams
      : await getCwdDirArg('.')
    ;
  }
  ezdArgs[VALID_ARGS.REMOVE_DEPENDENCIES] = {
    argType: VALID_ARGS.REMOVE_DEPENDENCIES,
    argParams: dirPath,
  };
}
