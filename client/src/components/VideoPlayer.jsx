import React, { useRef, useEffect, useState } from 'react';

const VideoPlayer = ({ socket, roomId }) => {
  const videoRef = useRef(null);
  const [fileURL, setFileURL] = useState(null);

  // 1. HANDLE FILE UPLOAD
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setFileURL(url);
      
      // Notify partner that I have picked a file (Optional feature)
      // socket.emit("file_change", { room: roomId, fileData: file.name });
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // --- EMIT EVENTS (Send to Partner) ---
    const handlePlay = () => {
      socket.emit("play_video", { room: roomId });
    };

    const handlePause = () => {
      socket.emit("pause_video", { room: roomId });
    };

    const handleSeek = () => {
      socket.emit("seek_video", { room: roomId, timestamp: video.currentTime });
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("seeking", handleSeek);

    // --- LISTEN FOR EVENTS (Receive from Partner) ---
    socket.on("receive_play", () => {
      console.log("Partner Played");
      video.play();
    });

    socket.on("receive_pause", () => {
      console.log("Partner Paused");
      video.pause();
    });

    socket.on("receive_seek", (timestamp) => {
      console.log("Partner Seeked to:", timestamp);
      // Small buffer check to prevent seek loops
      if (Math.abs(video.currentTime - timestamp) > 0.5) {
        video.currentTime = timestamp;
      }
    });

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("seeking", handleSeek);
      
      socket.off("receive_play");
      socket.off("receive_pause");
      socket.off("receive_seek");
    };
  }, [socket, roomId]);

  return (
    <div className="video-wrapper">
      {!fileURL ? (
        <div className="file-input-container">
           <label className="custom-file-upload">
              <input type="file" onChange={handleFileChange} accept="video/*" />
              📂 Choose Movie File
           </label>
           <p style={{color:'white', marginTop:'10px', fontSize:'0.8rem'}}>
             Both partners must select the same file from their own computer.
           </p>
        </div>
      ) : (
        <video 
          ref={videoRef} 
          src={fileURL} 
          controls 
          className="main-video"
          style={{ width: '100%' }}
        />
      )}
    </div>
  );
};

export default VideoPlayer;