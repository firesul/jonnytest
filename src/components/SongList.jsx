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
  const [showStats, setShowStats] = useState(false);

  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds) || seconds === 0) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // --- LOCAL PLAYLIST ANALYZER ENGINE ---
  const totalSongs = songs.length;
  
  const totalSeconds = songs.reduce((sum, s) => sum + (s.duration || 0), 0);
  const formatTotalDuration = (totalSecs) => {
    if (!totalSecs) return '0 min';
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins} min`;
  };

  // Genre accumulation
  const genreCounts = {};
  songs.forEach(s => {
    if (s.genre) {
      genreCounts[s.genre] = (genreCounts[s.genre] || 0) + 1;
    }
  });
  const sortedGenres = Object.entries(genreCounts)
    .map(([name, count]) => ({ name, count, percentage: Math.round((count / totalSongs) * 100) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Artist frequency mapping
  const artistCounts = {};
  songs.forEach(s => {
    if (s.artist && s.artist !== 'Artista Desconocido' && s.artist !== 'Enlace externo') {
      const cleanArtist = s.artist.trim();
      artistCounts[cleanArtist] = (artistCounts[cleanArtist] || 0) + 1;
    }
  });
  const sortedArtists = Object.entries(artistCounts)
    .sort((a, b) => b[1] - a[1]);
  const topArtist = sortedArtists.length > 0 ? sortedArtists[0][0] : 'Ninguno';

  // Dynamic atmospheric generator based on mathematical splits
  const generateLocalMoodSummary = () => {
    if (totalSongs === 0) return '';
    const artistText = sortedArtists.length > 0 ? ` con presencia destacada de **${sortedArtists[0][0]}**` : '';
    const genreText = sortedGenres.length > 0 ? `El estilo dominante en la lista actualmente es **${sortedGenres[0].name}** (representando el **${sortedGenres[0].percentage}%** de las peticiones)` : 'La lista cuenta con estilos diversos';
    return `${genreText}${artistText}. Puedes utilizar estas métricas para monitorear la tendencia musical de tu audiencia.`;
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

      {/* Collapsible Stats Section (Admin Only) */}
      {isAdmin && (
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={() => setShowStats(!showStats)}
            className="btn-secondary"
            style={{ 
              width: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px',
              background: 'rgba(255, 42, 59, 0.03)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-main)',
              padding: '12px'
            }}
            id="toggleStatsBtn"
          >
            {showStats ? 'Ocultar Estadísticas del Ambiente' : 'Ver Estadísticas del Ambiente (Analizador)'}
          </button>

          {showStats && (
            <div className="glass-card" style={{ 
              background: 'rgba(0, 0, 0, 0.25)', 
              borderColor: 'var(--border-color)', 
              padding: '20px', 
              marginTop: '12px',
              animation: 'fadeIn 0.3s ease-out'
            }}>
              {/* KPI Badges */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-technical)', textTransform: 'uppercase' }}>Canciones</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', marginTop: '4px' }}>{totalSongs}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-technical)', textTransform: 'uppercase' }}>Duración Total</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', marginTop: '4px' }}>{formatTotalDuration(totalSeconds)}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-technical)', textTransform: 'uppercase' }}>Top Artista</div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)', marginTop: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={topArtist}>{topArtist}</div>
                </div>
              </div>

              {/* Mood Description */}
              <div style={{ background: 'rgba(255, 42, 59, 0.05)', borderLeft: '3px solid var(--neon-mint)', padding: '14px', borderRadius: '0 6px 6px 0', fontSize: '13.5px', lineHeight: '1.5', color: 'var(--text-main)', marginBottom: '20px' }}>
                <strong style={{ color: 'var(--neon-mint)', display: 'block', marginBottom: '4px', fontFamily: 'var(--font-technical)', fontSize: '11px', textTransform: 'uppercase' }}>Reporte de Clima Musical</strong>
                <span dangerouslySetInnerHTML={{ __html: generateLocalMoodSummary().replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
              </div>

              {/* Genres Section */}
              <div>
                <h4 style={{ fontSize: '11px', textTransform: 'uppercase', fontFamily: 'var(--font-technical)', color: 'var(--text-muted)', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>Top Géneros Solicitados</h4>
                {sortedGenres.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>Sin datos de géneros</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {sortedGenres.map((g, idx) => (
                      <div key={g.name} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', width: '20px' }}>#{idx + 1}</span>
                        <div style={{ flexGrow: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '2px' }}>
                            <span style={{ fontWeight: '500' }}>{g.name}</span>
                            <span style={{ color: 'var(--neon-mint)', fontWeight: '600' }}>{g.count} ({g.percentage}%)</span>
                          </div>
                          <div style={{ height: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${g.percentage}%`, background: 'var(--neon-mint)', borderRadius: '2px' }}></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

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
