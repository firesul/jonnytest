import React, { useState } from 'react';
import { Trash2, Play, Pause, ExternalLink, Music, X, Check } from 'lucide-react';

export default function SongList({ 
  songs, 
  isAdmin, 
  onDeleteSong, 
  onClearSongs,
  currentPlayingSong, 
  isPlaying, 
  onTogglePlay 
}) {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [isClearing, setIsClearing] = useState(false);

  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds) || seconds === 0) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!songs || songs.length === 0) {
    return (
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ 
          width: '64px', 
          height: '64px', 
          borderRadius: '50%', 
          background: 'rgba(42, 255, 187, 0.05)', 
          border: '1px solid rgba(42, 255, 187, 0.15)',
          display: 'flex', 
          alignItems: 'center', 
          justify: 'center', 
          margin: '0 auto 20px auto',
          color: 'var(--neon-mint)'
        }}>
          <Music size={28} style={{ transform: 'translateX(2px)' }} />
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>La lista está vacía</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '320px', margin: '0 auto' }}>
          Sé el primero en agregar una canción escribiendo su nombre o pegando una dirección URL a la izquierda.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card" id="songListCard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <span style={{ color: 'var(--neon-mint)' }}>●</span> 
          Lista de Canciones ({songs.length})
        </h2>
        {isAdmin && (
          <div style={{ display: 'flex', gap: '8px' }}>
            {isClearing ? (
              <>
                <button
                  onClick={() => {
                    onClearSongs();
                    setIsClearing(false);
                  }}
                  className="btn-secondary"
                  style={{ 
                    padding: '6px 12px', 
                    fontSize: '12px', 
                    backgroundColor: 'rgba(255, 107, 107, 0.2)',
                    borderColor: '#ff6b6b',
                    color: '#ff6b6b'
                  }}
                  id="confirmClearBtn"
                >
                  <Check size={12} style={{ marginRight: '4px' }} />
                  ¿Confirmar Limpiar?
                </button>
                <button
                  onClick={() => setIsClearing(false)}
                  className="btn-secondary"
                  style={{ padding: '6px 10px', fontSize: '12px' }}
                  id="cancelClearBtn"
                >
                  <X size={12} />
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsClearing(true)}
                className="btn-secondary"
                style={{ 
                  padding: '6px 12px', 
                  fontSize: '12px', 
                  borderColor: 'rgba(255, 107, 107, 0.3)',
                  color: '#ff6b6b'
                }}
                id="clearPlaylistBtn"
                title="Borrar todas las canciones"
              >
                Limpiar Lista
              </button>
            )}
          </div>
        )}
      </div>

      <div id="songsContainer">
        {songs.map((song) => {
          const isCurrentTrack = currentPlayingSong && currentPlayingSong.id === song.id;
          const isThisPlaying = isCurrentTrack && isPlaying;

          return (
            <div key={song.id} className="song-card" id={`song-card-${song.id}`}>
              {/* Artwork thumbnail */}
              {song.artwork ? (
                <img src={song.artwork} alt={song.title} className="song-artwork" />
              ) : (
                <div className="song-artwork" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary-emerald)' }}>
                  <Music size={22} style={{ color: 'var(--text-muted)' }} />
                </div>
              )}

              {/* Title & Artist */}
              <div className="song-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                  <span className="song-title" title={song.title} style={{ marginBottom: 0, display: 'inline-block' }}>
                    {song.title}
                  </span>
                  {song.genre && (
                    <span className={`badge-vibe vibe-${song.vibe || 'chill'}`} style={{ textTransform: 'capitalize' }}>
                      {song.genre}
                    </span>
                  )}
                </div>
                <div className="song-artist" title={song.artist}>
                  {song.artist}
                </div>
              </div>

              {/* Actions & Meta */}
              <div className="song-meta">
                {/* 30-sec preview button */}
                {song.previewUrl ? (
                  <button
                    onClick={() => onTogglePlay(song)}
                    className={`btn-play-pause ${isThisPlaying ? 'playing' : ''}`}
                    title={isThisPlaying ? 'Pausar Preview' : 'Escuchar Preview'}
                    id={`play-btn-${song.id}`}
                  >
                    {isThisPlaying ? <Pause size={18} /> : <Play size={18} />}
                  </button>
                ) : (
                  <div style={{ width: '36px' }}></div> /* empty spacing if no preview */
                )}

                {/* Duration */}
                <div className="song-duration">
                  {formatDuration(song.duration)}
                </div>

                {/* External link to search page or source URL */}
                {song.url && (
                  <a
                    href={song.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-play-pause"
                    style={{ textDecoration: 'none' }}
                    title="Ver origen / Abrir enlace"
                    id={`link-btn-${song.id}`}
                  >
                    <ExternalLink size={16} />
                  </a>
                )}

                {/* Admin delete button with inline confirmation */}
                {isAdmin && (
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {confirmDeleteId === song.id ? (
                      <>
                        <button
                          onClick={() => {
                            onDeleteSong(song.id);
                            setConfirmDeleteId(null);
                          }}
                          className="btn-delete"
                          style={{ 
                            color: '#ff6b6b', 
                            backgroundColor: 'rgba(255, 107, 107, 0.12)', 
                            padding: '4px 8px', 
                            borderRadius: '4px', 
                            fontSize: '11px',
                            fontWeight: '600',
                            width: 'auto', 
                            height: 'auto' 
                          }}
                          title="Confirmar eliminación"
                          id={`confirm-delete-btn-${song.id}`}
                        >
                          ¿Borrar?
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="btn-play-pause"
                          style={{ width: '28px', height: '28px' }}
                          title="Cancelar"
                          id={`cancel-delete-btn-${song.id}`}
                        >
                          <X size={12} />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setConfirmDeleteId(song.id);
                        }}
                        className="btn-delete"
                        title="Eliminar canción"
                        id={`delete-btn-${song.id}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
