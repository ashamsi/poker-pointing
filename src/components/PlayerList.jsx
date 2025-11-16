import React from 'react'

export default function PlayerList({ players, onVote, revealed, cards }){
  if(!players || players.length === 0) return <div className="empty">No players yet. Add players to start.</div>

  return (
    <div className="player-list">
      {players.map(p => (
        <div key={p.id} className="player">
          <div className="player-info">
            <div className="player-name">{p.name}</div>
            <div className="player-vote">{revealed ? (p.vote ?? '—') : (p.vote ? 'Voted' : '—')}</div>
          </div>

          <div className="player-cards">
            {cards.map(c => (
              <button
                key={c}
                className={`card small ${p.vote === c ? 'selected' : ''}`}
                onClick={() => onVote(p.id, c)}
                title={`Vote ${c}`}
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
