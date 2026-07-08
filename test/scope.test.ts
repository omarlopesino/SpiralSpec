import { describe, it, expect } from 'vitest';
import { globsOverlap, scopesOverlap, fileInScope } from '../src/core/scope.js';

describe('globsOverlap', () => {
  it('nested ** globs overlap', () => {
    expect(globsOverlap('src/migration/**', 'src/migration/mapping/**')).toBe(true);
  });
  it('sibling directories do not overlap', () => {
    expect(globsOverlap('src/mapping/**', 'src/migrate/**')).toBe(false);
  });
  it('** overlaps everything', () => {
    expect(globsOverlap('**', 'src/a/b.ts')).toBe(true);
  });
  it('* segment overlaps a literal segment', () => {
    expect(globsOverlap('src/*/utils.ts', 'src/auth/utils.ts')).toBe(true);
  });
  it('extension wildcards overlap matching literals', () => {
    expect(globsOverlap('src/*.ts', 'src/index.ts')).toBe(true);
    expect(globsOverlap('src/*.ts', 'src/index.css')).toBe(false);
  });
  it('identical globs overlap', () => {
    expect(globsOverlap('db/**', 'db/**')).toBe(true);
  });
});

describe('scopesOverlap', () => {
  it('true when any pair overlaps', () => {
    expect(scopesOverlap(['a/**', 'b/**'], ['c/**', 'b/x/**'])).toBe(true);
  });
  it('false when no pair overlaps', () => {
    expect(scopesOverlap(['a/**'], ['b/**'])).toBe(false);
  });
});

describe('fileInScope', () => {
  it('matches a file against scope globs', () => {
    expect(fileInScope('src/mapping/index.ts', ['src/mapping/**'])).toBe(true);
    expect(fileInScope('src/other/index.ts', ['src/mapping/**'])).toBe(false);
  });
});
