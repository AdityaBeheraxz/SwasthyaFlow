import {it,expect} from 'vitest';
import {estimateTextTilt} from '../lib/image-quality';
it('ignores blank images and detects clearly slanted text rows',()=>{
 const width=400,height=400,pixels=new Uint8Array(width*height).fill(255);expect(estimateTextTilt(pixels,width,height)).toBeNull();
 for(const origin of [70,140,210,280])for(let x=30;x<370;x++)for(let thickness=0;thickness<3;thickness++){const y=Math.round(origin+x*Math.tan(5*Math.PI/180))+thickness;pixels[y*width+x]=0;}
 expect(Math.abs(estimateTextTilt(pixels,width,height)??0)).toBeGreaterThanOrEqual(4);
});
