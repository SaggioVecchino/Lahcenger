import { ACCEPT_REQUEST, REJECT_REQUEST } from "../services/constants";

export default function Requests({
  sentRequests,
  incomingRequests,
  respondRequest,
  cancelRequest,
}) {
  return (
    <>
      {sentRequests.length > 0 && (
        <div>
          <h3>Appending requests:</h3>
          <ul>
            {sentRequests.map((r) => (
              <li key={r.request_id}>
                {r.to_username}
                <button onClick={() => cancelRequest(r)}>Delete request</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {incomingRequests.length > 0 && (
        <div>
          <h3>Received requests:</h3>
          <ul>
            {incomingRequests.map((r) => (
              <li key={r.request_id}>
                {r.from_username}
                <button onClick={() => respondRequest(r, ACCEPT_REQUEST)}>
                  Accept
                </button>
                <button onClick={() => respondRequest(r, REJECT_REQUEST)}>
                  Reject
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
