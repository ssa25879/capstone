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
const storage = multer.diskStorage({
    destination: "uploads", // 저장할 폴더 경로
    filename: (req, file, cb) => {
        // 파일 이름 설정 로직
        const userId = req.session.user.user_id;
        const date = new Date(Date.now() + (9 * 60 * 60 * 1000)).toISOString();
        const formattedDate = date.replace(/[.:]/g, '');
        const fileExtension = file.originalname.split(".").pop(); // 파일 확장자

        const fileName = `${formattedDate}-${userId}.${fileExtension}`;

        cb(null, fileName);
    },
});

const fileFilter = (req, file, cb) => {
    // 파일 사이즈 제한 (20MB 이하)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
        return cb(new Error("파일 사이즈는 20MB 이하만 허용됩니다."));
    }

    // 파일 유형 제한 (이미지 파일만 허용)
    if (!file.mimetype.startsWith("image/")) {
        return cb(new Error("이미지 파일만 허용됩니다."));
    }

    // 파일 허용
    cb(null, true);
};

const upload = multer({ storage: storage, fileFilter: fileFilter });



const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// 클라이언트로부터의 연결을 기다립니다.
io.on('connection', (socket) => {
    // 방 접속 이벤트 대기, 클라이언트에서 방번호와 이벤트 발송되면 해당 방번호로 연결
    socket.on('joinRoom', (room) => {

        socket.join(room);
    });

    // 클라이언트에서 메시지 전송시 해당 방으로 메시지 전송
    socket.on('chatMessage', ({ room, message, nickname }) => {

        io.to(room).emit('chatMessage', { message, nickname });

        // 데이터베이스에 메시지 저장
        try {
            db.InsertChatMessage(room, nickname, message); // 실제 사용자 ID로 변경해야 함
        } catch (err) {
            console.error(err);
        }
    });

    socket.on('loadMessages', (room) => {
        try {
            // 클라이언트에게 메시지 전송
            socket.emit('loadedMessages', db.GetChatMessages(room));
        } catch (err) {
            console.error(err);
        }
    });
});


// 세션 암호화를 위한 비밀키
const secretKey = generateRandomString(32);


// Body-parser 미들웨어 설정
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// 세션 설정
app.use(
    session({
        secret: secretKey,
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 10800000, // 세션 유효 기간 (3시간)
        },
    })
);

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
app.post("/create-post", (req, res) => {
    const { content } = req.body;

    // 입력된 HTML을 필터링하여 특정 태그만 허용
    const filteredHtml = sanitizeHtml(content, {
        allowedTags: [
            "p", "h1", "h2", "h3","h4","h5","h6","br","strong","em","del","hr","ol","ul","li","a","img","pre","code",
        ], // 필터링에서 허용할 태그 목록
    });

    if (filteredHtml.length == 0) {
        return;
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

    try {
        const userData = db.LoginUser(userid, password);

        if (userData) {
            // 로그인 성공 시 세션에 사용자 정보 저장
            req.session.user = {
                user_id: userData.user_id,
                name: userData.user_name,
                bio: userData.bio,
            };
            req.session.isLoggedIn = true;
            res.status(200).send("로그인 성공");
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
app.post("/report", (req, res) => {
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
            count: parseInt(count, 10) || 10,
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
app.post("/comment", (req, res) => {
    const { postId, content } = req.body;

    try {
        db.CreateComment(postId, req.session.user.user_id, content);

        res.status(200).send("댓글 작성");
    } catch (error) {
        console.error(error);
        res.status(500).send("서버 오류가 발생했습니다.");
    }
});

// 팔로우 요청 처리
app.post("/follow", (req, res) => {
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

    if (userid.length < 4) {
        res.status(400).send("사용자 이름이 너무 짧습니다 (최소 4자 이상)");
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

app.post("/upload", upload.single("image"), (req, res) => {
    // 업로드된 이미지 처리
    const file = req.file;
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
                    .toFile(`uploads/${req.file.filename}-compressed.jpg`, (err, info) => {
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
            // 에러 처리 로직
            res.status(500).send("이미지 처리 중 오류가 발생했습니다.");
        });
});


function generateRandomString(length) {
    const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let randomString = "";
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        randomString += characters.charAt(randomIndex);
    }
    return randomString;
}


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
