import { useEffect, useState, useRef } from "react";
import ChatWindow from "./ChatWindow";
import { useAuth } from "../AuthContext";

import notificationSound from "../assets/notification.mp3";

export default function Chats({
  friends,
  selectedFriends,
  openFriendChat,
  closeFriendChat,
}) {
  const { user, socket } = useAuth();

  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.src = notificationSound;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playNotificationSound = async () => {
    try {
      setIsPlaying(true);
      console.log("Will play sound");
      await audioRef.current.play();
      setTimeout(() => setIsPlaying(false), 100);
      console.log("Done !");
    } catch (error) {
      console.error("Error playing notification sound:", error);
      setIsPlaying(false);
    }
  };

  const checkConditionAndNotify = async () => {
    if (document.visibilityState === "visible" || isPlaying) {
      return;
    }
    console.log("Conditions met !");
    await playNotificationSound();
  };

  useEffect(() => {
    if (socket != null && user != null) {
      const handler = async (payload) => {
        const { sender_id, recipient_id, sender_username } = payload;
        let other_user;
        if (user.id === sender_id) {
          const other_user_tmp = friends.filter((e) => e.id === recipient_id);
          if (other_user_tmp.length === 0) return;
          other_user = other_user_tmp[0];
        } else {
          other_user = { id: sender_id, username: sender_username };
        }
        if (
          !selectedFriends
            .map((other_user) => other_user.id)
            .includes(other_user.id)
        ) {
          openFriendChat(other_user);
        }
        await checkConditionAndNotify();
      };

      socket.on("new_message", handler);
      return () => socket.off("new_message", handler);
    }
  }, [user, socket, friends, selectedFriends, openFriendChat]);

  return (
    <>
      {friends.length > 0 && (
        <div>
          <h3>Chat with friends:</h3>
          <ul>
            {friends.map((f) => (
              <li key={f.id}>
                {f.username}{" "}
                {!selectedFriends.map((friend) => friend.id).includes(f.id) && (
                  <a
                    className="open-chat"
                    disabled={selectedFriends
                      .map((friend) => friend.id)
                      .includes(f.id)}
                    href="/"
                    onClick={(e) => {
                      e.preventDefault();
                      openFriendChat(f);
                    }}
                  >
                    💬​
                  </a>
                )}
              </li>
            ))}
          </ul>
          {selectedFriends &&
            selectedFriends.map((friend) => (
              <ChatWindow
                key={friend.id}
                friend_recipient={friend}
                closeChat={closeFriendChat}
              />
            ))}
        </div>
      )}
    </>
  );
}
