import { useEffect, useState, useRef } from "react";
import { useAuth } from "../AuthContext";
import { API_MESSAGES_HISTORY } from "../services/constants";
import Message from "./Message";
import "../styles/chat.css";

export default function ChatWindow({ friend_recipient, closeChat }) {
  const { apiFetch, socket, user } = useAuth();
  const [msgContent, setMsgContent] = useState("");
  const [messages, setMessages] = useState([]);
  const messageInput = useRef(null);
  const conversation = useRef(null);
  const formMessage = useRef(null);

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
    // const element_form = formMessage.current;
    const handler = (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        submitMessage(e); //This will contain prevent default
      }
    };
    const element_input = messageInput.current;
    element_input.addEventListener("keypress", handler);
    return () => element_input.removeEventListener("keypress", handler);
  }, [sendMessage]);

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
  }, [socket, friend_recipient, user]);

  useEffect(() => {
    conversation.current.scrollTop = conversation.current.scrollHeight;
  }, [messages]);

  return (
    <div className="chat-window-container">
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
          {messages.map((message, index) => (
            <Message
              key={message.id}
              message_id={message.id}
              sender_id={message.sender_id}
              content={message.content}
              image_url={message.image_url}
              message_status={message.status}
              messageArea={messageInput}
              isLastMessage={index === messages.length - 1}
            />
          ))}
        </div>
        <div className="chat-input-container">
          <form onSubmit={submitMessage} ref={formMessage}>
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
    </div>
  );
}
