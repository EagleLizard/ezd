
export function getIntuitiveBytes(bytes: number): [ number, string ] {
  // let sizeVal: number, labelStr: string;
  let bytesTuple: [ number, string ];
  if(bytes > (1024 ** 3)) {
    bytesTuple = [
      bytes / (1024 ** 3),
      'gb',
    ];
  } else if(bytes > (1024 ** 2)) {
    bytesTuple = [
      bytes / (1024 ** 2),
      'mb',
    ];
  } else if(bytes > 1024) {
    bytesTuple = [
      bytes / 1024,
      'kb',
    ];
  } else {
    bytesTuple = [
      bytes,
      'b'
    ];
  }
  return bytesTuple;
}
