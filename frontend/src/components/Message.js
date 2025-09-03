import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import MessageStatus from "./MessageStatus";

export default function Message({
  message_id,
  sender_id,
  content,
  image_url,
  message_status,
  messageArea,
  isLastMessage,
}) {
  const { user, socket } = useAuth();
  const [realStatus, setRealStatus] = useState(message_status);
  const meSender = user.id === sender_id;

  useEffect(() => {
    if (isLastMessage && !meSender && realStatus !== "read") {
      const element = messageArea.current;
      if (
        document.activeElement === element &&
        document.visibilityState === "visible" &&
        document.hasFocus()
      ) {
        socket.emit("i_read_message", { message_id });
      } else {
        const handler = () => {
          socket.emit("i_read_message", { message_id });
        };
        element.addEventListener("focus", handler);
        return () => element.removeEventListener("focus", handler);
      }
    }
  }, [
    meSender,
    socket,
    isLastMessage,
    realStatus,
    sender_id,
    message_id,
    messageArea,
    content,
  ]);

  useEffect(() => {
    if (isLastMessage && !meSender && realStatus === "sent") {
      socket.emit("i_received_message", {
        message_id,
      });
    }
  }, [meSender, socket, isLastMessage, realStatus, sender_id, message_id]);

  useEffect(() => {
    if (isLastMessage && meSender && realStatus === "sent") {
      const handler = (payload) => {
        const message_id_socket = payload.message_id;
        if (message_id !== message_id_socket) return;
        // Already checked outside
        // if (realStatus === "received") return; //no need to rerender
        // if (realStatus === "read") return; //because if read not going back to received
        setRealStatus("received");
      };
      if (
        socket != null &&
        meSender &&
        isLastMessage &&
        realStatus === "sent"
      ) {
        socket.on("he_received_message", handler);
      }
      return () => socket.off("he_received_message", handler);
    }
  }, [meSender, socket, isLastMessage, realStatus, sender_id, message_id]);

  useEffect(() => {
    if (isLastMessage && meSender && realStatus !== "read") {
      const handler = (payload) => {
        const message_id_socket = payload.message_id;
        if (message_id !== message_id_socket) return;
        // Already checked outside
        // if (realStatus === "read") return; //because no need to send again and force rerendering
        setRealStatus("read");
      };
      if (
        socket != null &&
        meSender &&
        isLastMessage &&
        ["sent", "received"].includes(realStatus)
      ) {
        socket.on("he_read_message", handler);
      }
      return () => socket.off("he_read_message", handler);
    }
  }, [meSender, socket, isLastMessage, realStatus, sender_id, message_id]);

  return (
    <div>
      <div
        className={meSender ? "me-sender-container" : "me-receiver-container"}
      >
        {meSender && isLastMessage && <MessageStatus status={realStatus} />}
        <div className={meSender ? "me-sender" : "me-receiver"}>
          {content}
          {image_url && (
            <img src={image_url} alt="" style={{ maxWidth: "400px" }} />
          )}
        </div>
      </div>
    </div>
  );
}
