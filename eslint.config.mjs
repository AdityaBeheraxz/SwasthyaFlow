import { FlatCompat } from '@eslint/eslintrc';
import { globalIgnores } from 'eslint/config';
import {createRequire} from 'node:module';
import {dirname} from 'node:path';
const require=createRequire(import.meta.url);
const compat = new FlatCompat({ baseDirectory: import.meta.dirname,resolvePluginsRelativeTo:dirname(require.resolve('eslint-config-next')) });
const config=[...compat.extends('next/core-web-vitals','next/typescript'), globalIgnores(['.next/**','node_modules/**','.data/**','next-env.d.ts'])];
export default config;
