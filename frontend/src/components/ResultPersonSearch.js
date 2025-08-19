export function ResultPersonSearch({
  user,
  isFriend = false,
  sentRequest = null,
  recivedRequest = null,
  acceptRequest = null,
  rejectRequest = null,
  cancelRequest = null,
  addFriend = null,
}) {
  const helper = () => {
    if (isFriend) {
      return <span>(Already friend)</span>;
    }

    if (sentRequest !== null) {
      return (
        <span>
          Already requested
          <button onClick={() => cancelRequest(sentRequest)}>
            Cancel request
          </button>
        </span>
      );
    }

    if (recivedRequest != null) {
      return (
        <span>
          This user sent you a friend request
          <button onClick={() => acceptRequest(recivedRequest)}>Accept</button>
          <button onClick={() => rejectRequest(recivedRequest)}>Reject</button>
        </span>
      );
    }

    return <button onClick={() => addFriend(user)}>Add as a friend</button>;
  };

  return (
    <span>
      <span>{user.username}</span>
      <span>{helper()}</span>
    </span>
  );
}
