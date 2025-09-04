import os
import uuid
import base64
import datetime
from functools import wraps

from flask import Flask, request, jsonify, g, send_from_directory, abort
from flask_cors import CORS, cross_origin

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import or_
from flask_migrate import Migrate
from flask_socketio import SocketIO, emit, join_room, leave_room
import bcrypt
import jwt
import uuid

# -----------------------
# Configuration
# -----------------------
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app = Flask(__name__)
cors = CORS(app)  # allow CORS for all domains on all routes.
app.config["CORS_HEADERS"] = "Content-Type"
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + os.path.join(BASE_DIR, "app.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "change-this-secret-key")
app.config["JWT_ALGORITHM"] = "HS256"
app.config["JWT_EXP_DELTA_SECONDS"] = 7 * 24 * 3600  # 7 days

db = SQLAlchemy(app)
migrate = Migrate(app, db)
socketio = SocketIO(app, cors_allowed_origins="*")


# -----------------------
# Models
# -----------------------
def now_utc():
    return datetime.datetime.now(datetime.timezone.utc)


class User(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = db.Column(db.String(20), unique=True, nullable=False)
    password_hash = db.Column(db.LargeBinary(60), nullable=False)
    created_at = db.Column(db.DateTime, default=now_utc)


class RevokedToken(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    jti = db.Column(db.String(64), unique=True, nullable=False)
    revoked_at = db.Column(db.DateTime, default=now_utc)


class FriendRequest(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    from_user_id = db.Column(db.String, db.ForeignKey("user.id"), nullable=False)
    to_user_id = db.Column(db.String, db.ForeignKey("user.id"), nullable=False)
    status = db.Column(
        db.String(10), default="pending"
    )  # pending, accepted, rejected, canceled
    created_at = db.Column(db.DateTime, default=now_utc)
    updated_at = db.Column(
        db.DateTime,
        default=now_utc,
        onupdate=now_utc,
    )

class Friendship(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String, db.ForeignKey("user.id"), nullable=False)
    friend_id = db.Column(db.String, db.ForeignKey("user.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=now_utc)


class Message(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    sender_id = db.Column(db.String, db.ForeignKey("user.id"), nullable=False)
    recipient_id = db.Column(db.String, db.ForeignKey("user.id"), nullable=False)
    content = db.Column(db.Text, nullable=True)
    image_path = db.Column(db.String(400), nullable=True)
    status = db.Column(db.String(10), default="sent")  # sent, received, read
    created_at = db.Column(db.DateTime, default=now_utc)
    updated_at = db.Column(
        db.DateTime,
        default=now_utc,
        onupdate=now_utc,
    )


# -----------------------
# Utilities
# -----------------------
def hash_password(password: str) -> bytes:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())


def check_password(password: str, hashed: bytes) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed)


def generate_token(user_id: int) -> str:
    jti = uuid.uuid4().hex
    payload = {
        "user_id": user_id,
        "exp": now_utc()
        + datetime.timedelta(seconds=app.config["JWT_EXP_DELTA_SECONDS"]),
        "iat": now_utc(),
        "jti": jti,
    }
    token = jwt.encode(
        payload, app.config["SECRET_KEY"], algorithm=app.config["JWT_ALGORITHM"]
    )
    # PyJWT returns str in v2+, bytes in older versions. Ensure string.
    if isinstance(token, bytes):
        token = token.decode("utf-8")
    return token


def decode_token(token: str):
    try:
        payload = jwt.decode(
            token, app.config["SECRET_KEY"], algorithms=[app.config["JWT_ALGORITHM"]]
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise
    except jwt.InvalidTokenError:
        raise


def revoke_token_jti(jti: str):
    if not RevokedToken.query.filter_by(jti=jti).first():
        db.session.add(RevokedToken(jti=jti))
        db.session.commit()


def is_jti_revoked(jti: str) -> bool:
    return RevokedToken.query.filter_by(jti=jti).first() is not None


# -----------------------
# Authentication Decorator
# -----------------------
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        header = request.headers.get("Authorization", None)
        if not header or not header.startswith("Bearer "):
            return (
                jsonify({"message": "Authorization header must be Bearer token"}),
                401,
            )
        token = header.split(" ", 1)[1].strip()
        try:
            payload = decode_token(token)
        except jwt.ExpiredSignatureError:
            return jsonify({"message": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"message": "Invalid token"}), 401
        jti = payload.get("jti")
        if is_jti_revoked(jti):
            return jsonify({"message": "Token revoked"}), 401
        user = User.query.get(payload.get("user_id"))
        if not user:
            return jsonify({"message": "User not found"}), 401
        g.current_user = user
        g.token_jti = jti
        return f(*args, **kwargs)

    return decorated


# -----------------------
# Routes - Auth
# -----------------------
@app.route("/signup", methods=["POST"])
@cross_origin()
def signup():
    data = request.get_json(force=True)
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    if not username or not password:
        return jsonify({"message": "username and password required"}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({"message": "username already exists"}), 400
    pw_hash = hash_password(password)
    user = User(username=username, password_hash=pw_hash)
    db.session.add(user)
    db.session.commit()
    return jsonify({"message": "user created", "user_id": user.id}), 201


@app.route("/login", methods=["POST"])
@cross_origin()
def login():
    data = request.get_json(force=True)
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    if not username or not password:
        return jsonify({"message": "username and password required"}), 400
    user = User.query.filter_by(username=username).first()
    if not user or not check_password(password, user.password_hash):
        return jsonify({"message": "invalid credentials"}), 401
    token = generate_token(user.id)
    return jsonify({"token": token, "user_id": user.id})


@app.route("/logout", methods=["POST"])
@cross_origin()
@token_required
def logout():
    # Revoke the token jti
    revoke_token_jti(g.token_jti)
    return jsonify({"message": "logged out"}), 200


@app.route("/check_token", methods=["GET"])
@cross_origin()
@token_required
def check_token(): #To check whether the token is valid
    return jsonify({"message": "valid"}), 200

# -----------------------
# Routes - Users / Friends
# -----------------------
@app.route("/users/search", methods=["GET"])
@cross_origin()
@token_required
def search_users():
    q = (request.args.get("q") or "").strip()
    if q == "":
        return jsonify([]), 200
    users = User.query.filter(User.username.like(f"%{q}%")).limit(50).all()
    results = [
        {"id": u.id, "username": u.username} for u in users if u.id != g.current_user.id
    ]
    return jsonify(results)


@app.route("/friends/send_request", methods=["POST"])
@cross_origin()
@token_required
def send_friend_request():
    data = request.get_json(force=True)
    to_user_id = data.get("to_user_id")
    if not to_user_id:
        return jsonify({"message": "to_user_id is required"}), 400
    if to_user_id == g.current_user.id:
        return jsonify({"message": "cannot friend yourself"}), 400
    to_user = User.query.get(to_user_id)
    to_username = to_user.username
    if not to_user:
        return jsonify({"message": "user not found"}), 404
    # Check if already friends
    existing_friend = Friendship.query.filter_by(
        user_id=g.current_user.id, friend_id=to_user_id
    ).first()
    if existing_friend:
        return jsonify({"message": "already friends"}), 400
    # Check if request exists
    existing_request = FriendRequest.query.filter(
        FriendRequest.from_user_id == g.current_user.id,
        FriendRequest.to_user_id == to_user_id,
        FriendRequest.status == "pending",
    ).first()
    if existing_request:
        return jsonify({"message": "friend request already sent"}), 400
    # Create request
    fr = FriendRequest(from_user_id=g.current_user.id, to_user_id=to_user_id)
    db.session.add(fr)
    db.session.commit()

    room_recipient = _user_room(to_user_id)
    room_sender = _user_room(g.current_user.id)
    emit(
        "new_request",
        {
            "request_id": fr.id,
            "from_user_id": g.current_user.id,
            "from_username": g.current_user.username,
            "to_user_id": to_user_id,
            "to_username": to_username,
        },
        room=room_recipient,
        namespace="/",
    )
    emit(
        "new_request",
        {
            "request_id": fr.id,
            "from_user_id": g.current_user.id,
            "from_username": g.current_user.username,
            "to_user_id": to_user_id,
            "to_username": to_username,
        },
        room=room_sender,
        namespace="/",
    )
    return jsonify({"message": "friend request sent", "request_id": fr.id}), 201


@app.route("/friends/incoming_requests", methods=["GET"])
@cross_origin()
@token_required
def incoming_friend_requests():
    reqs = FriendRequest.query.filter_by(
        to_user_id=g.current_user.id, status="pending"
    ).all()
    out = []
    for r in reqs:
        from_user = User.query.get(r.from_user_id)
        out.append(
            {
                "request_id": r.id,
                "from_user_id": from_user.id,
                "from_username": from_user.username,
                "created_at": r.created_at.isoformat(),
            }
        )
    return jsonify(out)


@app.route("/friends/sent_requests", methods=["GET"])
@cross_origin()
@token_required
def sent_friend_requests():
    reqs = FriendRequest.query.filter_by(
        from_user_id=g.current_user.id, status="pending"
    ).all()
    out = []
    for r in reqs:
        to_user = User.query.get(r.to_user_id)
        out.append(
            {
                "request_id": r.id,
                "to_user_id": to_user.id,
                "to_username": to_user.username,
                "created_at": r.created_at.isoformat(),
            }
        )
    return jsonify(out)


@app.route("/friends/respond", methods=["POST"])
@cross_origin()
@token_required
def respond_friend_request():
    data = request.get_json(force=True)
    request_id = data.get("request_id")
    action = data.get("action")  # accept or reject
    if action not in ("accept", "reject"):
        return jsonify({"message": "action must be 'accept' or 'reject'"}), 400
    fr = FriendRequest.query.get(request_id)
    if not fr or fr.status == "canceled" or fr.to_user_id != g.current_user.id:
        return jsonify({"message": "friend request not found"}), 404
    if fr.status in ["accepted", "rejected"]:
        return jsonify({"message": "friend request already handled"}), 400
    fr.status = "accepted" if action == "accept" else "rejected"
    db.session.add(fr)
    if action == "accept":
        # create mutual friendship (both directions)
        f1 = Friendship(user_id=fr.from_user_id, friend_id=fr.to_user_id)
        f2 = Friendship(user_id=fr.to_user_id, friend_id=fr.from_user_id)
        db.session.add_all([f1, f2])
    db.session.commit()

    # The logic here is reversed in sockets
    room_recipient = _user_room(fr.from_user_id)
    room_sender = _user_room(fr.to_user_id)
    responder_id = fr.to_user_id

    # We emit to both, in case the respond user is on multiple devices
    if action == "accept":
        emit(
            "request_accepted",
            {"request_id": request_id, "responder_id": responder_id},
            room=room_recipient,
            namespace="/",
        )
        emit(
            "request_accepted",
            {"request_id": request_id, "responder_id": responder_id},
            room=room_sender,
            namespace="/",
        )
    else:  # action == "reject"
        emit(
            "request_rejected",
            {"request_id": request_id, "responder_id": responder_id},
            room=room_recipient,
            namespace="/",
        )
        emit(
            "request_rejected",
            {"request_id": request_id, "responder_id": responder_id},
            room=room_sender,
            namespace="/",
        )
    return jsonify({"message": f"friend request {fr.status}"}), 201


@app.route("/friends/cancel_request", methods=["POST"])
@cross_origin()
@token_required
def cancel_sent_request():
    data = request.get_json(force=True)
    request_id = data.get("request_id")
    fr = FriendRequest.query.get(request_id)
    if not fr or fr.from_user_id != g.current_user.id:
        return jsonify({"message": "friend request not found"}), 404
    fr.status = "canceled"
    db.session.add(fr)
    db.session.commit()
    room_recipient = _user_room(fr.to_user_id)
    room_sender = _user_room(g.current_user.id)

    canceler_id = g.current_user.id
    emit(
        "request_canceled",
        {"request_id": request_id, "canceler_id": canceler_id},
        room=room_recipient,
        namespace="/",
    )
    emit(
        "request_canceled",
        {"request_id": request_id, "canceler_id": canceler_id},
        room=room_sender,
        namespace="/",
    )
    return jsonify({"message": f"Request canceled with success"}), 201


@app.route("/friends/list", methods=["GET"])
@cross_origin()
@token_required
def friends_list():
    friendships = Friendship.query.filter_by(user_id=g.current_user.id).all()
    out = []
    for f in friendships:
        u = User.query.get(f.friend_id)
        if u:
            out.append({"id": u.id, "username": u.username})
    return jsonify(out)


# -----------------------
# Routes - Messages (simple history API & image retrieval)
# -----------------------
@app.route("/messages/history/<other_user_id>", methods=["GET"])
@cross_origin()
@token_required
def messages_history(other_user_id):
    # Only allow if they are friends
    friendship = Friendship.query.filter_by(
        user_id=g.current_user.id, friend_id=other_user_id
    ).first()
    if not friendship:
        return jsonify({"message": "not friends"}), 403
    msgs = (
        Message.query.filter(
            (
                (Message.sender_id == g.current_user.id)
                & (Message.recipient_id == other_user_id)
            )
            | (
                (Message.sender_id == other_user_id)
                & (Message.recipient_id == g.current_user.id)
            )
        )
        .order_by(Message.created_at.asc())
        .all()
    )
    out = []
    for m in msgs:
        out.append(
            {
                "id": m.id,
                "sender_id": m.sender_id,
                "recipient_id": m.recipient_id,
                "content": m.content,
                "image_url": (
                    f"/uploads/{os.path.basename(m.image_path)}"
                    if m.image_path
                    else None
                ),
                "status": m.status,
                "created_at": m.created_at.isoformat(),
            }
        )
    return jsonify(out)


@app.route("/uploads/<filename>", methods=["GET"])
@cross_origin()
def uploaded_file(filename):
    # serve image files
    return send_from_directory(UPLOAD_FOLDER, filename)


# -----------------------
# SocketIO - Real-time messaging
# -----------------------
# Keep mapping of user_id -> socket sid(s)
# user_id -> set(room names), we'll use room = f"user_{user_id}"
# connected_rooms = {}


def _user_room(user_id):
    return f"user_{user_id}"


@socketio.on("connect", namespace="/")
def handle_connect():
    # client must provide token query param: ?token=...
    token = request.args.get("token", None)
    if not token:
        return False  # reject connection
    try:
        payload = decode_token(token)
    except Exception:
        return False
    jti = payload.get("jti")
    if is_jti_revoked(jti):
        return False
    user = User.query.get(payload.get("user_id"))
    if not user:
        return False
    # Attach user info to socket session
    g_socket_user = {"id": user.id, "username": user.username}
    room = _user_room(user.id)
    join_room(room)
    # Optionally store mapping (for scale consider external store)
    # send acknowledgement
    emit("connected", {"message": "connected", "user_id": user.id}, namespace="/")


@socketio.on("disconnect", namespace="/")
def handle_disconnect():
    # leaving rooms is automatic, no action needed
    pass


@socketio.on("send_message", namespace="/")
def handle_send_message(data):
    """
    Expected data:
    {
      "recipient_id": int,
      "content": "text optional",
      "image_b64": "optional base64 string of image (data URL or raw base64)",
      "filename": "optional original filename for extension"
    }
    Must have either content or image_b64.
    """
    token = request.args.get("token", None)
    if not token:
        emit("error", {"message": "not authenticated"}, namespace="/")
        return
    try:
        payload = decode_token(token)
    except Exception:
        emit("error", {"message": "invalid token"}, namespace="/")
        return
    jti = payload.get("jti")
    if is_jti_revoked(jti):
        emit("error", {"message": "token revoked"}, namespace="/")
        return
    sender = User.query.get(payload.get("user_id"))
    if not sender:
        emit("error", {"message": "user not found"}, namespace="/")
        return

    recipient_id = data.get("recipient_id")
    if not recipient_id:
        emit("error", {"message": "recipient_id required"}, namespace="/")
        return
    # Must be friends to send messages
    if not Friendship.query.filter_by(
        user_id=sender.id, friend_id=recipient_id
    ).first():
        emit("error", {"message": "you are not friends with this user"}, namespace="/")
        return

    content = data.get("content")
    image_b64 = data.get("image_b64")
    filename = data.get("filename", None)
    image_path = None

    if not content and not image_b64:
        emit("error", {"message": "message must have content or image"}, namespace="/")
        return

    if image_b64:
        # Accept data URL or pure base64
        if image_b64.startswith("data:"):
            # data:image/png;base64,.....
            try:
                header, b64data = image_b64.split(",", 1)
            except ValueError:
                b64data = image_b64
        else:
            b64data = image_b64
        try:
            img_bytes = base64.b64decode(b64data)
            ext = None
            if filename and "." in filename:
                ext = filename.rsplit(".", 1)[1]
            else:
                # Try to infer simple extension from header (if any)
                ext = "bin"
            fname = f"{uuid.uuid4().hex}.{ext}"
            path = os.path.join(UPLOAD_FOLDER, fname)
            with open(path, "wb") as f:
                f.write(img_bytes)
            image_path = path
        except Exception as e:
            emit(
                "error",
                {"message": "invalid image data", "detail": str(e)},
                namespace="/",
            )
            return

    if content:
        content = content.strip()

    msg = Message(
        sender_id=sender.id,
        recipient_id=recipient_id,
        content=content,
        image_path=image_path,
    )
    db.session.add(msg)
    db.session.commit()

    payload_out = {
        "id": msg.id,
        "sender_id": sender.id,
        "recipient_id": recipient_id,
        "sender_username": sender.username,
        "content": content,
        "image_url": f"/uploads/{os.path.basename(image_path)}" if image_path else None,
        "status": msg.status,
        "created_at": msg.created_at.isoformat(),
    }

    # Emit message to recipient room and sender (so both clients see it)
    room_recipient = _user_room(recipient_id)
    room_sender = _user_room(sender.id)
    emit("new_message", payload_out, room=room_recipient, namespace="/")
    emit("new_message", payload_out, room=room_sender, namespace="/")


@socketio.on("i_received_message", namespace="/")
def handle_received_message(data):
    """
    Expected data:
    {
      "message_id": int
    }
    Must been sent of message receiver.
    """
    token = request.args.get("token", None)
    if not token:
        emit("error", {"message": "not authenticated"}, namespace="/")
        return
    try:
        payload = decode_token(token)
    except Exception:
        emit("error", {"message": "invalid token"}, namespace="/")
        return
    jti = payload.get("jti")
    if is_jti_revoked(jti):
        emit("error", {"message": "token revoked"}, namespace="/")
        return
    user = User.query.get(payload.get("user_id"))
    if not user:
        emit("error", {"message": "user not found"}, namespace="/")
        return
    msg_id = data.get("message_id")
    if not msg_id:
        emit("error", {"message": "no message_id provided"}, namespace="/")
        return
    message = Message.query.get(msg_id)
    if not message:
        emit("error", {"message": "message not found"}, namespace="/")
        return
    if message.recipient_id != user.id or message.status != "sent":
        emit("error", {"message": "unexpected notification"}, namespace="/")
        return

    # I have to update previous messages status too (not obligatory, but I want to keep it consistent)
    messages_to_update = Message.query.filter(
        Message.created_at <= message.created_at,
        Message.sender_id == message.sender_id,
        Message.recipient_id == message.recipient_id,
        Message.status == "sent",
    )

    if messages_to_update:
        messages_to_update.update(
            {Message.status: "received"}, synchronize_session="auto"
        )
        db.session.commit()

        room_sender = _user_room(message.sender_id)
        payload_out = {"message_id": msg_id}
        emit("he_received_message", payload_out, room=room_sender, namespace="/")


@socketio.on("i_read_message", namespace="/")
def handle_read_message(data):
    """
    Expected data:
    {
      "message_id": int
    }
    Must been sent of message receiver.
    """
    token = request.args.get("token", None)
    if not token:
        emit("error", {"message": "not authenticated"}, namespace="/")
        return
    try:
        payload = decode_token(token)
    except Exception:
        emit("error", {"message": "invalid token"}, namespace="/")
        return
    jti = payload.get("jti")
    if is_jti_revoked(jti):
        emit("error", {"message": "token revoked"}, namespace="/")
        return
    user = User.query.get(payload.get("user_id"))
    if not user:
        emit("error", {"message": "user not found"}, namespace="/")
        return
    msg_id = data.get("message_id")
    if not msg_id:
        emit("error", {"message": "no message_id provided"}, namespace="/")
        return

    message = Message.query.get(msg_id)
    if not message:
        emit("error", {"message": "message not found"}, namespace="/")
        return
    if message.recipient_id != user.id or message.status not in ["sent", "received"]:
        emit("error", {"message": "unexpected notification"}, namespace="/")
        return

    # I have to update previous messages status too (not obligatory, but I want to keep it consistent)
    messages_to_update = Message.query.filter(
        Message.created_at <= message.created_at,
        Message.sender_id == message.sender_id,
        Message.recipient_id == message.recipient_id,
        or_(Message.status == "received", Message.status == "sent"),
    )

    if messages_to_update:
        messages_to_update.update({Message.status: "read"}, synchronize_session="auto")
        db.session.commit()
        room_sender = _user_room(message.sender_id)
        payload_out = {"message_id": msg_id}
        emit("he_read_message", payload_out, room=room_sender, namespace="/")


# -----------------------
# CLI Helpers
# -----------------------
@app.cli.command("init-db")
def init_db():
    """Initialize the database (create tables)."""
    db.create_all()


# -----------------------
# Run
# -----------------------
if __name__ == "__main__":
    # Ensure DB exists
    with app.app_context():
        db.create_all()
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
