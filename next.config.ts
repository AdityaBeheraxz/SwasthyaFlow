import type { NextConfig } from 'next';
const hosted=process.env.VERCEL==='1';
const config:NextConfig={
 serverExternalPackages:['@electric-sql/pglite','pg','tesseract.js','sharp','pdf-lib','playwright','@pdf-lib/fontkit','pdfjs-dist','@napi-rs/canvas'],
 outputFileTracingIncludes:{
  '/api/referrals/*/download':['./assets/fonts/**'],
  '/api/reports/ocr':['./assets/ocr/*.traineddata','./node_modules/tesseract.js/**','./node_modules/.pnpm/tesseract.js-core@*/node_modules/tesseract.js-core/**','./node_modules/pdfjs-dist/**','./node_modules/@napi-rs/canvas*/**'],
  '/api/reports/page/*':['./node_modules/pdfjs-dist/**','./node_modules/@napi-rs/canvas*/**'],
 },
 ...(hosted?{outputFileTracingExcludes:{'/*':['./node_modules/playwright/**','./node_modules/playwright-core/**','./node_modules/@electric-sql/pglite/**','./node_modules/.pnpm/playwright*/**','./node_modules/.pnpm/@electric-sql+pglite*/**','./.data/**','./tests/**']}}:{}),
};
export default config;
