const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const bodyParser = require("body-parser");
const session = require("express-session");
const db = require("./db");
const multer = require("multer");
const sanitizeHtml = require("sanitize-html");
const sharp = require('sharp');
const requestIp = require('request-ip');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 허용하는 이미지 형식과 저장 확장자 (클라이언트가 보낸 파일명 확장자는 사용하지 않음)
const imageExtensions = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
};

// 업로드 이미지 저장 폴더
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, "uploads");

// 아이디 형식 (회원가입 규칙과 동일)
const userIdPattern = /^[a-zA-Z0-9_]+$/;

const storage = multer.diskStorage({
    destination: uploadDir, // 저장할 폴더 경로
    filename: (req, file, cb) => {
        // 파일 이름 설정 로직
        const userId = req.session.user.user_id;
        const date = new Date(Date.now() + (9 * 60 * 60 * 1000)).toISOString();
        const formattedDate = date.replace(/[.:]/g, '');
        const fileExtension = imageExtensions[file.mimetype]; // 파일 확장자

        const fileName = `${formattedDate}-${userId}.${fileExtension}`;

        cb(null, fileName);
    },
});

const fileFilter = (req, file, cb) => {
    // 파일 유형 제한 (jpg, png, gif, webp만 허용)
    if (!imageExtensions[file.mimetype]) {
        return cb(new Error("이미지 파일만 허용됩니다."));
    }

    // 파일 허용
    cb(null, true);
};

// 파일 사이즈 제한 (20MB 이하) - fileFilter 단계에서는 file.size를 알 수 없어 limits로 제한
const upload = multer({ storage: storage, fileFilter: fileFilter, limits: { fileSize: 20 * 1024 * 1024 } });



const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));
// 업로드한 이미지 제공 (에디터가 /uploads/파일명 으로 삽입함)
app.use('/uploads', express.static(uploadDir, { dotfiles: 'deny', index: false }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // 실행 위치와 관계없이 템플릿을 찾도록

// 로그인한 사용자가 해당 대화방("아이디1@아이디2")의 참여자인지 확인
function isRoomMember(socket, room) {
    const user = socket.request.session && socket.request.session.user;
    return Boolean(user) && typeof room === "string" && room.split("@").includes(user.user_id);
}

// 클라이언트로부터의 연결을 기다립니다.
io.on('connection', (socket) => {
    // 방 접속 이벤트 대기, 클라이언트에서 방번호와 이벤트 발송되면 해당 방번호로 연결
    socket.on('joinRoom', (room) => {
        if (!isRoomMember(socket, room)) return;
        socket.join(room);
    });

    // 클라이언트에서 메시지 전송시 해당 방으로 메시지 전송
    // 발신자는 클라이언트가 보낸 nickname이 아니라 세션의 사용자 ID를 사용한다
    socket.on('chatMessage', ({ room, message } = {}) => {
        if (!isRoomMember(socket, room)) return;
        if (typeof message !== "string" || !message.trim() || message.length > 300) return;

        const nickname = socket.request.session.user.user_id;
        io.to(room).emit('chatMessage', { message, nickname });

        // 데이터베이스에 메시지 저장
        try {
            db.InsertChatMessage(room, nickname, message);
        } catch (err) {
            console.error(err);
        }
    });

    socket.on('loadMessages', (room) => {
        if (!isRoomMember(socket, room)) return;
        try {
            // 클라이언트에게 메시지 전송
            socket.emit('loadedMessages', db.GetChatMessages(room));
        } catch (err) {
            console.error(err);
        }
    });
});


// 세션 암호화를 위한 비밀키 (지정하지 않으면 실행할 때마다 새로 생성)
const secretKey = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");


// Body-parser 미들웨어 설정
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// 세션 설정
const sessionMiddleware = session({
    secret: secretKey,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 10800000, // 세션 유효 기간 (3시간)
        httpOnly: true,
        sameSite: "lax",
    },
});
app.use(sessionMiddleware);
// Socket.IO에서도 같은 세션으로 사용자를 확인한다
io.engine.use(sessionMiddleware);

// 로그인이 필요한 API (비로그인 시 401)
const requireLogin = (req, res, next) => {
    if (req.session.isLoggedIn) {
        next();
    } else {
        res.status(401).json({ message: "로그인 후 이용해주세요." });
    }
};

// 메인 페이지 렌더링
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});


// 로그인 페이지 렌더링
app.get("/login", (req, res) => {
    res.sendFile(__dirname + "/login.html");
});

// 회원가입 페이지 렌더링
app.get("/register", (req, res) => {
    res.sendFile(__dirname + "/register.html");
});

// 게시글 작성
app.post("/create-post", requireLogin, (req, res) => {
    const { content } = req.body;

    if (typeof content !== "string" || content.length > 20000) {
        return res.status(400).json({ message: "게시글 내용이 올바르지 않습니다." });
    }

    // 입력된 HTML을 필터링하여 특정 태그만 허용
    const filteredHtml = sanitizeHtml(content, {
        allowedTags: [
            "p", "h1", "h2", "h3","h4","h5","h6","br","strong","em","del","hr","ol","ul","li","a","img","pre","code",
        ], // 필터링에서 허용할 태그 목록
    });

    if (filteredHtml.length == 0) {
        return res.status(400).json({ message: "내용을 입력해주세요." });
    }

    try {
        const message = db.CreatePost(req.session.user.user_id, filteredHtml);
        res.status(200).json({ message });
    } catch (error) {
        console.error("게시글 작성 실패:", error);
        res.status(500).json({ message: "게시글 작성에 실패하였습니다." });
    }
});

// 로그인 요청 처리
app.post("/login", (req, res) => {
    const { userid, password } = req.body;

    if (typeof userid !== "string" || typeof password !== "string") {
        return res.status(400).send("아이디와 비밀번호를 입력해주세요.");
    }

    try {
        const userData = db.LoginUser(userid, password);

        if (userData) {
            // 세션 고정 공격 방지를 위해 로그인 시 세션 ID를 새로 발급
            req.session.regenerate((err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send("서버 오류가 발생했습니다.");
                }
                // 로그인 성공 시 세션에 사용자 정보 저장
                req.session.user = {
                    user_id: userData.user_id,
                    name: userData.user_name,
                    bio: userData.bio,
                };
                req.session.isLoggedIn = true;
                res.status(200).send("로그인 성공");
            });
        } else {
            // 로그인 실패
            res.status(401).send("아이디 또는 비밀번호가 잘못되었습니다.");
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("서버 오류가 발생했습니다.");
    }
});

// 로그인 상태 확인 미들웨어
const checkLoginStatus = (req, res, next) => {
    if (req.session.isLoggedIn) {
        next();
    } else {
        res.redirect("/login");
    }
};

// 로그인 페이지 처리
app.get("/user/:userId", (req, res) => {
    res.sendFile(__dirname + "/user.html");
});

// 채팅방 페이지 렌더링
app.get('/dm/:room', (req, res) => {
    if (req.session.isLoggedIn) {
        // 상대 아이디 형식이 아니면 거부 (템플릿의 스크립트에 그대로 들어가므로)
        if (!userIdPattern.test(req.params.room)) {
            return res.status(404).send("사용자를 찾을 수 없습니다.");
        }
        const userList = [req.params.room, req.session.user.user_id];
        userList.sort();

        const roomId = userList[0] + '@' + userList[1];

        try {
            const chatList = db.GetChatList(req.session.user.user_id);
            res.render('chat', { room: roomId, nickname: req.session.user.user_id , chatList : chatList});
        } catch (error) {
            console.error(error);
            res.status(500).send("서버 오류가 발생했습니다.");
        }
    }
    else {
        // 비로그인 상태일 경우 로그인 페이지로 리다이렉트
        res.redirect("/login");
    }
});

// 채팅방 페이지 렌더링
app.get('/dm', (req, res) => {
    if (req.session.isLoggedIn) {
        try {
            const chatList = db.GetChatList(req.session.user.user_id);
            res.render('chat', { room : false, nickname: req.session.user.user_id , chatList : chatList});
        } catch (error) {
            console.error(error);
            res.status(500).send("서버 오류가 발생했습니다.");
        }
    }
    else {
        // 비로그인 상태일 경우 로그인 페이지로 리다이렉트
        res.redirect("/login");
    }
});

// 유저 정보 api
app.get('/api/user/:userId', (req, res) => {
    try {
        const userId = req.params.userId;
        const userData = db.GetUserInfo(userId);
        res.json(userData);
    } catch (error) {
        console.error(error);
        res.status(500).send("서버 오류가 발생했습니다.");
    }
});

// 신고 요청 처리
app.post("/report", requireLogin, (req, res) => {
    const { postId } = req.body;

    try {
        db.Report(req.session.user.user_id, postId);

        res.status(200).send("신고 접수");
    } catch (error) {
        console.error(error);
        res.status(500).send("서버 오류가 발생했습니다.");
    }
});

// 프로필 페이지 요청 처리
app.get("/api/profile", checkLoginStatus, (req, res) => {
    // 세션에서 사용자 정보 확인
    if (req.session.isLoggedIn) {
        // 로그인 상태일 경우 프로필 정보 반환
        const user = req.session.user;
        const profileInfo = {
            user_id: user.user_id,
            name: user.name,
            bio: user.bio,
        };
        res.json(profileInfo);
    } else {
        // 비로그인 상태일 경우 로그인 페이지로 리다이렉트
        res.redirect("/login");
    }
});

// 로그인 확인 API
app.get("/api/check-login", (req, res) => {
    if (req.session.isLoggedIn) {
        res.json({ isLoggedIn: true, username: req.session.user.name });
    } else {
        res.json({ isLoggedIn: false, username: null });
    }
});

app.get("/logout", (req, res) => {
    // 세션 정보 삭제
    req.session.destroy((err) => {
        if (err) {
            console.error("세션 삭제 실패:", err);
        }
        // 로그아웃 후 리다이렉트 등 필요한 동작 수행
        res.redirect("/"); // 로그아웃 후 리다이렉트할 경로 설정
    });
});

// 포스트 가져오기
app.get("/posts", (req, res) => {
    // 최근 n개의 게시글을 요청 파라미터에서 가져오기 (기본값은 10)
    const count = req.query.count || "10";
    const follow = req.query.follow;

    try {
        const posts = db.GetPost({
            count: Math.min(parseInt(count, 10) || 10, 100), // 한 번에 최대 100개
            follow: follow && req.session.user,
            userId: req.session.user ? req.session.user.user_id : null,
        });

        res.json(posts);
    } catch (error) {
        console.error(error);
        res.status(500).send("서버 오류가 발생했습니다.");
    }
});


// 댓글 가져오기
app.get("/comment", (req, res) => {
    // 최근 n개의 게시글을 요청 파라미터에서 가져오기 (기본값은 10)
    const postId = req.query.post;

    try {
        res.json(db.GetComment(postId));
    } catch (error) {
        console.error(error);
        res.status(500).send("서버 오류가 발생했습니다.");
    }
});

// 댓글 작성
app.post("/comment", requireLogin, (req, res) => {
    const { postId, content } = req.body;

    if (typeof content !== "string" || !content.trim() || content.length > 300) {
        return res.status(400).send("댓글은 1~300자로 입력해주세요.");
    }

    try {
        db.CreateComment(postId, req.session.user.user_id, content);

        res.status(200).send("댓글 작성");
    } catch (error) {
        console.error(error);
        res.status(500).send("서버 오류가 발생했습니다.");
    }
});

// 팔로우 요청 처리
app.post("/follow", requireLogin, (req, res) => {
    const { userId} = req.body;

    try {
        db.FollowUser(req.session.user.user_id, userId);

        res.status(200).send("Done");
    } catch (error) {
        console.error(error);
        res.status(500).send("서버 오류가 발생했습니다.");
    }
});

// 회원가입 요청 처리
app.post("/register", (req, res) => {
    const { userid, password, user_name, bio, student_id } = req.body;

    // 형식·길이 검증 (기존 DB 컬럼 길이 기준)
    if (typeof userid !== "string" || typeof password !== "string" || typeof user_name !== "string") {
        return res.status(400).send("필수 항목을 입력해주세요.");
    }
    if (userid.length > 50 || password.length > 128 || user_name.length > 50
        || String(bio || "").length > 1000 || String(student_id || "").length > 50) {
        return res.status(400).send("입력값이 너무 깁니다.");
    }

    if (userid.length < 4) {
        res.status(400).send("아이디가 너무 짧습니다 (최소 4자 이상)");
        return
    } else if (!/^[a-zA-Z0-9_]+$/.test(userid)) {
        res.status(400).send(
            "아이디에 알파벳, 숫자, 언더바 이외의 특수문자가 포함되었습니다"
        );
        return
    }

    if (password.length < 6) {
        res.status(400).send("비밀번호가 너무 짧습니다 (최소 6자 이상)");
        return
    }

    // 기존 코드는 아이디 길이를 다시 검사하고 있었음. 한글 이름을 고려해 최소 2자로 검사
    if (user_name.length < 2) {
        res.status(400).send("사용자 이름이 너무 짧습니다 (최소 2자 이상)");
        return
    } else if (!/^[\wㄱ-힣]+$/.test(user_name)) {
        res.status(400).send(
            "사용자 이름에 알파벳, 숫자, 언더바, 한글 이외의 문자가 포함되었습니다"
        );
        return
    }

    // IP 주소 가져오기
    const ipAddress = requestIp.getClientIp(req);;
    // 브라우저 정보 가져오기
    const browser = req.headers['user-agent'];

    try {
        const { registerSuccess, errorMessage } = db.RegisterUser({
            userid, password, user_name, bio, student_id, ipAddress, browser,
        });

        // 회원가입 결과 처리

        if (registerSuccess) {
            // 회원가입 성공
            res.status(200).send("회원가입이 성공적으로 완료되었습니다.");
        } else {
            // 회원가입 실패
            res.status(400).send(errorMessage);
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("서버 오류가 발생했습니다.");
    }
});

app.post("/upload", requireLogin, upload.single("image"), (req, res) => {
    // 업로드된 이미지 처리
    const file = req.file;
    if (!file) {
        return res.status(400).send("업로드할 이미지가 없습니다.");
    }
    // 이미지 파일의 이름을 반환
    const imageName = file.filename;
    // 업로드된 이미지 경로
    const imagePath = req.file.path;

    // 이미지 정보 가져오기
    sharp(imagePath)
        .metadata()
        .then(metadata => {
            const { width, height } = metadata;

            // 가로 또는 세로 중 하나라도 2048 이상인 경우에만 비율에 맞춰 이미지 조절
            if (width >= 2048 || height >= 2048) {
                const scaleFactor = Math.min(2048 / width, 2048 / height);

                // 이미지 조절 및 압축
                sharp(imagePath)
                    .resize(Math.round(width * scaleFactor), Math.round(height * scaleFactor))
                    .jpeg({ quality: 80 })
                    .toFile(path.join(uploadDir, `${req.file.filename}-compressed.jpg`), (err, info) => {
                        if (err) {
                            console.error(err);
                            // 에러 처리 로직
                            return res.status(500).send("이미지 처리 중 오류가 발생했습니다.");
                        }

                        // 기존 파일 삭제
                        fs.unlink(imagePath, err => {
                            if (err) {
                                console.log(err);
                                // 에러 처리 로직
                            }
                        })

                        res.json({ imageName: `${req.file.filename}-compressed.jpg` });
                    });
            } else {
                // 2048 이하인 경우에는 그대로 저장
                res.json({ imageName: imageName });
            }
        })
        .catch(err => {
            console.error(err);
            // 이미지로 읽을 수 없는 파일은 저장하지 않는다
            fs.unlink(imagePath, () => {});
            res.status(500).send("이미지 처리 중 오류가 발생했습니다.");
        });
});


// 업로드 오류(용량 초과, 허용하지 않는 형식)는 400으로 응답 (기본 오류 페이지의 스택 노출 방지)
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError || err.message === "이미지 파일만 허용됩니다.") {
        return res.status(400).send(err.code === "LIMIT_FILE_SIZE" ? "파일 사이즈는 20MB 이하만 허용됩니다." : err.message);
    }
    console.error(err);
    res.status(500).send("서버 오류가 발생했습니다.");
});

// 서버를 시작합니다.
const PORT = process.env.PORT || 3000; // 포트 번호는 환경 변수로 변경할 수 있습니다.
server.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다. (종료: Ctrl+C)`);
});

// 종료 신호를 받으면 연결을 정리하고 DB를 닫은 뒤 종료합니다.
function shutdown() {
    console.log("서버를 종료합니다.");
    // io.close()는 HTTP 서버도 함께 닫는다
    io.close(() => {
        db.db.close();
        process.exit(0);
    });
    setTimeout(() => process.exit(0), 3000).unref();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
