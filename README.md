# GTEC-SNS-frending
학교 축제 전시용 SNS 사이트

마크다운을 활용하는 SNS

교수님, "축제때 이런거 만들어서 만들어서 전시해봐라" 까지는 좋은데 그걸 축제 10일 전에 말씀 주시면 어떻합니까ㅠㅠ 

<img width="1840" alt="스크린샷 2023-05-30 오후 10 13 51" src="https://github.com/kdo9921/GTEC-SNS-frending/assets/21959564/ed1d606e-6a14-43a6-87f8-f6b79dfb5365">

## 로컬 실행

외부 DB 없이 SQLite 파일(`data/frending.db`)로 동작합니다. Node.js 22.13 이상이 필요합니다.

```bash
npm install
npm run seed   # 데모 데이터 추가 (계정: frend_dev / green_tea / node_lover, 비밀번호: demo1234)
npm start      # http://localhost:3000 에서 실행, Ctrl+C로 종료
npm test       # 스모크 테스트
```

| 환경 변수 | 기본값 | 설명 |
|---|---|---|
| `PORT` | `3000` | 서버 포트 |
| `DB_PATH` | `data/frending.db` | SQLite 파일 경로 |
| `UPLOAD_DIR` | `uploads/` | 업로드 이미지 저장 폴더 |
| `SESSION_SECRET` | 실행 시 무작위 생성 | 지정하면 재시작해도 로그인이 유지됩니다 |

데이터를 초기화하려면 서버를 끈 뒤 `data/` 폴더를 지우고 `npm run seed`를 다시 실행합니다.
