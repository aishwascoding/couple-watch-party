import React, { useEffect, useRef, useState } from "react";
import Peer from "simple-peer";

const VideoCall = ({ socket, roomId }) => {
	const [stream, setStream] = useState(null);
	const [receivingCall, setReceivingCall] = useState(false);
	const [caller, setCaller] = useState("");
	const [callerSignal, setCallerSignal] = useState();
	const [callAccepted, setCallAccepted] = useState(false);
	const [callEnded, setCallEnded] = useState(false);
	
	const myVideo = useRef();
	const userVideo = useRef();
	const connectionRef = useRef();

	useEffect(() => {
        // Get user media (Camera/Mic)
		navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
			setStream(stream);
			if (myVideo.current) {
				myVideo.current.srcObject = stream;
			}
		});

        // Listen for incoming calls
		socket.on("incoming_call", (data) => {
			setReceivingCall(true);
			setCaller(data.from);
			setCallerSignal(data.signal);
		});
	}, [socket]);

	const callUser = () => {
		const peer = new Peer({
			initiator: true,
			trickle: false,
			stream: stream
		});

		peer.on("signal", (data) => {
			socket.emit("call_user", {
				roomId: roomId, // Matches Server "data.roomId"
				signalData: data,
				from: socket.id
			});
		});

		peer.on("stream", (stream) => {
			if (userVideo.current) {
				userVideo.current.srcObject = stream;
			}
		});

		socket.on("call_accepted", (signal) => {
			setCallAccepted(true);
			peer.signal(signal);
		});

		connectionRef.current = peer;
	};

	const answerCall = () => {
		setCallAccepted(true);
		const peer = new Peer({
			initiator: false,
			trickle: false,
			stream: stream
		});

		peer.on("signal", (data) => {
			socket.emit("answer_call", { 
                signal: data, 
                roomId: roomId // Matches Server "data.roomId"
            });
		});

		peer.on("stream", (stream) => {
			userVideo.current.srcObject = stream;
		});

		peer.signal(callerSignal);
		connectionRef.current = peer;
	};

	return (
		<div className="video-call-container">
            {/* MY VIDEO (Small, Bottom Corner) */}
			{stream && (
                <div className="my-video-frame">
				    <video playsInline muted ref={myVideo} autoPlay />
                </div>
			)}
            
            {/* PARTNER VIDEO (Big, Overlay) */}
			{callAccepted && !callEnded && (
                <div className="partner-video-frame">
				    <video playsInline ref={userVideo} autoPlay />
                </div>
			)}

            {/* CALL CONTROLS */}
			<div className="call-controls">
				{callAccepted && !callEnded ? (
					<button onClick={() => setCallEnded(true)} className="end-call-btn">
                        End Call
                    </button>
				) : (
                    // IF receiving a call, show ANSWER. If not, show CALL.
                    <div>
                        {receivingCall && !callAccepted ? (
                            <div className="incoming-call-alert">
                                <p>Incoming Call...</p>
                                <button onClick={answerCall} className="answer-btn">Answer</button>
                            </div>
                        ) : (
                            <button onClick={callUser} className="call-btn">
                                📹 Call Partner
                            </button>
                        )}
                    </div>
				)}
			</div>
		</div>
	);
};

export default VideoCall;