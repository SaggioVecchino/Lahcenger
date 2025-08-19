import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import io from "socket.io-client";
import { useAuth } from "../AuthContext";
import { ACCEPT_REQUEST, REJECT_REQUEST } from "../services/constants";
import FriendSearch from "../components/FriendSearch";
import Requests from "../components/Requests";
import Chats from "../components/Chats";
import "../styles/dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const { token, user, logout, apiFetch } = useAuth();
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (user !== null) {
      const s = io("http://localhost:5000", { query: { token } });
      s.on("connected", () => {});
      setSocket(s);
      return () => s.disconnect();
    }
  }, [token]);

  useEffect(() => {
    if (socket !== null && user !== null) {
      const handler = ({ sender_id, recipient_id, sender_username }) => {
        if (sender_id === user.id || recipient_id !== user.id) return;
        if (
          selectedFriends.map((other_user) => other_user.id).includes(sender_id)
        )
          return;

        setSelectedFriends((prev) => [
          ...prev,
          { id: sender_id, username: sender_username },
        ]);
      };
      socket.on("new_message", handler);

      return () => {
        socket.off("new_message", handler);
      };
    }
  }, [socket, user, selectedFriends]);

  const openFriendChat = (friend) => {
    setSelectedFriends((prev) => [...prev, friend]);
  };

  const closeFriendChat = (friend) => {
    setSelectedFriends((prev) => prev.filter((e) => e.id !== friend.id));
  };

  useEffect(() => {
    if (user !== null) {
      apiFetch("http://localhost:5000/friends/list")
        .then((res) => (res ? res : []))
        .then(setFriends);

      apiFetch("http://localhost:5000/friends/incoming_requests")
        .then((res) => (res ? res : []))
        .then((res) =>
          res.map((e) => ({
            request_id: e.request_id,
            from_user_id: e.from_user_id,
            from_username: e.from_username,
          }))
        )
        .then(setRequests);

      apiFetch("http://localhost:5000/friends/sent_requests")
        .then((res) => (res ? res : []))
        .then((res) =>
          res.map((e) => ({
            request_id: e.request_id,
            to_user_id: e.to_user_id,
            to_username: e.to_username,
          }))
        )
        .then(setSentRequests);
    }
  }, []);

  const addFriend = useCallback(
    (other_user) => {
      apiFetch("http://localhost:5000/friends/send_request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_user_id: other_user.id }),
      }).then((res) =>
        setSentRequests((prev) => [
          ...prev,
          {
            request_id: res.request_id,
            to_user_id: other_user.id,
            to_username: other_user.username,
          },
        ])
      );
    },
    [apiFetch, setSentRequests]
  );

  const cancelRequest = useCallback(
    (r) => {
      apiFetch("http://localhost:5000/friends/cancel_request", {
        method: "POST",
        body: JSON.stringify({ request_id: r.request_id }),
      }).then(
        setSentRequests((prev) =>
          prev.filter((req) => req.request_id !== r.request_id)
        )
      );
    },
    [apiFetch, setSentRequests]
  );

  const respondRequest = useCallback(
    (r, action) => {
      if (![ACCEPT_REQUEST, REJECT_REQUEST].includes(action)) {
        return;
      }

      apiFetch("http://localhost:5000/friends/respond", {
        method: "POST",
        body: JSON.stringify({ request_id: r.request_id, action: action }),
      }).then((res) => {
        if (action === ACCEPT_REQUEST) {
          setFriends((prev) => [
            ...prev,
            { id: r.from_user_id, username: r.from_username },
          ]);
          setRequests((prev) =>
            prev.filter((req) => req.request_id !== r.request_id)
          );
        } else {
          //REJECT_REQUEST
          setRequests((prev) =>
            prev.filter((req) => req.request_id !== r.request_id)
          );
        }
      });
    },
    [setFriends, setRequests, apiFetch]
  );

  const handleRespondedSentRequestEvent = useCallback(
    (payload, action) => {
      // action: 'accept', 'reject'
      const { request_id } = payload;
      if (action === ACCEPT_REQUEST) {
        const tmp = sentRequests.filter((req) => req.request_id === request_id);
        if (tmp.length === 0) return;
        setSentRequests((prev) =>
          prev.filter((req) => req.request_id !== request_id)
        );
        const req = tmp[0];
        setFriends((prev) => [
          ...prev,
          { id: req.to_user_id, username: req.to_username },
        ]);
      } else {
        // 'reject'
        setSentRequests((prev) =>
          prev.filter((req) => req.request_id !== request_id)
        );
      }
    },
    [sentRequests, setFriends, setSentRequests]
  );

  const handleCanceledRequestEvent = useCallback(
    (payload) => {
      const { request_id } = payload;
      setRequests((prev) =>
        prev.filter((req) => req.request_id !== request_id)
      );
    },
    [setRequests]
  );

  const handleReceivedRequestEvent = useCallback(
    (payload) => {
      const { request_id, from_user_id, from_username } = payload;
      if (requests.map((e) => e.request_id).includes(request_id)) return;
      setRequests((prev) => [
        ...prev,
        { request_id, from_user_id, from_username },
      ]);
    },
    [requests]
  );

  const handleLogout = async () => {
    await logout();
    navigate("/signup");
  };

  return (
    user?.id && (
      <div>
        <header>
          <FriendSearch
            alreadyReceivedRequests={requests}
            alreadyFriends={friends}
            alreadyRequested={sentRequests}
            addFriend={addFriend}
            acceptRequest={(r) => respondRequest(r, ACCEPT_REQUEST)}
            rejectRequest={(r) => respondRequest(r, REJECT_REQUEST)}
            cancelRequest={cancelRequest}
            socket={socket}
            onAcceptedSentRequest={(payload) =>
              handleRespondedSentRequestEvent(payload, ACCEPT_REQUEST)
            }
            onRejectedSentRequest={(payload) =>
              handleRespondedSentRequestEvent(payload, REJECT_REQUEST)
            }
            onCanceledRequest={handleCanceledRequestEvent}
            onReceivedRequest={handleReceivedRequestEvent}
          />
          <h2>{user.username}</h2>
          <div className="logout-btn">
            <a href="/" onClick={handleLogout}>
              👋 Logout
            </a>
          </div>
        </header>

        <Requests
          sentRequests={sentRequests}
          incomingRequests={requests}
          respondRequest={respondRequest}
          cancelRequest={cancelRequest}
        />

        <Chats
          friends={friends}
          selectedFriends={selectedFriends}
          openFriendChat={openFriendChat}
          socket={socket}
          closeFriendChat={closeFriendChat}
        />
      </div>
    )
  );
}
