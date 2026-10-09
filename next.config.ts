import type { NextConfig } from 'next';
import {realpathSync} from 'node:fs';
import {relative,resolve} from 'node:path';
// Trace actual pnpm package directories. Adding files beneath a symlink alias
// can create an invalid Vercel function archive with conflicting paths.
const packageAssets=(name:string)=>'./'+relative(process.cwd(),realpathSync(resolve('node_modules',name))).replaceAll('\\','/')+'/**';
const hosted=process.env.VERCEL==='1';
const config:NextConfig={
 serverExternalPackages:['@electric-sql/pglite','pg','tesseract.js','sharp','pdf-lib','playwright','@pdf-lib/fontkit','pdfjs-dist','@napi-rs/canvas'],
 outputFileTracingIncludes:{
  '/api/referrals/*/download':['./assets/fonts/**'],
  '/api/reports/ocr':['./assets/ocr/*.traineddata',packageAssets('tesseract.js'),'./node_modules/.pnpm/tesseract.js-core@*/node_modules/tesseract.js-core/**',packageAssets('pdfjs-dist'),packageAssets('@napi-rs/canvas')],
  '/api/reports/page/*':[packageAssets('pdfjs-dist'),packageAssets('@napi-rs/canvas')],
 },
 ...(hosted?{outputFileTracingExcludes:{'/*':['./node_modules/playwright/**','./node_modules/playwright-core/**','./node_modules/@electric-sql/pglite/**','./node_modules/.pnpm/playwright*/**','./node_modules/.pnpm/@electric-sql+pglite*/**','./.data/**','./tests/**']}}:{}),
};
export default config;
