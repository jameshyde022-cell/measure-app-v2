'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

const PRESET_MEASUREMENTS = [
  'Waist','Outseam','Inseam','Rise','Thigh','Knee','Leg Opening',
  'Chest','Shoulder','Sleeve','Back Length','Hem','Bust','Hip','Armhole','Neck','Cuff',
];

const LINE_COLORS = [
  '#4FC3F7','#81C784','#FFB74D','#F06292','#CE93D8',
  '#4DB6AC','#FFF176','#FF8A65','#90CAF9','#A5D6A7',
  '#FFCC02','#EF9A9A','#80DEEA','#BCAAA4','#80CBC4','#FFAB91',
];

const HIT_RADIUS = 22;

function mid(a, b) { return { x: (a.x+b.x)/2, y: (a.y+b.y)/2 }; }
function dist(a, b) { return Math.hypot(a.x-b.x, a.y-b.y); }

function drawEndDot(ctx, pt, color, r, highlight) {
  ctx.beginPath(); ctx.arc(pt.x,pt.y,r,0,Math.PI*2);
  ctx.fillStyle = highlight ? '#ffffff' : color;
  ctx.fill();
  ctx.strokeStyle = highlight ? color : 'rgba(0,0,0,0.5)';
  ctx.lineWidth = highlight ? 2.5 : 1;
  ctx.stroke();
}

function drawNumberTag(ctx, num, x, y, color) {
  const label = String(num);
  ctx.font = 'bold 10px monospace';
  const tw = ctx.measureText(label).width;
  const r = Math.max(9, tw/2+4);
  ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2);
  ctx.fillStyle='rgba(8,8,8,0.82)'; ctx.fill();
  ctx.strokeStyle=color; ctx.lineWidth=1.5; ctx.stroke();
  ctx.fillStyle=color; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(label,x,y);
}

function drawCrosshair(ctx, pt) {
  const g=2, size=14;
  const segs=[[pt.x-size,pt.y,pt.x-g,pt.y],[pt.x+g,pt.y,pt.x+size,pt.y],[pt.x,pt.y-size,pt.x,pt.y-g],[pt.x,pt.y+g,pt.x,pt.y+size]];
  ctx.strokeStyle='rgba(0,0,0,0.7)'; ctx.lineWidth=3;
  segs.forEach(([x1,y1,x2,y2])=>{ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();});
  ctx.strokeStyle='#e8b84b'; ctx.lineWidth=2;
  segs.forEach(([x1,y1,x2,y2])=>{ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();});
  ctx.beginPath();ctx.arc(pt.x,pt.y,3,0,Math.PI*2);ctx.fillStyle='#e8b84b';ctx.fill();
}

function renderCanvas(canvas, img, lines, ix, hoverIdx) {
  if (!canvas||!img) return;
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(img,0,0,canvas.width,canvas.height);

  lines.forEach((line,i)=>{
    const isH=hoverIdx===i;
    const {p1,p2,color}=line;
    ctx.save(); ctx.globalAlpha=isH?1:0.85;
    ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y);
    ctx.strokeStyle=color; ctx.lineWidth=isH?2:1.5; ctx.stroke();
    drawEndDot(ctx,p1,color,isH?5:3.5,false);
    drawEndDot(ctx,p2,color,isH?5:3.5,false);
    const m=mid(p1,p2);
    drawNumberTag(ctx,i+1,m.x,m.y,color);
    ctx.restore();
  });

  const {mode,p1,p2,color,dragging} = ix;

  if (mode==='placing_p1'||mode==='placing_p2') {
    if (p1) drawCrosshair(ctx,p1);
  }

  if (mode==='adjusting'&&p1&&p2) {
    ctx.save();
    ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y);
    ctx.strokeStyle=color; ctx.lineWidth=2; ctx.setLineDash([6,3]); ctx.stroke();
    ctx.setLineDash([]);
    drawEndDot(ctx,p1,color,8,dragging==='p1');
    drawEndDot(ctx,p2,color,8,dragging==='p2');
    const m=mid(p1,p2);
    drawNumberTag(ctx,lines.length+1,m.x,m.y,color);
    ctx.restore();
  }

  if (mode==='placing_p2'&&p1) {
    drawCrosshair(ctx,p1);
  }
}

function renderExportImage(canvas, img, lines) {
  if (!canvas||!img) return;
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(img,0,0,canvas.width,canvas.height);
  lines.forEach(line=>{
    const {p1,p2,color}=line;
    ctx.save(); ctx.globalAlpha=0.9;
    ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y);
    ctx.strokeStyle=color; ctx.lineWidth=1.5; ctx.stroke();
    drawEndDot(ctx,p1,color,3,false);
    drawEndDot(ctx,p2,color,3,false);
    ctx.restore();
  });
}

export default function MeasureTool() {
  const [phase,setPhase]             = useState('upload');
  const [naturalSize,setNatural]     = useState({w:1,h:1});
  const [lines,setLines]             = useState([]);
  const [hoverIdx,setHoverIdx]       = useState(null);
  const [dragging,setDragging]       = useState(false);
  const [colorIdx,setColorIdx]       = useState(0);
  const [curName,setCurName]         = useState('Waist');
  const [useCustom,setUseCustom]     = useState(false);
  const [customName,setCustom]       = useState('');
  const [curValue,setCurValue]       = useState('');
  const [curUnit,setCurUnit]         = useState('"');
  const [brand,setBrand]             = useState('');
  const [itemName,setItemName]       = useState('');
  const [notes,setNotes]             = useState('');
  const [showExport,setShowExport]   = useState(false);
  const [bgRemoving,setBgRemoving]   = useState(false);
  const [bgError,setBgError]         = useState(null);
  const [loadingStep,setLoadingStep] = useState(0);
  const [aspectRatio,setAspectRatio] = useState('original');
  const [ix, setIx] = useState({mode:'idle',p1:null,p2:null,color:LINE_COLORS[0],dragging:null});

  const ASPECT_RATIOS = [
    {id:'original', label:'Original',     desc:'As-is'},
    {id:'1:1',      label:'Square 1:1',   desc:'Poshmark / Depop'},
    {id:'4:5',      label:'Portrait 4:5', desc:'Instagram'},
    {id:'3:4',      label:'Standard 3:4', desc:'eBay'},
  ];

  const LOADING_STEPS = [
    'Uploading your photo...',
    'Analyzing garment details...',
    'Generating ghost mannequin...',
    'Applying invisible mannequin...',
    'Finalizing image...',
  ];

  const canvasRef        = useRef(null);
  const exportRef        = useRef(null);
  const imgRef           = useRef(null);
  const fileRef          = useRef(null);
  const flatLayRef       = useRef(null);
  const exportSectionRef = useRef(null);
  const ixRef            = useRef(ix);
  ixRef.current = ix;

  const activeName = useCustom?(customName||'Measurement'):curName;

  useEffect(()=>{
    renderCanvas(canvasRef.current, imgRef.current, lines, ix, hoverIdx);
  },[ix, lines, hoverIdx]);

  useEffect(()=>{
    if (phase!=='annotate'||!canvasRef.current||!imgRef.current) return;
    const maxW = window.innerWidth - 16;
    const maxH = window.innerHeight * 0.70;
    const {w,h} = naturalSize;
    const scale = Math.min(maxW/w, maxH/h);
    canvasRef.current.width  = Math.floor(w*scale);
    canvasRef.current.height = Math.floor(h*scale);
    renderCanvas(canvasRef.current, imgRef.current, lines, ixRef.current, hoverIdx);
  },[phase,naturalSize]);

  const loadImageFromBlob = (blob) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setNatural({w:img.naturalWidth,h:img.naturalHeight});
      setBgRemoving(false);
      setPhase('annotate');
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const handleFlatLay = useCallback((file)=>{
    if (!file||!file.type.startsWith('image/')) return;
    setLines([]); setColorIdx(0); setShowExport(false); setBgError(null);
    setIx({mode:'idle',p1:null,p2:null,color:LINE_COLORS[0],dragging:null});
    const reader=new FileReader();
    reader.onload=e=>{
      const img=new Image();
      img.onload=()=>{ imgRef.current=img; setNatural({w:img.naturalWidth,h:img.naturalHeight}); setPhase('annotate'); };
      img.src=e.target.result;
    };
    reader.readAsDataURL(file);
  },[]);

  const handleFile = useCallback(async (file)=>{
    if (!file||!file.type.startsWith('image/')) return;
    setLines([]); setColorIdx(0); setShowExport(false); setBgError(null);
    setIx({mode:'idle',p1:null,p2:null,color:LINE_COLORS[0],dragging:null});
    setBgRemoving(true); setLoadingStep(0);
    let stepIdx=0;
    const si=setInterval(()=>{ stepIdx=Math.min(stepIdx+1,4); setLoadingStep(stepIdx); },4000);
    try {
      const fd=new FormData(); fd.append('image_file',file);
      const res=await fetch('/api/ghost-mannequin',{method:'POST',body:fd});
      if (res.ok) { clearInterval(si); loadImageFromBlob(await res.blob()); return; }
      clearInterval(si);
      const err=await res.json().catch(()=>({}));
      setBgError(err.error||'Ghost mannequin generation failed. Using original photo.');
    } catch(e) { clearInterval(si); setBgError('Ghost mannequin generation failed. Using original photo.'); }
    const reader=new FileReader();
    reader.onload=e=>{
      const img=new Image();
      img.onload=()=>{ imgRef.current=img; setNatural({w:img.naturalWidth,h:img.naturalHeight}); setBgRemoving(false); setPhase('annotate'); };
      img.src=e.target.result;
    };
    reader.readAsDataURL(file);
  },[]);

  const toCanvas = (clientX,clientY)=>{
    const c=canvasRef.current, r=c.getBoundingClientRect();
    return {x:(clientX-r.left)*(c.width/r.width), y:(clientY-r.top)*(c.height/r.height)};
  };

  const startNewLine = useCallback(()=>{
    const color=LINE_COLORS[colorIdx%LINE_COLORS.length];
    setIx({mode:'placing_p1',p1:null,p2:null,color,dragging:null});
  },[colorIdx]);

  const onTapCanvas = useCallback((clientX,clientY)=>{
    const pt=toCanvas(clientX,clientY);
    const cur=ixRef.current;
    if (cur.mode==='placing_p1') { setIx(p=>({...p,mode:'placing_p2',p1:pt})); return; }
    if (cur.mode==='placing_p2') { setIx(p=>({...p,mode:'adjusting',p2:pt})); return; }
    if (cur.mode==='adjusting') {
      const d1=dist(pt,cur.p1), d2=cur.p2?dist(pt,cur.p2):Infinity;
      if (d1<HIT_RADIUS) setIx(p=>({...p,dragging:'p1'}));
      else if (d2<HIT_RADIUS) setIx(p=>({...p,dragging:'p2'}));
    }
  },[]);

  const onMoveCanvas = useCallback((clientX,clientY)=>{
    const cur=ixRef.current;
    if (cur.mode==='adjusting'&&cur.dragging) {
      const pt=toCanvas(clientX,clientY);
      setIx(p=>({...p,[p.dragging]:pt}));
    }
  },[]);

  const onReleaseCanvas = useCallback(()=>{
    if (ixRef.current.dragging) setIx(p=>({...p,dragging:null}));
  },[]);

  const confirmLine = useCallback(()=>{
    const cur=ixRef.current;
    if (cur.mode!=='adjusting'||!cur.p1||!cur.p2) return;
    setLines(prev=>[...prev,{name:activeName,value:curValue,unit:curUnit,p1:cur.p1,p2:cur.p2,color:cur.color}]);
    setCurValue('');
    if (!useCustom) {
      const idx=PRESET_MEASUREMENTS.indexOf(curName);
      if (idx>=0&&idx<PRESET_MEASUREMENTS.length-1) setCurName(PRESET_MEASUREMENTS[idx+1]);
    }
    setColorIdx(c=>c+1);
    setIx({mode:'idle',p1:null,p2:null,color:LINE_COLORS[(colorIdx+1)%LINE_COLORS.length],dragging:null});
  },[activeName,curValue,curUnit,colorIdx,curName,useCustom]);

  const cancelLine = useCallback(()=>{
    setIx({mode:'idle',p1:null,p2:null,color:LINE_COLORS[colorIdx%LINE_COLORS.length],dragging:null});
  },[colorIdx]);

  const undo = ()=>{
    if (ix.mode!=='idle') { cancelLine(); return; }
    setLines(p=>p.slice(0,-1)); setColorIdx(c=>Math.max(0,c-1));
  };

  const updLine=(i,f,v)=>setLines(prev=>prev.map((l,idx)=>idx===i?{...l,[f]:v}:l));
  const delLine=i=>setLines(prev=>prev.filter((_,idx)=>idx!==i));

  const handleExport=()=>{
    const src=canvasRef.current; if(!src||!imgRef.current) return;
    let W=src.width,H=src.height;
    if(aspectRatio==='1:1'){W=Math.max(W,H);H=W;}
    else if(aspectRatio==='4:5'){H=Math.round(W*5/4);}
    else if(aspectRatio==='3:4'){H=Math.round(W*4/3);}
    const ROW_H=36,COLS=2,PAD=20;
    const rows=Math.ceil(lines.length/COLS);
    const tableH=lines.length>0?rows*ROW_H+48:0;
    const infoH=(brand||itemName||notes)?68:0;
    const ec=document.createElement('canvas');
    ec.width=W; ec.height=H+tableH+infoH;
    const ctx=ec.getContext('2d');
    ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,W,H);
    const ic=document.createElement('canvas');
    ic.width=src.width; ic.height=src.height;
    renderExportImage(ic,imgRef.current,lines);
    ctx.drawImage(ic,Math.round((W-src.width)/2),Math.round((H-src.height)/2));
    if(lines.length>0){
      const tY=H;
      ctx.fillStyle='#f8f6f0'; ctx.fillRect(0,tY,W,tableH);
      ctx.fillStyle='#e0ddd6'; ctx.fillRect(0,tY,W,1);
      ctx.font='bold 11px monospace'; ctx.fillStyle='#888'; ctx.textBaseline='middle'; ctx.textAlign='left';
      ctx.fillText('MEASUREMENTS',PAD,tY+14);
      ctx.fillStyle='#e0ddd6'; ctx.fillRect(0,tY+26,W,1);
      const colW=(W-PAD*2)/COLS;
      lines.forEach((line,i)=>{
        const col=i%COLS,row=Math.floor(i/COLS);
        const x=PAD+col*colW,y=tY+28+row*ROW_H+ROW_H/2;
        ctx.beginPath(); ctx.arc(x+8,y,5,0,Math.PI*2); ctx.fillStyle=line.color; ctx.fill();
        ctx.font='bold 10px monospace'; ctx.fillStyle='#888'; ctx.textAlign='left';
        ctx.fillText(`${i+1}.`,x+18,y);
        ctx.font='11px monospace'; ctx.fillStyle='#333'; ctx.fillText(line.name,x+34,y);
        if(line.value){ctx.font='bold 13px monospace'; ctx.fillStyle='#1a1a1a'; ctx.textAlign='right'; ctx.fillText(`${line.value}${line.unit}`,x+colW-8,y);}
        if(col===COLS-1||i===lines.length-1){ctx.fillStyle='#ece9e2'; ctx.fillRect(PAD,tY+28+(row+1)*ROW_H-1,W-PAD*2,1);}
      });
    }
    if(infoH>0){
      const iy=H+tableH;
      ctx.fillStyle='#1a1a1a'; ctx.fillRect(0,iy,W,infoH);
      ctx.fillStyle='#333'; ctx.fillRect(0,iy,W,1);
      ctx.textBaseline='top'; ctx.textAlign='left'; let ty=iy+12;
      if(brand){ctx.font='bold 13px monospace';ctx.fillStyle='#f0ebe0';ctx.fillText(`Brand: ${brand}`,PAD,ty);ty+=18;}
      if(itemName){ctx.font='bold 13px monospace';ctx.fillStyle='#f0ebe0';ctx.fillText(`Item: ${itemName}`,PAD,ty);ty+=18;}
      if(notes){ctx.font='11px monospace';ctx.fillStyle='#888';ctx.fillText(`Notes: ${notes}`,PAD,ty);}
      ctx.font='9px monospace'; ctx.fillStyle='#444'; ctx.textAlign='right';
      ctx.fillText('MEASURE - Garment Annotation Tool',W-PAD,iy+infoH-12);
    }
    const el=exportRef.current;
    el.width=ec.width; el.height=ec.height;
    el.getContext('2d').drawImage(ec,0,0);
    setShowExport(true);
    setTimeout(()=>exportSectionRef.current?.scrollIntoView({behavior:'smooth',block:'start'}),150);
  };

  const S={
    lbl:{fontFamily:'monospace',fontSize:9,letterSpacing:'0.18em',textTransform:'uppercase',color:'#555',marginBottom:5,display:'block'},
    inp:{fontFamily:'monospace',fontSize:12,padding:'7px 10px',border:'1px solid #2a2a2a',borderRadius:2,background:'#080808',color:'#f0ebe0',width:'100%'},
    ghost:{padding:'6px 10px',background:'transparent',border:'1px solid #1e1e1e',fontFamily:'monospace',fontSize:9,letterSpacing:'0.12em',textTransform:'uppercase',color:'#555',cursor:'pointer',borderRadius:2},
  };

  const isIdle      = ix.mode==='idle';
  const isPlacing   = ix.mode==='placing_p1'||ix.mode==='placing_p2';
  const isAdjusting = ix.mode==='adjusting';

  const instrText = ()=>{
    if (ix.mode==='idle')        return 'Tap "Add Line" to place a measurement';
    if (ix.mode==='placing_p1')  return `Tap the START point of "${activeName}"`;
    if (ix.mode==='placing_p2')  return `Tap the END point of "${activeName}"`;
    if (ix.mode==='adjusting')   return 'Drag the endpoints to adjust. Tap Confirm when ready.';
    return '';
  };
  const instrColor = ()=>{
    if (ix.mode==='placing_p1') return '#e8b84b';
    if (ix.mode==='placing_p2') return '#81C784';
    if (ix.mode==='adjusting')  return '#4FC3F7';
    return '#555';
  };

  return (
    <div style={{background:'#0d0d0d',minHeight:'100vh',color:'#f0ebe0',display:'flex',flexDirection:'column',fontFamily:'monospace'}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {bgRemoving&&(
        <div style={{position:'fixed',inset:0,background:'rgba(6,6,6,0.97)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:24,zIndex:999}}>
          <div style={{position:'relative',width:80,height:80}}>
            {[0,1,2].map(i=>(
              <div key={i} style={{position:'absolute',inset:i*10,borderRadius:'50%',border:'2px solid transparent',borderTopColor:i===0?'#e8b84b':i===1?'#4FC3F7':'#444',animation:`spin ${[0.9,1.3,1.8][i]}s linear infinite ${i%2?'reverse':''}`}}/>
            ))}
          </div>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:'#f0ebe0',fontWeight:700}}>Generating Ghost Mannequin</div>
            <div style={{fontFamily:'monospace',fontSize:11,color:'#e8b84b',letterSpacing:'0.12em'}}>{LOADING_STEPS[loadingStep]}</div>
            <div style={{display:'flex',gap:8,marginTop:6}}>
              {LOADING_STEPS.map((_,i)=>(
                <div key={i} style={{width:i===loadingStep?28:8,height:4,borderRadius:2,background:i===loadingStep?'#e8b84b':i<loadingStep?'#666':'#222',transition:'all 0.4s'}}/>
              ))}
            </div>
          </div>
          <div style={{fontFamily:'monospace',fontSize:9,color:'#444',letterSpacing:'0.1em'}}>Powered by Gemini - This may take 20-30 seconds</div>
        </div>
      )}

      <div style={{borderBottom:'1px solid #1a1a1a',padding:'10px 16px',display:'flex',alignItems:'center',gap:12,flexShrink:0,flexWrap:'wrap'}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700}}>
          MEAS<span style={{color:'#e8b84b'}}>UR</span>E
        </div>
        <div style={{width:1,height:14,background:'#2a2a2a'}}/>
        <div style={{fontSize:9,color:'#444',letterSpacing:'0.18em',textTransform:'uppercase'}}>Garment Annotation Tool</div>
        {phase==='annotate'&&(
          <div style={{marginLeft:'auto',display:'flex',gap:6}}>
            {lines.length>0&&isIdle&&(
              <button onClick={handleExport} style={{padding:'6px 12px',background:'#e8b84b',border:'none',fontFamily:'monospace',fontSize:9,letterSpacing:'0.12em',textTransform:'uppercase',cursor:'pointer',borderRadius:2,color:'#0d0d0d'}}>
                Generate Sheet
              </button>
            )}
            <button onClick={()=>fileRef.current.click()} style={S.ghost}>New Photo</button>
          </div>
        )}
      </div>

      {phase==='upload'&&(
        <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:40}}>
          <div style={{maxWidth:560,width:'100%',display:'flex',flexDirection:'column',gap:24}}>
            <div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:30,fontWeight:700,lineHeight:1.2,marginBottom:10}}>
                Your measurements.<br/><span style={{color:'#e8b84b'}}>Beautifully annotated.</span>
              </div>
              <p style={{fontSize:11,color:'#555',lineHeight:1.8}}>
                Upload a garment photo. Place measurement lines. Generate a professional spec sheet.
              </p>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div
                onClick={()=>flatLayRef.current.click()}
                onDragOver={e=>{e.preventDefault();setDragging(true);}}
                onDragLeave={()=>setDragging(false)}
                onDrop={e=>{e.preventDefault();setDragging(false);handleFlatLay(e.dataTransfer.files[0]);}}
                style={{border:`2px dashed ${dragging?'#e8b84b':'#2a2a2a'}`,borderRadius:4,padding:'36px 20px',textAlign:'center',cursor:'pointer',transition:'border-color 0.2s',display:'flex',flexDirection:'column',alignItems:'center',gap:10}}
              >
                <div style={{fontSize:30}}>🧹</div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:14,color:'#f0ebe0'}}>Clean Flat-Lay</div>
                <div style={{fontSize:9,color:'#555',letterSpacing:'0.12em',lineHeight:1.7,textTransform:'uppercase'}}>Already removed<br/>background</div>
                <div style={{marginTop:4,padding:'4px 12px',background:'#1a1a1a',border:'1px solid #2a2a2a',borderRadius:2,fontSize:9,color:'#888',fontFamily:'monospace',letterSpacing:'0.1em'}}>Skip BG Removal</div>
              </div>
              <div
                onClick={()=>fileRef.current.click()}
                onDragOver={e=>{e.preventDefault();setDragging(true);}}
                onDragLeave={()=>setDragging(false)}
                onDrop={e=>{e.preventDefault();setDragging(false);handleFile(e.dataTransfer.files[0]);}}
                style={{border:`2px dashed ${dragging?'#e8b84b':'#2a2a2a'}`,borderRadius:4,padding:'36px 20px',textAlign:'center',cursor:'pointer',transition:'border-color 0.2s',display:'flex',flexDirection:'column',alignItems:'center',gap:10}}
              >
                <div style={{fontSize:30}}>📷</div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:14,color:'#f0ebe0'}}>Raw Photo</div>
                <div style={{fontSize:9,color:'#555',letterSpacing:'0.12em',lineHeight:1.7,textTransform:'uppercase'}}>Auto background<br/>removal via Gemini</div>
                <div style={{marginTop:4,padding:'4px 12px',background:'#e8b84b22',border:'1px solid #e8b84b44',borderRadius:2,fontSize:9,color:'#e8b84b',fontFamily:'monospace',letterSpacing:'0.1em'}}>Auto Clean - Measure</div>
              </div>
            </div>
            <div style={{fontSize:9,color:'#333',letterSpacing:'0.12em',textAlign:'center',textTransform:'uppercase'}}>
              JPG - PNG - WEBP - Drop anywhere above
            </div>
          </div>
        </div>
      )}

      {phase==='annotate'&&(
        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>

          <div style={{background:'#060606',display:'flex',alignItems:'center',justifyContent:'center',padding:8,position:'relative',flexShrink:0}}>
            {bgError&&(
              <div style={{position:'absolute',top:8,left:'50%',transform:'translateX(-50%)',background:'rgba(90,26,26,0.95)',border:'1px solid #c8401a',borderRadius:2,padding:'8px 16px',zIndex:10,whiteSpace:'nowrap'}}>
                <span style={{fontFamily:'monospace',fontSize:9,color:'#EF9A9A'}}>{bgError}</span>
                <button onClick={()=>setBgError(null)} style={{background:'transparent',border:'none',color:'#EF9A9A',cursor:'pointer',marginLeft:10,fontSize:12}}>x</button>
              </div>
            )}
            <canvas
              ref={canvasRef}
              onMouseDown={e=>onTapCanvas(e.clientX,e.clientY)}
              onMouseMove={e=>onMoveCanvas(e.clientX,e.clientY)}
              onMouseUp={onReleaseCanvas}
              onTouchStart={e=>{e.preventDefault();const t=e.touches[0];onTapCanvas(t.clientX,t.clientY);}}
              onTouchMove={e=>{e.preventDefault();const t=e.touches[0];onMoveCanvas(t.clientX,t.clientY);}}
              onTouchEnd={e=>{e.preventDefault();onReleaseCanvas();}}
              style={{cursor:isAdjusting?'grab':'crosshair',borderRadius:2,maxWidth:'100%',touchAction:'none',display:'block',boxShadow:'0 4px 40px rgba(0,0,0,0.7)'}}
            />
          </div>

          <div style={{flex:1,overflowY:'auto',padding:16,display:'flex',flexDirection:'column',gap:12}}>

            <div style={{background:`${instrColor()}11`,border:`1px solid ${instrColor()}33`,borderRadius:2,padding:'10px 12px'}}>
              <div style={{fontSize:10,color:instrColor(),fontWeight:'bold'}}>{instrText()}</div>
            </div>

            <div style={{display:'flex',gap:8}}>
              {isIdle&&(
                <button onClick={startNewLine} style={{flex:1,padding:'11px',background:'#e8b84b',border:'none',fontFamily:"'Playfair Display',serif",fontSize:14,fontWeight:700,cursor:'pointer',borderRadius:2,color:'#0d0d0d'}}>
                  + Add Line
                </button>
              )}
              {isAdjusting&&(
                <>
                  <button onClick={confirmLine} style={{flex:2,padding:'11px',background:'#81C784',border:'none',fontFamily:"'Playfair Display',serif",fontSize:14,fontWeight:700,cursor:'pointer',borderRadius:2,color:'#0d0d0d'}}>
                    Confirm Line
                  </button>
                  <button onClick={cancelLine} style={{flex:1,padding:'11px',background:'transparent',border:'1px solid #c8401a',fontFamily:'monospace',fontSize:9,letterSpacing:'0.1em',textTransform:'uppercase',cursor:'pointer',borderRadius:2,color:'#EF9A9A'}}>
                    Cancel
                  </button>
                </>
              )}
              {isPlacing&&(
                <button onClick={cancelLine} style={{...S.ghost,flex:1}}>Cancel</button>
              )}
              {isIdle&&(
                <button onClick={undo} style={S.ghost}>Undo</button>
              )}
            </div>

            {!isIdle&&(
              <div style={{background:'#080808',border:'1px solid #1e1e1e',borderRadius:2,padding:'13px',display:'flex',flexDirection:'column',gap:10}}>
                <div>
                  <label style={S.lbl}>Measurement Name</label>
                  <select value={useCustom?'__custom__':curName} onChange={e=>{if(e.target.value==='__custom__')setUseCustom(true);else{setUseCustom(false);setCurName(e.target.value);}}} style={S.inp}>
                    {PRESET_MEASUREMENTS.map(m=><option key={m} value={m}>{m}</option>)}
                    <option value='__custom__'>Custom...</option>
                  </select>
                </div>
                {useCustom&&(
                  <div>
                    <label style={S.lbl}>Custom Name</label>
                    <input type='text' placeholder='e.g. Crotch depth' value={customName} onChange={e=>setCustom(e.target.value)} style={S.inp}/>
                  </div>
                )}
                <div style={{display:'flex',gap:6}}>
                  <div style={{flex:1}}><label style={S.lbl}>Value (optional)</label><input type='text' placeholder='e.g. 16.5' value={curValue} onChange={e=>setCurValue(e.target.value)} style={S.inp}/></div>
                  <div style={{width:58}}><label style={S.lbl}>Unit</label><select value={curUnit} onChange={e=>setCurUnit(e.target.value)} style={S.inp}><option value='"'>in</option><option value='cm'>cm</option></select></div>
                </div>
              </div>
            )}

            {lines.length>0&&(
              <div style={{borderTop:'1px solid #1a1a1a',paddingTop:12}}>
                <span style={S.lbl}>Lines ({lines.length})</span>
                <div style={{display:'flex',flexDirection:'column',gap:5}}>
                  {lines.map((line,i)=>(
                    <div key={i} onMouseEnter={()=>setHoverIdx(i)} onMouseLeave={()=>setHoverIdx(null)}
                      style={{background:hoverIdx===i?'#111':'#080808',border:`1px solid ${hoverIdx===i?line.color+'44':'#1a1a1a'}`,borderLeft:`3px solid ${line.color}`,borderRadius:2,padding:'7px 9px',transition:'all 0.1s'}}>
                      <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:4}}>
                        <div style={{width:16,height:16,borderRadius:'50%',background:'rgba(8,8,8,0.85)',border:`1.5px solid ${line.color}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                          <span style={{fontFamily:'monospace',fontSize:8,color:line.color,fontWeight:'bold'}}>{i+1}</span>
                        </div>
                        <input type='text' value={line.name} onChange={e=>updLine(i,'name',e.target.value)} style={{...S.inp,flex:1,fontSize:10,padding:'2px 6px',color:line.color}}/>
                        <button onClick={()=>delLine(i)} style={{background:'transparent',border:'none',color:'#333',cursor:'pointer',fontSize:13,padding:'0 2px',flexShrink:0}}>x</button>
                      </div>
                      <div style={{display:'flex',gap:5,paddingLeft:22}}>
                        <input type='text' placeholder='value' value={line.value} onChange={e=>updLine(i,'value',e.target.value)} style={{...S.inp,flex:1,fontSize:11,padding:'2px 6px'}}/>
                        <select value={line.unit} onChange={e=>updLine(i,'unit',e.target.value)} style={{...S.inp,width:50,fontSize:10,padding:'2px 4px'}}><option value='"'>in</option><option value='cm'>cm</option></select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {lines.length>0&&isIdle&&(
              <div style={{borderTop:'1px solid #1a1a1a',paddingTop:12,display:'flex',flexDirection:'column',gap:8}}>
                <span style={S.lbl}>Sheet Details</span>
                <div>
                  <label style={S.lbl}>Export Format</label>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5}}>
                    {ASPECT_RATIOS.map(ar=>(
                      <div key={ar.id} onClick={()=>setAspectRatio(ar.id)}
                        style={{padding:'7px 8px',border:`1px solid ${aspectRatio===ar.id?'#e8b84b':'#2a2a2a'}`,borderRadius:2,cursor:'pointer',background:aspectRatio===ar.id?'#e8b84b11':'#080808',transition:'all 0.15s'}}>
                        <div style={{fontSize:10,color:aspectRatio===ar.id?'#e8b84b':'#888',fontWeight:'bold'}}>{ar.label}</div>
                        <div style={{fontSize:8,color:'#444',marginTop:1}}>{ar.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div><label style={S.lbl}>Brand</label><input type='text' placeholder='e.g. Moschino Jeans' value={brand} onChange={e=>setBrand(e.target.value)} style={S.inp}/></div>
                <div><label style={S.lbl}>Item</label><input type='text' placeholder='e.g. Love All Over' value={itemName} onChange={e=>setItemName(e.target.value)} style={S.inp}/></div>
                <div><label style={S.lbl}>Notes</label><input type='text' placeholder='e.g. Condition, colour' value={notes} onChange={e=>setNotes(e.target.value)} style={S.inp}/></div>
                <button onClick={handleExport} style={{padding:'11px',background:'#e8b84b',border:'none',fontFamily:"'Playfair Display',serif",fontSize:14,fontWeight:700,letterSpacing:'0.06em',cursor:'pointer',borderRadius:2,color:'#0d0d0d'}}>
                  Generate Sheet
                </button>
              </div>
            )}

            <div ref={exportSectionRef} style={{display:showExport?'flex':'none',borderTop:'2px solid #e8b84b44',padding:'24px 0',flexDirection:'column',alignItems:'center',gap:16}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:'#e8b84b'}}>Measurement Sheet</div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <span style={{fontFamily:'monospace',fontSize:9,color:'#444',letterSpacing:'0.12em',textTransform:'uppercase'}}>Format:</span>
                <span style={{fontFamily:'monospace',fontSize:9,color:'#e8b84b',letterSpacing:'0.12em'}}>{ASPECT_RATIOS.find(a=>a.id===aspectRatio)?.label}</span>
              </div>
              <p style={{fontFamily:'monospace',fontSize:10,color:'#555',letterSpacing:'0.1em',textAlign:'center',lineHeight:1.8}}>
                <strong style={{color:'#888'}}>Long press / Right-click</strong> to save image
              </p>
              <canvas ref={exportRef} style={{maxWidth:'100%',borderRadius:2,boxShadow:'0 8px 48px rgba(0,0,0,0.8)',border:'1px solid #2a2a2a'}}/>
              <div style={{display:'flex',gap:8,marginTop:4}}>
                <button onClick={handleExport} style={{...S.ghost,color:'#e8b84b',borderColor:'#e8b84b44'}}>Regenerate</button>
                <button onClick={()=>setShowExport(false)} style={S.ghost}>Close</button>
              </div>
            </div>

          </div>
        </div>
      )}

      <input ref={fileRef} type='file' accept='image/*' style={{display:'none'}} onChange={e=>handleFile(e.target.files[0])}/>
      <input ref={flatLayRef} type='file' accept='image/*' style={{display:'none'}} onChange={e=>handleFlatLay(e.target.files[0])}/>

      <div style={{borderTop:'1px solid #111',padding:'7px 24px',display:'flex',justifyContent:'space-between',flexShrink:0}}>
        <span style={{fontSize:8,color:'#1e1e1e'}}>MEASURE - Garment Annotation Tool</span>
        <span style={{fontSize:8,color:'#1e1e1e'}}>Place - Adjust - Confirm</span>
      </div>
    </div>
  );
}
