// 업로드 이미지 저장소
// SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY가 있으면 Supabase Storage(공개 버킷)에 저장하고,
// 없으면 로컬 uploads 폴더를 그대로 사용한다.
// service_role 키는 서버 환경 변수에만 두고 클라이언트로 보내지 않는다.
const fs = require("fs");
const path = require("path");

const baseUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_BUCKET || "uploads";
const enabled = Boolean(baseUrl && serviceKey);

const contentTypes = { ".jpg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp" };

function headers(extra = {}) {
    return { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey, ...extra };
}

// 버킷이 없으면 공개 버킷으로 만든다 (이미지 형식·20MB 제한)
async function ensureBucket() {
    const res = await fetch(`${baseUrl}/storage/v1/bucket`, {
        method: "POST",
        headers: headers({ "Content-Type": "application/json" }),
        body: JSON.stringify({
            id: bucket,
            name: bucket,
            public: true,
            file_size_limit: 20 * 1024 * 1024,
            allowed_mime_types: Object.values(contentTypes),
        }),
    });
    if (!res.ok) {
        const body = await res.text();
        if (!body.includes("already exists") && !body.includes("Duplicate")) {
            throw new Error(`Supabase Storage 버킷 생성 실패 (${res.status}): ${body}`);
        }
    }
}

// 로컬에 처리된 이미지를 버킷에 올리고 로컬 파일은 삭제한다
async function save(localPath, name) {
    const res = await fetch(`${baseUrl}/storage/v1/object/${bucket}/${encodeURIComponent(name)}`, {
        method: "POST",
        headers: headers({ "Content-Type": contentTypes[path.extname(name)] || "application/octet-stream" }),
        body: await fs.promises.readFile(localPath),
    });
    if (!res.ok) {
        throw new Error(`Supabase Storage 업로드 실패 (${res.status}): ${await res.text()}`);
    }
    await fs.promises.unlink(localPath);
}

function publicUrl(name) {
    return `${baseUrl}/storage/v1/object/public/${bucket}/${encodeURIComponent(name)}`;
}

module.exports = { enabled, ensureBucket, save, publicUrl };
