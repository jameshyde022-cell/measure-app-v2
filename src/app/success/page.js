'use client';

import { useEffect, useState } from 'react';

export default function SuccessPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <div style={{background:'#0d0d0d',minHeight:'100vh',color:'#f0ebe0',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'monospace'}}>
      <div style={{maxWidth:480,width:'100%',padding:40,display:'flex',flexDirection:'column',alignItems:'center',gap:24,textAlign:'center'}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:48,color:'#e8b84b'}}>✓</div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:700}}>
          Welcome to Pro
        </div>
        <p style={{fontSize:11,color:'#555',lineHeight:1.8}}>
          Your subscription is active. You now have unlimited exports, unlimited measurement lines, and a custom watermark on your spec sheets.
        </p>
        <button
          onClick={()=>window.location.href='/'}
          style={{padding:'14px 32px',background:'#e8b84b',border:'none',fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:700,cursor:'pointer',borderRadius:2,color:'#0d0d0d'}}
        >
          Start Measuring
        </button>
      </div>
    </div>
  );
}
