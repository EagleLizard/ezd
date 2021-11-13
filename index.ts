
import sourceMapSupport from 'source-map-support';
sourceMapSupport.install();

import { main as ezd } from './src/main';

export { ezd };

(async () => {
  try {
    await ezd(process.argv);
  } catch(e) {
    console.error(e);
    throw e;
  }
})();
