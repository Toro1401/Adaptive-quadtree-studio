(function(){
  const defaults={priorityModel:'total',areaWeight:1,channelMode:'rgb',representative:'mean',splitMode:'quad',noiseBlur:0,minWidth:0,minHeight:0,qualityTarget:0};
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const copyCell=c=>({id:c.id,x:c.x,y:c.y,w:c.w,h:c.h,depthX:c.depthX,depthY:c.depthY,color:[...c.color],variance:c.variance,error:c.error,edge:c.edge,sse:c.sse,maskWeight:c.maskWeight});

  class QuadEngine{
    constructor(){this.settings={...defaults};this.analysisCanvas=document.createElement('canvas');this.analysisCtx=this.analysisCanvas.getContext('2d',{willReadFrequently:true});this.baseCanvas=document.createElement('canvas');this.baseCtx=this.baseCanvas.getContext('2d',{willReadFrequently:true});this.width=0;this.height=0;this.originalWidth=0;this.originalHeight=0;this.imageData=null;this.edgeData=null;this.maskData=null;this.cells=[];this.seedCells=[];this.history=[];this.position=0;this.metrics=[];this.idCounter=1;this.lastStop='idle'}

    loadImage(image,originalWidth=image.naturalWidth,originalHeight=image.naturalHeight){
      this.originalWidth=originalWidth;this.originalHeight=originalHeight;
      const scale=Math.min(1,1024/Math.max(originalWidth,originalHeight));
      this.width=Math.max(2,Math.round(originalWidth*scale));this.height=Math.max(2,Math.round(originalHeight*scale));
      for(const canvas of [this.baseCanvas,this.analysisCanvas]){canvas.width=this.width;canvas.height=this.height}
      this.baseCtx.clearRect(0,0,this.width,this.height);this.baseCtx.drawImage(image,0,0,this.width,this.height);
      this.maskData=new Uint8ClampedArray(this.width*this.height);this.maskData.fill(128);
      this.rebuildAnalysis();return this;
    }

    rebuildAnalysis(){
      this.analysisCtx.clearRect(0,0,this.width,this.height);this.analysisCtx.save();
      this.analysisCtx.filter=this.settings.noiseBlur?`blur(${this.settings.noiseBlur}px)`:'none';this.analysisCtx.drawImage(this.baseCanvas,0,0);this.analysisCtx.restore();
      this.imageData=this.analysisCtx.getImageData(0,0,this.width,this.height).data;this.buildEdges();this.reset();
    }

    buildEdges(){
      const {width:w,height:h,imageData:d}=this,edge=new Float32Array(w*h),lum=new Float32Array(w*h);
      for(let p=0,i=0;p<lum.length;p++,i+=4)lum[p]=.2126*d[i]+.7152*d[i+1]+.0722*d[i+2];
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=y*w+x,r=x<w-1?p+1:p,b=y<h-1?p+w:p;edge[p]=Math.min(255,Math.abs(lum[p]-lum[r])+Math.abs(lum[p]-lum[b]))}
      this.edgeData=edge;
    }

    setSettings(next,rebuild=true){
      const blurChanged=Number(next.noiseBlur??this.settings.noiseBlur)!==Number(this.settings.noiseBlur);Object.assign(this.settings,next);
      if(!this.imageData)return;
      if(blurChanged)this.rebuildAnalysis();else if(rebuild)this.reset();
    }

    setMask(mask){if(mask&&mask.length===this.width*this.height)this.maskData=new Uint8ClampedArray(mask);this.reset()}

    reset(){
      if(!this.imageData)return;this.idCounter=1;this.history=[];this.position=0;this.lastStop='ready';
      const mx=Math.floor(this.width/2),my=Math.floor(this.height/2);
      this.seedCells=[this.computeCell(0,0,mx,my,1,1),this.computeCell(mx,0,this.width-mx,my,1,1),this.computeCell(0,my,mx,this.height-my,1,1),this.computeCell(mx,my,this.width-mx,this.height-my,1,1)];
      this.cells=this.seedCells.map(copyCell);this.metrics=[this.metricPoint()];
    }

    computeCell(x,y,w,h,depthX,depthY){
      const data=this.imageData,W=this.width,area=w*h,s=[0,0,0,0],ss=[0,0,0,0],samples=[[],[],[],[]];
      const sampleStep=Math.max(1,Math.floor(Math.sqrt(area/2400)));let edgeSum=0,maskSum=0,count=0,lumaS=0,lumaSS=0,satS=0,satSS=0;
      const bins=new Map();
      for(let yy=y;yy<y+h;yy+=sampleStep)for(let xx=x;xx<x+w;xx+=sampleStep){
        const p=yy*W+xx,i=p*4,r=data[i],g=data[i+1],b=data[i+2],a=data[i+3],vals=[r,g,b,a];count++;
        for(let c=0;c<4;c++){s[c]+=vals[c];ss[c]+=vals[c]*vals[c];if(this.settings.representative==='median')samples[c].push(vals[c])}
        if(this.settings.representative==='dominant'){const key=((r>>4)<<8)|((g>>4)<<4)|(b>>4),bin=bins.get(key)||{n:0,s:[0,0,0,0]};bin.n++;for(let c=0;c<4;c++)bin.s[c]+=vals[c];bins.set(key,bin)}
        const l=.2126*r+.7152*g+.0722*b,sat=Math.max(r,g,b)-Math.min(r,g,b);lumaS+=l;lumaSS+=l*l;satS+=sat;satSS+=sat*sat;edgeSum+=this.edgeData[p];maskSum+=this.maskData?this.maskData[p]:128;
      }
      let color=s.map(v=>v/count);
      if(this.settings.representative==='median')color=samples.map(arr=>{arr.sort((a,b)=>a-b);return arr[Math.floor(arr.length/2)]});
      if(this.settings.representative==='dominant'&&bins.size){let best;for(const bin of bins.values())if(!best||bin.n>best.n)best=bin;color=best.s.map(v=>v/best.n)}
      const variances=ss.map((v,c)=>Math.max(0,v/count-(s[c]/count)**2));let variance;
      if(this.settings.channelMode==='luma')variance=Math.max(0,lumaSS/count-(lumaS/count)**2);
      else if(this.settings.channelMode==='saturation')variance=Math.max(0,satSS/count-(satS/count)**2);
      else if(this.settings.channelMode==='alpha')variance=variances[3];
      else variance=(variances[0]+variances[1]+variances[2])/3;
      const maskMean=maskSum/count,maskWeight=maskMean>=128?1+3*(maskMean-128)/127:.1+.9*maskMean/128;
      return{id:this.idCounter++,x,y,w,h,depthX,depthY,color,variance,error:Math.sqrt(variance),edge:edgeSum/count,sse:variance*area,maskWeight};
    }

    splitRects(cell,type){
      const {x,y,w,h}=cell,left=Math.floor(w/2),top=Math.floor(h/2),right=w-left,bottom=h-top;
      if(type==='horizontal')return[{x,y,w,h:top,dx:0,dy:1},{x,y:y+top,w,h:bottom,dx:0,dy:1}];
      if(type==='vertical')return[{x,y,w:left,h,dx:1,dy:0},{x:x+left,y,w:right,h,dx:1,dy:0}];
      return[{x,y,w:left,h:top,dx:1,dy:1},{x:x+left,y,w:right,h:top,dx:1,dy:1},{x,y:y+top,w:left,h:bottom,dx:1,dy:1},{x:x+left,y:y+top,w:right,h:bottom,dx:1,dy:1}];
    }

    typeAllowed(cell,type){
      const minW=this.settings.minWidth?this.width/this.settings.minWidth:1,minH=this.settings.minHeight?this.height/this.settings.minHeight:1;
      if(type==='horizontal')return cell.h>Math.ceil(minH);
      if(type==='vertical')return cell.w>Math.ceil(minW);
      return cell.w>Math.ceil(minW)&&cell.h>Math.ceil(minH);
    }

    proposal(cell){
      if(Object.prototype.hasOwnProperty.call(cell,'_proposal'))return cell._proposal;
      const mode=this.settings.splitMode,types=mode==='best'?['quad','horizontal','vertical']:[mode];let best=null;
      for(const type of types){if(!this.typeAllowed(cell,type))continue;const rects=this.splitRects(cell,type),children=rects.map(r=>this.computeCell(r.x,r.y,r.w,r.h,cell.depthX+r.dx,cell.depthY+r.dy)),gain=Math.max(0,cell.sse-children.reduce((a,c)=>a+c.sse,0)),efficiency=gain/(children.length-1);const item={type,children,gain,efficiency};if(!best||item.efficiency>best.efficiency)best=item}
      cell._proposal=best;return best;
    }

    score(cell,proposal){
      const area=cell.w*cell.h,aw=Number(this.settings.areaWeight),model=this.settings.priorityModel;let base;
      if(model==='gain')base=proposal?proposal.gain:0;
      else if(model==='deviation')base=cell.error*Math.pow(area,aw);
      else if(model==='edge')base=(cell.edge+cell.error*.12)*Math.pow(area,aw);
      else if(model==='random')base=(Math.sin(cell.id*999.91+this.position*13.7)+1.01)*Math.pow(area,aw*.25);
      else base=cell.variance*Math.pow(area,aw);
      return base*cell.maskWeight;
    }

    candidate(budget=Infinity){
      let best=null;
      for(let i=0;i<this.cells.length;i++){const cell=this.cells[i],proposal=this.proposal(cell);if(!proposal)continue;const delta=proposal.children.length-1;if(this.cells.length+delta>budget)continue;const score=this.score(cell,proposal);if(!best||score>best.score)best={cell,index:i,proposal,score}}
      return best;
    }

    metricPoint(){return{cells:this.cells.length,rmse:this.rmse()}}
    rmse(){if(!this.cells.length)return 0;return Math.sqrt(this.cells.reduce((a,c)=>a+c.sse,0)/(this.width*this.height))}

    step(budget=Infinity,qualityTarget=0){
      if(this.cells.length>=budget){this.lastStop='pixel budget reached';return null}
      if(qualityTarget>0&&this.rmse()<=qualityTarget){this.lastStop='quality target reached';return null}
      const choice=this.candidate(budget);if(!choice){this.lastStop='cell size limit reached';return null}
      if(this.position<this.history.length)this.history.splice(this.position);
      const op={parent:copyCell(choice.cell),children:choice.proposal.children.map(copyCell),type:choice.proposal.type,index:choice.index,score:choice.score};
      this.cells.splice(choice.index,1,...op.children.map(copyCell));this.history.push(op);this.position++;this.metrics=this.metrics.slice(0,this.position);this.metrics.push(this.metricPoint());this.lastStop='running';return op;
    }

    seek(position){
      const target=clamp(Math.round(position),0,this.history.length),cells=this.seedCells.map(copyCell);
      for(let p=0;p<target;p++){const op=this.history[p],index=cells.findIndex(c=>c.id===op.parent.id);if(index>=0)cells.splice(index,1,...op.children.map(copyCell))}
      this.cells=cells;this.position=target;this.lastStop=target?'history':'ready';return this.cells;
    }
    undo(){return this.seek(this.position-1)}
    redo(){return this.seek(this.position+1)}
    rewind(){return this.seek(0)}
    leavesAt(position){const current=this.position,cells=this.seek(position).map(copyCell);this.seek(current);return cells}

    cellAt(x,y){for(let i=this.cells.length-1;i>=0;i--){const c=this.cells[i];if(x>=c.x&&x<c.x+c.w&&y>=c.y&&y<c.y+c.h)return c}return null}

    serialize(){
      return{version:2,settings:{...this.settings},width:this.width,height:this.height,originalWidth:this.originalWidth,originalHeight:this.originalHeight,position:this.position,idCounter:this.idCounter,seedCells:this.seedCells.map(copyCell),history:this.history.map(op=>({parent:copyCell(op.parent),children:op.children.map(copyCell),type:op.type,index:op.index,score:op.score})),metrics:this.metrics.map(m=>({...m}))};
    }

    restore(state){
      this.settings={...defaults,...state.settings};this.originalWidth=state.originalWidth;this.originalHeight=state.originalHeight;this.seedCells=state.seedCells.map(copyCell);this.history=state.history.map(op=>({parent:copyCell(op.parent),children:op.children.map(copyCell),type:op.type,index:op.index,score:op.score}));this.metrics=(state.metrics||[]).map(m=>({...m}));this.idCounter=state.idCounter||1;this.seek(state.position??this.history.length);
    }
  }

  window.QuadEngine=QuadEngine;
})();
