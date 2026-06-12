// Database Abstraction layer for Playlist (formerly VibeList)
// Automatically supports LocalStorage with active subscriber pattern and multi-tab sync.

const LOCAL_STORAGE_KEY = 'vibelist_songs';
let subscribers = [];

const getLocalSongs = () => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error reading from LocalStorage:', e);
    return [];
  }
};

const saveLocalSongs = (songs) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(songs));
  } catch (e) {
    console.error('Error writing to LocalStorage:', e);
  }
};

// Default mock songs to show on first run if empty
const DEFAULT_SONGS = [
  {
    id: 'mock-1',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/44/28/7f/mzi.cfftdvcl.jpg/400x400bb.jpg',
    duration: 200,
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview122/v4/bf/d7/08/bfd70830-ec38-6625-f935-7db84872c8f8/mzaf_10915609312215886616.plus.aac.p.m4a',
    url: 'https://music.apple.com/us/album/blinding-lights/1499385848?i=1499386152',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString() // 2 hours ago
  },
  {
    id: 'mock-2',
    title: 'Dakiti',
    artist: 'Bad Bunny & Jhayco',
    artwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/a5/d8/6d/a5d86d5e-e478-f7b6-c56a-a28a2a0fcd56/602435471676.jpg/400x400bb.jpg',
    duration: 205,
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/58/b0/a2/58b0a2fa-f273-0447-758c-85f9be28f322/mzaf_16480572700344078696.plus.aac.p.m4a',
    url: 'https://music.apple.com/us/album/dakiti/1542104124?i=1542104131',
    createdAt: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
  }
];

// Initialize default songs if localStorage is empty
if (getLocalSongs().length === 0) {
  saveLocalSongs(DEFAULT_SONGS);
}

const notifySubscribers = (songs) => {
  subscribers.forEach(cb => {
    try {
      cb(songs);
    } catch (e) {
      console.error('Error notifying subscriber:', e);
    }
  });
};

export const dbService = {
  /**
   * Subscribes to songs updates in real-time.
   * Works client-side via active callback registry and StorageEvents for cross-tab updates.
   * @param {function} callback - Called with updated songs array
   * @returns {function} unsubscribe function
   */
  subscribeSongs: (callback) => {
    subscribers.push(callback);
    // Initial call
    callback(getLocalSongs());

    const handleStorageChange = (e) => {
      if (e.key === LOCAL_STORAGE_KEY) {
        const updated = getLocalSongs();
        notifySubscribers(updated);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      subscribers = subscribers.filter(cb => cb !== callback);
      window.removeEventListener('storage', handleStorageChange);
    };
  },

  /**
   * Adds a new song to the list.
   * @param {object} songData 
   */
  addSong: async (songData) => {
    const songs = getLocalSongs();
    const newSong = {
      ...songData,
      id: 'song-' + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString()
    };
    songs.unshift(newSong); // Add to beginning of list
    saveLocalSongs(songs);
    notifySubscribers(songs);
    return newSong;
  },

  /**
   * Deletes a song by its unique ID.
   * @param {string} id 
   */
  deleteSong: async (id) => {
    let songs = getLocalSongs();
    songs = songs.filter(song => song.id !== id);
    saveLocalSongs(songs);
    notifySubscribers(songs);
  },

  /**
   * Deletes all songs from the list.
   */
  clearAllSongs: async () => {
    saveLocalSongs([]);
    notifySubscribers([]);
  },

  /**
   * Updates an existing song's details.
   * @param {string} id 
   * @param {object} updatedFields 
   */
  updateSong: async (id, updatedFields) => {
    let songs = getLocalSongs();
    songs = songs.map(song => {
      if (song.id === id) {
        return {
          ...song,
          ...updatedFields
        };
      }
      return song;
    });
    saveLocalSongs(songs);
    notifySubscribers(songs);
  }
};
