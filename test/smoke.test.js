// 서버를 임시 DB로 띄워 주요 API 흐름을 확인하는 스모크 테스트
const { test, before, after } = require("node:test");
const assert = require("node:assert");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const PORT = 3999;
const BASE = `http://127.0.0.1:${PORT}`;
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "frending-test-"));
let server;

before(async () => {
    server = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {
        env: { ...process.env, PORT, DB_PATH: path.join(tmpDir, "test.db") },
        stdio: "pipe",
    });
    await new Promise((resolve, reject) => {
        server.stdout.on("data", (d) => d.toString().includes("실행 중") && resolve());
        server.on("exit", (code) => reject(new Error(`server exited ${code}`)));
    });
});

after(async () => {
    // Windows에서는 DB 파일 잠금이 풀리도록 프로세스 종료를 기다린다
    const exited = new Promise((resolve) => server.once("exit", resolve));
    server.kill();
    await exited;
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

// 쿠키를 유지하는 간단한 클라이언트
function client() {
    let cookie = "";
    return async (url, { method = "GET", body } = {}) => {
        const res = await fetch(BASE + url, {
            method,
            redirect: "manual",
            headers: { "Content-Type": "application/json", Cookie: cookie },
            body: body && JSON.stringify(body),
        });
        const setCookie = res.headers.get("set-cookie");
        if (setCookie) cookie = setCookie.split(";")[0];
        return res;
    };
}

async function signup(req, userid) {
    const res = await req("/register", {
        method: "POST",
        body: { userid, password: "test1234", user_name: userid, bio: "", student_id: "" },
    });
    assert.strictEqual(res.status, 200, await res.text());
}

test("회원가입·로그인·게시글·댓글·팔로우 흐름", async () => {
    const alice = client();
    const bob = client();
    await signup(alice, "alice");
    await signup(bob, "bob_");

    // 중복 아이디는 거부된다
    const dup = await alice("/register", {
        method: "POST",
        body: { userid: "alice", password: "test1234", user_name: "alice" },
    });
    assert.strictEqual(dup.status, 400);

    // 잘못된 비밀번호는 401
    assert.strictEqual((await alice("/login", { method: "POST", body: { userid: "alice", password: "wrong!!" } })).status, 401);
    assert.strictEqual((await alice("/login", { method: "POST", body: { userid: "alice", password: "test1234" } })).status, 200);
    assert.strictEqual((await bob("/login", { method: "POST", body: { userid: "bob_", password: "test1234" } })).status, 200);

    const login = await (await alice("/api/check-login")).json();
    assert.deepStrictEqual(login, { isLoggedIn: true, username: "alice" });

    await bob("/create-post", { method: "POST", body: { content: "<h2>hello</h2><script>x()</script>" } });
    let posts = await (await alice("/posts?count=10")).json();
    assert.strictEqual(posts.length, 1);
    assert.strictEqual(posts[0].content, "<h2>hello</h2>");
    assert.strictEqual(posts[0].following, "N");

    const postId = posts[0].post_id;
    await alice("/comment", { method: "POST", body: { postId, content: "nice" } });
    const comments = await (await alice(`/comment?post=${postId}`)).json();
    assert.deepStrictEqual(comments, [{ USER_ID: "alice", CONTENT: "nice" }]);

    // 팔로우는 토글된다
    await alice("/follow", { method: "POST", body: { userId: "bob_" } });
    posts = await (await alice("/posts?count=10&follow=y")).json();
    assert.strictEqual(posts[0].following, "Y");
    await alice("/follow", { method: "POST", body: { userId: "bob_" } });
    posts = await (await alice("/posts?count=10&follow=y")).json();
    assert.strictEqual(posts.length, 0);

    assert.strictEqual((await alice("/report", { method: "POST", body: { postId } })).status, 200);

    const user = await (await alice("/api/user/bob_")).json();
    assert.strictEqual(user.user_name, "bob_");

    assert.strictEqual((await alice("/dm/bob_")).status, 200);
});

test("비로그인 상태의 DM 접근은 로그인으로 리다이렉트", async () => {
    const guest = client();
    const res = await guest("/dm");
    assert.strictEqual(res.status, 302);
    assert.strictEqual(res.headers.get("location"), "/login");
});
