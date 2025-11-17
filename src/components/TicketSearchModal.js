import React, { useState } from 'react'

export default function TicketSearchModal({ open, onClose, onSelectTicket }){
  const [domain, setDomain] = useState('')
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSearch = async () => {
    if (!domain || !email || !token || !query) {
      setError('Please enter domain, email address, API token, and search query')
      return
    }

    setLoading(true)
    setError(null)
    setResults([])

    try {
      const response = await fetch('http://localhost:4000/api/jira/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domain.trim(), email: email.trim(), token: token.trim(), query: query.trim() })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Search failed (${response.status})`)
      }

      const data = await response.json()
      setResults(data.tickets || [])
      if (data.tickets.length === 0) {
        setError('No tickets found. Try a different search.')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectTicket = (ticket) => {
    onSelectTicket(ticket)
    // Reset form
    setDomain('')
    setEmail('')
    setToken('')
    setQuery('')
    setResults([])
    setError(null)
    onClose()
  }

  if (!open) return null

  return (
    <div className="ticket-modal-backdrop">
      <div className="ticket-modal">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 12}}>
          <h3>Search JIRA Tickets</h3>
          <button onClick={onClose} style={{background:'none', border:'none', color:'inherit', cursor:'pointer', fontSize:20}}>×</button>
        </div>

        <div className="ticket-form">
          <div className="form-group">
            <label>JIRA Domain</label>
            <input
              type="text"
              placeholder="your-domain.atlassian.net"
              value={domain}
              onChange={e => setDomain(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="your-email@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <small style={{color:'var(--muted)'}}>Required for API token authentication</small>
          </div>

          <div className="form-group">
            <label>API Token</label>
            <input
              type="password"
              placeholder="Paste your API token here"
              value={token}
              onChange={e => setToken(e.target.value)}
            />
            <small style={{color:'var(--muted)'}}>
              <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noreferrer" style={{color:'var(--accent)'}}>
                Get API token
              </a>
            </small>
          </div>

          <div className="form-group">
            <label>Search Query</label>
            <input
              type="text"
              placeholder="e.g., 'Login feature' or 'PROJ-123'"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
          </div>

          <button onClick={handleSearch} disabled={loading} className="search-button">
            {loading ? 'Searching...' : 'Search'}
          </button>

          {error && <div style={{color:'#ef4444', marginTop: 8}}>{error}</div>}
        </div>

        <div className="ticket-results">
          {results.length > 0 && (
            <>
              <p style={{color:'var(--muted)', fontSize: 12, marginBottom: 8}}>Found {results.length} result(s)</p>
              {results.map(ticket => (
                <div key={ticket.key} className="ticket-item" onClick={() => handleSelectTicket(ticket)}>
                  <div className="ticket-key">{ticket.key}</div>
                  <div>
                    <div className="ticket-summary">{ticket.summary}</div>
                    {ticket.storyPoints !== null && (
                      <div className="ticket-points">Story Points: {ticket.storyPoints}</div>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
