
export function isString(val: unknown): boolean {
  if((typeof val) === 'string') {
    return true;
  }
  return false;
}
