'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

const PRESET_MEASUREMENTS = [
  'Waist','Outseam','Inseam','Rise','Thigh','Knee','Leg Opening',
  'Chest','Shoulder','Sleeve','Length','Hem','Bust','Hip','Armhole','Neck','Cuff',
];

const LINE_COLORS = [
  '#4FC3F7','#81C784','#FFB74D','#F06292','#CE93D8',
  '#4DB6AC','#FFF176','#FF8A65','#90CAF9','#A5D6A7',
  '#FFCC02','#EF9A9A','#80DEEA','#BCAAA4','#80CBC4','#FFAB91',
];

const HIT_RADIUS = 22;
const FREE_MAX_LINES = 4;
const FREE_MAX_EXPORTS_PER_DAY = 3;

function todayKey() {
  return 'measure_exports_' + new Date().toISOString().slice(0,10);
}

function getExportCount() {
  try { return parseInt(localStorage.getItem(todayKey())||'0',10); } catch(e) { return 0; }
}

function incrementExportCount() {
  try { localStorage.setItem(todayKey(), String(getExportCount()+1)); } catch(e) {}
}

async function fetchProStatus() {
  try {
    const res = await fetch('/api/auth/me')
    if (!res.ok) return false
    const data = await res.json()
    return data.pro === true
  } catch {
    return false
  }
}

function mid(a,b) { return {x:(a.x+b.x)/2,y:(a.y+b.y)/2}; }
function dist(a,b) { return Math.hypot(a.x-b.x,a.y-b.y); }

function drawEndDot(ctx,pt,color,r,highlight) {
  ctx.beginPath(); ctx.arc(pt.x,pt.y,r,0,Math.PI*2);
  ctx.fillStyle=highlight?'#ffffff':color; ctx.fill();
  ctx.strokeStyle=highlight?color:'rgba(0,0,0,0.5)';
  ctx.lineWidth=highlight?2.5:1; ctx.stroke();
}

function drawNumberTag(ctx,num,x,y,color) {
  const label=String(num);
  ctx.font='bold 10px monospace';
  const tw=ctx.measureText(label).width;
  const r=Math.max(9,tw/2+4);
  ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2);
  ctx.fillStyle='rgba(8,8,8,0.82)'; ctx.fill();
  ctx.strokeStyle=color; ctx.lineWidth=1.5; ctx.stroke();
  ctx.fillStyle=color; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(label,x,y);
}

function drawCrosshair(ctx,pt) {
  const g=2,size=14;
  const segs=[[pt.x-size,pt.y,pt.x-g,pt.y],[pt.x+g,pt.y,pt.x+size,pt.y],[pt.x,pt.y-size,pt.x,pt.y-g],[pt.x,pt.y+g,pt.x,pt.y+size]];
  ctx.strokeStyle='rgba(0,0,0,0.7)'; ctx.lineWidth=3;
  segs.forEach(([x1,y1,x2,y2])=>{ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();});
  ctx.strokeStyle='#e8b84b'; ctx.lineWidth=2;
  segs.forEach(([x1,y1,x2,y2])=>{ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();});
  ctx.beginPath();ctx.arc(pt.x,pt.y,3,0,Math.PI*2);ctx.fillStyle='#e8b84b';ctx.fill();
}

function renderCanvas(canvas,img,lines,ix,hoverIdx) {
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
    drawNumberTag(ctx,i+1,mid(p1,p2).x,mid(p1,p2).y,color);
    ctx.restore();
  });
  const {mode,p1,p2,color,dragging}=ix;
  if ((mode==='placing_p1'||mode==='placing_p2')&&p1) drawCrosshair(ctx,p1);
  if (mode==='adjusting'&&p1&&p2) {
    ctx.save();
    ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y);
    ctx.strokeStyle=color; ctx.lineWidth=2; ctx.setLineDash([6,3]); ctx.stroke(); ctx.setLineDash([]);
    drawEndDot(ctx,p1,color,8,dragging==='p1');
    drawEndDot(ctx,p2,color,8,dragging==='p2');
    drawNumberTag(ctx,lines.length+1,mid(p1,p2).x,mid(p1,p2).y,color);
    ctx.restore();
  }
}

function renderExportImage(canvas,img,lines) {
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
  const [customWatermark,setCustomWatermark] = useState('');
  const [showExport,setShowExport]   = useState(false);
  const [bgRemoving,setBgRemoving]   = useState(false);
  const [bgError,setBgError]         = useState(null);
  const [loadingStep,setLoadingStep] = useState(0);
  const [aspectRatio,setAspectRatio] = useState('original');
  const [ix,setIx]                   = useState({mode:'idle',p1:null,p2:null,color:LINE_COLORS[0],dragging:null});
  const [pro,setPro]                 = useState(false);
  const [exportCount,setExportCount] = useState(0);
  const [limitMsg,setLimitMsg]       = useState(null);
  const [gender,setGender]           = useState('female');
  const [rearGenerating,setRearGenerating] = useState(false);
  const [rearResult,setRearResult]   = useState(null);
  const [rearError,setRearError]     = useState(null);
  const [modelGenerating,setModelGenerating] = useState(false);
  const [modelResult,setModelResult] = useState(null);
  const [modelError,setModelError]   = useState(null);
  const [clothingType,setClothingType] = useState('');
  const [condition,setCondition]       = useState('');
  const [taggedSize,setTaggedSize]     = useState('');
  const [flaws,setFlaws]               = useState('');
  const [weightOz,setWeightOz]         = useState('');
  const [saving,setSaving]             = useState(false);
  const [saveError,setSaveError]       = useState(null);
  const [suggestedPrice,setSuggestedPrice] = useState(null);
  const [savedRecordId,setSavedRecordId]   = useState(null);

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
  const rearFileRef      = useRef(null);
  const modelFileRef     = useRef(null);
  const exportSectionRef = useRef(null);
  const ixRef            = useRef(ix);
  ixRef.current          = ix;

  const activeName = useCustom?(customName||'Measurement'):curName;

  // Load pro status and export count on mount
  useEffect(()=>{
    setExportCount(getExportCount());
    fetchProStatus().then(setPro);
  },[]);

  useEffect(()=>{
    renderCanvas(canvasRef.current,imgRef.current,lines,ix,hoverIdx);
  },[ix,lines,hoverIdx]);

  useEffect(()=>{
    if (phase!=='annotate'||!canvasRef.current||!imgRef.current) return;
    const maxW=window.innerWidth-16;
    const maxH=window.innerHeight*0.70;
    const {w,h}=naturalSize;
    const scale=Math.min(maxW/w,maxH/h);
    canvasRef.current.width=Math.floor(w*scale);
    canvasRef.current.height=Math.floor(h*scale);
    renderCanvas(canvasRef.current,imgRef.current,lines,ixRef.current,hoverIdx);
  },[phase,naturalSize]);

  const loadImageFromBlob=(blob)=>{
    const url=URL.createObjectURL(blob);
    const img=new Image();
    img.onload=()=>{
      imgRef.current=img;
      setNatural({w:img.naturalWidth,h:img.naturalHeight});
      setBgRemoving(false);
      setPhase('annotate');
      URL.revokeObjectURL(url);
    };
    img.src=url;
  };

  const handleFlatLay=useCallback((file)=>{
    if (!file||!file.type.startsWith('image/')) return;
    setLines([]); setColorIdx(0); setShowExport(false); setBgError(null); setLimitMsg(null);
    setIx({mode:'idle',p1:null,p2:null,color:LINE_COLORS[0],dragging:null});
    const reader=new FileReader();
    reader.onload=e=>{
      const img=new Image();
      img.onload=()=>{ imgRef.current=img; setNatural({w:img.naturalWidth,h:img.naturalHeight}); setPhase('annotate'); };
      img.src=e.target.result;
    };
    reader.readAsDataURL(file);
  },[]);

  const handleFile=useCallback(async(file)=>{
    if (!file||!file.type.startsWith('image/')) return;
    setLines([]); setColorIdx(0); setShowExport(false); setBgError(null); setLimitMsg(null);
    setIx({mode:'idle',p1:null,p2:null,color:LINE_COLORS[0],dragging:null});
    setBgRemoving(true); setLoadingStep(0);
    let stepIdx=0;
    const si=setInterval(()=>{ stepIdx=Math.min(stepIdx+1,4); setLoadingStep(stepIdx); },4000);
    try {
      const fd=new FormData(); fd.append('image_file',file); fd.append('gender',gender);
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

  const toCanvas=(clientX,clientY)=>{
    const c=canvasRef.current,r=c.getBoundingClientRect();
    return {x:(clientX-r.left)*(c.width/r.width),y:(clientY-r.top)*(c.height/r.height)};
  };

  const startNewLine=useCallback(()=>{
    if (!pro&&lines.length>=FREE_MAX_LINES) {
      setLimitMsg('Free plan is limited to 4 measurement lines. Upgrade to Pro for unlimited.');
      return;
    }
    setLimitMsg(null);
    const color=LINE_COLORS[colorIdx%LINE_COLORS.length];
    setIx({mode:'placing_p1',p1:null,p2:null,color,dragging:null});
  },[colorIdx,lines.length,pro]);

  const onTapCanvas=useCallback((clientX,clientY)=>{
    const pt=toCanvas(clientX,clientY);
    const cur=ixRef.current;
    if (cur.mode==='placing_p1') { setIx(p=>({...p,mode:'placing_p2',p1:pt})); return; }
    if (cur.mode==='placing_p2') { setIx(p=>({...p,mode:'adjusting',p2:pt})); return; }
    if (cur.mode==='adjusting') {
      const d1=dist(pt,cur.p1),d2=cur.p2?dist(pt,cur.p2):Infinity;
      if (d1<HIT_RADIUS) setIx(p=>({...p,dragging:'p1'}));
      else if (d2<HIT_RADIUS) setIx(p=>({...p,dragging:'p2'}));
    }
  },[]);

  const onMoveCanvas=useCallback((clientX,clientY)=>{
    const cur=ixRef.current;
    if (cur.mode==='adjusting'&&cur.dragging) {
      const pt=toCanvas(clientX,clientY);
      setIx(p=>({...p,[p.dragging]:pt}));
    }
  },[]);

  const onReleaseCanvas=useCallback(()=>{
    if (ixRef.current.dragging) setIx(p=>({...p,dragging:null}));
  },[]);

  const confirmLine=useCallback(()=>{
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

  const cancelLine=useCallback(()=>{
    setIx({mode:'idle',p1:null,p2:null,color:LINE_COLORS[colorIdx%LINE_COLORS.length],dragging:null});
  },[colorIdx]);

  const undo=()=>{
    if (ix.mode!=='idle') { cancelLine(); return; }
    setLines(p=>p.slice(0,-1)); setColorIdx(c=>Math.max(0,c-1));
  };

  const updLine=(i,f,v)=>setLines(prev=>prev.map((l,idx)=>idx===i?{...l,[f]:v}:l));
  const delLine=i=>setLines(prev=>prev.filter((_,idx)=>idx!==i));

  const buildExportCanvas=()=>{
    const src=canvasRef.current; if(!src||!imgRef.current) return null;
    let W=src.width,H=src.height;
    if(aspectRatio==='1:1'){W=Math.max(W,H);H=W;}
    else if(aspectRatio==='4:5'){H=Math.round(W*5/4);}
    else if(aspectRatio==='3:4'){H=Math.round(W*4/3);}

    const ROW_H=36,COLS=2,PAD=20;
    const rows=Math.ceil(lines.length/COLS);
    const tableH=lines.length>0?rows*ROW_H+48:0;
    const infoH=(brand||itemName||notes)?80:0;
    const WATERMARK_H=28;
    const ec=document.createElement('canvas');
    ec.width=W; ec.height=H+tableH+infoH+WATERMARK_H;
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
      ctx.fillStyle='#f0ede6'; ctx.fillRect(0,iy,W,infoH);
      ctx.fillStyle='#e0ddd6'; ctx.fillRect(0,iy,W,1);
      ctx.font='11px monospace'; ctx.fillStyle='#444';
      ctx.textBaseline='middle'; ctx.textAlign='left';
      const parts=[];
      if(brand) parts.push(`Brand: ${brand}`);
      if(itemName) parts.push(`Item: ${itemName}`);
      if(notes) parts.push(`Notes: ${notes}`);
      // Wrap text across multiple lines if needed
      const maxW=W-PAD*2;
      const lineH=18;
      const words=parts.join('  |  ').split(' ');
      let line='', lines=[], word;
      for(let i=0;i<words.length;i++){
        word=words[i];
        const test=line?line+' '+word:word;
        if(ctx.measureText(test).width>maxW&&line){lines.push(line);line=word;}
        else{line=test;}
      }
      if(line) lines.push(line);
      const totalH=lines.length*lineH;
      const startY=iy+(infoH-totalH)/2+lineH/2;
      lines.forEach((l,i)=>ctx.fillText(l,PAD,startY+i*lineH));
    }

    // Watermark — always present
    const wy=H+tableH+infoH;
    ctx.fillStyle='#1a1a1a'; ctx.fillRect(0,wy,W,WATERMARK_H);
    ctx.fillStyle='#e0ddd6'; ctx.fillRect(0,wy,W,1);
    ctx.textBaseline='middle'; ctx.textAlign='left';
    ctx.font='bold 9px monospace'; ctx.letterSpacing='0.15em';

    if(pro){
      const wmText=customWatermark||'MEASURE';
      ctx.fillStyle='#e8b84b'; ctx.fillText(wmText,PAD,wy+WATERMARK_H/2);
      ctx.font='9px monospace'; ctx.fillStyle='#444'; ctx.textAlign='right';
      ctx.fillText('Garment Annotation Tool',W-PAD,wy+WATERMARK_H/2);
    } else {
      ctx.fillStyle='#e8b84b'; ctx.fillText('MEASURE',PAD,wy+WATERMARK_H/2);
      ctx.font='9px monospace'; ctx.fillStyle='#666'; ctx.textAlign='right';
      ctx.fillText('Free Version - measure-app-v2-pl2.vercel.app',W-PAD,wy+WATERMARK_H/2);
    }

    return ec;
  };

  const handleExport=()=>{
    if(!pro&&exportCount>=FREE_MAX_EXPORTS_PER_DAY){
      setLimitMsg(`You've used all 3 free exports for today. Upgrade to Pro for unlimited exports.`);
      return;
    }
    const ec=buildExportCanvas(); if(!ec) return;
    const el=exportRef.current;
    el.width=ec.width; el.height=ec.height;
    el.getContext('2d').drawImage(ec,0,0);
    if(!pro){
      incrementExportCount();
      const newCount=getExportCount();
      setExportCount(newCount);
    }
    setShowExport(true);
    setSaving(true); setSuggestedPrice(null); setSavedRecordId(null); setSaveError(null);
    setTimeout(()=>exportSectionRef.current?.scrollIntoView({behavior:'smooth',block:'start'}),150);
    // Use the DOM-attached exportRef canvas — more reliable than the off-screen ec canvas
    exportRef.current.toBlob(async(blob)=>{
      if(!blob){
        console.error('[save-export] toBlob returned null — canvas may be tainted or empty');
        setSaveError('Failed to read export image for upload');
        setSaving(false);
        return;
      }
      console.log('[save-export] blob size:', blob.size, 'bytes');
      try{
        const fd=new FormData();
        fd.append('image',blob,'export.png');
        fd.append('brand',brand);
        fd.append('clothingType',clothingType);
        fd.append('condition',condition);
        fd.append('taggedSize',taggedSize);
        fd.append('flaws',flaws);
        fd.append('weightOz',weightOz);
        fd.append('measurements',JSON.stringify(lines));
        const res=await fetch('/api/inventory/save-export',{method:'POST',body:fd});
        if(res.ok){
          const d=await res.json();
          setSuggestedPrice(d.suggestedPrice);
          setSavedRecordId(d.recordId);
        } else {
          let errMsg='Inventory save failed';
          try{const e=await res.json();errMsg=e.error||(e.hint?e.error+' — '+e.hint:errMsg);}catch{}
          console.error('[save-export] API error',res.status,errMsg);
          setSaveError(errMsg);
        }
      }catch(e){
        console.error('[save-export] fetch error:',e);
        setSaveError('Network error during inventory save — check console for details');
      }
      setSaving(false);
    },'image/png');
  };

  const handleDownload=()=>{
    const el=exportRef.current; if(!el) return;
    el.toBlob(blob=>{
      if(!blob) return;
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url;
      a.download=`measure-sheet-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },'image/png');
  };


  const handleRearView = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setRearGenerating(true);
    setRearResult(null);
    setRearError(null);
    try {
      const fd = new FormData();
      fd.append("image_file", file);
      fd.append("gender", gender);
      fd.append("view", "rear");
      const res = await fetch("/api/ghost-mannequin", { method: "POST", body: fd });
      if (res.ok) {
        const blob = await res.blob();
        setRearResult(URL.createObjectURL(blob));
      } else {
        const err = await res.json().catch(() => ({}));
        setRearError(err.error || "Rear view generation failed.");
      }
    } catch (e) {
      setRearError("Rear view generation failed.");
    }
    setRearGenerating(false);
  };

  const handleRearDownload = () => {
    if (!rearResult) return;
    const a = document.createElement("a");
    a.href = rearResult;
    a.download = `rear-view-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleModelDressUp = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setModelGenerating(true);
    setModelResult(null);
    setModelError(null);
    try {
      const fd = new FormData();
      fd.append("image_file", file);
      fd.append("gender", gender);
      const res = await fetch("/api/model-dressup", { method: "POST", body: fd });
      if (res.ok) {
        const blob = await res.blob();
        setModelResult(URL.createObjectURL(blob));
      } else {
        const err = await res.json().catch(() => ({}));
        setModelError(err.error || "Model dress-up generation failed.");
      }
    } catch (e) {
      setModelError("Model dress-up generation failed.");
    }
    setModelGenerating(false);
  };

  const handleModelDownload = () => {
    if (!modelResult) return;
    const a = document.createElement("a");
    a.href = modelResult;
    a.download = `model-dressup-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const S={
    lbl:{fontFamily:'monospace',fontSize:11,letterSpacing:'0.18em',textTransform:'uppercase',color:'#999',marginBottom:5,display:'block'},
    inp:{fontFamily:'monospace',fontSize:12,padding:'7px 10px',border:'1px solid #2a2a2a',borderRadius:2,background:'#080808',color:'#f0ebe0',width:'100%'},
    ghost:{padding:'6px 10px',background:'transparent',border:'1px solid #2a2a2a',fontFamily:'monospace',fontSize:11,letterSpacing:'0.12em',textTransform:'uppercase',color:'#aaaaaa',cursor:'pointer',borderRadius:2},
  };

  const isIdle      = ix.mode==='idle';
  const isPlacing   = ix.mode==='placing_p1'||ix.mode==='placing_p2';
  const isAdjusting = ix.mode==='adjusting';

  const instrText=()=>{
    if(ix.mode==='idle')       return 'Tap "+ Add Line" to place a measurement';
    if(ix.mode==='placing_p1') return `Tap the START point of "${activeName}"`;
    if(ix.mode==='placing_p2') return `Tap the END point of "${activeName}"`;
    if(ix.mode==='adjusting')  return 'Drag endpoints to adjust. Tap Confirm when ready.';
    return '';
  };
  const instrColor=()=>{
    if(ix.mode==='placing_p1') return '#e8b84b';
    if(ix.mode==='placing_p2') return '#81C784';
    if(ix.mode==='adjusting')  return '#4FC3F7';
    return '#999';
  };

  const exportsLeft = FREE_MAX_EXPORTS_PER_DAY - exportCount;

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
          <div style={{fontFamily:'monospace',fontSize:11,color:'#999',letterSpacing:'0.1em'}}>Powered by Gemini - This may take 20-30 seconds</div>
        </div>
      )}

      {/* Header */}
      <div style={{borderBottom:'1px solid #1a1a1a',padding:'10px 16px',display:'flex',alignItems:'center',gap:12,flexShrink:0,flexWrap:'wrap'}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700}}>
          MEAS<span style={{color:'#e8b84b'}}>UR</span>E
        </div>
        <div style={{width:1,height:14,background:'#2a2a2a'}}/>
        <div style={{fontSize:11,color:'#999',letterSpacing:'0.18em',textTransform:'uppercase'}}>Garment Annotation Tool</div>
        <div style={{marginLeft:'auto',display:'flex',gap:6,alignItems:'center'}}>
          {/* Tier badge */}
          <div style={{padding:'3px 8px',borderRadius:2,background:pro?'#e8b84b22':'#1a1a1a',border:`1px solid ${pro?'#e8b84b44':'#2a2a2a'}`,fontSize:10,color:pro?'#e8b84b':'#aaaaaa',letterSpacing:'0.15em',textTransform:'uppercase'}}>
            {pro?'PRO':`FREE ${exportsLeft > 0 ? `(${exportsLeft} exports left)` : '(0 left)'}`}
          </div>
          {!pro&&(
            <button onClick={()=>window.location.href='/pricing'} style={{padding:'4px 10px',background:'#e8b84b',border:'none',fontFamily:'monospace',fontSize:11,letterSpacing:'0.12em',textTransform:'uppercase',cursor:'pointer',borderRadius:2,color:'#0d0d0d'}}>
              Upgrade
            </button>
          )}
          {phase==='annotate'&&(
            <button onClick={()=>fileRef.current.click()} style={S.ghost}>New Photo</button>
          )}
          <button
            onClick={()=>window.location.href='/inventory'}
            style={{background:'none',border:'none',fontFamily:'monospace',fontSize:11,color:'#f0ebe0',cursor:'pointer',letterSpacing:'0.08em',padding:'2px 4px',textDecoration:'underline'}}
          >
            Inventory
          </button>
          <button
            onClick={async()=>{await fetch('/api/auth/logout',{method:'POST'});window.location.href='/login';}}
            style={{background:'none',border:'none',fontFamily:'monospace',fontSize:11,color:'#f0ebe0',cursor:'pointer',letterSpacing:'0.08em',padding:'2px 4px',textDecoration:'underline'}}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* UPLOAD */}
      {phase==='upload'&&(
        <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:40}}>
          <div style={{maxWidth:560,width:'100%',display:'flex',flexDirection:'column',gap:24}}>
            <div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:30,fontWeight:700,lineHeight:1.2,marginBottom:10}}>
                Your measurements.<br/><span style={{color:'#e8b84b'}}>Beautifully annotated.</span>
              </div>
              <p style={{fontSize:11,color:'#999',lineHeight:1.8}}>
                Upload a garment photo. Place measurement lines. Generate a professional spec sheet.
              </p>
            </div>
            {/* Gender toggle */}
            <div style={{display:'flex',gap:8,marginBottom:4}}>
              <div onClick={()=>setGender('female')} style={{flex:1,padding:'8px',border:`1px solid ${gender==='female'?'#e8b84b':'#2a2a2a'}`,borderRadius:2,cursor:'pointer',background:gender==='female'?'#e8b84b11':'#080808',textAlign:'center',transition:'all 0.15s'}}>
                <div style={{fontSize:11,color:gender==='female'?'#e8b84b':'#999',fontFamily:'monospace',letterSpacing:'0.1em'}}>♀ Women's</div>
              </div>
              <div onClick={()=>setGender('male')} style={{flex:1,padding:'8px',border:`1px solid ${gender==='male'?'#4FC3F7':'#2a2a2a'}`,borderRadius:2,cursor:'pointer',background:gender==='male'?'#4FC3F711':'#080808',textAlign:'center',transition:'all 0.15s'}}>
                <div style={{fontSize:11,color:gender==='male'?'#4FC3F7':'#999',fontFamily:'monospace',letterSpacing:'0.1em'}}>♂ Men's</div>
              </div>
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
                <div style={{fontSize:11,color:'#999',letterSpacing:'0.12em',lineHeight:1.7,textTransform:'uppercase'}}>Already removed<br/>background</div>
                <div style={{marginTop:4,padding:'4px 12px',background:'#1a1a1a',border:'1px solid #2a2a2a',borderRadius:2,fontSize:11,color:'#999',fontFamily:'monospace',letterSpacing:'0.1em'}}>Skip BG Removal</div>
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
                <div style={{fontSize:11,color:'#999',letterSpacing:'0.12em',lineHeight:1.7,textTransform:'uppercase'}}>Auto background<br/>removal via Gemini</div>
                <div style={{marginTop:4,padding:'4px 12px',background:'#e8b84b22',border:'1px solid #e8b84b44',borderRadius:2,fontSize:11,color:'#e8b84b',fontFamily:'monospace',letterSpacing:'0.1em'}}>Auto Clean - Measure</div>
              </div>
            </div>
            <div style={{fontSize:11,color:'#999',letterSpacing:'0.12em',textAlign:'center',textTransform:'uppercase'}}>
              JPG - PNG - WEBP - Drop anywhere above
            </div>

            {/* Rear View Generator */}
            <div style={{borderTop:'1px solid #1a1a1a',paddingTop:20,display:'flex',flexDirection:'column',gap:12}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:14,color:'#f0ebe0'}}>Rear View Ghost Mannequin</div>
              <div style={{fontSize:11,color:'#999',letterSpacing:'0.12em',lineHeight:1.8,textTransform:'uppercase'}}>Upload the back-side product photo to generate a rear-facing ghost mannequin image.</div>
              <div
                onClick={()=>rearFileRef.current.click()}
                onDragOver={e=>{e.preventDefault();}}
                onDrop={e=>{e.preventDefault();handleRearView(e.dataTransfer.files[0]);}}
                style={{border:'2px dashed #2a2a2a',borderRadius:4,padding:'28px 20px',textAlign:'center',cursor:'pointer',transition:'border-color 0.2s',display:'flex',flexDirection:'column',alignItems:'center',gap:10}}
              >
                <div style={{fontSize:30}}>🔄</div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:13,color:'#f0ebe0'}}>Upload Back Photo</div>
                <div style={{fontSize:11,color:'#999',letterSpacing:'0.12em',textTransform:'uppercase'}}>Generates rear-facing ghost mannequin</div>
              </div>
              {rearGenerating&&(
                <div style={{display:'flex',alignItems:'center',gap:12,padding:'14px',background:'#080808',border:'1px solid #1e1e1e',borderRadius:2}}>
                  <div style={{width:18,height:18,borderRadius:'50%',border:'2px solid transparent',borderTopColor:'#e8b84b',animation:'spin 0.9s linear infinite',flexShrink:0}}/>
                  <span style={{fontFamily:'monospace',fontSize:11,color:'#e8b84b',letterSpacing:'0.1em'}}>Generating rear view — this may take 20–30 seconds...</span>
                </div>
              )}
              {rearError&&(
                <div style={{background:'#1a0a0a',border:'1px solid #c8401a',borderRadius:2,padding:'10px 12px'}}>
                  <span style={{fontFamily:'monospace',fontSize:11,color:'#EF9A9A'}}>{rearError}</span>
                </div>
              )}
              {rearResult&&(
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:12,padding:'16px',background:'#080808',border:'1px solid #2a2a2a',borderRadius:2}}>
                  <img src={rearResult} alt="Rear view" style={{maxWidth:'100%',borderRadius:2,boxShadow:'0 4px 24px rgba(0,0,0,0.6)'}}/>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={handleRearDownload} style={{padding:'10px 20px',background:'#e8b84b',border:'none',fontFamily:'monospace',fontSize:11,letterSpacing:'0.12em',textTransform:'uppercase',cursor:'pointer',borderRadius:2,color:'#0d0d0d',fontWeight:'bold'}}>
                      Download Rear View
                    </button>
                    <button onClick={()=>{setRearResult(null);setRearError(null);}} style={{padding:'10px 14px',background:'transparent',border:'1px solid #2a2a2a',fontFamily:'monospace',fontSize:11,letterSpacing:'0.12em',textTransform:'uppercase',cursor:'pointer',borderRadius:2,color:'#999'}}>
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Model Dress-Up */}
            <div style={{borderTop:'1px solid #1a1a1a',paddingTop:20,display:'flex',flexDirection:'column',gap:12}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:14,color:'#f0ebe0'}}>Model Dress-Up</div>
              </div>
              <div style={{fontSize:11,color:'#999',letterSpacing:'0.12em',lineHeight:1.8,textTransform:'uppercase'}}>Upload a garment photo to generate a professional model photo styled for ecommerce.</div>
              <div
                onClick={()=>modelFileRef.current.click()}
                onDragOver={e=>{e.preventDefault();}}
                onDrop={e=>{e.preventDefault();handleModelDressUp(e.dataTransfer.files[0]);}}
                style={{border:'2px dashed #e8b84b44',borderRadius:4,padding:'28px 20px',textAlign:'center',cursor:'pointer',transition:'border-color 0.2s',display:'flex',flexDirection:'column',alignItems:'center',gap:10}}
              >
                <div style={{fontSize:30}}>👗</div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:13,color:'#f0ebe0'}}>Upload Garment Photo</div>
                <div style={{fontSize:11,color:'#999',letterSpacing:'0.12em',textTransform:'uppercase'}}>Generates professional model ecommerce photo</div>
              </div>
              {modelGenerating&&(
                <div style={{display:'flex',alignItems:'center',gap:12,padding:'14px',background:'#080808',border:'1px solid #1e1e1e',borderRadius:2}}>
                  <div style={{width:18,height:18,borderRadius:'50%',border:'2px solid transparent',borderTopColor:'#e8b84b',animation:'spin 0.9s linear infinite',flexShrink:0}}/>
                  <span style={{fontFamily:'monospace',fontSize:11,color:'#e8b84b',letterSpacing:'0.1em'}}>Generating model photo — this may take 20–30 seconds...</span>
                </div>
              )}
              {modelError&&(
                <div style={{background:'#1a0a0a',border:'1px solid #c8401a',borderRadius:2,padding:'10px 12px'}}>
                  <span style={{fontFamily:'monospace',fontSize:11,color:'#EF9A9A'}}>{modelError}</span>
                </div>
              )}
              {modelResult&&(
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:12,padding:'16px',background:'#080808',border:'1px solid #2a2a2a',borderRadius:2}}>
                  <img src={modelResult} alt="Model dress-up" style={{maxWidth:'100%',borderRadius:2,boxShadow:'0 4px 24px rgba(0,0,0,0.6)'}}/>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={handleModelDownload} style={{padding:'10px 20px',background:'#e8b84b',border:'none',fontFamily:'monospace',fontSize:11,letterSpacing:'0.12em',textTransform:'uppercase',cursor:'pointer',borderRadius:2,color:'#0d0d0d',fontWeight:'bold'}}>
                      Download
                    </button>
                    <button onClick={()=>{setModelResult(null);setModelError(null);}} style={{padding:'10px 14px',background:'transparent',border:'1px solid #2a2a2a',fontFamily:'monospace',fontSize:11,letterSpacing:'0.12em',textTransform:'uppercase',cursor:'pointer',borderRadius:2,color:'#999'}}>
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ANNOTATE */}
      {phase==='annotate'&&(
        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>

          <div style={{background:'#060606',display:'flex',alignItems:'center',justifyContent:'center',padding:8,position:'relative',flexShrink:0}}>
            {bgError&&(
              <div style={{position:'absolute',top:8,left:'50%',transform:'translateX(-50%)',background:'rgba(90,26,26,0.95)',border:'1px solid #c8401a',borderRadius:2,padding:'8px 16px',zIndex:10,whiteSpace:'nowrap'}}>
                <span style={{fontFamily:'monospace',fontSize:11,color:'#EF9A9A'}}>{bgError}</span>
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

            {/* Limit message */}
            {limitMsg&&(
              <div style={{background:'#1a0a0a',border:'1px solid #c8401a',borderRadius:2,padding:'10px 12px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
                <span style={{fontSize:11,color:'#EF9A9A'}}>{limitMsg}</span>
                <button onClick={()=>window.location.href='/pricing'} style={{padding:'4px 10px',background:'#e8b84b',border:'none',fontFamily:'monospace',fontSize:11,letterSpacing:'0.12em',textTransform:'uppercase',cursor:'pointer',borderRadius:2,color:'#0d0d0d',whiteSpace:'nowrap'}}>
                  Upgrade
                </button>
              </div>
            )}

            {/* Instruction bar */}
            <div style={{background:`${instrColor()}11`,border:`1px solid ${instrColor()}33`,borderRadius:2,padding:'10px 12px'}}>
              <div style={{fontSize:11,color:instrColor(),fontWeight:'bold'}}>{instrText()}</div>
            </div>

            {/* Action buttons */}
            <div style={{display:'flex',gap:8}}>
              {isIdle&&(
                <button onClick={startNewLine} style={{flex:1,padding:'11px',background:'#e8b84b',border:'none',fontFamily:"'Playfair Display',serif",fontSize:14,fontWeight:700,cursor:'pointer',borderRadius:2,color:'#0d0d0d'}}>
                  + Add Line {!pro&&`(${lines.length}/${FREE_MAX_LINES})`}
                </button>
              )}
              {isAdjusting&&(
                <>
                  <button onClick={confirmLine} style={{flex:2,padding:'11px',background:'#81C784',border:'none',fontFamily:"'Playfair Display',serif",fontSize:14,fontWeight:700,cursor:'pointer',borderRadius:2,color:'#0d0d0d'}}>
                    Confirm Line
                  </button>
                  <button onClick={cancelLine} style={{flex:1,padding:'11px',background:'transparent',border:'1px solid #c8401a',fontFamily:'monospace',fontSize:11,letterSpacing:'0.1em',textTransform:'uppercase',cursor:'pointer',borderRadius:2,color:'#EF9A9A'}}>
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

            {/* Measurement name/value */}
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

            {/* Lines list */}
            {lines.length>0&&(
              <div style={{borderTop:'1px solid #1a1a1a',paddingTop:12}}>
                <span style={S.lbl}>Lines ({lines.length}{!pro?`/${FREE_MAX_LINES}`:' - unlimited'})</span>
                <div style={{display:'flex',flexDirection:'column',gap:5}}>
                  {lines.map((line,i)=>(
                    <div key={i} onMouseEnter={()=>setHoverIdx(i)} onMouseLeave={()=>setHoverIdx(null)}
                      style={{background:hoverIdx===i?'#111':'#080808',border:`1px solid ${hoverIdx===i?line.color+'44':'#1a1a1a'}`,borderLeft:`3px solid ${line.color}`,borderRadius:2,padding:'7px 9px',transition:'all 0.1s'}}>
                      <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:4}}>
                        <div style={{width:20,height:20,borderRadius:'50%',background:'rgba(8,8,8,0.85)',border:`1.5px solid ${line.color}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                          <span style={{fontFamily:'monospace',fontSize:11,color:line.color,fontWeight:'bold'}}>{i+1}</span>
                        </div>
                        <input type='text' value={line.name} onChange={e=>updLine(i,'name',e.target.value)} style={{...S.inp,flex:1,fontSize:11,padding:'2px 6px',color:line.color}}/>
                        <button onClick={()=>delLine(i)} style={{background:'transparent',border:'none',color:'#999',cursor:'pointer',fontSize:13,padding:'0 2px',flexShrink:0}}>x</button>
                      </div>
                      <div style={{display:'flex',gap:5,paddingLeft:22}}>
                        <input type='text' placeholder='value' value={line.value} onChange={e=>updLine(i,'value',e.target.value)} style={{...S.inp,flex:1,fontSize:11,padding:'2px 6px'}}/>
                        <select value={line.unit} onChange={e=>updLine(i,'unit',e.target.value)} style={{...S.inp,width:50,fontSize:11,padding:'2px 4px'}}><option value='"'>in</option><option value='cm'>cm</option></select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sheet details + export */}
            {lines.length>0&&isIdle&&(
              <div style={{borderTop:'1px solid #1a1a1a',paddingTop:12,display:'flex',flexDirection:'column',gap:8}}>
                <span style={S.lbl}>Sheet Details</span>
                <div>
                  <label style={S.lbl}>Export Format</label>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5}}>
                    {ASPECT_RATIOS.map(ar=>(
                      <div key={ar.id} onClick={()=>setAspectRatio(ar.id)}
                        style={{padding:'7px 8px',border:`1px solid ${aspectRatio===ar.id?'#e8b84b':'#2a2a2a'}`,borderRadius:2,cursor:'pointer',background:aspectRatio===ar.id?'#e8b84b11':'#080808',transition:'all 0.15s'}}>
                        <div style={{fontSize:11,color:aspectRatio===ar.id?'#e8b84b':'#999',fontWeight:'bold'}}>{ar.label}</div>
                        <div style={{fontSize:11,color:'#999',marginTop:1}}>{ar.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div><label style={S.lbl}>Brand</label><input type='text' placeholder='e.g. Moschino Jeans' value={brand} onChange={e=>setBrand(e.target.value)} style={S.inp}/></div>
                <div><label style={S.lbl}>Item</label><input type='text' placeholder='e.g. Love All Over' value={itemName} onChange={e=>setItemName(e.target.value)} style={S.inp}/></div>
                <div><label style={S.lbl}>Notes</label><input type='text' placeholder='e.g. Condition, colour' value={notes} onChange={e=>setNotes(e.target.value)} style={S.inp}/></div>

                {/* Item Details — saved to inventory, not printed on image */}
                <div style={{borderTop:'1px solid #1e1e1e',paddingTop:12,marginTop:4,display:'flex',flexDirection:'column',gap:8}}>
                  <span style={{...S.lbl,color:'#4FC3F7'}}>Item Details</span>
                  <div><label style={S.lbl}>Clothing Type</label><input type='text' placeholder='e.g. Jeans, Blazer, T-shirt' value={clothingType} onChange={e=>setClothingType(e.target.value)} style={S.inp}/></div>
                  <div>
                    <label style={S.lbl}>Condition</label>
                    <select value={condition} onChange={e=>setCondition(e.target.value)} style={S.inp}>
                      <option value=''>Select condition...</option>
                      <option value='Excellent / Like new'>Excellent / Like new</option>
                      <option value='Very good'>Very good</option>
                      <option value='Good'>Good</option>
                      <option value='Fair / Worn'>Fair / Worn</option>
                    </select>
                  </div>
                  <div><label style={S.lbl}>Tagged Size</label><input type='text' placeholder='e.g. M, 32, 10' value={taggedSize} onChange={e=>setTaggedSize(e.target.value)} style={S.inp}/></div>
                  <div><label style={S.lbl}>Weight (oz)</label><input type='number' step='0.1' min='0' placeholder='e.g. 12' value={weightOz} onChange={e=>setWeightOz(e.target.value)} style={S.inp}/></div>
                  <div>
                    <label style={S.lbl}>Flaws / Damage</label>
                    <textarea placeholder='Describe any flaws or damage...' value={flaws} onChange={e=>setFlaws(e.target.value)} style={{...S.inp,minHeight:56,resize:'vertical'}}/>
                  </div>
                </div>

                {pro&&(
                  <div>
                    <label style={S.lbl}>Custom Watermark (Pro)</label>
                    <input type='text' placeholder='e.g. Your Store Name' value={customWatermark} onChange={e=>setCustomWatermark(e.target.value)} style={S.inp}/>
                  </div>
                )}
                {!pro&&(
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 10px',background:exportsLeft===0?'#1a0808':'#080808',border:`1px solid ${exportsLeft===0?'#c8401a44':exportsLeft===1?'#e8b84b33':'#1e1e1e'}`,borderRadius:2}}>
                    <span style={{fontFamily:'monospace',fontSize:11,color:exportsLeft===0?'#EF9A9A':exportsLeft===1?'#e8b84b':'#999',letterSpacing:'0.04em'}}>
                      {exportsLeft>0
                        ?`${exportsLeft} export${exportsLeft===1?'':'s'} remaining today`
                        :'No exports remaining today'}
                    </span>
                    <span style={{fontFamily:'monospace',fontSize:11,color:exportsLeft===0?'#c8401a':'#999',letterSpacing:'0.08em'}}>
                      {exportCount}/{FREE_MAX_EXPORTS_PER_DAY}
                    </span>
                  </div>
                )}
                <button onClick={handleExport} style={{padding:'11px',background:exportsLeft===0&&!pro?'#1a1a1a':'#e8b84b',border:`1px solid ${exportsLeft===0&&!pro?'#2a2a2a':'transparent'}`,fontFamily:"'Playfair Display',serif",fontSize:14,fontWeight:700,letterSpacing:'0.06em',cursor:exportsLeft===0&&!pro?'not-allowed':'pointer',borderRadius:2,color:exportsLeft===0&&!pro?'#444':'#0d0d0d'}}>
                  Generate Sheet
                </button>
              </div>
            )}

            {/* Export preview */}
            <div ref={exportSectionRef} style={{display:showExport?'flex':'none',borderTop:'2px solid #e8b84b44',padding:'24px 0',flexDirection:'column',alignItems:'center',gap:16}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:'#e8b84b'}}>Measurement Sheet</div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <span style={{fontFamily:'monospace',fontSize:11,color:'#999',letterSpacing:'0.12em',textTransform:'uppercase'}}>Format:</span>
                <span style={{fontFamily:'monospace',fontSize:11,color:'#e8b84b',letterSpacing:'0.12em'}}>{ASPECT_RATIOS.find(a=>a.id===aspectRatio)?.label}</span>
              </div>
              <canvas ref={exportRef} style={{maxWidth:'100%',borderRadius:2,boxShadow:'0 8px 48px rgba(0,0,0,0.8)',border:'1px solid #2a2a2a'}}/>
              <div style={{display:'flex',gap:8,marginTop:4,flexWrap:'wrap',justifyContent:'center'}}>
                <button onClick={handleDownload} style={{padding:'10px 20px',background:'#e8b84b',border:'none',fontFamily:'monospace',fontSize:11,letterSpacing:'0.12em',textTransform:'uppercase',cursor:'pointer',borderRadius:2,color:'#0d0d0d',fontWeight:'bold'}}>
                  Download Image
                </button>
                <button onClick={handleExport} style={{...S.ghost,color:'#e8b84b',borderColor:'#e8b84b44'}}>Regenerate</button>
                <button onClick={()=>setShowExport(false)} style={S.ghost}>Close</button>
              </div>
              {saving&&(
                <div style={{display:'flex',alignItems:'center',gap:8,fontFamily:'monospace',fontSize:11,color:'#888'}}>
                  <div style={{width:11,height:11,borderRadius:'50%',border:'2px solid transparent',borderTopColor:'#e8b84b',animation:'spin 0.9s linear infinite',flexShrink:0}}/>
                  Saving to inventory...
                </div>
              )}
              {suggestedPrice&&(
                <div style={{padding:'12px 20px',background:'#0a150a',border:'1px solid #4db64433',borderRadius:2,textAlign:'center',minWidth:200}}>
                  <div style={{fontFamily:'monospace',fontSize:10,color:'#666',letterSpacing:'0.18em',textTransform:'uppercase',marginBottom:4}}>Suggested listing price</div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:'#81C784',fontWeight:700}}>${suggestedPrice.toFixed(2)}</div>
                </div>
              )}
              {saveError&&(
                <div style={{fontFamily:'monospace',fontSize:11,color:'#EF9A9A'}}>{saveError}</div>
              )}
              {savedRecordId&&(
                <button onClick={()=>window.location.href='/inventory'} style={{...S.ghost,color:'#4FC3F7',borderColor:'#4FC3F744',letterSpacing:'0.08em'}}>
                  View in Inventory →
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      <input ref={fileRef} type='file' accept='image/*' style={{display:'none'}} onChange={e=>handleFile(e.target.files[0])}/>
      <input ref={flatLayRef} type='file' accept='image/*' style={{display:'none'}} onChange={e=>handleFlatLay(e.target.files[0])}/>
      <input ref={rearFileRef} type='file' accept='image/*' style={{display:'none'}} onChange={e=>handleRearView(e.target.files[0])}/>
      <input ref={modelFileRef} type='file' accept='image/*' style={{display:'none'}} onChange={e=>handleModelDressUp(e.target.files[0])}/>

      <div style={{borderTop:'1px solid #111',padding:'7px 24px',display:'flex',justifyContent:'space-between',flexShrink:0}}>
        <span style={{fontSize:11,color:'#444'}}>MEASURE - Garment Annotation Tool</span>
        <span style={{fontSize:11,color:'#444'}}>Place - Adjust - Confirm</span>
      </div>
    </div>
  );
}
