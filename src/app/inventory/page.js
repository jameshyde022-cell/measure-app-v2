'use client';
import { useState, useEffect } from 'react';

const S = {
  lbl: { fontFamily:'monospace', fontSize:11, letterSpacing:'0.18em', textTransform:'uppercase', color:'#999', marginBottom:5, display:'block' },
  inp: { fontFamily:'monospace', fontSize:12, padding:'7px 10px', border:'1px solid #2a2a2a', borderRadius:2, background:'#080808', color:'#f0ebe0', width:'100%', boxSizing:'border-box' },
  ghost: { padding:'6px 10px', background:'transparent', border:'1px solid #2a2a2a', fontFamily:'monospace', fontSize:11, letterSpacing:'0.12em', textTransform:'uppercase', color:'#aaaaaa', cursor:'pointer', borderRadius:2 },
};

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}

function InventoryCard({ record, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ cursor:'pointer', background:'#111', border:`1px solid ${hover ? '#e8b84b55' : '#1e1e1e'}`, borderRadius:4, overflow:'hidden', transition:'border-color 0.15s' }}
    >
      <div style={{ aspectRatio:'3/4', background:'#080808', overflow:'hidden', position:'relative' }}>
        {record.image_url ? (
          <img
            src={record.image_url}
            alt={record.brand || 'Item'}
            style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
          />
        ) : (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#333', fontSize:24 }}>📷</div>
        )}
        {record.sold_price && (
          <div style={{ position:'absolute', top:6, right:6, background:'#0d1a0d', border:'1px solid #4db64444', borderRadius:2, padding:'2px 6px', fontFamily:'monospace', fontSize:10, color:'#81C784' }}>SOLD</div>
        )}
      </div>
      <div style={{ padding:'10px 12px' }}>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:13, color:'#f0ebe0', marginBottom:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{record.brand || '—'}</div>
        <div style={{ fontFamily:'monospace', fontSize:11, color:'#888', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{record.clothing_type || '—'}</div>
        <div style={{ fontFamily:'monospace', fontSize:10, color:'#555', marginTop:4 }}>{formatDate(record.created_at)}</div>
        {record.suggested_price && (
          <div style={{ fontFamily:'monospace', fontSize:11, color:'#81C784', marginTop:3 }}>${Number(record.suggested_price).toFixed(2)}</div>
        )}
      </div>
    </div>
  );
}

function DetailModal({ record: initialRecord, onClose, onUpdate }) {
  const [record, setRecord] = useState(initialRecord);
  const [editData, setEditData] = useState({
    listing_price: initialRecord.listing_price ?? '',
    sold_price: initialRecord.sold_price ?? '',
    sold_date: initialRecord.sold_date ? initialRecord.sold_date.slice(0, 10) : '',
  });
  const [updating, setUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState(null);
  const [tab, setTab] = useState('details'); // 'details' | 'listing'
  const [generatingListing, setGeneratingListing] = useState(false);
  const [listing, setListing] = useState(null);
  const [listingCsv, setListingCsv] = useState(null);
  const [listingError, setListingError] = useState(null);

  const handleUpdate = async () => {
    setUpdating(true);
    setUpdateMsg(null);
    try {
      const res = await fetch(`/api/inventory/${record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });
      if (res.ok) {
        const data = await res.json();
        setRecord(data.record);
        onUpdate(data.record);
        setUpdateMsg('Saved');
        setTimeout(() => setUpdateMsg(null), 2000);
      } else {
        setUpdateMsg('Save failed');
      }
    } catch {
      setUpdateMsg('Save failed');
    }
    setUpdating(false);
  };

  const handleGenerateListing = async () => {
    setGeneratingListing(true);
    setListing(null);
    setListingCsv(null);
    setListingError(null);
    try {
      const res = await fetch('/api/inventory/ebay-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: record.brand,
          clothingType: record.clothing_type,
          condition: record.condition,
          taggedSize: record.tagged_size,
          flaws: record.flaws,
          measurements: record.measurements || [],
          suggestedPrice: record.suggested_price,
          imageUrl: record.image_url,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setListing(data.listing);
        setListingCsv(data.csv);
      } else {
        const err = await res.json().catch(() => ({}));
        setListingError(err.error || 'Failed to generate listing');
      }
    } catch {
      setListingError('Failed to generate listing');
    }
    setGeneratingListing(false);
  };

  const downloadCsv = () => {
    if (!listingCsv) return;
    const blob = new Blob([listingCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ebay-listing-${record.id?.slice(0, 8) || 'item'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.88)', display:'flex', alignItems:'flex-start', justifyContent:'center', zIndex:1000, overflowY:'auto', padding:'20px 12px 40px' }}
    >
      <div style={{ background:'#0d0d0d', border:'1px solid #2a2a2a', borderRadius:4, width:'100%', maxWidth:640 }}>
        {/* Modal header */}
        <div style={{ padding:'14px 16px', borderBottom:'1px solid #1a1a1a', display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17, color:'#f0ebe0' }}>
              {record.brand || 'Item'}{record.clothing_type ? ` — ${record.clothing_type}` : ''}
            </div>
            <div style={{ fontFamily:'monospace', fontSize:10, color:'#555', marginTop:2 }}>{formatDate(record.created_at)}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#666', cursor:'pointer', fontSize:20, lineHeight:1, padding:'0 4px' }}>×</button>
        </div>

        {/* Tab switcher */}
        <div style={{ display:'flex', borderBottom:'1px solid #1a1a1a' }}>
          {[['details','Details'], ['listing','eBay Listing']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{ flex:1, padding:'10px', background:'none', border:'none', borderBottom:`2px solid ${tab === id ? '#e8b84b' : 'transparent'}`, fontFamily:'monospace', fontSize:11, letterSpacing:'0.12em', textTransform:'uppercase', color:tab === id ? '#e8b84b' : '#666', cursor:'pointer', transition:'all 0.15s' }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Details tab */}
        {tab === 'details' && (
          <div style={{ padding:'16px', display:'flex', flexDirection:'column', gap:14 }}>
            {record.image_url && (
              <img
                src={record.image_url}
                alt={record.brand || 'Item'}
                style={{ width:'100%', borderRadius:2, maxHeight:380, objectFit:'contain', background:'#080808', display:'block' }}
              />
            )}

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px 16px' }}>
              {[
                ['Brand', record.brand],
                ['Clothing Type', record.clothing_type],
                ['Condition', record.condition],
                ['Tagged Size', record.tagged_size],
                ['Suggested Price', record.suggested_price ? `$${Number(record.suggested_price).toFixed(2)}` : null],
                ['Listing Price', record.listing_price ? `$${Number(record.listing_price).toFixed(2)}` : null],
                ['Sold Price', record.sold_price ? `$${Number(record.sold_price).toFixed(2)}` : null],
                ['Sold Date', record.sold_date ? formatDate(record.sold_date) : null],
              ].map(([label, value]) => value ? (
                <div key={label}>
                  <span style={S.lbl}>{label}</span>
                  <span style={{ fontFamily:'monospace', fontSize:12, color:'#f0ebe0' }}>{value}</span>
                </div>
              ) : null)}
            </div>

            {record.flaws && (
              <div>
                <span style={S.lbl}>Flaws / Damage</span>
                <div style={{ fontFamily:'monospace', fontSize:12, color:'#EF9A9A', background:'#1a0a0a', border:'1px solid #c8401a22', borderRadius:2, padding:'8px 10px', lineHeight:1.6 }}>{record.flaws}</div>
              </div>
            )}

            {record.measurements && record.measurements.length > 0 && (
              <div>
                <span style={S.lbl}>Measurements</span>
                <div style={{ background:'#080808', border:'1px solid #1a1a1a', borderRadius:2, overflow:'hidden' }}>
                  {record.measurements.map((m, i) => (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontFamily:'monospace', fontSize:12, padding:'7px 10px', borderBottom: i < record.measurements.length - 1 ? '1px solid #111' : 'none' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        {m.color && <div style={{ width:8, height:8, borderRadius:'50%', background:m.color, flexShrink:0 }} />}
                        <span style={{ color:'#888' }}>{m.name}</span>
                      </div>
                      <span style={{ color:'#f0ebe0' }}>{m.value ? `${m.value}${m.unit}` : '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sale tracking form */}
            <div style={{ borderTop:'1px solid #1a1a1a', paddingTop:14 }}>
              <span style={S.lbl}>Sale Tracking</span>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  <div>
                    <label style={S.lbl}>Listing Price ($)</label>
                    <input type='number' step='0.01' min='0' placeholder='e.g. 35.00' value={editData.listing_price} onChange={e => setEditData(d => ({ ...d, listing_price: e.target.value }))} style={S.inp} />
                  </div>
                  <div>
                    <label style={S.lbl}>Sold Price ($)</label>
                    <input type='number' step='0.01' min='0' placeholder='e.g. 28.00' value={editData.sold_price} onChange={e => setEditData(d => ({ ...d, sold_price: e.target.value }))} style={S.inp} />
                  </div>
                </div>
                <div>
                  <label style={S.lbl}>Sold Date</label>
                  <input type='date' value={editData.sold_date} onChange={e => setEditData(d => ({ ...d, sold_date: e.target.value }))} style={S.inp} />
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <button onClick={handleUpdate} disabled={updating} style={{ padding:'8px 18px', background:'#e8b84b', border:'none', fontFamily:'monospace', fontSize:11, letterSpacing:'0.12em', textTransform:'uppercase', cursor:updating ? 'not-allowed' : 'pointer', borderRadius:2, color:'#0d0d0d', fontWeight:'bold', opacity:updating ? 0.6 : 1 }}>
                    {updating ? 'Saving...' : 'Save'}
                  </button>
                  {updateMsg && (
                    <span style={{ fontFamily:'monospace', fontSize:11, color: updateMsg === 'Saved' ? '#81C784' : '#EF9A9A' }}>{updateMsg}</span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => setTab('listing')}
              style={{ width:'100%', padding:'11px', background:'#0a0a1a', border:'1px solid #4FC3F733', fontFamily:"'Playfair Display',serif", fontSize:14, fontWeight:700, cursor:'pointer', borderRadius:2, color:'#4FC3F7' }}
            >
              Generate eBay Listing →
            </button>
          </div>
        )}

        {/* eBay Listing tab */}
        {tab === 'listing' && (
          <div style={{ padding:'16px', display:'flex', flexDirection:'column', gap:14 }}>
            {/* Pre-populated summary */}
            <div style={{ background:'#080808', border:'1px solid #1e1e1e', borderRadius:2, padding:'12px', display:'flex', flexDirection:'column', gap:6 }}>
              <span style={S.lbl}>Item Summary</span>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'8px 16px' }}>
                {[['Brand', record.brand], ['Type', record.clothing_type], ['Condition', record.condition], ['Size', record.tagged_size]].filter(([,v]) => v).map(([k, v]) => (
                  <div key={k} style={{ fontFamily:'monospace', fontSize:11 }}>
                    <span style={{ color:'#666' }}>{k}: </span>
                    <span style={{ color:'#f0ebe0' }}>{v}</span>
                  </div>
                ))}
              </div>
              {record.measurements && record.measurements.length > 0 && (
                <div style={{ fontFamily:'monospace', fontSize:11, color:'#666' }}>
                  {record.measurements.length} measurement{record.measurements.length !== 1 ? 's' : ''} included
                </div>
              )}
              {record.flaws && (
                <div style={{ fontFamily:'monospace', fontSize:11, color:'#EF9A9A' }}>Flaws: {record.flaws}</div>
              )}
              {record.image_url && (
                <div style={{ fontFamily:'monospace', fontSize:11, color:'#4FC3F7' }}>Photo pre-loaded ✓</div>
              )}
            </div>

            <button
              onClick={handleGenerateListing}
              disabled={generatingListing}
              style={{ width:'100%', padding:'13px', background:generatingListing ? '#1a1a1a' : '#e8b84b', border:'none', fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:700, cursor:generatingListing ? 'not-allowed' : 'pointer', borderRadius:2, color:generatingListing ? '#666' : '#0d0d0d', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}
            >
              {generatingListing && (
                <div style={{ width:14, height:14, borderRadius:'50%', border:'2px solid transparent', borderTopColor:'#666', animation:'spin 0.9s linear infinite' }} />
              )}
              {generatingListing ? 'Generating listing...' : '📋 Generate eBay Listing'}
            </button>

            {listingError && (
              <div style={{ background:'#1a0a0a', border:'1px solid #c8401a', borderRadius:2, padding:'10px 12px', fontFamily:'monospace', fontSize:11, color:'#EF9A9A' }}>{listingError}</div>
            )}

            {listing && (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {/* Title */}
                <div style={{ background:'#080808', border:'1px solid #1e1e1e', borderRadius:2, padding:'12px' }}>
                  <span style={S.lbl}>Listing Title</span>
                  <div style={{ fontFamily:'monospace', fontSize:13, color:'#f0ebe0', lineHeight:1.5 }}>{listing.title}</div>
                  <div style={{ fontFamily:'monospace', fontSize:10, color: listing.title?.length > 80 ? '#EF9A9A' : '#555', marginTop:4 }}>{listing.title?.length || 0}/80 characters</div>
                </div>

                {/* Description */}
                <div style={{ background:'#080808', border:'1px solid #1e1e1e', borderRadius:2, padding:'12px' }}>
                  <span style={S.lbl}>Description</span>
                  <div style={{ fontFamily:'monospace', fontSize:11, color:'#ccc', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{listing.description}</div>
                </div>

                {/* Key fields grid */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px 16px', background:'#080808', border:'1px solid #1e1e1e', borderRadius:2, padding:'12px' }}>
                  <span style={{ ...S.lbl, gridColumn:'1/-1' }}>Item Details</span>
                  {[
                    ['Category', listing.category],
                    ['Price', listing.price ? `$${listing.price}` : null],
                    ['Condition', listing.condition],
                    ...Object.entries(listing.itemSpecifics || {}),
                  ].filter(([, v]) => v).map(([k, v]) => (
                    <div key={k}>
                      <span style={S.lbl}>{k}</span>
                      <span style={{ fontFamily:'monospace', fontSize:12, color:'#f0ebe0' }}>{v}</span>
                    </div>
                  ))}
                </div>

                {/* Keywords */}
                {listing.keywords?.length > 0 && (
                  <div style={{ background:'#080808', border:'1px solid #1e1e1e', borderRadius:2, padding:'12px' }}>
                    <span style={S.lbl}>SEO Keywords</span>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:4 }}>
                      {listing.keywords.map((kw, i) => (
                        <span key={i} style={{ fontFamily:'monospace', fontSize:10, padding:'3px 7px', background:'#111', border:'1px solid #2a2a2a', borderRadius:2, color:'#888' }}>{kw}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Download */}
                <div style={{ display:'flex', gap:8, paddingTop:4 }}>
                  <button
                    onClick={downloadCsv}
                    style={{ flex:1, padding:'11px', background:'#e8b84b', border:'none', fontFamily:'monospace', fontSize:11, letterSpacing:'0.12em', textTransform:'uppercase', cursor:'pointer', borderRadius:2, color:'#0d0d0d', fontWeight:'bold' }}
                  >
                    Download eBay CSV
                  </button>
                  <button onClick={handleGenerateListing} disabled={generatingListing} style={{ ...S.ghost, color:'#e8b84b', borderColor:'#e8b84b33' }}>
                    Regenerate
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    fetch('/api/inventory/list')
      .then(r => { if (!r.ok) throw new Error('Failed'); return r.json(); })
      .then(d => { setRecords(d.records || []); setLoading(false); })
      .catch(() => { setError('Failed to load inventory. Make sure the exported_images table exists in Supabase.'); setLoading(false); });
  }, []);

  const handleUpdate = updatedRecord => {
    setRecords(rs => rs.map(r => r.id === updatedRecord.id ? updatedRecord : r));
    setSelectedRecord(updatedRecord);
  };

  return (
    <div style={{ background:'#0d0d0d', minHeight:'100vh', color:'#f0ebe0', fontFamily:'monospace' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ borderBottom:'1px solid #1a1a1a', padding:'10px 16px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', flexShrink:0 }}>
        <a href="/app" style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, textDecoration:'none', color:'inherit' }}>
          MEAS<span style={{ color:'#e8b84b' }}>UR</span>E
        </a>
        <div style={{ width:1, height:14, background:'#2a2a2a' }} />
        <div style={{ fontSize:11, color:'#999', letterSpacing:'0.18em', textTransform:'uppercase' }}>Inventory</div>
        <div style={{ marginLeft:'auto' }}>
          <a href="/app" style={{ fontFamily:'monospace', fontSize:11, color:'#f0ebe0', textDecoration:'underline' }}>← Back to Measure</a>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding:'24px 16px', maxWidth:1200, margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:20, gap:12 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:24 }}>My Inventory</div>
          {!loading && !error && (
            <div style={{ fontFamily:'monospace', fontSize:11, color:'#555' }}>
              {records.length} item{records.length !== 1 ? 's' : ''}
              {records.filter(r => r.sold_price).length > 0 && (
                <span style={{ color:'#81C784', marginLeft:8 }}>· {records.filter(r => r.sold_price).length} sold</span>
              )}
            </div>
          )}
        </div>

        {loading && (
          <div style={{ display:'flex', justifyContent:'center', alignItems:'center', padding:80, gap:12 }}>
            <div style={{ width:28, height:28, borderRadius:'50%', border:'2px solid transparent', borderTopColor:'#e8b84b', animation:'spin 0.9s linear infinite' }} />
            <span style={{ fontSize:11, color:'#666', letterSpacing:'0.1em' }}>Loading inventory...</span>
          </div>
        )}

        {error && (
          <div style={{ padding:'14px', background:'#1a0a0a', border:'1px solid #c8401a', borderRadius:2, color:'#EF9A9A', fontSize:12, lineHeight:1.6 }}>{error}</div>
        )}

        {!loading && !error && records.length === 0 && (
          <div style={{ textAlign:'center', padding:'70px 20px' }}>
            <div style={{ fontSize:48, marginBottom:14 }}>📦</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:'#666', marginBottom:6 }}>No items yet</div>
            <div style={{ fontSize:11, color:'#444', lineHeight:1.8, maxWidth:280, margin:'0 auto' }}>
              Export a measurement sheet from the Measure tool to add items to your inventory
            </div>
            <a href="/app" style={{ display:'inline-block', marginTop:20, padding:'10px 20px', background:'#e8b84b', color:'#0d0d0d', borderRadius:2, fontSize:11, fontFamily:'monospace', textDecoration:'none', letterSpacing:'0.12em', textTransform:'uppercase', fontWeight:'bold' }}>
              Go to Measure
            </a>
          </div>
        )}

        {!loading && records.length > 0 && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(155px, 1fr))', gap:12 }}>
            {records.map(record => (
              <InventoryCard
                key={record.id}
                record={record}
                onClick={() => setSelectedRecord(record)}
              />
            ))}
          </div>
        )}
      </div>

      {selectedRecord && (
        <DetailModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}
