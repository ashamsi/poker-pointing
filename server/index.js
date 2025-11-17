const express = require('express')
const WebSocket = require('ws')
const crypto = require('crypto')
const axios = require('axios')
const http = require('http')

const app = express()
app.use(express.json())

// Enable CORS for API endpoints
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

const PORT = process.env.PORT || 4000
const server = http.createServer(app)
const wss = new WebSocket.Server({ server })

const rooms = {}

function makeId(len = 6){
  return crypto.randomBytes(Math.ceil(len/2)).toString('hex').slice(0,len)
}

function broadcastRoom(room){
  for(const client of wss.clients){
    if(client.readyState !== WebSocket.OPEN) continue
    if(!client.roomId || client.roomId !== room.id) continue

    const viewPlayers = room.players.map(p => {
      if(room.revealed) return { id: p.id, name: p.name, vote: p.vote, comment: p.comment }
      if(client.playerId && client.playerId === p.id) return { id: p.id, name: p.name, vote: p.vote, comment: p.comment }
      return { id: p.id, name: p.name, vote: p.vote ? '__VOTED__' : null }
    })

    const msg = JSON.stringify({ type: 'state', roomId: room.id, players: viewPlayers, revealed: room.revealed, hostPlayerId: room.hostPlayerId })
    client.send(msg)
  }
}

function findRoomById(roomId){ return rooms[roomId] }

// JIRA API Token-based ticket search endpoint
app.post('/api/jira/search', async (req, res) => {
  try {
    let { domain, token, email, query } = req.body

    // Basic validation
    if (!domain || !email || !token || !query) {
      return res.status(400).json({ error: 'Please provide domain, email, API token and query' })
    }

    // Normalize domain and build base URL robustly.
    domain = domain.toString().trim()
    // If the user pasted a full URL or a path, parse and extract only the origin (protocol + host + port)
    let baseUrl
    try {
      let parsed
      if (/^https?:\/\//i.test(domain)) {
        parsed = new URL(domain)
      } else {
        // add protocol for parsing
        parsed = new URL(`https://${domain}`)
      }
      baseUrl = `${parsed.protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ''}`
    } catch (e) {
      // Fallback: strip protocol and paths
      baseUrl = domain.replace(/^https?:\/\//i, '').replace(/\/.*/, '')
      baseUrl = `https://${baseUrl}`
    }

    // Build Basic auth header using email:token (JIRA Cloud requirement)
    const authHeader = `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`

    // Use the new JQL search API: POST /rest/api/3/search/jql
    const jiraUrl = `${baseUrl}/rest/api/3/search/jql`
    console.log(`Searching JIRA (JQL API) at ${jiraUrl} (base: ${baseUrl}) with query: ${query}`)

    const jql = `text ~ "${query}" OR key ~ "${query}"`
    const response = await axios.post(jiraUrl, {
      jql,
      fields: ['key', 'summary', 'customfield_10016'],
      maxResults: 10
    }, {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    })

    const issues = response?.data?.issues || []
    const tickets = issues.map(issue => ({
      key: issue.key,
      summary: issue.fields?.summary || '(no summary)',
      storyPoints: issue.fields?.customfield_10016 ?? null,
      url: `https://${domain}/browse/${issue.key}`
    }))

    return res.json({ tickets })
  } catch (err) {
    // Differentiate axios errors vs other errors
    if (err.response) {
      console.error('JIRA search error response:', err.response.status, err.response.data)
      const errMsg = (err.response.data && (err.response.data.errorMessages || err.response.data.message)) || JSON.stringify(err.response.data)
      return res.status(err.response.status || 500).json({ error: errMsg })
    }
    console.error('JIRA search unexpected error:', err.message || err)
    return res.status(500).json({ error: err.message || 'Unexpected error' })
  }
})

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'ready' }))

  ws.on('message', (data) => {
    let msg
    try{ msg = JSON.parse(data.toString()) }catch(e){ return }

    const sendError = (text) => { try{ ws.send(JSON.stringify({ type: 'error', message: text })) }catch(e){} }

    switch(msg.type){
      case 'create-room': {
        const roomId = makeId(8)
        const playerId = makeId(10)
        const name = msg.name || 'Host'
        const room = { id: roomId, hostPlayerId: playerId, players: [], revealed: false, invites: [] }
        const player = { id: playerId, name, vote: null, connected: true }
        room.players.push(player)
        const token = makeId(12)
        room.invites.push(token)
        rooms[roomId] = room

        ws.roomId = roomId
        ws.playerId = playerId
        ws.send(JSON.stringify({ type: 'room-created', roomId, playerId, inviteToken: token, url: `/room/${roomId}` }))
        broadcastRoom(room)
        break
      }

      case 'create-invite': {
        const { roomId } = msg
        const room = findRoomById(roomId)
        if(!room) { sendError('room not found'); break }
        if(ws.playerId !== room.hostPlayerId){ sendError('only host may create invites'); break }
        const token = makeId(12)
        room.invites.push(token)
        ws.send(JSON.stringify({ type: 'invite-created', roomId, token, url: `/room/${roomId}?invite=${token}` }))
        break
      }

      case 'join': {
        const { roomId, name, inviteToken } = msg
        const room = findRoomById(roomId)
        if(!room){ sendError('room not found'); break }

        if(room.invites && room.invites.length > 0){
          if(!inviteToken || !room.invites.includes(inviteToken)){
            sendError('invite token required or invalid')
            break
          }
        }

        const id = makeId(10)
        const player = { id, name: name || 'Anonymous', vote: null, connected: true }
        room.players.push(player)
        ws.playerId = id
        ws.roomId = roomId

        ws.send(JSON.stringify({ type: 'joined', playerId: id, role: (id === room.hostPlayerId ? 'host' : 'participant'), roomId }))
        broadcastRoom(room)
        break
      }

      case 'vote': {
        const { roomId, playerId, vote, comment } = msg
        const room = findRoomById(roomId)
        if(!room){ sendError('room not found'); break }
        if(ws.playerId !== playerId){ sendError('you can only vote for yourself'); break }
        const p = room.players.find(x => x.id === playerId)
        if(p){ 
          p.vote = vote
          p.comment = comment || null
        }
        broadcastRoom(room)
        break
      }

      case 'reveal': {
        const { roomId } = msg
        const room = findRoomById(roomId)
        if(!room){ sendError('room not found'); break }
        if(ws.playerId !== room.hostPlayerId){ sendError('only host can reveal'); break }
        room.revealed = true
        broadcastRoom(room)
        break
      }

      case 'reset': {
        const { roomId } = msg
        const room = findRoomById(roomId)
        if(!room){ sendError('room not found'); break }
        if(ws.playerId !== room.hostPlayerId){ sendError('only host can reset'); break }
        room.players = room.players.map(p => ({ ...p, vote: null, comment: null }))
        room.revealed = false
        broadcastRoom(room)
        break
      }

      case 'clearPlayers': {
        const { roomId } = msg
        const room = findRoomById(roomId)
        if(!room){ sendError('room not found'); break }
        if(ws.playerId !== room.hostPlayerId){ sendError('only host can clear players'); break }
        room.players = []
        room.revealed = false
        broadcastRoom(room)
        break
      }

      default:
        // unknown message
    }
  })

  ws.on('close', () => {
    const { roomId, playerId } = ws
    if(!roomId || !playerId) return
    const room = findRoomById(roomId)
    if(!room) return

    room.players = room.players.filter(p => p.id !== playerId)

    if(room.hostPlayerId === playerId){
      if(room.players.length > 0){
        room.hostPlayerId = room.players[0].id
      } else {
        delete rooms[roomId]
        return
      }
    }

    broadcastRoom(room)
  })
})

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`)
  console.log(`WebSocket server on ws://localhost:${PORT}`)
  console.log(`JIRA search endpoint: POST http://localhost:${PORT}/api/jira/search`)
})
