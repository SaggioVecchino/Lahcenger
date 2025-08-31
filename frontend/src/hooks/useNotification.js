import { useEffect, useState, useRef } from "react";
import notificationSound from "../assets/notification.mp3";

export default function useNotification() {
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
      await audioRef.current.play();
      setTimeout(() => setIsPlaying(false), 100);
    } catch (error) {
      console.error("Error playing notification sound:", error);
      setIsPlaying(false);
    }
  };

  const checkConditionAndNotify = async () => {
    if (document.visibilityState === "visible" || isPlaying) {
      return;
    }
    await playNotificationSound();
  };

  return { checkConditionAndNotify };
}
