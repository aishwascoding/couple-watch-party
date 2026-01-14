import React, { useRef, useState, useEffect } from 'react';

const VideoPlayer = ({ socket, roomId }) => {
  const videoRef = useRef(null);
  const [videoFile, setVideoFile] = useState(null);
  
  // THE FLAG: This determines if a 'play' event came from you or the server
  // true = "My partner clicked play, so I shouldn't send a signal back"
  // false = "I clicked play, so I MUST send a signal"
  const isRemoteUpdate = useRef(false); 

  // 1. Handle loading the local file
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideoFile(URL.createObjectURL(file));
    }
  };

  // 2. Listen for signals from the Server (Partner)
  useEffect(() => {
    if (!socket) return;

    socket.on('sync_action', (data) => {
      console.log("Received action:", data);
      
      // Set flag to true so our local 'onPlay' handler knows to stay quiet
      isRemoteUpdate.current = true;

      const video = videoRef.current;
      if (!video) return;

      if (data.type === 'PLAY') {
        // Sync time first, then play
        // We only adjust time if the difference is significant (> 0.5s) to avoid jumping
        if (Math.abs(video.currentTime - data.time) > 0.5) {
          video.currentTime = data.time;
        }
        video.play();
      } else if (data.type === 'PAUSE') {
        video.pause();
      }

      // Reset the flag after a short delay
      setTimeout(() => {
        isRemoteUpdate.current = false;
      }, 500);
    });

    // Cleanup listener on unmount
    return () => socket.off('sync_action');
  }, [socket]);

  // 3. Handle Local Events (Sending to Partner)
  const handlePlay = () => {
    if (isRemoteUpdate.current) return; // If this was triggered by code, STOP.

    socket.emit('sync_action', {
      roomId,
      action: { type: 'PLAY', time: videoRef.current.currentTime }
    });
  };

  const handlePause = () => {
    if (isRemoteUpdate.current) return;

    socket.emit('sync_action', {
      roomId,
      action: { type: 'PAUSE', time: videoRef.current.currentTime }
    });
  };

  const handleSeek = () => {
     if (isRemoteUpdate.current) return;
     // When seeking, we treat it like a play event to sync the new timestamp
     socket.emit('sync_action', {
       roomId,
       action: { type: 'PLAY', time: videoRef.current.currentTime }
     });
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '20px' }}>
      {!videoFile && (
        <div style={{ marginBottom: '20px' }}>
          <h3>Step 2: Select your movie file</h3>
          <p>(Your partner must select the same file)</p>
          <input type="file" accept="video/*" onChange={handleFileChange} />
        </div>
      )}

      {videoFile && (
        <video
          ref={videoRef}
          src={videoFile}
          controls
          width="80%"
          style={{ border: '2px solid #333', borderRadius: '8px' }}
          onPlay={handlePlay}
          onPause={handlePause}
          onSeeked={handleSeek}
        />
      )}
    </div>
  );
};

export default VideoPlayer;