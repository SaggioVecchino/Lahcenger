import { useEffect, useState, useRef } from "react";

function Tick({ status, aimingStatus }) {
  const [isHidden, setIsHidden] = useState(
    status === "sent" || (aimingStatus === "read" && status !== "read")
  );

  useEffect(() => {
    setIsHidden(
      status === "sent" || (aimingStatus === "read" && status !== "read")
    );
  }, [status, aimingStatus]);

  return (
    <div>
      <div className={`${aimingStatus}-tick`}>
        <span className={isHidden ? "hidden" : null}></span>
        <span className={isHidden ? "hidden" : null}></span>
      </div>
    </div>
  );
}

export default function MessageStatus({ status }) {
  const messageStatusSign = useRef(null);
  const messageStatusTooltip = useRef(null);

  useEffect(() => {
    const sign = messageStatusSign.current;
    const tooltip = messageStatusTooltip.current;
    if (sign && tooltip) {
      const onMouseOver = (e) => {
        tooltip.classList.add("show");
      };
      const onMouseOut = (e) => {
        tooltip.classList.remove("show");
      };

      sign.addEventListener("mouseover", onMouseOver);
      sign.addEventListener("mouseout", onMouseOut);

      return () => {
        sign.removeEventListener("mouseover", onMouseOver);
        sign.removeEventListener("mouseout", onMouseOut);
      };
    }
  }, [status]);

  return (
    <div className="message-status">
      <Tick status={status} aimingStatus={"received"} />
      <Tick status={status} aimingStatus={"read"} />
      {status !== "sent" && (
        <div className="hidden-to-help" ref={messageStatusSign}></div>
      )}
      {status !== "sent" && (
        <div className="tooltip" ref={messageStatusTooltip}>
          {status}
        </div>
      )}
    </div>
  );
}
