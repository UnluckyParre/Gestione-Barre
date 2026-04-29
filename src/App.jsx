import { useEffect, useState, useRef } from 'react'
import { supabase } from './supabaseClient'

function App() {
  const [page, setPage] = useState('gestione')

  const [articoli, setArticoli] = useState([])
  const [movimenti, setMovimenti] = useState([])

  const [user, setUser] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loadingLogin, setLoadingLogin] = useState(false)
  const [loginError, setLoginError] = useState('')

  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)

  const [errorShake, setErrorShake] = useState(false)
  const [errorStockId, setErrorStockId] = useState(null)

  const [starAnimId, setStarAnimId] = useState(null)

  const [stockAnimId, setStockAnimId] = useState(null)

  const [searchStorico, setSearchStorico] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('tutti')

  const [filtroPeriodo, setFiltroPeriodo] = useState('tutti')

  const inputRef = useRef(null)

  useEffect(() => {
    if (editing?.id && inputRef.current) {
      inputRef.current.focus()
    }
  }, [editing])

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null)
    })

  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_, session) => {
      setUser(session?.user ?? null)
    }
  )
  return () => {
    subscription.unsubscribe()
  }
  }, [])

  useEffect(() => {
    const savedEmail = localStorage.getItem('lastEmail')
    if (savedEmail) {
      setEmail(savedEmail)
    }
  }, [])

  async function handleLogin() {
    setLoadingLogin(true)
    setLoginError('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      setLoginError('Email o password non corretti')
    } else {
      setEmail('')
      setPassword('')
      localStorage.setItem('lastEmail', email)
    }

    setLoadingLogin(false)
  }

  async function loadData() {
    const { data: art } = await supabase.from('articoli').select('*')
    const { data: mov } = await supabase.from('movimenti').select('*')

    setArticoli(art || [])
    setMovimenti(mov || [])

    // trigger animazione stock globale
    setStockAnimId(Date.now())
    setTimeout(() => setStockAnimId(null), 300)
  }

  async function togglePreferito(id, value) {
    setStarAnimId(id)

    // ✅ aggiornamento immediato UI
    setArticoli(prev =>
      prev.map(a =>
        a.id === id ? { ...a, preferito: !value } : a
      )
    )

    const { error } = await supabase
      .from('articoli')
      .update({ preferito: !value })
      .eq('id', id)

    if (error) {
      console.error(error)

      // 🔴 rollback se qualcosa va male
      loadData()
    }

    setTimeout(() => setStarAnimId(null), 200)
  }

  async function movimento(id, tipo, qta = 1) {
    if (!qta || qta <= 0) return
    const stockAttuale = movimenti
      .filter(m => m.articolo_id === id)
      .reduce((stock, m) =>
        m.tipo === 'carico' ? stock + m.quantita : stock - m.quantita
      , 0)

    if (tipo === 'scarico' && stockAttuale - qta < 0) {
      setErrorStockId(id)

      setTimeout(() => {
        setErrorStockId(null)
      }, 600)

      setEditing({
        id,
        tipo,
        qta,
        error: 'Stock insufficiente'
      })

      return
    }

    await supabase.from('movimenti').insert([
      { articolo_id: id, tipo, quantita: qta }
    ])

    loadData()
  }

  function getStock(id) {
    return movimenti
      .filter(m => m.articolo_id === id)
      .reduce((stock, m) =>
        m.tipo === 'carico' ? stock + m.quantita : stock - m.quantita
      , 0)
  }

  function getEditTheme() {
    if (!editing) return {}

    return editing.tipo === 'carico'
      ? { border: '#22c55e', ok: '#22c55e' }
      : { border: '#ef4444', ok: '#ef4444' }
  }

  const filtered = articoli
    .filter(a =>
      a.codice.toLowerCase().includes(search.toLowerCase()) ||
      a.descrizione.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      // 1. preferiti prima
      if (a.preferito !== b.preferito) {
        return b.preferito - a.preferito
      }

      const stockA = getStock(a.id)
      const stockB = getStock(b.id)

      // 2. stock decrescente
      if (stockA !== stockB) {
        return stockB - stockA
      }

      // 3. codice alfabetico/numerico
      return a.codice.localeCompare(b.codice, 'it', {
        numeric: true,
        sensitivity: 'base'
      })
    })

  if (!user) {
    return (
      <div style={styles.loginPage}>

        {/* BACKGROUND LAYER */}
        <div style={styles.loginBg} />

        {/* CARD */}
        <div style={styles.loginCard}>

          <div style={styles.loginHeader}>
            <div style={styles.loginTitle}>
              Gestione Magazzino
            </div>

            <div style={styles.loginSubtitle}>
              Accesso riservato
            </div>
          </div>

          <div style={styles.loginForm}>

            <input
              style={styles.loginInput}
              placeholder="Email"
              value={email}
              autoComplete="username"
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              style={styles.loginInput}
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {/* ERRORE LOGIN */}
            {loginError && (
              <div style={styles.loginError}>
                {loginError}
              </div>
            )}

            <button
              onClick={handleLogin}
              style={styles.loginButton}
              disabled={loadingLogin}
            >
              {loadingLogin ? 'Accesso...' : 'Login'}
            </button>

          </div>

        </div>

      </div>
    )
  }

  return (
    <div style={styles.app}>

      <div style={styles.header}>
        <div style={styles.title}>
          {page === 'storico' ? 'Storico Movimenti' : 'Gestione Barre Intere'}
        </div>

        <div style={styles.nav}>
          <button
            onClick={() => setPage('gestione')}
            style={{
              ...styles.navBtn,
              background: page === 'gestione' ? '#1f2937' : '#111a2e',
              border: page === 'gestione' 
                ? '2px solid #fbbf24'
                : '2px solid #24324a',
              color: page === 'gestione' ? '#fbbf24' : '#e5e7eb',
              boxShadow: page === 'gestione' ? '0 0 0 1px #fbbf24' : 'none',
              transform: page === 'gestione' ? 'translateY(-1px)' : 'none',
              cursor: 'pointer'
            }}
          >
            Gestione
          </button>

          <button
            onClick={() => setPage('storico')}
            style={{
              ...styles.navBtn,
              background: page === 'storico' ? '#1f2937' : '#111a2e',
              border: page === 'storico'
                ? '2px solid #fbbf24'
                : '2px solid #24324a',
              color: page === 'storico' ? '#fbbf24' : '#e5e7eb',
              boxShadow: page === 'storico' ? '0 0 0 1px #fbbf24' : 'none',
              transform: page === 'storico' ? 'translateY(-1px)' : 'none',
              cursor: 'pointer'
            }}
          >
            Storico
          </button>
        </div>
      </div>

      {page === 'gestione' && (
        <input
          placeholder="Cerca codice o descrizione..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.search}
        />
      )}

      {page === 'gestione' && (
        <div style={styles.list}>

          {filtered.map(a => (
            <div
              key={a.id}
              style={{
              ...styles.row,
              borderLeft: a.preferito ? '4px solid #fbbf24' : '1px solid #24324a',

              transform: starAnimId === a.id 
                ? 'translateY(-4px) scale(1.015)' 
                : 'translateY(0) scale(1)',

              boxShadow: starAnimId === a.id
                ? '0 6px 18px rgba(0,0,0,0.25), 0 0 0 1px rgba(251,191,36,0.15)'
                : 'none',

              animation: starAnimId === a.id 
                ? 'rowGlow 0.5s ease'
                : 'none',

              transition: 'all 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
              zIndex: starAnimId === a.id ? 2 : 1
            }}
            >

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

                {/* STELLINA */}
                <button
                  onClick={() => togglePreferito(a.id, a.preferito)}
                  style={{
                    ...styles.star,
                    transform: starAnimId === a.id ? 'scale(1.3)' : 'scale(1)',
                    transition: 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
                    filter: starAnimId === a.id 
                      ? 'drop-shadow(0 0 6px rgba(251,191,36,0.6))'
                      : 'none'
                  }}
                >
                  {a.preferito ? '★' : '☆'}
                </button>

                {/* BLOCCO CODICE + DESCRIZIONE + LUNGHEZZA */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'center'
                }}>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={styles.code}>{a.codice}</div>

                    {a.lunghezza && (
                      <span style={styles.lengthTag}>
                        {a.lunghezza} mt
                      </span>
                    )}
                  </div>

                  <div style={styles.desc}>{a.descrizione}</div>

                </div>

              </div>
              </div>

              <div
                style={{
                  ...styles.stock,
                  animation:
                    errorStockId === a.id
                      ? 'shake 0.4s ease'
                      : stockAnimId ? 'pop 0.25s ease' : 'none',
                  transition: 'all 0.2s ease',
                  color: errorStockId === a.id ? '#ef4444' : '#e5e7eb'
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.5}}>
                  Disponibili
                </div>
                <div style={{ fontSize: 23, fontWeight: 700 }}>
                  {getStock(a.id)}
                </div>
              </div>

              <div style={styles.actions}>

                {editing?.id !== a.id && (
                  <>
                    <button
                      style={{
                        ...styles.carico,
                        fontSize: 16,
                        padding: '14px 18px',
                        transition: 'transform 0.15s ease',
                        transform: 'scale(1)',
                        cursor: 'pointer'
                      }}
                      onClick={() => setEditing({ id: a.id, tipo: 'carico', qta: '' })}
                    >
                      CARICO
                    </button>

                    <button
                      style={{
                        ...styles.scarico,
                        fontSize: 16,
                        padding: '14px 18px',
                        opacity: getStock(a.id) === 0 ? 0.35 : 1,
                        filter: getStock(a.id) === 0 ? 'grayscale(30%)' : 'none',
                        cursor: getStock(a.id) === 0 ? 'not-allowed' : 'pointer',
                        transition: 'transform 0.15s ease',
                        transform: 'scale(1)',
                      }}
                      onClick={() => {
                        if (getStock(a.id) === 0) return
                        setEditing({ id: a.id, tipo: 'scarico', qta: '' })
                      }}
                    >
                      SCARICO
                    </button>
                  </>
                )}

                {editing?.id === a.id && (
                  <div
                    style={{
                      ...styles.inlineEdit,
                      minWidth: 170,
                      justifyContent: 'flex-end'
                    }}
                  >

                    <input
                      ref={inputRef}
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={editing.qta}
                      onChange={(e) => {
                        const value = e.target.value

                        // permette campo vuoto (fondamentale)
                        if (value === '') {
                          setEditing({ ...editing, qta: '' })
                          return
                        }

                        // accetta solo numeri
                        if (!/^\d+$/.test(value)) return

                        setEditing({ ...editing, qta: value })
                      }}
                      onKeyDown={(e) => {
                        if (e.key === '-') {
                          e.preventDefault()
                        }
                      }}
                      style={{
                        ...styles.input,
                        border: `2px solid ${getEditTheme().border}`,
                        fontSize: 26,
                        fontWeight: 700,
                        touchAction: 'manipulation',
                        height: 18
                      }}
                    />

                    <button
                      onClick={() => {
                        movimento(a.id, editing.tipo, Number(editing.qta))
                        setEditing(null)
                      }}
                      style={{
                        ...styles.ok,
                        background: getEditTheme().ok,
                        fontSize: 18,
                        padding: '10px 18px',
                        cursor: 'pointer'
                      }}
                    >
                      ✔
                    </button>

                    <button
                      onClick={() => setEditing(null)}
                      style={{
                        ...styles.cancel,
                        fontSize: 18,
                        padding: '10px 18px',
                        cursor: 'pointer'
                      }}
                    >
                      ✖
                    </button>

                  </div>
                )}

              </div>

            </div>
          ))}

        </div>
      )}

      {page === 'storico' && (
        <div style={styles.history}>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            marginBottom: 15
          }}>

            {/* SEARCH */}
            <input
              placeholder="Cerca codice o descrizione..."
              value={searchStorico}
              onChange={(e) => setSearchStorico(e.target.value)}
              style={{
                ...styles.search,
                marginBottom: 0
              }}
            />

            {/* FILTRI ERP ROW */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'nowrap',
              overflowX: 'auto'
            }}>

              {/* LEFT: CARICO / SCARICO */}
              <div style={{
                display: 'flex',
                gap: 10,
                flexShrink: 0
              }}>
                {['tutti', 'carico', 'scarico'].map(tipo => (
                  <button
                    key={tipo}
                    onClick={() => setFiltroTipo(tipo)}
                    style={{
                      ...styles.chip,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      background: filtroTipo === tipo ? '#1f2937' : '#111a2e',
                      color: filtroTipo === tipo ? '#fbbf24' : '#e5e7eb',
                      border: filtroTipo === tipo 
                        ? '2px solid #fbbf24'
                        : '2px solid #24324a'
                    }}
                  >
                    {tipo.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* RIGHT: PERIODO */}
              <div style={{
                display: 'flex',
                gap: 10,
                flexShrink: 0
              }}>
                {[
                  { key: 'tutti', label: 'Sempre' },
                  { key: 'oggi', label: 'Oggi' },
                  { key: 'settimana', label: '7 giorni' }
                ].map(p => (
                  <button
                    key={p.key}
                    onClick={() => setFiltroPeriodo(p.key)}
                    style={{
                      ...styles.chip,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      background: filtroPeriodo === p.key ? '#1f2937' : '#111a2e',
                      color: filtroPeriodo === p.key ? '#fbbf24' : '#e5e7eb',
                      border: filtroPeriodo === p.key 
                        ? '2px solid #fbbf24' 
                        : '2px solid #24324a'
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

            </div>

          </div>
          
          {movimenti
            .filter(m => {
              const art = articoli.find(a => a.id === m.articolo_id)

              const matchTesto =
                art?.codice.toLowerCase().includes(searchStorico.toLowerCase()) ||
                art?.descrizione.toLowerCase().includes(searchStorico.toLowerCase())

              const matchTipo =
                filtroTipo === 'tutti' || m.tipo === filtroTipo

              const data = new Date(m.created_at)

              const oggi = new Date()
              const startOggi = new Date()
              startOggi.setHours(0,0,0,0)

              const inizioSettimana = new Date()
              inizioSettimana.setDate(inizioSettimana.getDate() - 7)

              let matchPeriodo = true

              if (filtroPeriodo === 'oggi') {
                matchPeriodo = data >= startOggi
              }

              if (filtroPeriodo === 'settimana') {
                matchPeriodo = data >= inizioSettimana
              }

              return matchTesto && matchTipo && matchPeriodo
            })
            .sort((a, b) => b.id - a.id)
            .map(m => {
              const art = articoli.find(a => a.id === m.articolo_id)

              return (
                <div
                  key={m.id}
                  style={{
                    ...styles.historyRow,
                    borderLeft: m.tipo === 'carico'
                      ? '4px solid #22c55e'
                      : '4px solid #ef4444',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
  
                    <div style={{ fontWeight: 700, fontSize: 19 }}>
                      {art?.codice}
                    </div>

                    <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>
                      {art?.descrizione}
                    </div>

                  </div>
                  
                  <div
                    style={{
                      color: m.tipo === 'carico' ? '#22c55e' : '#ef4444',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      fontSize: 20,
                      letterSpacing: 0.5
                    }}
                  >
                    {m.tipo}
                  </div>

                  <div style={{ fontWeight: 700, fontSize: 20 }}>
                    {m.tipo === 'scarico' ? '-' : '+'}{m.quantita}
                  </div>

                  <div style={{ opacity: 0.6, fontSize: 12 }}>
                    {m.created_at
                      ? new Date(m.created_at).toLocaleString('it-IT')
                      : ''}
                  </div>
                </div>
              )
            })}
        </div>
      )}

      <style>
        {`
        @keyframes shake {
          0% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          50% { transform: translateX(4px); }
          75% { transform: translateX(-4px); }
          100% { transform: translateX(0); }
        }
        
        @keyframes pop {
          0% { transform: scale(1); }
          40% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }

        @keyframes rowGlow {
          0% { background: #111a2e; }
          30% { background: rgba(251, 191, 36, 0.08); }
          60% { background: rgba(251, 191, 36, 0.04); }
          100% { background: #111a2e; }
        }
        `}
      </style>

    </div>
  )
}

const styles = {
  app: {
    background: '#0b1220',
    minHeight: '100vh',
    padding: 20,
    color: '#e5e7eb',
    fontFamily: 'system-ui'
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },

  title: { fontSize: 30, fontWeight: 700 },
  subtitle: { fontSize: 12, opacity: 0.6 },

  nav: { display: 'flex', gap: 10 },

  navBtn: {
    border: '1px solid #24324a',
    padding: '12px 22px',
    borderRadius: 999,
    fontWeight: 700,
    fontSize: 15,
    background: '#111a2e',
    color: '#e5e7eb',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minHeight: 44,
    minWidth: 120
  },

  search: {
    width: '100%',
    padding: 12,
    borderRadius: 10,
    border: '1px solid #24324a',
    background: '#111a2e',
    color: '#e5e7eb',
    marginBottom: 15,
    boxSizing: 'border-box'
  },

  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10
  },

  row: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 2fr',
    alignItems: 'center',
    background: '#111a2e',
    border: '1px solid #24324a',
    borderRadius: 10,
    padding: 14
  },

  codeRow: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center'
  },

  star: {
    background: 'transparent',
    border: 'none',
    color: '#fbbf24',
    fontSize: 22,
    cursor: 'pointer',
    padding: 0,
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center'
  },

  code: {
    fontWeight: 700,
    fontSize: 19
  },

  desc: {
    fontSize: 13,
    opacity: 0.6,
    textAlign: 'left',
    marginLeft: 0
  },

  stock: {
    textAlign: 'center',
    fontWeight: 700
  },

  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10
  },

  carico: {
    background: '#22c55e',
    border: 'none',
    padding: '14px 16px',
    borderRadius: 10,
    color: 'white',
    fontWeight: 700,
    fontSize: 15
  },

  scarico: {
    background: '#ef4444',
    border: 'none',
    padding: '14px 16px',
    borderRadius: 10,
    color: 'white',
    fontWeight: 700,
    fontSize: 15
  },

  inlineEdit: {
    display: 'flex',
    gap: 8,
    alignItems: 'center'
  },

  input: {
    width: 70,
    padding: 12,
    height: 48,
    borderRadius: 8,
    background: '#0b1220',
    color: 'white',
    textAlign: 'center',
    outline: 'none',
    MozAppearance: 'textfield',
    fontSize: 26,
    fontWeight: 700
  },

  ok: {
    border: 'none',
    padding: '11px 16px',
    borderRadius: 8,
    fontWeight: 800,
    color: 'white'
  },

  cancel: {
    background: '#1f2937',
    border: '1px solid #334155',
    padding: '11px 16px',
    borderRadius: 8,
    color: '#cbd5e1',
    fontWeight: 700
  },

  history: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  },

  sectionTitle: {
    fontWeight: 700,
    marginBottom: 10
  },

  historyRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 2fr',
    background: '#0f172a',
    padding: 12,
    borderRadius: 10,
    border: '1px solid #24324a',
    alignItems: 'center'
  },

  filtersBar: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    marginBottom: 15,
  },

  searchStorico: {
    width: '100%',
    padding: 12,
    borderRadius: 10,
    border: '1px solid #24324a',
    background: '#111a2e',
    color: '#e5e7eb',
    outline: 'none',
    fontSize: 14
  },

  selectStorico: {
    width: '100%',
    padding: 12,
    borderRadius: 10,
    border: '1px solid #24324a',
    background: '#111a2e',
    color: '#e5e7eb',
    fontSize: 14,
    cursor: 'pointer',
    outline: 'none'
  },

  chipGroup: {
    display: 'flex',
    gap: 12,
    marginBottom: 12
  },

  chip: {
    padding: '10px 16px',
    borderRadius: 999,
    border: '1px solid #24324a',
    background: '#111a2e',
    color: '#e5e7eb',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minHeight: 40,
    display: 'flex',
    alignItems: 'center'
  },

  lengthTag: {
    fontSize: 11,
    fontWeight: 500,
    padding: '3px 8px',
    borderRadius: 999,
    background: '#0b1220',
    border: '1px solid #24324a',
    color: '#64748b',
    marginLeft: 6,
    lineHeight: 1,
    whiteSpace: 'nowrap'
  },
  
  loginPage: {
    position: 'relative',
    minHeight: '100vh',
    width: '100vw',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0b1220',
    overflow: 'hidden'
  },

  loginBg: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    background: `
      radial-gradient(circle at 20% 30%, rgba(251,191,36,0.12), transparent 45%),
      radial-gradient(circle at 80% 70%, rgba(59,130,246,0.10), transparent 45%),
      radial-gradient(circle at 50% 50%, rgba(148,163,184,0.05), transparent 60%)
    `,
    filter: 'blur(60px)',
    transform: 'scale(1.3)',
    pointerEvents: 'none'
  },

  loginCard: {
    position: 'relative',
    width: '100%',
    maxWidth: 380,
    margin: '0 20px',
    padding: 26,
    borderRadius: 20,
    background: 'rgba(17, 26, 46, 0.65)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.06)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
    display: 'flex',
    flexDirection: 'column',
    gap: 18
  },

  loginTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: '#f9fafb',
    letterSpacing: 0.3,
    marginBottom: 8,
    textShadow: '0 2px 10px rgba(0,0,0,0.4)'
  },

  loginSubtitle: {
    fontSize: 13,
    color: 'red'
  },

  loginInput: {
    padding: '7px 14px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(11, 18, 32, 0.7)',
    color: '#e5e7eb',
    outline: 'none',
    fontSize: 15,
    minHeight: 46,
    backdropFilter: 'blur(6px)'
  },

  loginButton: {
    marginTop: 10,
    padding: '13px',
    borderRadius: 12,
    border: '1px solid #bfa23a',
    background: '#2a2412',
    color: '#fef3c7',
    fontWeight: 600,
    fontSize: 15,
    cursor: 'pointer',
    minHeight: 46,
    boxShadow: '0 0 0 1px rgba(251,191,36,0.15)',
    transition: 'all 0.15s ease'
  },

  loginHeader: {
    textAlign: 'center',
    marginBottom: 6
  },

  loginForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10
  },

  loginError: {
    marginTop: 12,
    padding: '10px 12px',
    borderRadius: 10,
    background: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    color: '#ef4444',
    fontSize: 13,
    fontWeight: 500,
    textAlign: 'center',
    animation: 'fadeIn 0.25s ease'
  },

}

export default App