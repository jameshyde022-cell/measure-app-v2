'use client';

import { useState, useEffect } from 'react';

const S = {
  page: { background: '#0d0d0d', minHeight: '100vh', color: '#f0ebe0', fontFamily: 'monospace', padding: '40px 32px' },
  header: { fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, marginBottom: 4 },
  sub: { fontSize: 10, color: '#444', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 40 },
  card: { background: '#080808', border: '1px solid #1e1e1e', borderRadius: 4, padding: '24px' },
  lbl: { fontSize: 9, color: '#555', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 6, display: 'block' },
  inp: { fontFamily: 'monospace', fontSize: 12, padding: '10px 12px', border: '1px solid #2a2a2a', borderRadius: 2, background: '#0d0d0d', color: '#f0ebe0', width: '100%', boxSizing: 'border-box' },
  btn: { padding: '11px 24px', background: '#e8b84b', border: 'none', fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 700, cursor: 'pointer', borderRadius: 2, color: '#0d0d0d', letterSpacing: '0.04em' },
  ghost: { padding: '8px 16px', background: 'transparent', border: '1px solid #2a2a2a', fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', cursor: 'pointer', borderRadius: 2 },
};

function downloadCSV(list) {
  const header = ['Email', 'Plan', 'Joined', 'Last Active'];
  const rows = list.map(r => [
    r.email,
    r.plan,
    r.joined ? new Date(r.joined).toLocaleDateString() : '',
    r.last_active ? new Date(r.last_active).toLocaleDateString() : '',
  ]);
  const csv = [header, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `measure-marketing-list-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [influencers, setInfluencers] = useState([]);
  const [fetching, setFetching] = useState(true);

  const [marketingList, setMarketingList] = useState([]);
  const [fetchingMarketing, setFetchingMarketing] = useState(false);
  const [marketingLoaded, setMarketingLoaded] = useState(false);

  const fetchInfluencers = async () => {
    setFetching(true);
    try {
      const res = await fetch('/api/influencers');
      if (res.ok) {
        const data = await res.json();
        setInfluencers(data.influencers || []);
      }
    } catch (e) {}
    setFetching(false);
  };

  const fetchMarketingList = async () => {
    setFetchingMarketing(true);
    try {
      const res = await fetch('/api/marketing-list');
      if (res.ok) {
        const data = await res.json();
        setMarketingList(data.list || []);
        setMarketingLoaded(true);
      }
    } catch (e) {}
    setFetchingMarketing(false);
  };

  useEffect(() => { fetchInfluencers(); }, []);

  const handleCreate = async () => {
    if (!name || !email || !code) {
      setMessage({ type: 'error', text: 'All fields required.' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/create-influencer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, code }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Army Director created! Code: ${data.influencer.code}` });
        setName(''); setEmail(''); setCode('');
        fetchInfluencers();
      } else {
        setMessage({ type: 'error', text: data.error || 'Something went wrong.' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Network error.' });
    }
    setLoading(false);
  };

  return (
    <div style={S.page}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        <div style={S.header}>MEAS<span style={{ color: '#e8b84b' }}>UR</span>E</div>
        <div style={S.sub}>Admin</div>

        {/* Create influencer form */}
        <div style={{ ...S.card, marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: '#e8b84b', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 20 }}>
            New Army Director
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={S.lbl}>Name</label>
              <input style={S.inp} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sarah K" />
            </div>
            <div>
              <label style={S.lbl}>Email</label>
              <input style={S.inp} value={email} onChange={e => setEmail(e.target.value)} placeholder="sarah@email.com" />
            </div>
            <div>
              <label style={S.lbl}>Referral Code</label>
              <input style={S.inp} value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="e.g. SARAH20" />
            </div>
          </div>
          {message && (
            <div style={{ marginBottom: 14, padding: '8px 12px', borderRadius: 2, background: message.type === 'error' ? '#1a0a0a' : '#0a1a0a', border: `1px solid ${message.type === 'error' ? '#c8401a' : '#2a6a2a'}` }}>
              <span style={{ fontSize: 10, color: message.type === 'error' ? '#EF9A9A' : '#81C784' }}>{message.text}</span>
            </div>
          )}
          <button style={S.btn} onClick={handleCreate} disabled={loading}>
            {loading ? 'Creating…' : 'Create Army Director →'}
          </button>
        </div>

        {/* Influencer list */}
        <div style={{ ...S.card, marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: '#e8b84b', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 20 }}>
            Army Directors ({influencers.length})
          </div>
          {fetching ? (
            <div style={{ fontSize: 10, color: '#444' }}>Loading…</div>
          ) : influencers.length === 0 ? (
            <div style={{ fontSize: 10, color: '#444' }}>No Army Directors yet.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Name', 'Email', 'Code', 'Earnings', 'Created'].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 9, color: '#444', letterSpacing: '0.15em', textTransform: 'uppercase', paddingBottom: 10, borderBottom: '1px solid #1a1a1a' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {influencers.map((inf) => (
                  <tr key={inf.id} style={{ borderBottom: '1px solid #111' }}>
                    <td style={{ padding: '12px 0', fontSize: 12, color: '#f0ebe0' }}>{inf.name}</td>
                    <td style={{ padding: '12px 0', fontSize: 11, color: '#666' }}>{inf.email}</td>
                    <td style={{ padding: '12px 0' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#e8b84b', background: '#e8b84b11', padding: '3px 8px', borderRadius: 2, border: '1px solid #e8b84b22' }}>{inf.code}</span>
                    </td>
                    <td style={{ padding: '12px 0', fontSize: 12, color: '#81C784' }}>${(inf.earnings_cents / 100).toFixed(2)}</td>
                    <td style={{ padding: '12px 0', fontSize: 10, color: '#444' }}>{new Date(inf.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Marketing list */}
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: '#e8b84b', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Marketing List {marketingLoaded && `(${marketingList.length})`}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {!marketingLoaded && (
                <button style={S.ghost} onClick={fetchMarketingList} disabled={fetchingMarketing}>
                  {fetchingMarketing ? 'Loading…' : 'Load List'}
                </button>
              )}
              {marketingLoaded && marketingList.length > 0 && (
                <button style={S.ghost} onClick={() => downloadCSV(marketingList)}>
                  Export CSV
                </button>
              )}
              {marketingLoaded && (
                <button style={S.ghost} onClick={fetchMarketingList} disabled={fetchingMarketing}>
                  {fetchingMarketing ? '…' : 'Refresh'}
                </button>
              )}
            </div>
          </div>

          {!marketingLoaded ? (
            <div style={{ fontSize: 10, color: '#444' }}>Click "Load List" to fetch users who opted in to marketing emails.</div>
          ) : marketingList.length === 0 ? (
            <div style={{ fontSize: 10, color: '#444' }}>No users in marketing list yet.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Email', 'Plan', 'Joined', 'Last Active'].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 9, color: '#444', letterSpacing: '0.15em', textTransform: 'uppercase', paddingBottom: 10, borderBottom: '1px solid #1a1a1a' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {marketingList.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #111' }}>
                    <td style={{ padding: '10px 0', fontSize: 12, color: '#f0ebe0' }}>{row.email}</td>
                    <td style={{ padding: '10px 0' }}>
                      <span style={{ fontSize: 10, color: row.plan === 'Pro' ? '#e8b84b' : '#666', background: row.plan === 'Pro' ? '#e8b84b11' : 'transparent', padding: '2px 7px', borderRadius: 2, border: row.plan === 'Pro' ? '1px solid #e8b84b22' : 'none' }}>
                        {row.plan}
                      </span>
                    </td>
                    <td style={{ padding: '10px 0', fontSize: 10, color: '#444' }}>
                      {row.joined ? new Date(row.joined).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '10px 0', fontSize: 10, color: '#444' }}>
                      {row.last_active ? new Date(row.last_active).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}
