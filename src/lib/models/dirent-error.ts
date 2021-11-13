
import { Dirent } from 'fs';

interface DirentErrorOpts {
  dirent?: Dirent;
  absolutePath?: string;
}

export class DirentError extends Error {
  dirent: Dirent;
  absolutePath: string;
  constructor(message: string, opts: DirentErrorOpts = {}) {
    super(message);
    this.name = 'DirentError';
    if(opts.dirent !== undefined) {
      this.dirent = opts.dirent;
    }
    if(opts.absolutePath !== undefined) {
      this.absolutePath = opts.absolutePath;
    }
  }
}
