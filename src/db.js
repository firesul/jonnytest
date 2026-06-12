import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, push, set, remove } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDRaxZTpgT8j5FXtcZiGWLnHQVQy98xTKY",
  authDomain: "jonnytest-b0dea.firebaseapp.com",
  projectId: "jonnytest-b0dea",
  storageBucket: "jonnytest-b0dea.firebasestorage.app",
  messagingSenderId: "618071358221",
  appId: "1:618071358221:web:2e9c3aec142d0dc205ce44",
  measurementId: "G-0GD9R29ME4",
  databaseURL: "https://jonnytest-b0dea-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const songsRef = ref(database, 'songs');

export const dbService = {
  /**
   * Subscribes to songs updates in real-time from Firebase Realtime Database.
   * @param {function} callback - Called with updated songs array
   * @returns {function} unsubscribe function
   */
  subscribeSongs: (callback) => {
    return onValue(songsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const songsList = Object.keys(data).map(key => ({
          ...data[key],
          id: key
        }));
        songsList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        callback(songsList);
      } else {
        callback([]);
      }
    });
  },

  /**
   * Adds a new song to Firebase.
   * @param {object} songData 
   */
  addSong: async (songData) => {
    const newSongRef = push(songsRef);
    const newSong = {
      ...songData,
      id: newSongRef.key,
      createdAt: new Date().toISOString()
    };
    await set(newSongRef, newSong);
    return newSong;
  },

  /**
   * Deletes a song by its unique ID.
   * @param {string} id 
   */
  deleteSong: async (id) => {
    const songRef = ref(database, `songs/${id}`);
    await remove(songRef);
  },

  /**
   * Deletes all songs from the list.
   */
  clearAllSongs: async () => {
    await set(songsRef, null);
  }
};
