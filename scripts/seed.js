// 데모 데이터 (가상 사용자·게시글)
// 데모 계정 비밀번호: demo1234
// DATABASE_URL이 있으면 Postgres(Supabase), 없으면 로컬 SQLite에 추가한다.
const db = require("../db");

(async () => {
    await db.init();

    if (await db.CountUsers() > 0) {
        console.log("이미 데이터가 있어 시드를 건너뜁니다.");
        return;
    }

    const users = [
        { userid: "frend_dev", user_name: "김프렌", bio: "마크다운으로 글 쓰는 걸 좋아합니다 ✍️" },
        { userid: "green_tea", user_name: "이초록", bio: "축제 부스 운영 중 🌱" },
        { userid: "node_lover", user_name: "박노드", bio: "Express와 Socket.IO 공부 중" },
    ];
    for (const u of users) {
        await db.RegisterUser({ ...u, password: "demo1234" });
    }

    await db.CreatePost("frend_dev", "<h2>Frending 첫 글</h2><p>Frending은 <em>마크다운</em>으로 글을 쓰는 SNS입니다.</p><ol><li>왼쪽에 마크다운 작성</li><li>오른쪽에서 미리보기 확인</li><li><strong>Post</strong> 버튼으로 게시</li></ol>");
    await db.CreatePost("node_lover", "<p>Socket.IO로 방(room) 단위 채팅 구현하는 법 정리</p><pre><code>socket.on('joinRoom', (room) =&gt; {\n    socket.join(room);\n});</code></pre>");
    await db.CreatePost("green_tea", "<h3>🎉 축제 부스 오픈!</h3><p>오늘 <strong>2시부터</strong> 전시관 1층에서 Frending 데모를 진행합니다.</p>");

    await db.CreateComment(2, "green_tea", "정리 감사합니다! 바로 적용해볼게요.");
    await db.FollowUser("frend_dev", "green_tea");

    const room = "frend_dev@green_tea";
    await db.InsertChatMessage(room, "green_tea", "오늘 전시 준비 다 됐어요?");
    await db.InsertChatMessage(room, "frend_dev", "네! 노트북 두 대에 데모 띄워놨어요.");

    console.log("데모 데이터를 추가했습니다. (계정: frend_dev / green_tea / node_lover, 비밀번호: demo1234)");
})()
    .catch((err) => {
        console.error("시드 실패:", err.message);
        process.exitCode = 1;
    })
    .finally(() => db.close());
