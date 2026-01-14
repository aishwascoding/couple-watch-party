import React, { useState, useEffect } from 'react';
import './ReactionBar.css';

const REACTION_TYPES = [
  { label: 'LOVE', emoji: '❤️' },
  { label: 'HAHA', emoji: '😂' },
  { label: 'WOW',  emoji: '😮' },
  { label: 'SAD',  emoji: '🥺' },
  { label: 'YAY',  emoji: '🎉' }
];

const ReactionBar = ({ socket, roomId }) => {
  const [reactions, setReactions] = useState([]);

  // 1. ADD REACTION TO SCREEN
  const addReaction = (emoji) => {
    const id = Date.now() + Math.random();
    // Randomize position slightly (between 20% and 80% of screen width)
    const randomLeft = Math.floor(Math.random() * 60) + 20; 
    
    const newReaction = { id, emoji, left: randomLeft };
    
    setReactions((prev) => [...prev, newReaction]);

    // Remove it after 2 seconds (cleanup)
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2000);
  };

  // 2. SEND REACTION
  const sendReaction = (emoji) => {
    // Show it on MY screen
    addReaction(emoji);
    // Send it to HER screen
    socket.emit("send_reaction", { roomId, emoji });
  };

  // 3. LISTEN FOR HER REACTIONS
  useEffect(() => {
    socket.on("receive_reaction", (emoji) => {
      addReaction(emoji);
    });

    return () => {
      socket.off("receive_reaction");
    };
  }, [socket]);

  return (
    <>
      {/* --- THE FLOATING EMOJIS LAYER --- */}
      <div className="reaction-overlay">
        {reactions.map((r) => (
          <div 
            key={r.id} 
            className="floating-emoji"
            style={{ left: `${r.left}%` }}
          >
            {r.emoji}
          </div>
        ))}
      </div>

      {/* --- THE BUTTON BAR --- */}
      <div className="reaction-bar">
        {REACTION_TYPES.map((type) => (
          <button 
            key={type.label} 
            className="reaction-btn" 
            onClick={() => sendReaction(type.emoji)}
          >
            {type.emoji}
          </button>
        ))}
      </div>
    </>
  );
};

export default ReactionBar;