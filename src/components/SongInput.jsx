import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Link as LinkIcon, Music, Check, Zap, Flame, Sparkles, Disc } from 'lucide-react';

// Map iTunes primaryGenreName to our 5 visual Vibes
const mapGenreToVibe = (genreName) => {
  if (!genreName) return 'chill';
  const g = genreName.toLowerCase();
  
  if (
    g.includes('chill') || 
    g.includes('ambient') || 
    g.includes('lounge') || 
    g.includes('r&b') || 
    g.includes('soul') || 
    g.includes('blues') || 
    g.includes('jazz') || 
    g.includes('lofi') || 
    g.includes('lo-fi') ||
    g.includes('downtempo') ||
    g.includes('trip-hop')
  ) {
    return 'chill';
  }
  
  if (
    g.includes('pop') || 
    g.includes('dance') || 
    g.includes('electro') || 
    g.includes('house') || 
    g.includes('techno') || 
    g.includes('trance') || 
    g.includes('disco') || 
    g.includes('club') || 
    g.includes('edm') ||
    g.includes('synth') ||
    g.includes('funk')
  ) {
    return 'energy';
  }
  
  if (
    g.includes('rock') || 
    g.includes('metal') || 
    g.includes('punk') || 
    g.includes('alternative') || 
    g.includes('grunge') || 
    g.includes('indie') ||
    g.includes('emo') ||
    g.includes('hardcore')
  ) {
    return 'intense';
  }
  
  if (
    g.includes('latin') || 
    g.includes('reggaeton') || 
    g.includes('salsa') || 
    g.includes('bachata') || 
    g.includes('urbano') || 
    g.includes('merengue') || 
    g.includes('tropical') ||
    g.includes('cumbia') ||
    g.includes('pop latino')
  ) {
    return 'vibrant';
  }
  
  if (
    g.includes('classic') || 
    g.includes('soundtrack') || 
    g.includes('instrumental') || 
    g.includes('new age') || 
    g.includes('acoustic') || 
    g.includes('singer') || 
    g.includes('folk') ||
    g.includes('orchestral') ||
    g.includes('piano')
  ) {
    return 'ethereal';
  }
  
  return 'chill'; // default fallback
};

export default function SongInput({ onAddSong }) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState('');
  const [selectedVibe, setSelectedVibe] = useState('chill');
  
  // Success state feedback
  const [showSuccess, setShowSuccess] = useState(false);
  const [successDetails, setSuccessDetails] = useState(null);
  
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Automatic success card timeout
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  const cleanUrlToSearchQuery = (urlStr) => {
    try {
      const url = new URL(urlStr);
      let query = url.pathname;
      
      const ytid = url.searchParams.get('v');
      if (ytid) {
        return ''; 
      }
      
      query = query
        .replace(/^\/(track|watch|video|embed|music|album)\//i, '')
        .replace(/[-_]/g, ' ')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .trim();
        
      return query;
    } catch (e) {
      return '';
    }
  };

  // Fetch metadata from URL with fallbacks
  const fetchMetadataFromUrl = async (urlStr) => {
    try {
      const url = new URL(urlStr);
      const host = url.hostname.toLowerCase();
      
      let domain = host.replace('www.', '');
      const dotIndex = domain.indexOf('.');
      if (dotIndex > 0) {
        domain = domain.substring(0, dotIndex);
      }
      domain = domain.charAt(0).toUpperCase() + domain.slice(1);

      const isSpotify = host.includes('spotify.com') && url.pathname.includes('/track/');
      const isYoutube = host.includes('youtube.com') || host.includes('youtu.be');
      const isAppleMusic = host.includes('music.apple.com');

      // YouTube ID case correction helper
      let targetUrl = urlStr;
      if (isYoutube) {
        let ytId = url.searchParams.get('v');
        if (!ytId && host.includes('youtu.be')) {
          ytId = url.pathname.split('/').filter(Boolean)[0];
        }
        
        const listId = url.searchParams.get('list');
        if (ytId && listId) {
          const idx = listId.toLowerCase().indexOf(ytId.toLowerCase());
          if (idx !== -1) {
            const correctedId = listId.substring(idx, idx + ytId.length);
            if (correctedId !== ytId) {
              ytId = correctedId;
            }
          }
        }
        
        if (ytId) {
          targetUrl = `https://www.youtube.com/watch?v=${ytId}`;
        }
      }

      // 1. APPLE MUSIC
      if (isAppleMusic) {
        const pathSegments = url.pathname.split('/').filter(Boolean);
        let country = 'us';
        if (pathSegments.length > 0 && pathSegments[0].length === 2) {
          country = pathSegments[0];
        }

        let trackId = url.searchParams.get('i');
        if (!trackId && pathSegments.length > 0) {
          trackId = pathSegments[pathSegments.length - 1];
        }

        if (trackId && /^\d+$/.test(trackId)) {
          try {
            const itunesRes = await fetch(
              `https://itunes.apple.com/lookup?id=${trackId}&country=${country}`
            );
            const itunesData = await itunesRes.json();
            const trackItem = itunesData.results.find(item => item.wrapperType === 'track');
            
            if (trackItem) {
              return {
                title: trackItem.trackName,
                artist: trackItem.artistName,
                artwork: trackItem.artworkUrl100 ? trackItem.artworkUrl100.replace('100x100bb.jpg', '400x400bb.jpg') : '',
                duration: Math.round(trackItem.trackTimeMillis / 1000),
                previewUrl: trackItem.previewUrl || '',
                url: urlStr,
                primaryGenreName: trackItem.primaryGenreName
              };
            }
          } catch (e) {
            console.error('iTunes lookup from Apple Music ID failed:', e);
          }
        }
      }

      // 2. SPOTIFY
      if (isSpotify) {
        let title = '';
        let artist = '';
        let artwork = '';

        try {
          const microlinkUrl = `https://api.microlink.io/?url=${encodeURIComponent(urlStr)}`;
          const response = await fetch(microlinkUrl);
          const result = await response.json();
          if (result.status === 'success' && result.data) {
            title = result.data.title || '';
            artist = result.data.author || 'Spotify';
            artwork = result.data.image?.url || result.data.logo?.url || '';
            title = title.replace(/\s*\|\s*Spotify/gi, '').trim();
          }
        } catch (err) {
          console.warn('Spotify Microlink failed:', err);
        }

        if (!title) {
          try {
            const response = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(urlStr)}`);
            if (response.ok) {
              const data = await response.json();
              if (data && data.title) {
                title = data.title;
                artist = 'Spotify';
                artwork = data.thumbnail_url || '';
                const byParts = title.split(' by ');
                if (byParts.length > 1) {
                  artist = byParts[1];
                  title = byParts[0].split(' - ')[0];
                }
              }
            }
          } catch (e) {
            console.warn('Spotify oEmbed failed:', e);
          }
        }

        if (title) {
          try {
            const searchQuery = title + ' ' + (artist !== 'Spotify' ? artist : '');
            const itunesRes = await fetch(
              `https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&media=music&limit=1`
            );
            const itunesData = await itunesRes.json();
            if (itunesData.results && itunesData.results.length > 0) {
              const item = itunesData.results[0];
              return {
                title: item.trackName,
                artist: item.artistName,
                artwork: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb.jpg', '400x400bb.jpg') : artwork,
                duration: Math.round(item.trackTimeMillis / 1000),
                previewUrl: item.previewUrl || '',
                url: urlStr,
                primaryGenreName: item.primaryGenreName
              };
            }
          } catch (e) {
            console.error('iTunes search from Spotify info failed:', e);
          }

          return {
            title: title,
            artist: artist,
            artwork: artwork,
            duration: 0,
            previewUrl: '',
            url: urlStr,
            primaryGenreName: ''
          };
        }
      }

      // 3. YOUTUBE
      if (isYoutube) {
        const noembedUrl = `https://noembed.com/embed?url=${encodeURIComponent(targetUrl)}`;
        const response = await fetch(noembedUrl);
        const data = await response.json();
        
        if (data && data.title) {
          let title = data.title;
          let cleanTitle = title.replace(/\s*[\(\[][^)]*[\)\]]/gi, '').trim();
          let artist = 'YouTube';
          const dashIndex = cleanTitle.indexOf('-');
          if (dashIndex > 0) {
            artist = cleanTitle.substring(0, dashIndex).trim();
            cleanTitle = cleanTitle.substring(dashIndex + 1).trim();
          }
          
          try {
            const itunesRes = await fetch(
              `https://itunes.apple.com/search?term=${encodeURIComponent(cleanTitle + ' ' + artist)}&media=music&limit=1`
            );
            const itunesData = await itunesRes.json();
            if (itunesData.results && itunesData.results.length > 0) {
              const item = itunesData.results[0];
              return {
                title: item.trackName,
                artist: item.artistName,
                artwork: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb.jpg', '400x400bb.jpg') : (data.thumbnail_url || ''),
                duration: Math.round(item.trackTimeMillis / 1000),
                previewUrl: item.previewUrl || '',
                url: targetUrl,
                primaryGenreName: item.primaryGenreName
              };
            }
          } catch (e) {
            console.error('iTunes lookup from YouTube terms failed:', e);
          }
          
          return {
            title: cleanTitle,
            artist: artist,
            artwork: data.thumbnail_url || '',
            duration: 0,
            previewUrl: '',
            url: targetUrl,
            primaryGenreName: ''
          };
        }
      }

      // 4. OTHER WEBSITES
      try {
        const microlinkUrl = `https://api.microlink.io/?url=${encodeURIComponent(urlStr)}`;
        const response = await fetch(microlinkUrl);
        const result = await response.json();
        if (result.status === 'success' && result.data) {
          const meta = result.data;
          return {
            title: `Canción de ${domain}`,
            artist: meta.title || 'Enlace externo',
            artwork: meta.logo?.url || meta.image?.url || '',
            duration: 0,
            previewUrl: '',
            url: urlStr,
            primaryGenreName: ''
          };
        }
      } catch (e) {}

      return {
        title: `Canción de ${domain}`,
        artist: 'Enlace externo',
        artwork: '',
        duration: 0,
        previewUrl: '',
        url: urlStr,
        primaryGenreName: ''
      };
    } catch (e) {
      console.error('Error fetching URL metadata:', e);
      return null;
    }
  };

  const handleInputChange = async (e) => {
    const value = e.target.value;
    setInputValue(value);
    setError('');

    if (value.trim().length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const isUrl = value.startsWith('http://') || value.startsWith('https://');
    let searchQuery = value;

    if (isUrl) {
      const parsedQuery = cleanUrlToSearchQuery(value);
      if (!parsedQuery) {
        setSuggestions([]);
        setShowDropdown(false);
        return;
      }
      searchQuery = parsedQuery;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&media=music&limit=5`
      );
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const formatted = data.results.map((item) => ({
          trackId: item.trackId,
          title: item.trackName,
          artist: item.artistName,
          artwork: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb.jpg', '400x400bb.jpg') : '',
          duration: Math.round(item.trackTimeMillis / 1000),
          previewUrl: item.previewUrl || '',
          url: isUrl ? value : item.trackViewUrl || '',
          primaryGenreName: item.primaryGenreName
        }));
        setSuggestions(formatted);
        setShowDropdown(true);
      } else {
        setSuggestions([]);
        setShowDropdown(false);
      }
    } catch (err) {
      console.error('Error fetching search results from iTunes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSuggestion = (song) => {
    const detectedVibe = mapGenreToVibe(song.primaryGenreName);
    
    onAddSong({
      title: song.title,
      artist: song.artist,
      artwork: song.artwork,
      duration: song.duration,
      previewUrl: song.previewUrl,
      url: song.url,
      vibe: detectedVibe
    });

    setSuccessDetails({
      title: song.title,
      artist: song.artist,
      artwork: song.artwork,
      vibe: detectedVibe
    });
    
    // Automatically visual-sync the vibe selector for aesthetic consistency
    setSelectedVibe(detectedVibe);
    setShowSuccess(true);
    setInputValue('');
    setSuggestions([]);
    setShowDropdown(false);
  };

  const handleManualOrUrlAdd = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const isUrl = inputValue.startsWith('http://') || inputValue.startsWith('https://');
    setLoading(true);
    
    try {
      let songData = null;
      if (isUrl) {
        const metadata = await fetchMetadataFromUrl(inputValue);
        if (metadata) {
          const finalVibe = mapGenreToVibe(metadata.primaryGenreName) || selectedVibe;
          songData = {
            ...metadata,
            vibe: finalVibe
          };
          setSelectedVibe(finalVibe);
        } else {
          songData = {
            title: 'Enlace Web',
            artist: 'Enlace externo',
            artwork: '',
            duration: 0,
            previewUrl: '',
            url: inputValue,
            vibe: selectedVibe
          };
        }
      } else {
        const response = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(inputValue)}&media=music&limit=1`
        );
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          const item = data.results[0];
          const finalVibe = mapGenreToVibe(item.primaryGenreName) || selectedVibe;
          songData = {
            title: item.trackName,
            artist: item.artistName,
            artwork: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb.jpg', '400x400bb.jpg') : '',
            duration: Math.round(item.trackTimeMillis / 1000),
            previewUrl: item.previewUrl || '',
            url: item.trackViewUrl || '',
            vibe: finalVibe
          };
          setSelectedVibe(finalVibe);
        } else {
          songData = {
            title: inputValue,
            artist: 'Artista Desconocido',
            artwork: '',
            duration: 0,
            previewUrl: '',
            url: '',
            vibe: selectedVibe
          };
        }
      }

      if (songData) {
        onAddSong(songData);
        setSuccessDetails({
          title: songData.title,
          artist: songData.artist,
          artwork: songData.artwork,
          vibe: songData.vibe
        });
        setShowSuccess(true);
        setInputValue('');
      }
    } catch (err) {
      setError('Error al agregar la canción. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
      setSuggestions([]);
      setShowDropdown(false);
    }
  };

  // Render success feedback view
  if (showSuccess) {
    const vibeLabel = 
      successDetails?.vibe === 'chill' ? 'Chill ❄️' :
      successDetails?.vibe === 'energy' ? 'Energy ⚡' :
      successDetails?.vibe === 'vibrant' ? 'Vibrant 🔥' :
      successDetails?.vibe === 'intense' ? 'Intense 🎸' : 'Ethereal ✨';

    return (
      <div className="glass-card success-card-container" id="successSongCard">
        <div className="success-checkmark-circle">
          <Check size={36} className="checkmark-icon" />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: '700', margin: '12px 0 6px 0', textAlign: 'center' }}>
          ¡Música Agregada!
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', marginBottom: '20px' }}>
          Tu canción ha sido enviada a la lista de reproducción.
        </p>
        
        {successDetails && (
          <div className="success-song-badge">
            {successDetails.artwork ? (
              <img src={successDetails.artwork} alt={successDetails.title} className="success-badge-artwork" />
            ) : (
              <div className="success-badge-artwork fallback">
                <Music size={18} />
              </div>
            )}
            <div className="success-badge-info">
              <div className="success-badge-title">{successDetails.title}</div>
              <div className="success-badge-artist">{successDetails.artist}</div>
              <div className="success-badge-vibe">Vibra: {vibeLabel}</div>
            </div>
          </div>
        )}
        
        <button 
          onClick={() => setShowSuccess(false)}
          className="btn-primary"
          style={{ width: '100%', marginTop: '16px' }}
        >
          Agregar otra canción
        </button>
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ position: 'relative' }} id="addSongCard">
      <h2 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Music size={18} style={{ color: 'var(--neon-mint)' }} />
        Agregar a la Lista
      </h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleManualOrUrlAdd}>
        <div className="form-group" style={{ position: 'relative' }} ref={dropdownRef}>
          <label className="form-label" htmlFor="songSearchInput">
            Escribe el nombre o pega la URL
          </label>
          <div style={{ display: 'flex', gap: '8px', position: 'relative', marginBottom: '20px' }}>
            <div style={{ position: 'relative', flexGrow: 1 }}>
              <input
                type="text"
                id="songSearchInput"
                className="input-field"
                placeholder="Ej. Blinding Lights o enlace de YouTube/Spotify..."
                value={inputValue}
                onChange={handleInputChange}
                autoComplete="off"
                style={{ paddingRight: '40px' }}
              />
              <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
                {inputValue.startsWith('http') ? <LinkIcon size={16} /> : <Search size={16} />}
              </span>
            </div>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={loading || !inputValue.trim()}
              id="addSongBtn"
            >
              <Plus size={16} />
              Agregar
            </button>
          </div>

          {/* Suggestions Dropdown */}
          {showDropdown && suggestions.length > 0 && (
            <div className="suggestions-list" id="searchDropdown">
              {suggestions.map((song) => (
                <div
                  key={song.trackId || Math.random()}
                  className="suggestion-item"
                  onClick={() => handleSelectSuggestion(song)}
                >
                  {song.artwork ? (
                    <img src={song.artwork} alt={song.title} className="suggestion-art" />
                  ) : (
                    <div className="suggestion-art" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary-emerald)' }}>
                      <Music size={16} />
                    </div>
                  )}
                  <div className="suggestion-details">
                    <div className="suggestion-title">{song.title}</div>
                    <div className="suggestion-artist">{song.artist}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dynamic Vibe Selector */}
        <div className="vibe-selector-container">
          <span className="form-label" style={{ marginBottom: '10px', display: 'block' }}>
            Personalizar Vibra (Atmósfera del Fondo)
          </span>
          <div className="vibe-grid">
            {[
              { id: 'chill', icon: <Disc size={14} />, label: 'Chill ❄️', desc: 'Lofi / Jazz / R&B', color: '#00f0ff' },
              { id: 'energy', icon: <Zap size={14} />, label: 'Energy ⚡', desc: 'Pop / Electro / Dance', color: '#ff50b4' },
              { id: 'vibrant', icon: <Sparkles size={14} />, label: 'Vibrant 🔥', desc: 'Reggaeton / Latino', color: '#ffd700' },
              { id: 'intense', icon: <Flame size={14} />, label: 'Intense 🎸', desc: 'Rock / Metal / Indie', color: '#e60f28' },
              { id: 'ethereal', icon: <Music size={14} />, label: 'Ethereal ✨', desc: 'Ambient / Clásica', color: '#ffffff' }
            ].map((v) => (
              <button
                key={v.id}
                type="button"
                className={`vibe-btn ${selectedVibe === v.id ? 'active' : ''}`}
                style={{
                  '--vibe-accent': v.color
                }}
                onClick={() => setSelectedVibe(v.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700' }}>
                  {v.icon}
                  <span>{v.label}</span>
                </div>
                <span className="vibe-desc">{v.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}
