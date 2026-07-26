const blacklist = new Map();
const TOKEN_TTL = 3600000; // 1 hour

setInterval(() => {
    const now = Date.now();
    for (const [token, expiry] of blacklist) {
        if (now > expiry) blacklist.delete(token);
    }
}, 60000); // Clean every minute

module.exports = {
    add(token) {
        blacklist.set(token, Date.now() + TOKEN_TTL);
    },
    has(token) {
        return blacklist.has(token);
    },
    remove(token) {
        blacklist.delete(token);
    },
    clear() {
        blacklist.clear();
    },
};
