import React from 'react'

export default function PlayerList({ players, onVote, revealed, cards, myPlayerId }){
  if(!players || players.length === 0) return <div className="empty">No players connected yet.</div>

  return (
    <div className="player-list">
      {players.map(p => (
        <div key={p.id} className="player">
          <div className="player-info">
            <div className="player-name">{p.name}{myPlayerId === p.id ? ' (you)' : ''}</div>
            <div className="player-vote">{revealed ? (p.vote ?? '—') : (p.vote ? 'Voted' : '—')}</div>
          </div>

          <div className="player-cards">
            {cards.map(c => (
              <button
                key={c}
                className={`card small ${p.vote === c ? 'selected' : ''}`}
                onClick={() => { if(myPlayerId === p.id) onVote(p.id, c) }}
                title={myPlayerId === p.id ? `Vote ${c}` : 'You can only vote for yourself'}
                disabled={myPlayerId !== p.id}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
