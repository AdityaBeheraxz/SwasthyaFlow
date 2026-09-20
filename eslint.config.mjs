import { FlatCompat } from '@eslint/eslintrc';
import { globalIgnores } from 'eslint/config';
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });
const config=[...compat.extends('next/core-web-vitals','next/typescript'), globalIgnores(['.next/**','node_modules/**','.data/**','next-env.d.ts'])];
export default config;
