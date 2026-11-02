// 비밀번호 해시 (scrypt, salt 포함) - SQLite·Postgres 공용
const crypto = require("crypto");

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
    const [salt, hash] = stored.split(":");
    const candidate = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(candidate, Buffer.from(hash, "hex"));
}

module.exports = { hashPassword, verifyPassword };
