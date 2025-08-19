import { useEffect, useState, useRef } from "react";
import { useAuth } from "../AuthContext";
import { sleep } from "../services/utils";
import { useClickOutside } from "../services/utils";
import { ResultPersonSearch } from "./ResultPersonSearch";

export default function FriendSearch({
  alreadyRequested,
  alreadyReceivedRequests,
  alreadyFriends,
  addFriend,
  cancelRequest,
  acceptRequest,
  rejectRequest,
  socket,
  onAcceptedSentRequest,
  onRejectedSentRequest,
  onCanceledRequest,
  onReceivedRequest,
}) {
  const { apiFetch } = useAuth();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultsCleared, setResultsCleared] = useState(true);
  const [results, setResults] = useState([]);
  const searchRef = useRef([]);
  const [socketHandlers, setSocketHandlers] = useState([
    { event: "request_accepted", handler: onAcceptedSentRequest },
    { event: "request_rejected", handler: onRejectedSentRequest },
    { event: "request_canceled", handler: onCanceledRequest },
    { event: "new_request", handler: onReceivedRequest },
  ]);
  const [keepFocus, setKeepFocus] = useState(false);

  useEffect(() => {
    searchRef.current[1].style.visibility = "hidden";
  }, []);

  useEffect(() => {
    setSocketHandlers([
      { event: "request_accepted", handler: onAcceptedSentRequest },
      { event: "request_rejected", handler: onRejectedSentRequest },
      { event: "request_canceled", handler: onCanceledRequest },
      { event: "new_request", handler: onReceivedRequest },
    ]);
  }, [
    onAcceptedSentRequest,
    onRejectedSentRequest,
    onCanceledRequest,
    onReceivedRequest,
  ]);

  useEffect(() => {
    if (socket !== null) {
      socketHandlers.forEach(({ event, handler }) => socket.on(event, handler));
      return () =>
        socketHandlers.forEach(({ event, handler }) =>
          socket.off(event, handler)
        );
    }
  }, [socket, socketHandlers]);

  const searchForFriend = async (query) => {
    if (loading) return;
    setLoading(true);
    searchRef.current[1].style.visibility = "visible";
    await sleep(500);
    try {
      const res = await apiFetch(
        "http://localhost:5000/users/search?" +
          new URLSearchParams({
            q: query,
          }).toString()
      );
      setResults(res);
    } catch (error) {
      console.log("Try again in few moments please");
    }
    setResultsCleared(false);
    setLoading(false);
  };

  const helperRender = (other_user) => {
    if (alreadyFriends.map((friend) => friend.id).includes(other_user.id)) {
      return <ResultPersonSearch user={other_user} isFriend={true} />;
    } else if (
      alreadyRequested.map((req) => req.to_user_id).includes(other_user.id)
    ) {
      const r = alreadyRequested.filter(
        (req) => req.to_user_id === other_user.id
      )[0];
      return (
        <ResultPersonSearch
          user={other_user}
          sentRequest={r}
          cancelRequest={cancelRequest}
        />
      );
    } else if (
      alreadyReceivedRequests
        .map((req) => req.from_user_id)
        .includes(other_user.id)
    ) {
      const r = alreadyReceivedRequests.filter(
        (r) => r.from_user_id === other_user.id
      )[0];
      return <ResultPersonSearch user={other_user} recivedRequestRequest={r} />;
    } else {
      return <ResultPersonSearch user={other_user} addFriend={addFriend} />;
    }
  };

  const clearSearchResults = () => {
    searchRef.current[1].style.visibility = "hidden";
    setResultsCleared(true);
    setKeepFocus(false);
    setResults([]);
    setQuery("");
  };

  useClickOutside(searchRef, () => {
    if (keepFocus) clearSearchResults();
  });

  useEffect(() => {
    if (query === "" && !resultsCleared) clearSearchResults();
  }, [query]);

  return (
    <div>
      <form
        className="form-search"
        onSubmit={async (e) => {
          e.preventDefault();
          await searchForFriend(query);
        }}
      >
        <input
          type="search"
          id="s"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setKeepFocus(true)}
          placeholder="Friend username"
          className={keepFocus ? "forced-focus" : null}
          ref={(el) => {
            searchRef.current[0] = el;
          }}
        />
      </form>

      <div className="results-search">
        <div
          ref={(el) => {
            searchRef.current[1] = el;
          }}
        >
          {loading ? (
            <>Please wait...</>
          ) : (
            !resultsCleared && (
              <>
                <button onClick={clearSearchResults} disabled={loading}>
                  Clear results
                </button>
                {results.length === 0 ? (
                  <div>No results found</div>
                ) : (
                  <>
                    {results.map((other_user) => (
                      <div key={other_user.id}>{helperRender(other_user)}</div>
                    ))}
                  </>
                )}
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
}
