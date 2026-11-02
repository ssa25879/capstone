// SQLite 데이터베이스 모듈
// 기존 MSSQL 저장 프로시저를 같은 이름의 함수로 대체한다.
const { DatabaseSync } = require("node:sqlite");
const fs = require("fs");
const path = require("path");
const { hashPassword, verifyPassword } = require("./password");

const dbPath = process.env.DB_PATH || path.join(__dirname, "..", "data", "frending.db");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS users (
        user_id       TEXT PRIMARY KEY,
        password_hash TEXT NOT NULL,
        user_name     TEXT NOT NULL,
        bio           TEXT,
        student_id    TEXT,
        ip_address    TEXT,
        browser_info  TEXT,
        created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS posts (
        post_id    INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    TEXT NOT NULL REFERENCES users(user_id),
        content    TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS comments (
        comment_id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id    INTEGER NOT NULL REFERENCES posts(post_id),
        user_id    TEXT NOT NULL REFERENCES users(user_id),
        content    TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS follows (
        follower_id  TEXT NOT NULL REFERENCES users(user_id),
        following_id TEXT NOT NULL REFERENCES users(user_id),
        PRIMARY KEY (follower_id, following_id)
    );

    CREATE TABLE IF NOT EXISTS reports (
        user_id    TEXT NOT NULL REFERENCES users(user_id),
        post_id    INTEGER NOT NULL REFERENCES posts(post_id),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, post_id)
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
        message_id      INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id         TEXT NOT NULL,
        user_id         TEXT NOT NULL REFERENCES users(user_id),
        message_content TEXT NOT NULL,
        message_time    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_chat_room ON chat_messages(room_id);
`);

// 화면 표시용 시간 (한국 시간, 분 단위)
const KST = (col) => `strftime('%Y-%m-%d %H:%M', ${col}, '+9 hours')`;

function RegisterUser({ userid, password, user_name, bio, student_id, ipAddress, browser }) {
    const exists = db.prepare("SELECT 1 FROM users WHERE user_id = ?").get(userid);
    if (exists) {
        return { registerSuccess: false, errorMessage: "이미 사용 중인 아이디입니다." };
    }
    db.prepare(`
        INSERT INTO users (user_id, password_hash, user_name, bio, student_id, ip_address, browser_info)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userid, hashPassword(password), user_name, bio || "", student_id || "", ipAddress || "", browser || "");
    return { registerSuccess: true, errorMessage: null };
}

function LoginUser(userid, password) {
    const user = db.prepare("SELECT user_id, user_name, bio, password_hash FROM users WHERE user_id = ?").get(userid);
    if (!user || !verifyPassword(password, user.password_hash)) {
        return undefined;
    }
    return { user_id: user.user_id, user_name: user.user_name, bio: user.bio };
}

function GetUserInfo(userid) {
    return db.prepare("SELECT user_id, user_name, bio FROM users WHERE user_id = ?").get(userid);
}

function CreatePost(userId, content) {
    db.prepare("INSERT INTO posts (user_id, content) VALUES (?, ?)").run(userId, content);
    return "게시글이 작성되었습니다.";
}

function GetPost({ count, follow, userId }) {
    const params = { cnt: count, userId: userId || "" };
    let where = "";
    if (follow && userId) {
        where = `WHERE p.user_id = $userId
                    OR p.user_id IN (SELECT following_id FROM follows WHERE follower_id = $userId)`;
    }
    return db.prepare(`
        SELECT p.post_id, p.user_id, u.user_name, p.content,
               ${KST("p.created_at")} AS created_at,
               CASE WHEN f.follower_id IS NULL THEN 'N' ELSE 'Y' END AS following
        FROM posts p
        JOIN users u ON u.user_id = p.user_id
        LEFT JOIN follows f ON f.following_id = p.user_id AND f.follower_id = $userId
        ${where}
        ORDER BY p.post_id DESC
        LIMIT $cnt
    `).all(params);
}

function GetComment(postId) {
    // 클라이언트(main.js)가 대문자 컬럼명을 사용한다
    return db.prepare(`
        SELECT user_id AS USER_ID, content AS CONTENT
        FROM comments WHERE post_id = ? ORDER BY comment_id
    `).all(postId);
}

function CreateComment(postId, userId, content) {
    db.prepare("INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)").run(postId, userId, content);
}

// 팔로우 상태를 토글한다
function FollowUser(followerId, followingId) {
    const removed = db.prepare("DELETE FROM follows WHERE follower_id = ? AND following_id = ?").run(followerId, followingId);
    if (removed.changes === 0) {
        db.prepare("INSERT INTO follows (follower_id, following_id) VALUES (?, ?)").run(followerId, followingId);
    }
}

function Report(userId, postId) {
    db.prepare("INSERT OR IGNORE INTO reports (user_id, post_id) VALUES (?, ?)").run(userId, postId);
}

function InsertChatMessage(roomId, userId, content) {
    db.prepare("INSERT INTO chat_messages (room_id, user_id, message_content) VALUES (?, ?, ?)").run(roomId, userId, content);
}

function GetChatMessages(roomId) {
    return db.prepare(`
        SELECT user_id, message_content, ${KST("message_time")} AS message_time
        FROM chat_messages WHERE room_id = ? ORDER BY message_id
    `).all(roomId);
}

// 사용자가 참여한 대화방별 마지막 메시지 (방 ID는 "아이디1@아이디2" 형식)
function GetChatList(userId) {
    const rows = db.prepare(`
        SELECT room_id, message_content, ${KST("message_time")} AS message_time
        FROM chat_messages
        WHERE message_id IN (SELECT MAX(message_id) FROM chat_messages GROUP BY room_id)
          AND (substr(room_id, 1, length($u) + 1) = $u || '@'
               OR substr(room_id, -(length($u) + 1)) = '@' || $u)
        ORDER BY message_id DESC
    `).all({ u: userId });
    return rows.map((row) => {
        const [a, b] = row.room_id.split("@");
        return { user_id: a === userId ? b : a, message_content: row.message_content, message_time: row.message_time };
    });
}

module.exports = {
    // 스키마는 모듈을 불러올 때 이미 만들어진다 (Postgres 모듈과 인터페이스를 맞추기 위한 함수)
    init: async () => {},
    close: async () => db.close(),
    CountUsers: () => db.prepare("SELECT COUNT(*) AS n FROM users").get().n,
    RegisterUser,
    LoginUser,
    GetUserInfo,
    CreatePost,
    GetPost,
    GetComment,
    CreateComment,
    FollowUser,
    Report,
    InsertChatMessage,
    GetChatMessages,
    GetChatList,
};
