import { useEffect, useState, useRef } from "react";
export default function useCurrentlyWriting(
  watchableElement,
  socket,
  user,
  recipient_id
) {
  const timeoutIAmWriting = useRef(null);
  const timeoutHeIsWriting = useRef(null);

  const [lastTimeSocketSent, setLastTimeSocketSent] = useState(new Date(0));

  const [heIsWriting, setHeIsWriting] = useState(false);
  const [wait, setWait] = useState(false);

  useEffect(() => {
    const element = watchableElement.current;
    if (element && !wait) {
      const handlerHeIsWriting = (payload) => {
        if (wait) {
          setHeIsWriting(false);
          return;
        }
        if (payload.sender_id !== recipient_id) return;
        setHeIsWriting(true);
        clearInterval(timeoutHeIsWriting.current);
        timeoutHeIsWriting.current = setTimeout(() => {
          setHeIsWriting(false);
        }, 2500);
      };

      const handlerHeStoppedWriting = (payload) => {
        if (payload.sender_id !== recipient_id) return;
        setHeIsWriting(false);
        clearInterval(timeoutHeIsWriting.current);
      };

      const handlerIAmWriting = (e) => {
        if (wait) {
          setHeIsWriting(false);
          return;
        }
        if (e.key === "Enter") {
          return;
        }
        const now = Date.now();
        if (now - lastTimeSocketSent >= 750) {
          setLastTimeSocketSent(now);
          socket.emit("i_am_writing", { recipient_id });
          clearInterval(timeoutIAmWriting.current);
          timeoutIAmWriting.current = setTimeout(() => {
            socket.emit("i_stopped_writing", { recipient_id });
          }, 1000);
        }
      };

      const forceImNoMoreWriting = () => {
        socket.emit("i_stopped_writing", { recipient_id });
        clearInterval(timeoutIAmWriting.current);
      };

      const handlerNewMessage = (payload) => {
        if (payload.sender_id === user?.id) {
          forceImNoMoreWriting();
        } else if (payload.recipient_id === user?.id) {
          setWait(true);
          setHeIsWriting(false);
          setTimeout(() => {
            setWait(false);
          }, 1500);
          handlerHeStoppedWriting(payload);
        }
      };

      element.addEventListener("keyup", handlerIAmWriting);

      socket.on("he_is_writing", handlerHeIsWriting);
      socket.on("he_stopped_writing", handlerHeStoppedWriting);
      socket.on("new_message", handlerNewMessage);

      return () => {
        element.removeEventListener("keyup", handlerIAmWriting);
        socket.emit("i_stopped_writing", { recipient_id });
        clearInterval(timeoutIAmWriting.current);
        socket.off("he_is_writing", handlerHeIsWriting);
        socket.off("he_stopped_writing", handlerHeStoppedWriting);
        socket.off("new_message", handlerNewMessage);
      };
    }
  }, [wait]);

  return { heIsWriting };
}
