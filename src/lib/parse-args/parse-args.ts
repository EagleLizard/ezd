
import { checkDir, getPathRelativeToCwd } from '../../util/files';
import { VALID_ARGS } from '../constants';
import { EzdArg, EZD_ARGS, GLOBAL_DIR } from './ezd-arg';

const GLOBAL_DIR_AFFECTED_ARGS = [
  VALID_ARGS.REMOVE_DEPENDENCIES,
  VALID_ARGS.INSTALL_DEPENDENCIES,
];

export interface ParsedArg {
  flag: string;
  argParams: string[];
  consumedArgs: number;
  argType: VALID_ARGS;
}

export async function parseArgs(rawArgv: string[]): Promise<ParsedArg[]> {
  let argv: string[];
  let parsedArgs: ParsedArg[];
  let globalDirArg: ParsedArg;
  argv = rawArgv.slice(2);

  parsedArgs = [];

  for(let i = 0; i < argv.length;) {
    let parsedArg: ParsedArg;
    parsedArg = await parseArg(argv, i);
    parsedArgs.push(parsedArg);
    i += parsedArg.consumedArgs;
  }

  if(parsedArgs[0].argType === VALID_ARGS.GLOBAL_DIR) {
    globalDirArg = parsedArgs[0];
  }

  if(globalDirArg !== undefined) {
    parsedArgs = parsedArgs.slice(1).map(parsedArg => {
      if(GLOBAL_DIR_AFFECTED_ARGS.includes(parsedArg.argType)) {
        if(parsedArg.argParams.length) {
          throw new Error(`${parsedArg.flag}: Cannot mix flag with dir param as first argument.`);
        } else {
          parsedArg = Object.assign({}, parsedArg);
          parsedArg.argParams = parsedArg.argParams.slice();
          parsedArg.argParams = [ globalDirArg.argParams[0] ];
        }
      }
      return parsedArg;
    });
  }

  return parsedArgs;
}

async function parseArg(argv: string[], startIdx: number): Promise<ParsedArg> {
  let toParse: string[], parsedArg: ParsedArg;
  let flag: string, argParams: string[], consumedArgs: number, argType: VALID_ARGS;

  toParse = argv.slice(startIdx);

  consumedArgs = 0;
  argParams = [];

  for(let i = 0; i < toParse.length; ++i) {
    let arg: string, isFlag: boolean, ezdArg: EzdArg;
    let dirPath: string, isDir: boolean;
    arg = toParse[i];
    isFlag = isArgFlag(arg);

    if(i === 0) {
      dirPath = getPathRelativeToCwd(arg);
      isDir = await checkDir(dirPath);
      if(!isFlag && !isDir) {
        /*
          first arg, should be a flag
            or... a default param
        */
        throw new Error(`Invalid argument, expected a flag or directory. Received: ${arg}`);
      } else if(isDir) {
        ezdArg = GLOBAL_DIR;
        flag = ezdArg.flag;
        argType = ezdArg.argType;
        argParams.push(arg);
        consumedArgs++;
        break;
      } else {
        ezdArg = getEzdArg(arg);
        if(ezdArg === undefined) {
          throw new Error(`invalid argv flag: ${arg}`);
        }
        flag = arg;
        argType = ezdArg.argType;
      }
    } else {
      if(isFlag) {
        break;
      }
      argParams.push(arg);
    }
    consumedArgs++;
  }

  parsedArg = {
    flag,
    argParams,
    consumedArgs,
    argType,
  };

  return parsedArg;
}

function isArgFlag(arg: string): boolean {
  return /^[-]{1,2}[a-z]+/g.test(arg.trim());
}

function getEzdArg(arg: string): EzdArg | undefined {
  return EZD_ARGS.find(ezdArg => {
    let validFlag: boolean, validLongFlag: boolean;
    validFlag = ezdArg.flag === arg;
    validLongFlag = ezdArg.longFlag === arg;
    if(validFlag || validLongFlag) {
      return true;
    }
  });
}
