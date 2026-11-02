// 서버를 임시 DB로 띄워 주요 API 흐름을 확인하는 스모크 테스트
const { test, before, after } = require("node:test");
const assert = require("node:assert");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const http = require("node:http");

// 기본은 SQLite + 로컬 업로드.
// supabase.test.js에서 "supabase"로 지정하면 PGlite(Postgres)와 모의 Supabase Storage로 같은 테스트를 실행한다.
const SUPABASE = process.env.FRENDING_TEST_BACKEND === "supabase";
const PORT = SUPABASE ? 3998 : 3999;
const BASE = `http://127.0.0.1:${PORT}`;
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "frending-test-"));
const SERVICE_KEY = "test-service-key";
let server;
let pg;
let storageServer;
const storedObjects = new Map(); // 모의 Storage에 저장된 파일

// Supabase Storage REST API 중 서버가 사용하는 부분만 흉내 낸다
function startMockStorage(port) {
    storageServer = http.createServer((req, res) => {
        const chunks = [];
        req.on("data", (c) => chunks.push(c));
        req.on("end", () => {
            const publicMatch = req.url.match(/^\/storage\/v1\/object\/public\/uploads\/(.+)$/);
            if (req.method === "GET" && publicMatch) {
                const obj = storedObjects.get(decodeURIComponent(publicMatch[1]));
                if (!obj) return res.writeHead(404).end();
                return res.writeHead(200, { "Content-Type": obj.type }).end(obj.body);
            }
            // 쓰기 요청은 service_role 키가 있어야 한다
            if (req.headers.authorization !== `Bearer ${SERVICE_KEY}` || req.headers.apikey !== SERVICE_KEY) {
                return res.writeHead(401).end("unauthorized");
            }
            if (req.method === "POST" && req.url === "/storage/v1/bucket") {
                return res.writeHead(200).end("{}");
            }
            const uploadMatch = req.url.match(/^\/storage\/v1\/object\/uploads\/(.+)$/);
            if (req.method === "POST" && uploadMatch) {
                storedObjects.set(decodeURIComponent(uploadMatch[1]), { type: req.headers["content-type"], body: Buffer.concat(chunks) });
                return res.writeHead(200).end("{}");
            }
            res.writeHead(404).end();
        });
    });
    return new Promise((resolve) => storageServer.listen(port, "127.0.0.1", resolve));
}

before(async () => {
    const env = { ...process.env, PORT, DB_PATH: path.join(tmpDir, "test.db"), UPLOAD_DIR: path.join(tmpDir, "uploads") };
    if (SUPABASE) {
        // PGlite: 설치 없이 쓰는 내장형 Postgres. 소켓 서버로 띄워 pg 클라이언트가 접속한다
        const { PGlite } = await import("@electric-sql/pglite");
        const { PGLiteSocketServer } = await import("@electric-sql/pglite-socket");
        const pgDb = await PGlite.create();
        pg = { db: pgDb, server: new PGLiteSocketServer({ db: pgDb, port: 5498, host: "127.0.0.1" }) };
        await pg.server.start();
        await startMockStorage(5497);
        Object.assign(env, {
            DATABASE_URL: "postgres://postgres:postgres@127.0.0.1:5498/postgres",
            DATABASE_SSL: "disable",
            PG_POOL_MAX: "1", // PGlite는 연결 하나만 처리한다
            SUPABASE_URL: "http://127.0.0.1:5497",
            SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
        });
    }
    server = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], { env, stdio: "pipe" });
    let log = "";
    await new Promise((resolve, reject) => {
        server.stdout.on("data", (d) => d.toString().includes("실행 중") && resolve());
        server.stderr.on("data", (d) => { log += d; });
        server.on("exit", (code) => reject(new Error(`server exited ${code}: ${log}`)));
    });
});

after(async () => {
    // Windows에서는 DB 파일 잠금이 풀리도록 프로세스 종료를 기다린다
    const exited = new Promise((resolve) => server.once("exit", resolve));
    server.kill();
    await exited;
    if (SUPABASE) {
        await pg.server.stop();
        await pg.db.close();
        storageServer.close();
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

// 업로드된 이미지 내용과 목록 (로컬 폴더 또는 모의 Storage)
function readUploaded(name) {
    return SUPABASE ? storedObjects.get(name).body : fs.readFileSync(path.join(tmpDir, "uploads", name));
}
function listUploaded() {
    return SUPABASE ? [...storedObjects.keys()] : fs.readdirSync(path.join(tmpDir, "uploads"));
}

// 쿠키를 유지하는 간단한 클라이언트
function client() {
    let cookie = "";
    return async (url, { method = "GET", body } = {}) => {
        const res = await fetch(BASE + url, {
            method,
            redirect: "manual",
            // FormData는 fetch가 multipart 헤더를 직접 설정한다
            headers: body instanceof FormData ? { Cookie: cookie } : { "Content-Type": "application/json", Cookie: cookie },
            body: body instanceof FormData ? body : body && JSON.stringify(body),
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

test("비로그인 상태의 쓰기 API는 401", async () => {
    const guest = client();
    for (const url of ["/create-post", "/comment", "/follow", "/report", "/upload"]) {
        const res = await guest(url, { method: "POST", body: {} });
        assert.strictEqual(res.status, 401, url);
    }
});

test("잘못된 입력은 400/404로 거부", async () => {
    const carol = client();
    await signup(carol, "carol");
    await carol("/login", { method: "POST", body: { userid: "carol", password: "test1234" } });

    assert.strictEqual((await carol("/comment", { method: "POST", body: { postId: 1, content: "" } })).status, 400);
    assert.strictEqual((await carol("/comment", { method: "POST", body: { postId: 1, content: "x".repeat(301) } })).status, 400);
    assert.strictEqual((await carol("/register", { method: "POST", body: {} })).status, 400);
    assert.strictEqual((await carol("/dm/a'b")).status, 404);
});

test("이미지 업로드: 큰 이미지는 축소, 이미지가 아닌 파일은 거부", async () => {
    const sharp = require("sharp");
    const dave = client();
    await signup(dave, "dave");
    await dave("/login", { method: "POST", body: { userid: "dave", password: "test1234" } });

    const big = await sharp({ create: { width: 3000, height: 1000, channels: 3, background: "#9ce159" } }).png().toBuffer();
    let form = new FormData();
    form.append("image", new Blob([big], { type: "image/png" }), "big.png");
    let res = await dave("/upload", { method: "POST", body: form });
    assert.strictEqual(res.status, 200);
    const { imageName } = await res.json();
    assert.match(imageName, /-dave\.png-compressed\.jpg$/);
    const meta = await sharp(readUploaded(imageName)).metadata();
    assert.strictEqual(meta.width, 2048);

    // 이미지 MIME으로 위장한 텍스트 파일은 저장되지 않는다
    form = new FormData();
    form.append("image", new Blob(["<script>alert(1)</script>"], { type: "image/png" }), "x.png");
    res = await dave("/upload", { method: "POST", body: form });
    assert.strictEqual(res.status, 500);
    const left = listUploaded();
    assert.deepStrictEqual(left, [imageName]);
});

test("버그 수정 확인: 업로드 이미지 제공, 빈 글·짧은 이름·파일 없음 처리", async () => {
    const sharp = require("sharp");
    const erin = client();
    await signup(erin, "erin");
    await erin("/login", { method: "POST", body: { userid: "erin", password: "test1234" } });

    // 업로드한 이미지를 /uploads 경로로 볼 수 있다
    const small = await sharp({ create: { width: 10, height: 10, channels: 3, background: "#000" } }).png().toBuffer();
    const form = new FormData();
    form.append("image", new Blob([small], { type: "image/png" }), "s.png");
    const { imageName } = await (await erin("/upload", { method: "POST", body: form })).json();
    let img = await erin(`/uploads/${imageName}`);
    if (SUPABASE) {
        // Supabase Storage 공개 URL로 리다이렉트된다
        assert.strictEqual(img.status, 302);
        img = await fetch(img.headers.get("location"));
    }
    assert.strictEqual(img.status, 200);
    assert.strictEqual(img.headers.get("content-type"), "image/png");

    // 파일 없이 업로드하면 400 (기존: 서버 예외)
    assert.strictEqual((await erin("/upload", { method: "POST", body: new FormData() })).status, 400);

    // 허용하지 않는 형식은 400
    const svg = new FormData();
    svg.append("image", new Blob(["<svg/>"], { type: "image/svg+xml" }), "a.svg");
    assert.strictEqual((await erin("/upload", { method: "POST", body: svg })).status, 400);

    // 빈 게시글은 400 (기존: 응답 없이 요청이 멈춤)
    assert.strictEqual((await erin("/create-post", { method: "POST", body: { content: "<script></script>" } })).status, 400);

    // 사용자 이름 길이 검사 (기존: 아이디 길이를 잘못 검사)
    const short = await erin("/register", { method: "POST", body: { userid: "frank", password: "test1234", user_name: "a" } });
    assert.strictEqual(short.status, 400);
    const korean = await erin("/register", { method: "POST", body: { userid: "gildong", password: "test1234", user_name: "홍길동" } });
    assert.strictEqual(korean.status, 200);
});
