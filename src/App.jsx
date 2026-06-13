import React, { useState, useEffect, useRef } from 'react';
import { dbService } from './db';
import SongInput from './components/SongInput';
import SongList from './components/SongList';
import AdminLogin from './components/AdminLogin';
import Background from './components/Background';
import { 
  Heart,
  Lock, 
  LogOut, 
  Play, 
  Pause, 
  X, 
  Volume2 
} from 'lucide-react';

export default function App() {
  const [songs, setSongs] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  
  // Audio Playback State
  const [currentPlayingSong, setCurrentPlayingSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  // Web Audio API refs & state for real-time visualization
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const [analyser, setAnalyser] = useState(null);

  // Helper to check if the browser is running on iOS or Safari (WebKit CORS muting bug)
  const isAppleBrowser = () => {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
    return isIOS || isSafari;
  };

  // Initialize AudioContext & AnalyserNode lazily on user gesture
  const initAudioContext = () => {
    if (audioCtxRef.current) return;

    // WebKit has a security policy bug where createMediaElementSource mutes cross-origin audio
    // even with CORS allowed, so we bypass it on Apple/Safari platforms.
    if (isAppleBrowser()) {
      console.warn("Apple device/Safari detected: bypassing Web Audio routing to prevent muting bug.");
      return;
    }

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContextClass();
      const node = ctx.createAnalyser();
      node.fftSize = 256; // 128 frequency bins (plenty for high, mid, low separation)

      // Route Audio -> Analyser -> Output Speakers
      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(node);
      node.connect(ctx.destination);

      audioCtxRef.current = ctx;
      analyserRef.current = node;
      setAnalyser(node);
    } catch (e) {
      console.error("Web Audio API failed to initialize:", e);
    }
  };

  // Initialize Audio & Subscriptions
  useEffect(() => {
    const audio = new Audio();
    
    // Apple devices block crossOrigin audio caches, so we omit it there
    if (!isAppleBrowser()) {
      audio.crossOrigin = "anonymous"; // Mandatory for CORS to read frequencies from iTunes CDN
    }
    
    audioRef.current = audio;
    
    const handleEnded = () => {
      setIsPlaying(false);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);

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
      audio.pause();
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(e => console.error("Error closing AudioContext:", e));
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

    // Trigger AudioContext initialization or resume on gesture
    initAudioContext();
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }

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

  return (
    <div className="app-container">
      {/* 3D Topographic Relieve Canvas Background (Reacting to Web Audio API) */}
      <Background isPlaying={isPlaying} analyser={analyser} />

      {/* Navigation / Header */}
      <nav className="navbar" id="mainNavbar">
        <div className="logo" id="appLogo">
          <img 
            src="/heart_logo.png" 
            alt="Heart Logo" 
            style={{ width: '28px', height: '28px', objectFit: 'contain' }} 
          />
          <span>Heart</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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

      {/* Main Content Layout - Stacked Centered Column */}
      <main className="layout-grid">
        <section className="form-column" style={{ width: '100%' }}>
          <SongInput onAddSong={handleAddSong} />
        </section>

        {isAdmin && (
          <section className="list-column" style={{ width: '100%' }}>
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
              <Heart size={18} style={{ color: 'var(--neon-mint)' }} />
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
