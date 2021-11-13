import { VALID_ARGS } from '../constants';

export interface EzdArg {
  argType: VALID_ARGS,
  flag: string,
  longFlag: string,
}

const BOOTSTRAP_ARG: EzdArg = {
  argType: VALID_ARGS.BOOTSTRAP,
  flag: '-b',
  longFlag: '--bootstrap',
};

const REMOVE_DEPS_ARG: EzdArg = {
  argType: VALID_ARGS.REMOVE_DEPENDENCIES,
  flag: '-rmd',
  longFlag: '--remove-deps',
};

const INSTALL_DEPS_ARG: EzdArg = {
  argType: VALID_ARGS.INSTALL_DEPENDENCIES,
  flag: '-i',
  longFlag: '--install-deps',
};

const GLOBAL_DIR: EzdArg = {
  argType: VALID_ARGS.GLOBAL_DIR,
  flag: '',
  longFlag: '',
};

const EZD_ARGS: EzdArg[] = [
  BOOTSTRAP_ARG,
  REMOVE_DEPS_ARG,
  INSTALL_DEPS_ARG,
];

export {
  EZD_ARGS,
  GLOBAL_DIR,
};
