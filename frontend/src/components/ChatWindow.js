import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import "../styles/chat.css";

export default function ChatWindow({ socket, friend_recipient, closeChat }) {
  const { apiFetch } = useAuth();
  const [msgContent, setMsgContent] = useState("");
  const [messages, setMessages] = useState([]);

  const sendMessage = () => {
    if (socket && friend_recipient) {
      socket.emit("send_message", {
        recipient_id: friend_recipient.id,
        content: msgContent,
      });
      setMsgContent("");
    }
  };

  const loadMessages = async () => {
    const msgs = await apiFetch(
      "http://localhost:5000/messages/history/" + friend_recipient.id
    );
    setMessages(msgs);
  };

  useEffect(() => {
    loadMessages();
  }, []);

  useEffect(() => {
    if (socket !== null) {
      const handler = (payload) => {
        if (
          payload.sender_id === friend_recipient?.id ||
          payload.recipient_id === friend_recipient?.id
        ) {
          setMessages((prev) => [...prev, payload]);
        }
      };

      socket.on("new_message", handler);
      return () => socket.off("new_message", handler);
    }
  }, [socket, friend_recipient]);

  useEffect(() => {
    let chat_window = document.querySelector(`#chat_${friend_recipient.id}`);
    chat_window.scrollTop = chat_window.scrollHeight;
  }, [messages]);

  return (
    <div>
      <h3>Chat with {friend_recipient.username}</h3>
      <button onClick={() => closeChat(friend_recipient)}>
        Close this chat
      </button>
      <button onClick={() => setMessages([])}>Clear messages from UI</button>
      <div className="conversation" id={`chat_${friend_recipient.id}`}>
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.sender_id !== friend_recipient.id
                ? "me-sender-container"
                : "me-receiver-container"
            }
          >
            <div
              className={
                m.sender_id !== friend_recipient.id
                  ? "me-sender"
                  : "me-receiver"
              }
            >
              {/* <b>
                {m.sender_id === friend_recipient.id
                  ? friend_recipient.username
                  : "Me"}
                :
              </b>{" "} */}
              {m.content}
              {m.image_url && (
                <img src={m.image_url} alt="" style={{ maxWidth: "400px" }} />
              )}
            </div>
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
      >
        <input
          value={msgContent}
          onChange={(e) => setMsgContent(e.target.value)}
          placeholder="Type message"
        />
        <button>Send</button>
      </form>
    </div>
  );
}
