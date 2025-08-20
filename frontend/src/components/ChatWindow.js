import { useEffect, useState, useRef } from "react";
import { useAuth } from "../AuthContext";
import "../styles/chat.css";

export default function ChatWindow({ socket, friend_recipient, closeChat }) {
  const { apiFetch } = useAuth();
  const [msgContent, setMsgContent] = useState("");
  const [messages, setMessages] = useState([]);
  const [loadedMessages, setLoadedMessages] = useState(false);
  const messageInput = useRef(null);
  const conversation = useRef(null);

  const sendMessage = () => {
    if (socket && friend_recipient) {
      socket.emit("send_message", {
        recipient_id: friend_recipient.id,
        content: msgContent,
      });
      setMsgContent("");
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const submitMessage = (e) => {
    e.preventDefault();
    sendMessage();
  };

  const loadMessages = async () => {
    const msgs = await apiFetch(
      "http://localhost:5000/messages/history/" + friend_recipient.id
    );
    setMessages(msgs);
    setLoadedMessages(true);
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        submitMessage(e); //This will contain prevent default
      }
    };
    const element = messageInput.current;
    element.addEventListener("keypress", handler);
    return () => element.removeEventListener("keypress", handler);
  }, [submitMessage]);

  useEffect(() => {
    if (loadedMessages) messageInput.current.focus();
  }, [loadedMessages]);

  useEffect(() => {
    if (socket != null) {
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
    conversation.current.scrollTop = conversation.current.scrollHeight;
  }, [messages]);

  return (
    <div className="chat-window">
      <header>
        <div>{friend_recipient.username}</div>
        <div>
          <button onClick={() => closeChat(friend_recipient)}>
            Close this chat
          </button>
          <button onClick={() => setMessages([])}>
            Clear messages from UI
          </button>
        </div>
      </header>
      <div className="conversation" ref={conversation}>
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
              {m.content}
              {m.image_url && (
                <img src={m.image_url} alt="" style={{ maxWidth: "400px" }} />
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="chat-input-container">
        <form onSubmit={submitMessage}>
          <textarea
            ref={messageInput}
            rows={3}
            className="chat-input"
            value={msgContent}
            onChange={(e) => setMsgContent(e.target.value)}
            placeholder="Type message"
          />
          <div className="send-message-button">
            <div>
              <a href="/" onClick={submitMessage}>
                📨
              </a>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
