import React, { useEffect, useState, useRef } from 'react';
import Peer from 'simple-peer';

const VideoCall = ({ socket, roomId }) => {
  const [stream, setStream] = useState(null);
  const [partnerStream, setPartnerStream] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [receivingCall, setReceivingCall] = useState(false);
  const [callerSignal, setCallerSignal] = useState(null);
  const [caller, setCaller] = useState("");
  const [idToCall, setIdToCall] = useState("");
  
  const myVideo = useRef();
  const partnerVideo = useRef();
  const connectionRef = useRef();
  const connectionStatus = useRef("idle"); 

  // --- DRAG LOGIC ---
  const dragItem = useRef();
  const isDragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    isDragging.current = true;
    const rect = dragItem.current.getBoundingClientRect();
    offset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current || !dragItem.current) return;
    e.preventDefault();
    dragItem.current.style.left = `${e.clientX - offset.current.x}px`;
    dragItem.current.style.top = `${e.clientY - offset.current.y}px`;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // --- VIDEO CONNECTION ---
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((currentStream) => {
        setStream(currentStream);
        socket.emit("ready", roomId);
      })
      .catch(err => console.error("Camera Error:", err));

    socket.on("user_ready", (id) => setIdToCall(id));

    socket.on("signal", (data) => {
      if (connectionStatus.current === "connected") return;

      const senderId = data.from || data.callerID;

      if (connectionRef.current && !callAccepted) {
          setCallAccepted(true);
          connectionStatus.current = "connected";
          connectionRef.current.signal(data.signal);
          return;
      }

      if (!connectionRef.current && senderId !== socket.id) {
          setReceivingCall(true);
          setCaller(senderId);
          setCallerSignal(data.signal);
      }
    });

    return () => {
      socket.off("user_ready");
      socket.off("signal");
      if (connectionRef.current) connectionRef.current.destroy();
    };
  }, [roomId, socket]);

  // --- WATCHER 1: FORCE LOCAL VIDEO (Fixes the Black Box) ---
  useEffect(() => {
    if (myVideo.current && stream) {
        myVideo.current.srcObject = stream;
    }
  }, [stream]); // Runs whenever the stream is ready

  // --- WATCHER 2: FORCE PARTNER VIDEO ---
  useEffect(() => {
    if (partnerVideo.current && partnerStream) {
        partnerVideo.current.srcObject = partnerStream;
    }
  }, [partnerStream, callAccepted]);


  // --- CALL ACTIONS ---
  const callUser = (id) => {
    connectionStatus.current = "calling";
    const peer = new Peer({ initiator: true, trickle: false, stream: stream });
    
    peer.on("signal", (data) => {
      socket.emit("signal", { userToSignal: id, signal: data, from: socket.id });
    });
    
    peer.on("stream", (currentStream) => setPartnerStream(currentStream));
    
    socket.on("signal", (data) => {
        setCallAccepted(true);
        if (connectionStatus.current !== "connected") {
            connectionStatus.current = "connected";
            peer.signal(data.signal);
        }
    });
    connectionRef.current = peer;
  };

  const answerCall = () => {
    setCallAccepted(true);
    connectionStatus.current = "connected";
    const peer = new Peer({ initiator: false, trickle: false, stream: stream });
    
    peer.on("signal", (data) => {
      socket.emit("signal", { signal: data, userToSignal: caller, from: socket.id });
    });
    
    peer.on("stream", (currentStream) => setPartnerStream(currentStream));
    
    peer.signal(callerSignal);
    connectionRef.current = peer;
  };

  return (
    <div 
        ref={dragItem}
        style={{ 
            position: 'fixed', top: '20px', left: '20px', zIndex: 1000,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            background: 'rgba(0, 0, 0, 0.6)', padding: '10px',
            borderRadius: '12px', backdropFilter: 'blur(5px)',
            boxShadow: '0 4px 15px rgba(0,0,0,0.5)', width: 'fit-content'
        }}
    >
        {/* DRAG HANDLE */}
        <div 
            onMouseDown={handleMouseDown}
            style={{ 
                color: '#aaa', fontSize: '14px', marginBottom: '5px', 
                cursor: 'grab', width: '100%', textAlign: 'center', userSelect: 'none'
            }}
        >
           ::::
        </div>

        {/* BUTTONS */}
        <div style={{ marginBottom: '8px', display: 'flex', gap: '5px' }}>
            {idToCall && !callAccepted && !receivingCall && (
                <button onClick={() => callUser(idToCall)} style={btnStyle('#28a745')}>Call Partner</button>
            )}
            {receivingCall && !callAccepted && (
                <button onClick={answerCall} style={btnStyle('#007bff')}>Answer Call</button>
            )}
        </div>

        {/* VIDEOS */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {stream && (
                <div style={{ position: 'relative', width: '100px', height: '56px' }}>
                    <video playsInline muted ref={myVideo} autoPlay style={videoStyle} />
                </div>
            )}
            
            {callAccepted && (
                <div style={{ position: 'relative', width: '240px', height: '135px' }}>
                    <video playsInline ref={partnerVideo} autoPlay style={{ ...videoStyle, border: '2px solid #ff4757' }} />
                </div>
            )}
        </div>
    </div>
  );
};

const videoStyle = {
    width: '100%', height: '100%', borderRadius: '8px',
    background: '#000', objectFit: 'cover', aspectRatio: '16/9'
};

const btnStyle = (color) => ({
    background: color, color: 'white', padding: '5px 10px',
    borderRadius: '15px', border: 'none', cursor: 'pointer',
    fontWeight: 'bold', fontSize: '12px'
});

export default VideoCall;