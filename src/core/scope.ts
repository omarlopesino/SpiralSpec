import picomatch from 'picomatch';

function segsOverlap(a: string[], b: string[]): boolean {
  if (a.length === 0 && b.length === 0) return true;
  if (a.length > 0 && a[0] === '**') {
    return segsOverlap(a.slice(1), b) || (b.length > 0 && segsOverlap(a, b.slice(1)));
  }
  if (b.length > 0 && b[0] === '**') {
    return segsOverlap(a, b.slice(1)) || (a.length > 0 && segsOverlap(a.slice(1), b));
  }
  if (a.length === 0 || b.length === 0) return false;
  const x = a[0];
  const y = b[0];
  if (x === '*' || y === '*' || x === y) return segsOverlap(a.slice(1), b.slice(1));
  if (x.includes('*') || y.includes('*')) {
    if (picomatch.isMatch(y, x) || picomatch.isMatch(x, y)) return segsOverlap(a.slice(1), b.slice(1));
  }
  return false;
}

export function globsOverlap(a: string, b: string): boolean {
  return segsOverlap(a.split('/').filter(Boolean), b.split('/').filter(Boolean));
}

export function scopesOverlap(a: string[], b: string[]): boolean {
  return a.some((g1) => b.some((g2) => globsOverlap(g1, g2)));
}

export function fileInScope(file: string, scope: string[]): boolean {
  return scope.some((g) => picomatch.isMatch(file, g));
}
