import { useEffect, useState } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const emptyForm = {
  name: '',
  url: '',
  category: 'placement',
  schedule: '',
  enabled: false,
  mode: 'css',
  jsonLdType: '',
  collectionPath: '',
  itemSelector: '',
  fields: [{ name: 'title', selector: '', attribute: 'text' }],
}

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const body = await response.json()
  if (!response.ok) throw new Error(body.error || 'Request failed')
  return body
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sources, setSources] = useState([])
  const [items, setItems] = useState([])
  const [runs, setRuns] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [chatMessage, setChatMessage] = useState('')
  const [chatAnswer, setChatAnswer] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  const authHeaders = { Authorization: `Bearer ${token}` }

  async function loadDashboard() {
    const categoryQuery = categoryFilter
      ? `?category=${encodeURIComponent(categoryFilter)}`
      : ''
    const [sourceData, itemData, runData] = await Promise.all([
      request(`/sources${categoryQuery}`, { headers: authHeaders }),
      request(`/items${categoryQuery}`, { headers: authHeaders }),
      request('/items/runs', { headers: authHeaders }),
    ])
    setSources(sourceData.sources)
    setItems(itemData.items)
    setRuns(runData.runs)
  }

  useEffect(() => {
    if (token) loadDashboard().catch((loadError) => setError(loadError.message))
  }, [token, categoryFilter])

  async function handleLogin(event) {
    event.preventDefault()
    setError('')
    try {
      const data = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      localStorage.setItem('token', data.token)
      setToken(data.token)
    } catch (loginError) {
      setError(loginError.message)
    }
  }

  function updateField(index, key, value) {
    const fields = [...form.fields]
    fields[index] = { ...fields[index], [key]: value }
    setForm({ ...form, fields })
  }

  async function createSource(event) {
    event.preventDefault()
    setError('')
    try {
      await request(editingId ? `/sources/${editingId}` : '/sources', {
        method: editingId ? 'PUT' : 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: form.name,
          url: form.url,
          category: form.category,
          schedule: form.schedule,
          enabled: form.enabled,
          extractionRules: {
            mode: form.mode,
            jsonLdType: form.jsonLdType,
            collectionPath: form.collectionPath,
            itemSelector: form.itemSelector,
            fields: form.mode === 'rss' ? [] : form.fields.map((field) => form.mode === 'jsonld'
              ? { name: field.name, path: field.path }
              : field),
          },
        }),
      })
      setForm(emptyForm)
      setEditingId(null)
      setMessage('Source saved')
      await loadDashboard()
    } catch (saveError) {
      setError(saveError.message)
    }
  }

  function editSource(source) {
    setEditingId(source._id)
    setForm({
      name: source.name,
      url: source.url,
      category: source.category || 'placement',
      schedule: source.schedule || '',
      enabled: source.enabled || false,
      mode: source.extractionRules.mode || 'css',
      jsonLdType: source.extractionRules.jsonLdType || '',
      collectionPath: source.extractionRules.collectionPath || '',
      itemSelector: source.extractionRules.itemSelector,
      fields: source.extractionRules.fields,
    })
    setMessage('')
    setError('')
  }

  async function deleteSource(id) {
    if (!window.confirm('Delete this source and keep its collected items?')) return

    setError('')
    try {
      await request(`/sources/${id}`, {
        method: 'DELETE',
        headers: authHeaders,
      })
      if (editingId === id) {
        setEditingId(null)
        setForm(emptyForm)
      }
      setMessage('Source deleted')
      await loadDashboard()
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  async function scrapeSource(id) {
    setError('')
    try {
      const result = await request(`/sources/${id}/scrape`, {
        method: 'POST',
        headers: authHeaders,
      })
      setMessage(`Scrape complete: ${result.newItems} new item(s)`)
      await loadDashboard()
    } catch (scrapeError) {
      setError(scrapeError.message)
    }
  }

  async function askAssistant(event) {
    event.preventDefault()
    if (!chatMessage.trim()) return

    setChatLoading(true)
    setError('')
    try {
      const data = await request('/chat', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ message: chatMessage }),
      })
      setChatAnswer(data.answer)
      setChatMessage('')
    } catch (chatError) {
      setError(chatError.message)
    } finally {
      setChatLoading(false)
    }
  }

  function isNewItem(item) {
    return Date.now() - new Date(item.createdAt).getTime() < 24 * 60 * 60 * 1000
  }

  if (!token) {
    return (
      <main className="card login">
        <h1>Web Data Collector</h1>
        <p>Admin login</p>
        <form onSubmit={handleLogin}>
          <input type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          <button type="submit">Login</button>
        </form>
        {error && <p className="error">{error}</p>}
      </main>
    )
  }

  return (
    <main>
      <header>
        <h1>Web Data Collector</h1>
        <button onClick={() => { localStorage.removeItem('token'); setToken(null) }}>Logout</button>
      </header>
      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      <section className="card">
        <h2>{editingId ? 'Edit source' : 'Add source'}</h2>
        <form onSubmit={createSource} className="source-form">
          <input placeholder="Source name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          <input type="url" placeholder="https://example.com" value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} required />
          <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
            <option value="placement">Placement / recruitment</option>
            <option value="government-job">Government jobs</option>
            <option value="news">Daily news</option>
          </select>
          <select value={form.mode} onChange={(event) => setForm({ ...form, mode: event.target.value })}>
            <option value="css">CSS selectors</option>
            <option value="jsonld">JSON-LD data</option>
            <option value="rss">RSS feed</option>
            <option value="api">JSON API</option>
          </select>
          {form.mode === 'css' && <input placeholder="Item selector, e.g. article.product_pod" value={form.itemSelector} onChange={(event) => setForm({ ...form, itemSelector: event.target.value })} required />}
          {form.mode === 'jsonld' && <input placeholder="Optional JSON-LD type, e.g. Product" value={form.jsonLdType} onChange={(event) => setForm({ ...form, jsonLdType: event.target.value })} />}
          {form.mode === 'api' && <input placeholder="Array path, e.g. jobs" value={form.collectionPath} onChange={(event) => setForm({ ...form, collectionPath: event.target.value })} required />}
          <input placeholder="Cron schedule, e.g. */30 * * * *" value={form.schedule} onChange={(event) => setForm({ ...form, schedule: event.target.value })} />
          <label><input type="checkbox" checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} /> Enable schedule</label>
          {form.mode !== 'rss' && form.fields.map((field, index) => (
            <div className="field-row" key={index}>
              <input placeholder="Field name" value={field.name} onChange={(event) => updateField(index, 'name', event.target.value)} required />
              <input placeholder={form.mode === 'jsonld' || form.mode === 'api' ? 'Path, e.g. offers.price' : 'CSS selector'} value={form.mode === 'jsonld' || form.mode === 'api' ? field.path : field.selector} onChange={(event) => updateField(index, form.mode === 'jsonld' || form.mode === 'api' ? 'path' : 'selector', event.target.value)} required />
              {form.mode === 'css' && <input placeholder="Attribute or text" value={field.attribute} onChange={(event) => updateField(index, 'attribute', event.target.value)} />}
            </div>
          ))}
          {form.mode !== 'rss' && <button type="button" onClick={() => setForm({ ...form, fields: [...form.fields, form.mode === 'css' ? { name: '', selector: '', attribute: 'text' } : { name: '', path: '' }] })}>Add field</button>}
          <button type="submit">{editingId ? 'Update source' : 'Save source'}</button>
          {editingId && <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm) }}>Cancel edit</button>}
        </form>
      </section>

      <section className="card">
        <h2>Sources</h2>
        <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
          <option value="">All categories</option>
          <option value="placement">Placement / recruitment</option>
          <option value="government-job">Government jobs</option>
          <option value="news">Daily news</option>
        </select>
        {sources.map((source) => (
          <div className="source-row" key={source._id}>
            <span><strong>{source.name}</strong> ({source.category})<br />{source.url}</span>
            <div className="source-actions">
              <button onClick={() => scrapeSource(source._id)}>Scrape now</button>
              <button onClick={() => editSource(source)}>Edit</button>
              <button onClick={() => deleteSource(source._id)}>Delete</button>
            </div>
          </div>
        ))}
        {sources.length === 0 && <p>No sources saved yet.</p>}
      </section>

      <section className="card">
        <h2>Collected items ({items.length})</h2>
        {items.map((item) => (
          <div key={item._id} className="item">
            {isNewItem(item) && <span className="new-label">New</span>}
            <pre>{JSON.stringify(item.data, null, 2)}</pre>
          </div>
        ))}
      </section>

      <section className="card">
        <h2>Recent runs</h2>
        {runs.map((run) => <p key={run._id}>{run.status} — found {run.found}, new {run.newItems}</p>)}
      </section>

      <aside className="chat-widget">
        <h2>Data assistant</h2>
        <p className="chat-help">Ask about saved items or source settings.</p>
        {chatAnswer && <div className="chat-answer">{chatAnswer}</div>}
        <form onSubmit={askAssistant}>
          <input
            placeholder="Summarize placement jobs..."
            value={chatMessage}
            onChange={(event) => setChatMessage(event.target.value)}
            maxLength="1000"
          />
          <button type="submit" disabled={chatLoading}>
            {chatLoading ? 'Asking...' : 'Ask'}
          </button>
        </form>
      </aside>
    </main>
  )
}

export default App
