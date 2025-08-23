import { useEffect, useState, useRef } from "react";
import { useAuth } from "../AuthContext";
import { API_MESSAGES_HISTORY } from "../services/constants";
import Message from "./Message";
import "../styles/chat.css";

export default function ChatWindow({ friend_recipient, closeChat }) {
  const { apiFetch, socket, user } = useAuth();
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
    let ignore = false;
    const loadMessages = async () => {
      return await apiFetch(`${API_MESSAGES_HISTORY}/${friend_recipient.id}`);
    };
    if (!ignore) {
      loadMessages().then((msgs) => {
        if (!ignore) {
          setMessages(msgs);
          setLoadedMessages(true);
        }
      });
    }
    return () => {
      ignore = true;
    };
  }, []);

  const submitMessage = (e) => {
    e.preventDefault();
    sendMessage();
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
    const element = messageInput.current;
    if (
      messages &&
      messages.length > 0 &&
      messages[messages.length - 1].sender_id !== user.id
    ) {
      const handler = (event) => {
        for (let i = messages.length - 1; i >= 0; i--) {
          const current_message = messages[i];
          if (
            current_message.sender_id === user.id ||
            current_message.status === "read"
          )
            return;
          socket.emit("i_read_message", { message_id: current_message.id });
        }
      };
      element.addEventListener("focus", handler);
      return () => element.addEventListener("focus", handler);
    }
  });

  useEffect(() => {
    if (socket != null) {
      const handler = (payload) => {
        if (
          payload.sender_id === friend_recipient?.id ||
          payload.recipient_id === friend_recipient?.id
        ) {
          setMessages((prev) => [...prev, payload]);
          if (payload.recipient_id === user.id) {
            socket.emit("i_received_message", {
              message_id: payload.id,
            });
          }
        }
      };

      socket.on("new_message", handler);
      return () => socket.off("new_message", handler);
    }
  }, [socket, friend_recipient, user]);

  useEffect(() => {
    conversation.current.scrollTop = conversation.current.scrollHeight;
  }, [messages]);

  const updateMessageStatus = (message_id, status) => {
    if (!["received", "read"].includes(status)) return;
    const message = messages.filter((message) => message.id === message_id);
    if (message.length === 0) return;
    if (status === "sent" && message.status === "read") return;
    const message_updated = { ...message, status };
    // TODO: Optimize this
    setMessages((prev) =>
      prev.map((message) =>
        message.id === message_id ? message_updated : message
      )
    );
  };

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
        {messages.map((message) => (
          <Message
            key={message.id}
            message_id={message.id}
            sender_id={message.sender_id}
            content={message.content}
            image_url={message.image_url}
            message_status={message.status}
            makeMessageStatusReceived={() => {
              updateMessageStatus(message.id, "received");
            }}
            makeMessageStatusRead={() => {
              updateMessageStatus(message.id, "read");
            }}
          />
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
