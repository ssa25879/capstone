// DATABASE_URL이 있으면 Postgres(Supabase), 없으면 로컬 SQLite를 사용한다.
// 두 모듈은 같은 함수 이름을 제공하며, 호출하는 쪽은 항상 await로 사용한다.
module.exports = process.env.DATABASE_URL ? require("./postgres") : require("./sqlite");
