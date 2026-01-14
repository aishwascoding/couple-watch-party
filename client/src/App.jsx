import React, { useState, useRef, useEffect } from 'react';
import io from 'socket.io-client';
import VideoPlayer from './components/VideoPlayer';
import VideoCall from './components/VideoCall';
import ReactionBar from './components/ReactionBar';
import './App.css';

const socket = io.connect("http://localhost:3001");

function App() {
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  
  const theaterRef = useRef(null);
  
  // Background Music For The Lobby (Sha-boom)
  const audioRef = useRef(new Audio('/music.mp3'));

  useEffect(() => {
    audioRef.current.loop = true;
    audioRef.current.volume = 0.2;

    const startMusic = async () => {
      try {
        await audioRef.current.play();
      } catch (err) {
        const playOnInteraction = () => {
          audioRef.current.play();
          document.removeEventListener('click', playOnInteraction);
          document.removeEventListener('keydown', playOnInteraction);
        };
        document.addEventListener('click', playOnInteraction);
        document.addEventListener('keydown', playOnInteraction);
      }
    };

    startMusic();

    return () => {
      audioRef.current.pause();
    };
  }, []);

  const joinRoom = () => {
    if (roomId !== "") {
      audioRef.current.pause();
      audioRef.current.currentTime = 0; 

      const sfx = new Audio('/start.mp3');
      sfx.volume = 0.7;
      sfx.play();

      socket.emit("join_room", roomId);
      setJoined(true);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsTheaterMode(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleTheaterMode = () => {
    if (!document.fullscreenElement) {
      theaterRef.current.requestFullscreen().catch(err => {
        alert(`Error enabling fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="App">
      {!joined ? (
        // --- LOBBY VIEW ---
        <> 
          <div className="lobby">
            <span className="pixel-heart">♥</span>
            <h1>Welcome Benchmates!</h1>
            <p className="subtitle">We hope you two will have a good time!</p>
            
            <div className="input-group">
              <input 
                type="text" 
                placeholder="Enter Room Name..." 
                onChange={(event) => setRoomId(event.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && joinRoom()}
              />
            </div>

            <button onClick={joinRoom}>START MOVIE NIGHT</button>
          </div>

          <div className="dev-credit">
             Developed by : A. Chitransh
          </div>
        </>
      ) : (
        // --- THEATER VIEW ---
        <div ref={theaterRef} className="theater-container">
            
            <div className="tv-frame-container">
                <div className="tv-screen-inset">
                    <VideoPlayer socket={socket} roomId={roomId} />
                </div>
            </div>

            <VideoCall socket={socket} roomId={roomId} />
            
            {/* single row controls */}
            <div className="controls-row">
                
                {/* LEFT: Quit Button */}
                <button className="theater-btn" onClick={toggleTheaterMode}>
                    {isTheaterMode ? "QUIT THEATER" : "ENTER THEATER"}
                </button>

                {/* RIGHT: Reaction Bar */}
                <ReactionBar socket={socket} roomId={roomId} />
                
            </div>

        </div>
      )}
    </div>
  );
}

export default App;