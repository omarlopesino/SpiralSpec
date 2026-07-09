#!/usr/bin/env node
import { buildProgram } from './program.js';

await buildProgram({ cwd: process.cwd(), out: console.log }).parseAsync(process.argv);
