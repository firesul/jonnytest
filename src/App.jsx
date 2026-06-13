import React, { useState, useEffect, useRef } from 'react';
import { dbService } from './db';
import SongInput from './components/SongInput';
import SongList from './components/SongList';
import AdminLogin from './components/AdminLogin';
import Background from './components/Background';
import { 
  Music, 
  Lock, 
  LogOut, 
  Play, 
  Pause, 
  X, 
  Volume2,
  Settings
} from 'lucide-react';

export default function App() {
  const [songs, setSongs] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  
  // Configuration Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsVibe, setSettingsVibe] = useState(() => {
    return localStorage.getItem('vibelist_background_mode') || 'auto';
  });

  // Audio Playback State
  const [currentPlayingSong, setCurrentPlayingSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  // Initialize Audio & Subscriptions
  useEffect(() => {
    audioRef.current = new Audio();
    
    const handleEnded = () => {
      setIsPlaying(false);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    audioRef.current.addEventListener('ended', handleEnded);
    audioRef.current.addEventListener('pause', handlePause);
    audioRef.current.addEventListener('play', handlePlay);

    // Load admin state from sessionStorage
    const savedAdmin = sessionStorage.getItem('vibelist_isAdmin');
    if (savedAdmin === 'true') {
      setIsAdmin(true);
    }

    // Subscribe to database songs (Firebase Realtime Database sync)
    const unsubscribe = dbService.subscribeSongs((updatedSongs) => {
      setSongs(updatedSongs);
    });

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeEventListener('ended', handleEnded);
        audioRef.current.removeEventListener('pause', handlePause);
        audioRef.current.removeEventListener('play', handlePlay);
      }
      unsubscribe();
    };
  }, []);

  // Admin authentication handler
  const handleLogin = (password) => {
    const savedPassword = localStorage.getItem('vibelist_admin_password') || 'admin123';
    
    if (password === savedPassword) {
      setIsAdmin(true);
      sessionStorage.setItem('vibelist_isAdmin', 'true');
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setIsAdmin(false);
    sessionStorage.removeItem('vibelist_isAdmin');
  };

  // Song database modifiers (WITH ADMIN CHECKS FOR SENSITIVE MUTATIONS)
  const handleAddSong = async (songData) => {
    // Anyone can add songs
    await dbService.addSong(songData);
  };

  const handleDeleteSong = async (id) => {
    if (!isAdmin) {
      alert('Acceso Denegado: Debes iniciar sesión como administrador para eliminar canciones.');
      return;
    }

    if (currentPlayingSong && currentPlayingSong.id === id) {
      handleStopAudio();
    }
    await dbService.deleteSong(id);
  };

  const handleClearSongs = async () => {
    if (!isAdmin) {
      alert('Acceso Denegado: Debes iniciar sesión como administrador para limpiar la lista.');
      return;
    }

    handleStopAudio();
    await dbService.clearAllSongs();
  };

  // Audio Playback Controls
  const handleTogglePlay = (song) => {
    if (!song.previewUrl) return;

    if (currentPlayingSong && currentPlayingSong.id === song.id) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(err => console.error("Error playing audio:", err));
      }
    } else {
      audioRef.current.pause();
      audioRef.current.src = song.previewUrl;
      setCurrentPlayingSong(song);
      audioRef.current.load();
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.error("Error playing audio:", err));
    }
  };

  const handleStopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setCurrentPlayingSong(null);
    setIsPlaying(false);
  };

  // Handle manual sidebar setting updates
  const handleUpdateSettingsVibe = (vibe) => {
    setSettingsVibe(vibe);
    localStorage.setItem('vibelist_background_mode', vibe);
  };

  // Calculate active background vibe:
  // If manual vibe is selected (not 'auto') -> use it directly.
  // Otherwise, fallback to the dynamic music-based vibe:
  // (active playing preview song > latest queue song > default 'chill').
  const activeVibe = settingsVibe !== 'auto'
    ? settingsVibe
    : ((currentPlayingSong && isPlaying)
        ? (currentPlayingSong.vibe || 'chill')
        : (songs.length > 0 ? (songs[0].vibe || 'chill') : 'chill'));

  // Effect to dynamically adjust CSS Accent Variables on HTML root based on active Vibe
  useEffect(() => {
    const root = document.documentElement;
    
    let primaryHex = '#004d3d';       // default green-emerald
    let primaryHoverHex = '#00604c';
    let neonHex = '#2affbb';          // default mint
    let neonGlow = 'rgba(42, 255, 187, 0.35)';

    switch (activeVibe) {
      case 'chill':
        primaryHex = '#00264d';
        primaryHoverHex = '#003c7a';
        neonHex = '#00f0ff';
        neonGlow = 'rgba(0, 240, 255, 0.35)';
        break;
      case 'energy':
        primaryHex = '#420054';
        primaryHoverHex = '#5b0073';
        neonHex = '#ff50b4';
        neonGlow = 'rgba(255, 80, 180, 0.35)';
        break;
      case 'vibrant':
        primaryHex = '#544300';
        primaryHoverHex = '#705a00';
        neonHex = '#ffd700';
        neonGlow = 'rgba(255, 215, 0, 0.35)';
        break;
      case 'intense':
        primaryHex = '#54020a';
        primaryHoverHex = '#70030e';
        neonHex = '#e60f28';
        neonGlow = 'rgba(230, 15, 40, 0.35)';
        break;
      case 'ethereal':
        primaryHex = '#242424';
        primaryHoverHex = '#383838';
        neonHex = '#ffffff';
        neonGlow = 'rgba(255, 255, 255, 0.35)';
        break;
      default:
        break;
    }

    root.style.setProperty('--primary-emerald', primaryHex);
    root.style.setProperty('--primary-emerald-hover', primaryHoverHex);
    root.style.setProperty('--neon-mint', neonHex);
    root.style.setProperty('--neon-mint-glow', neonGlow);
    root.style.setProperty('--border-color-focus', `${neonHex}66`); // 40% opacity hex
  }, [activeVibe]);

  return (
    <div className="app-container">
      {/* Responsive Animated Canvas Background */}
      <Background vibe={activeVibe} isPlaying={isPlaying} />

      {/* Navigation / Header */}
      <nav className="navbar" id="mainNavbar">
        <div className="logo" id="appLogo">
          <Music size={24} style={{ color: 'var(--neon-mint)' }} />
          <span>Playlist</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Settings Toggle Gear Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="btn-secondary"
            style={{ padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            id="settingsBtn"
            title="Configurar Ambiente de Fondo"
          >
            <Settings size={16} />
          </button>

          {isAdmin ? (
            <button 
              onClick={handleLogout} 
              className="btn-secondary"
              id="logoutBtn"
              title="Cerrar sesión de admin"
            >
              <LogOut size={14} />
              Salir
            </button>
          ) : (
            <button 
              onClick={() => setIsLoginOpen(true)} 
              className="btn-secondary"
              id="loginBtn"
              title="Iniciar sesión como Admin"
            >
              <Lock size={14} />
              Acceder
            </button>
          )}
        </div>
      </nav>

      {/* Main Content Layout - Role-based View */}
      <main className={isAdmin ? "layout-grid" : "layout-single-centered"}>
        <section className="form-column">
          <SongInput onAddSong={handleAddSong} />
        </section>

        {isAdmin && (
          <section className="list-column">
            <SongList 
              songs={songs} 
              isAdmin={isAdmin}
              onDeleteSong={handleDeleteSong}
              onClearSongs={handleClearSongs}
              currentPlayingSong={currentPlayingSong}
              isPlaying={isPlaying}
              onTogglePlay={handleTogglePlay}
            />
          </section>
        )}
      </main>

      {/* Slide-over Settings Sidebar */}
      {isSettingsOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setIsSettingsOpen(false)}
        />
      )}
      
      <div className={`settings-sidebar ${isSettingsOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)' }}>
            Configuración
          </h3>
          <button 
            onClick={() => setIsSettingsOpen(false)} 
            className="btn-play-pause" 
            title="Cerrar"
          >
            <X size={18} />
          </button>
        </div>
        
        <div className="sidebar-content">
          <div className="sidebar-section">
            <h4 style={{ fontSize: '13px', textTransform: 'uppercase', fontFamily: 'var(--font-technical)', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Color del Fondo / Ambiente
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Cambia la combinación de colores del fondo y los elementos visuales de la interfaz.
            </p>
            
            <div className="sidebar-vibe-list">
              {[
                { id: 'auto', label: 'Automático 🎵', desc: 'Se adapta al género de la música automáticamente.', color: 'var(--neon-mint)' },
                { id: 'chill', label: 'Chill ❄️', desc: 'Fondo lento azul / púrpura, detalles cian.', color: '#00f0ff' },
                { id: 'energy', label: 'Energy ⚡', desc: 'Ondas rápidas cian / rosa neón.', color: '#ff50b4' },
                { id: 'vibrant', label: 'Vibrant 🔥', desc: 'Ondas cálidas color dorado / naranja.', color: '#ffd700' },
                { id: 'intense', label: 'Intense 🎸', desc: 'Ondas agresivas rojo / carmesí.', color: '#e60f28' },
                { id: 'ethereal', label: 'Ethereal ✨', desc: 'Ondas lentas color plata / blanco.', color: '#ffffff' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  className={`sidebar-vibe-btn ${settingsVibe === opt.id ? 'active' : ''}`}
                  style={{
                    '--sidebar-vibe-accent': opt.color
                  }}
                  onClick={() => handleUpdateSettingsVibe(opt.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700', fontSize: '14px' }}>{opt.label}</span>
                    {settingsVibe === opt.id && (
                      <span style={{ color: 'var(--sidebar-vibe-accent)', fontSize: '12px' }}>●</span>
                    )}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'left', display: 'block', width: '100%' }}>
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Admin Login Modal */}
      <AdminLogin 
        isOpen={isLoginOpen} 
        onClose={() => setIsLoginOpen(false)} 
        onLogin={handleLogin}
      />

      {/* Floating Now Playing Mini Player (Admin Only) */}
      {isAdmin && currentPlayingSong && (
        <div className="glass-card now-playing-bar" id="nowPlayingBar">
          {currentPlayingSong.artwork ? (
            <img 
              src={currentPlayingSong.artwork} 
              alt={currentPlayingSong.title} 
              style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ width: '40px', height: '40px', borderRadius: '4px', background: 'var(--primary-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Music size={18} />
            </div>
          )}
          
          <div style={{ flexGrow: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Volume2 size={12} style={{ color: 'var(--neon-mint)' }} />
              Escuchando Preview
            </div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentPlayingSong.title}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className={`audio-visualizer-mini ${isPlaying ? 'playing' : ''}`}>
              <span className="bar bar-1"></span>
              <span className="bar bar-2"></span>
              <span className="bar bar-3"></span>
              <span className="bar bar-4"></span>
            </div>

            <button 
              onClick={() => handleTogglePlay(currentPlayingSong)}
              className="btn-play-pause playing"
              style={{ color: 'var(--neon-mint)' }}
              title={isPlaying ? 'Pausar' : 'Reproducir'}
              id="barPlayPauseBtn"
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
            
            <button 
              onClick={handleStopAudio}
              className="btn-play-pause"
              title="Cerrar reproductor"
              id="barCloseBtn"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
