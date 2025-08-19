import ChatWindow from "./ChatWindow";

export default function Chats({
  friends,
  selectedFriends,
  openFriendChat,
  socket,
  closeFriendChat,
}) {
  return (
    <>
      {friends.length > 0 && (
        <div>
          <h3>Chat with friends:</h3>
          <ul>
            {friends.map((f) => (
              <li key={f.id}>
                {f.username}{" "}
                <button
                  disabled={selectedFriends
                    .map((friend) => friend.id)
                    .includes(f.id)}
                  onClick={() => openFriendChat(f)}
                >
                  Chat
                </button>
              </li>
            ))}
          </ul>
          {selectedFriends &&
            selectedFriends.map((friend) => (
              <ChatWindow
                key={friend.id}
                socket={socket}
                friend_recipient={friend}
                closeChat={closeFriendChat}
              />
            ))}
        </div>
      )}
    </>
  );
}
