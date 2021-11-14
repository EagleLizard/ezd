import { VALID_ARGS } from '../constants';

export interface EzdArg<ArgParams = unknown> {
  argType: VALID_ARGS;
  argParams: ArgParams;
}
