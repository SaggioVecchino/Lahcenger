import { useEffect, useRef } from "react";

export default function useClickOutside(handler, listen = true) {
  const ref = useRef([]);

  useEffect(() => {
    if (!listen) return;

    const handleClick = (event) => {
      const refs = Array.isArray(ref.current) ? ref.current : [ref.current];

      const clickedInside = refs.some((r) => r && r.contains(event.target));

      if (!clickedInside) handler?.(event);
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [handler, listen]);

  return ref;
}
