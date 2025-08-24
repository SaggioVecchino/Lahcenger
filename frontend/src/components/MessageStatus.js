import { useEffect, useState } from "react";

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
  return (
    <div className="message-status">
      <Tick status={status} aimingStatus={"received"} />
      <Tick status={status} aimingStatus={"read"} />
    </div>
  );
}
