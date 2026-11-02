# Frending — 마크다운 SNS

학교 축제 전시를 위해 제작한 팀 프로젝트입니다. 마크다운으로 글과 이미지를 함께 작성하고, 피드·댓글·팔로우·실시간 메시지로 소통하는 SNS를 구현했습니다.

## 프로젝트 정보

| 항목 | 내용 |
| --- | --- |
| 개발 기간 | 2023.04 ~ 2023.09 |
| 프로젝트 형태 | 팀 프로젝트 |
| 윤우상 담당 | 마크다운 에디터 도입, UI 구성 및 연동, DB 전환 대응 |
| 주요 기술 | JavaScript, Node.js, Express, EJS, MS-SQL, Socket.IO, Toast UI Editor |

## 주요 기능

- **마크다운 게시글 작성**: Toast UI Editor로 글과 이미지를 작성하고, 에디터 내용을 HTML로 전달합니다.
- **피드·댓글·팔로우**: 게시글 목록과 팔로우 피드를 조회하고, 댓글과 팔로우 요청을 처리합니다.
- **회원·프로필**: 회원가입, 로그인·로그아웃, 세션 기반 로그인 상태와 프로필 조회를 제공합니다.
- **실시간 DM**: Socket.IO의 방 단위로 메시지를 전송하고, MS-SQL 저장 프로시저로 대화 내역을 저장·조회합니다.
- **이미지 업로드**: Multer로 이미지를 받고, 가로 또는 세로가 2048px 이상이면 Sharp로 비율을 유지해 크기를 조정하고 JPEG로 압축합니다.
- **게시글 HTML 필터링**: 서버에서 `sanitize-html`로 허용된 태그만 남긴 뒤 저장을 요청합니다.

## 담당 내용

- Toast UI Editor 도입
- 게시글 작성 UI 구성 및 서버 연동
- MySQL → MS-SQL 전환 대응

주요 기능은 팀 전체의 구현 내용이며, 위 항목은 윤우상의 담당 범위입니다.

## 기술 구성

| 영역 | 사용 기술 |
| --- | --- |
| 화면 | HTML, CSS, JavaScript, EJS, Toast UI Editor |
| 서버·세션 | Node.js, Express, express-session |
| 데이터베이스 | MS-SQL, mssql, 저장 프로시저 |
| 실시간 통신 | Socket.IO |
| 업로드·이미지 처리 | Multer, Sharp |
| 게시글 HTML 필터링 | sanitize-html |

현재 저장소는 React 기반 프로젝트가 아닙니다. HTML·JavaScript 화면과 EJS 채팅 템플릿을 Express 서버에서 제공합니다.

## 처리 흐름

```text
게시글: Toast UI Editor → HTML 전송 → 허용 태그 필터링 → MS-SQL 저장 프로시저
이미지: 에디터 업로드 훅 → Multer → Sharp 크기 조정·압축 → 이미지 경로 반환
DM:     Socket.IO 방 접속 → 메시지 전송 → 방 참여자에게 전달·DB 저장
```

## 파일 구성

```text
server.js         Express 라우트, 세션, Socket.IO, DB·이미지 처리
index.html        피드와 게시글 작성 화면
login.html        로그인 화면
register.html     회원가입 화면
user.html         사용자 페이지
public/main.js    에디터 초기화, 이미지 업로드, 게시글·화면 연동
views/chat.ejs    실시간 채팅 화면
images/           저장소에 포함된 이미지 자료
```

`config.js`와 `uploads/`의 업로드 파일은 Git 관리 대상에서 제외됩니다.

## 실행 준비

이 저장소에는 DB 접속 설정과 테이블·저장 프로시저 생성 스크립트가 포함되어 있지 않습니다. 원래 DB 구성을 별도로 준비해야 전체 기능을 실행할 수 있습니다.

1. Node.js와 npm을 준비하고 의존성을 설치합니다.

   ```bash
   npm ci
   ```

2. 프로젝트 루트에 `config.js`를 만들고, `mssql`에서 사용할 DB 접속 설정을 내보냅니다. 설정 형태는 `server.js`의 예시 주석을 참고합니다. 실제 접속 정보는 커밋하지 않습니다.
3. MS-SQL에 테이블과 저장 프로시저를 준비합니다. 서버가 사용하는 프로시저에는 `RegisterUser`, `LoginUser`, `GetUserInfo`, `CreatePost`, `GetPost`, `CreateComment`, `GetComment`, `FollowUser`, `Report`, `InsertChatMessage`, `GetChatMessages`, `GetChatList`가 있습니다. 인자와 결과 형식은 `server.js`의 호출부를 기준으로 맞춰야 합니다.
4. 프로젝트 루트에 `uploads` 폴더를 준비하고 서버를 실행합니다.

   ```bash
   node server.js
   ```

5. 브라우저에서 [http://localhost:3000](http://localhost:3000)에 접속합니다.

`npm start` 스크립트는 정의되어 있지 않습니다. `package.json`의 `main` 값 대신 실제 서버 진입점인 `server.js`로 실행합니다.

## 프로젝트 화면

기존 README에 포함된 축제 전시용 SNS 화면입니다.

<img width="1840" alt="Frending SNS 프로젝트 화면" src="https://github.com/kdo9921/GTEC-SNS-frending/assets/21959564/ed1d606e-6a14-43a6-87f8-f6b79dfb5365">

## 확인 범위

이 문서는 공개 소스와 프로젝트 자료를 기준으로 정리했습니다. 문서 정리 과정에서 DB 연결·서비스 실행·외부 이미지 접근을 다시 검증하지 않았습니다. `npm test`는 실제 자동화 테스트가 아닌 기본 오류 종료 스크립트입니다.

## 원본 프로젝트

기존 README와 `package.json`에 연결된 팀 프로젝트 원본: [kdo9921/GTEC-SNS-frending](https://github.com/kdo9921/GTEC-SNS-frending)
