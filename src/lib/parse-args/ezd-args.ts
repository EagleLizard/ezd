
import { Command } from 'commander';
import { mkdir } from 'fs/promises';
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
  [VALID_ARGS.DIRSTAT]?: EzdArg<string>;
  [VALID_ARGS.DIRSTAT2]?: EzdArg<string>;
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
    .action(async (rawDirPath: unknown, options: Record<string, unknown>) => {
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
    })
  ;
  ezdProgram.command('dirstat <rootDir>')
    .description('Scan a directory and get stats')
    .option('-gt --generate-test-files')
    .action(async (rawRootDir: string, options: Record<string, unknown>) => {
      let rootDir: string, isDir: boolean, generateTestFiles: boolean;
      rootDir = getPathRelativeToCwd(rawRootDir);
      isDir = await checkDir(rootDir);
      generateTestFiles = options.generateTestFiles === true;
      if(!isDir) {
        if(!generateTestFiles) {
          throw new Error(`Pass invalid path to scandir, must be a directory. Received: ${rootDir}`);
        } else {
          try {
            await mkdir(rootDir);
          } catch(e) {
            console.error(e);
            throw new Error(`Could not make test directory: ${rootDir}`);
          }
        }
      }
      if(options.generateTestFiles === true) {
        ezdArgs[VALID_ARGS.GENERATE_TEST_FILES] = {
          argType: VALID_ARGS.GENERATE_TEST_FILES,
          argParams: rootDir,
        };
      }
      ezdArgs[VALID_ARGS.DIRSTAT] = {
        argType: VALID_ARGS.DIRSTAT,
        argParams: rootDir,
      };
    });
  
  ezdProgram.command('dirstat2 <rootDir>')
    .description('Scan a directory and get stats')
    .action(async (rawRootDir: string, options: Record<string, unknown>) => {
      let rootDir: string, isDir: boolean;
      rootDir = getPathRelativeToCwd(rawRootDir);
      isDir = await checkDir(rootDir);
      if(!isDir) {
        throw new Error(`Passed invalid path to dirstat2, must be a directory. Received: ${rootDir}`);
      }
      ezdArgs[VALID_ARGS.DIRSTAT2] = {
        argType: VALID_ARGS.DIRSTAT2,
        argParams: rootDir,
      };
    });

  ezdProgram;

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
