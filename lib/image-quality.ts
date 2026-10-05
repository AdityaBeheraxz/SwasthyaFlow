// Projection-profile heuristic. This is a capture warning, not a clinical
// document validity check. Uniform pages and pages without enough ink are ignored.
export function estimateTextTilt(pixels:Uint8Array,width:number,height:number){
 const points:{x:number;y:number}[]=[];
 for(let y=4;y<height-4;y+=2)for(let x=4;x<width-4;x+=2)if(pixels[y*width+x]<100)points.push({x:x-width/2,y:y-height/2});
 if(points.length<100||points.length>width*height/8)return null;
 const score=(angle:number)=>{const rows=new Float64Array(height+width);const tangent=Math.tan(angle*Math.PI/180);for(const point of points){const row=Math.round(point.y-point.x*tangent+(height+width)/2);if(row>=0&&row<rows.length)rows[row]++;}return rows.reduce((sum,count)=>sum+count*count,0);};
 const baseline=score(0);let best=baseline,angle=0;
 for(let candidate=-8;candidate<=8;candidate+=0.5){const value=score(candidate);if(value>best){best=value;angle=candidate;}}
 return Math.abs(angle)>=2&&best>baseline*1.4?angle:null;
}
