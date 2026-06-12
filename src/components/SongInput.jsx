import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Link as LinkIcon, Music } from 'lucide-react';

export default function SongInput({ onAddSong }) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState('');
  
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

  // Advanced metadata fetcher using local parsing and API backups to avoid CORS/redirects
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

      // YouTube casing correction helper
      let targetUrl = urlStr;
      let youtubeId = '';
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
              console.log(`Auto-correcting YouTube video ID case: ${ytId} -> ${correctedId}`);
              ytId = correctedId;
            }
          }
        }
        
        if (ytId) {
          youtubeId = ytId;
          targetUrl = `https://www.youtube.com/watch?v=${ytId}`;
        }
      }

      // 1. APPLE MUSIC (Local path parsing - 100% reliable)
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
            
            // Sometimes it returns the album first if it's an album ID, we want the track
            const trackItem = itunesData.results.find(item => item.wrapperType === 'track');
            
            if (trackItem) {
              return {
                title: trackItem.trackName,
                artist: trackItem.artistName,
                artwork: trackItem.artworkUrl100 ? trackItem.artworkUrl100.replace('100x100bb.jpg', '400x400bb.jpg') : '',
                duration: Math.round(trackItem.trackTimeMillis / 1000),
                previewUrl: trackItem.previewUrl || '',
                url: urlStr
              };
            }
          } catch (e) {
            console.error('iTunes lookup from Apple Music ID failed:', e);
          }
        }
      }

      // 2. SPOTIFY (Try native oEmbed, fall back to Microlink proxy)
      if (isSpotify) {
        try {
          const response = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(urlStr)}`);
          if (response.ok) {
            const data = await response.json();
            if (data && data.title) {
              let title = data.title;
              let artist = 'Spotify';
              const byParts = title.split(' by ');
              if (byParts.length > 1) {
                artist = byParts[1];
                title = byParts[0].split(' - ')[0];
              }

              // Search iTunes to get duration and preview audio
              const itunesRes = await fetch(
                `https://itunes.apple.com/search?term=${encodeURIComponent(title + ' ' + artist)}&media=music&limit=1`
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
                  url: urlStr
                };
              }

              return {
                title: title,
                artist: artist,
                artwork: data.thumbnail_url || '',
                duration: 0,
                previewUrl: '',
                url: urlStr
              };
            }
          }
        } catch (e) {
          console.warn('Native Spotify oEmbed failed, trying Microlink:', e);
        }

        // Microlink fallback
        try {
          const microlinkUrl = `https://api.microlink.io/?url=${encodeURIComponent(urlStr)}`;
          const response = await fetch(microlinkUrl);
          const result = await response.json();
          if (result.status === 'success' && result.data) {
            const meta = result.data;
            let pageTitle = meta.title || '';
            let artworkUrl = meta.image?.url || meta.logo?.url || '';
            
            let cleanTitle = pageTitle.replace(/\s*\|\s*Spotify/gi, '').trim();
            let songTitle = cleanTitle;
            let artist = 'Spotify';
            const songByParts = cleanTitle.split(/\s*-\s*song\s+by\s+/i);
            const albumByParts = cleanTitle.split(/\s*-\s*album\s+by\s+/i);
            if (songByParts.length > 1) {
              songTitle = songByParts[0];
              artist = songByParts[1];
            } else if (albumByParts.length > 1) {
              songTitle = albumByParts[0];
              artist = albumByParts[1];
            }

            const itunesRes = await fetch(
              `https://itunes.apple.com/search?term=${encodeURIComponent(songTitle + ' ' + artist)}&media=music&limit=1`
            );
            const itunesData = await itunesRes.json();
            if (itunesData.results && itunesData.results.length > 0) {
              const item = itunesData.results[0];
              return {
                title: item.trackName,
                artist: item.artistName,
                artwork: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb.jpg', '400x400bb.jpg') : artworkUrl,
                duration: Math.round(item.trackTimeMillis / 1000),
                previewUrl: item.previewUrl || '',
                url: urlStr
              };
            }

            return {
              title: songTitle,
              artist: artist,
              artwork: artworkUrl,
              duration: 0,
              previewUrl: '',
              url: urlStr
            };
          }
        } catch (err) {
          console.error('Spotify Microlink fallback failed:', err);
        }
      }

      // 3. YOUTUBE (CORS-friendly noembed API)
      if (isYoutube) {
        const noembedUrl = `https://noembed.com/embed?url=${encodeURIComponent(targetUrl)}`;
        const response = await fetch(noembedUrl);
        const data = await response.json();
        
        if (data && data.title) {
          let title = data.title;
          let cleanTitle = title.replace(/\s*[\(\[][^)]*[\)\]]/gi, '').trim(); // clean brackets
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
                url: targetUrl
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
            url: targetUrl
          };
        }
      }

      // 4. OTHER WEBSITES (Generic Fallback)
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
            url: urlStr
          };
        }
      } catch (e) {}

      return {
        title: `Canción de ${domain}`,
        artist: 'Enlace externo',
        artwork: '',
        duration: 0,
        previewUrl: '',
        url: urlStr
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
          url: isUrl ? value : item.trackViewUrl || ''
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
    onAddSong({
      title: song.title,
      artist: song.artist,
      artwork: song.artwork,
      duration: song.duration,
      previewUrl: song.previewUrl,
      url: song.url
    });
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
      if (isUrl) {
        const metadata = await fetchMetadataFromUrl(inputValue);
        if (metadata) {
          onAddSong(metadata);
          setInputValue('');
        } else {
          onAddSong({
            title: 'Enlace Web',
            artist: 'Enlace externo',
            artwork: '',
            duration: 0,
            previewUrl: '',
            url: inputValue
          });
          setInputValue('');
        }
      } else {
        const response = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(inputValue)}&media=music&limit=1`
        );
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          const item = data.results[0];
          onAddSong({
            title: item.trackName,
            artist: item.artistName,
            artwork: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb.jpg', '400x400bb.jpg') : '',
            duration: Math.round(item.trackTimeMillis / 1000),
            previewUrl: item.previewUrl || '',
            url: item.trackViewUrl || ''
          });
          setInputValue('');
        } else {
          onAddSong({
            title: inputValue,
            artist: 'Artista Desconocido',
            artwork: '',
            duration: 0,
            previewUrl: '',
            url: ''
          });
          setInputValue('');
        }
      }
    } catch (err) {
      setError('Error al agregar la canción. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
      setSuggestions([]);
      setShowDropdown(false);
    }
  };

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
          <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
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
      </form>
    </div>
  );
}
