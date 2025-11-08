import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import useProtectedRoute from "../hooks/useProtectedRoute";
import {
  ACCEPT_REQUEST,
  API_FRIENDS_CANCEL_REQUEST,
  API_FRIENDS_LIST,
  API_FRIENDS_RESPOND,
  API_FRIENDS_SEND_REQUEST,
  API_FRIENDS_SENT_REQUESTS,
  API_FRIENDS_INCOMING_REQUESTS,
  REJECT_REQUEST,
} from "../services/constants";
import FriendSearch from "../components/FriendSearch";
import Requests from "../components/Requests";
import Chats from "../components/Chats";
import "../styles/dashboard.css";

export default function Dashboard() {
  useProtectedRoute();
  const { user, logout, apiFetch, socket } = useAuth();
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);

  useEffect(() => {
    if (user != null && socket != null && socket !== "") {
      const handler = ({ sender_id, recipient_id, sender_username }) => {
        if (sender_id === user.id || recipient_id !== user.id) return;
        if (
          selectedFriends.map((other_user) => other_user.id).includes(sender_id)
        )
          return;

        setSelectedFriends([
          ...selectedFriends,
          { id: sender_id, username: sender_username },
        ]);
      };
      socket.on("new_message", handler);

      return () => {
        socket.off("new_message", handler);
      };
    }
  }, [socket, user, selectedFriends, setSelectedFriends]);

  const openFriendChat = useCallback(
    (friend) => {
      if (!selectedFriends.map((friend) => friend.id).includes(friend.id))
        setSelectedFriends([...selectedFriends, friend]);
    },
    [selectedFriends]
  );

  const closeFriendChat = useCallback((friend) => {
    setSelectedFriends((prev) => prev.filter((e) => e.id !== friend.id));
  }, []);

  useEffect(() => {
    let ignore = false;
    if (user != null) {
      if (!ignore) {
        apiFetch(`${API_FRIENDS_LIST}`)
          .then((res) => (res ? res : []))
          .then((res) => {
            if (!ignore) setFriends(res);
          });

        apiFetch(`${API_FRIENDS_INCOMING_REQUESTS}`)
          .then((res) => (res ? res : []))
          .then((res) =>
            res.map((e) => ({
              request_id: e.request_id,
              from_user_id: e.from_user_id,
              from_username: e.from_username,
            }))
          )
          .then((res) => {
            if (!ignore) setRequests(res);
          });

        apiFetch(`${API_FRIENDS_SENT_REQUESTS}`)
          .then((res) => (res ? res : []))
          .then((res) =>
            res.map((e) => ({
              request_id: e.request_id,
              to_user_id: e.to_user_id,
              to_username: e.to_username,
            }))
          )
          .then((res) => {
            if (!ignore) setSentRequests(res);
          });
      }
    }
    return () => {
      ignore = true;
    };
  }, [user, apiFetch]);

  const addFriend = useCallback(
    (other_user) => {
      apiFetch(`${API_FRIENDS_SEND_REQUEST}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_user_id: other_user.id }),
      }).then((res) => {
        if (
          !sentRequests.map((req) => req.request_id).includes(res.request_id)
        ) {
          setSentRequests([
            ...sentRequests,
            {
              request_id: res.request_id,
              to_user_id: other_user.id,
              to_username: other_user.username,
            },
          ]);
        }
      });
    },
    [apiFetch, sentRequests, setSentRequests]
  );

  const cancelRequest = useCallback(
    (r) => {
      apiFetch(`${API_FRIENDS_CANCEL_REQUEST}`, {
        method: "POST",
        body: JSON.stringify({ request_id: r.request_id }),
      }).then(
        //no need to verify because it's a filter
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

      apiFetch(`${API_FRIENDS_RESPOND}`, {
        method: "POST",
        body: JSON.stringify({ request_id: r.request_id, action: action }),
      }).then((res) => {
        if (action === ACCEPT_REQUEST) {
          if (
            !friends.map((other_user) => other_user.id).includes(r.from_user_id)
          ) {
            setFriends([
              ...friends,
              { id: r.from_user_id, username: r.from_username },
            ]);
            setRequests((prev) =>
              prev.filter((req) => req.request_id !== r.request_id)
            );
          }
        } else {
          //REJECT_REQUEST
          setRequests((prev) =>
            prev.filter((req) => req.request_id !== r.request_id)
          );
        }
      });
    },
    [friends, setFriends, setRequests, apiFetch]
  );

  const handleRespondedSentRequestEvent = useCallback(
    (payload, action) => {
      // action: 'accept', 'reject'
      const { request_id, responder_id } = payload;

      if (responder_id !== user.id) {
        if (action === ACCEPT_REQUEST) {
          const tmp = sentRequests.filter(
            (req) => req.request_id === request_id
          );
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
      } else {
        if (requests.map((r) => r.request_id).includes(request_id)) {
          if (action === ACCEPT_REQUEST) {
            const tmp = requests.filter((req) => req.request_id === request_id);
            if (tmp.length === 0) return;
            setRequests((prev) =>
              prev.filter((req) => req.request_id !== request_id)
            );
            const req = tmp[0];
            setFriends([
              ...friends,
              { id: req.from_user_id, username: req.from_username },
            ]);
          } else {
            // 'reject'
            setRequests((prev) =>
              prev.filter((req) => req.request_id !== request_id)
            );
          }
        }
      }
    },
    [user, requests, sentRequests, friends, setFriends, setSentRequests]
  );

  const handleCanceledRequestEvent = useCallback(
    (payload) => {
      const { request_id, canceler_id } = payload;
      if (canceler_id !== user.id) {
        setRequests((prev) =>
          prev.filter((req) => req.request_id !== request_id)
        );
      } else {
        //no need to check because it's a filter
        setSentRequests((prev) =>
          prev.filter((req) => req.request_id !== request_id)
        );
      }
    },
    [user, setRequests, setSentRequests]
  );

  const handleReceivedRequestEvent = useCallback(
    (payload) => {
      const {
        request_id,
        from_user_id,
        from_username,
        to_user_id,
        to_username,
      } = payload;
      if (user.id !== from_user_id) {
        if (requests.map((e) => e.request_id).includes(request_id)) return;
        setRequests((prev) => [
          ...prev,
          { request_id, from_user_id, from_username },
        ]);
      } else {
        if (sentRequests.map((e) => e.request_id).includes(request_id)) return;

        setSentRequests([
          ...sentRequests,
          {
            request_id: request_id,
            to_user_id: to_user_id,
            to_username: to_username,
          },
        ]);
      }
    },
    [user, requests, setRequests, sentRequests]
  );

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
            onAcceptedSentRequest={(payload) =>
              handleRespondedSentRequestEvent(payload, ACCEPT_REQUEST)
            }
            onRejectedSentRequest={(payload) =>
              handleRespondedSentRequestEvent(payload, REJECT_REQUEST)
            }
            onCanceledRequest={handleCanceledRequestEvent}
            onReceivedRequest={handleReceivedRequestEvent}
          />
          <div className="logout-btn">
            <a href="/" onClick={logout}>
              👋 Logout
            </a>
          </div>
        </header>

        <div className="header-container">
          <div>
            <h2>{user.username}</h2>
          </div>
        </div>
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
          closeFriendChat={closeFriendChat}
        />
        {/* <h1>
          <a href="/test">Go to test page</a>
        </h1> */}
      </div>
    )
  );
}
