// smoke.test.js의 테스트를 Postgres(PGlite) + 모의 Supabase Storage 환경에서 다시 실행한다
process.env.FRENDING_TEST_BACKEND = "supabase";
require("./smoke.test.js");
