import path from 'path';

export function resolvePath(relativePath: string): string {
  return path.resolve(__dirname, '..', relativePath);
}
