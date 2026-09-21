import {createHash} from 'node:crypto';
import type {Rule} from './rules';

export function rulesChecksum(rules:Rule[]){return createHash('sha256').update(JSON.stringify(rules)).digest('hex');}
