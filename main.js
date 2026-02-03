/**
 * [main.js] v6.8.5
 * 1. 문구 수정: 개인톡방 가입 단계에서 닉네임 관련 권장 문구 삭제
 * 2. 일관성: 모든 방 메뉴 타이틀 『 메인 메뉴 』 유지
 * 3. 로직: 단체톡방 미가입 유저 대상 닉네임 일치 안내는 유지
 */

// ━━━━━━━━ [1. 설정 및 상수] ━━━━━━━━
var Config = {
    Prefix: ".",
    AdminHash: "2056407147",      
    AdminRoom: "소환사의협곡관리",   
    GroupRoom: "소환사의협곡",     
    BotName: "소환사의 협곡",
    DB_PATH: "/sdcard/msgbot/Bots/main/database.json",
    SESSION_PATH: "/sdcard/msgbot/Bots/main/sessions.json",
    LINE: "━━━━━━━━━━━━━━━━",
    CHAR_PRICE: 500 
};

// ... (SystemData 및 유틸 함수 v6.8.4와 동일)
var SystemData = {
    roles: {
        "탱커": { icon: "🛡️", units: ["알리스타", "말파이트", "레오나"] },
        "전사": { icon: "⚔️", units: ["가렌", "다리우스", "잭스"] },
        "암살자": { icon: "🗡️", units: ["제드", "카타리나", "탈론"] },
        "마법사": { icon: "🔮", units: ["럭스", "아리", "빅토르"] },
        "원거리딜러": { icon: "🏹", units: ["애쉬", "베인", "카이사"] },
        "서포터": { icon: "✨", units: ["소라카", "유미", "쓰레쉬"] }
    }
};

function calculateWinRate(win, lose) {
    var total = win + lose;
    return total === 0 ? "0.0" : ((win / total) * 100).toFixed(1);
}

// ━━━━━━━━ [2. 모듈: UI 엔진] ━━━━━━━━
var UI = {
    make: function(title, content, help) {
        var base = "『 " + title + " 』\n" + Config.LINE + "\n" + content + "\n" + Config.LINE;
        if (help) base += "\n" + help;
        return base;
    },
    renderMenu: function(session) {
        if (session.type === "ADMIN") return this.make("관리자 메뉴", "1. 시스템 정보\n2. 유저 관리", "💡 번호를 입력하세요.");
        if (session.type === "GROUP") return this.make("메인 메뉴", "1. 내 정보 확인", "💡 다른 기능은 준비 중입니다.");
        if (session.type === "DIRECT") {
            if (!session.data) return this.make("메인 메뉴", "1. 회원가입\n2. 로그인", "💡 가입 후 이용 가능합니다.");
            return this.make("메인 메뉴", "1. 내 정보\n2. 컬렉션\n3. 상점\n4. 로그아웃", "💡 항목을 선택하세요.");
        }
        return this.make("알림", "등록되지 않은 방입니다.");
    }
};

// ━━━━━━━━ [3. 데이터베이스 및 세션 매니저] ━━━━━━━━
var Database = {
    data: {},
    load: function() {
        var file = new java.io.File(Config.DB_PATH);
        if (!file.exists()) return {};
        try { return JSON.parse(FileStream.read(Config.DB_PATH)); } catch(e) { return {}; }
    },
    save: function(data) {
        this.data = data;
        new java.lang.Thread(function() {
            try { FileStream.write(Config.DB_PATH, JSON.stringify(data, null, 4)); } catch (e) {}
        }).start();
    }
};

var SessionManager = {
    sessions: {},
    load: function() {
        var file = new java.io.File(Config.SESSION_PATH);
        if (!file.exists()) return;
        try { this.sessions = JSON.parse(FileStream.read(Config.SESSION_PATH)); } catch(e) { this.sessions = {}; }
    },
    save: function() {
        var data = this.sessions;
        new java.lang.Thread(function() {
            try { FileStream.write(Config.SESSION_PATH, JSON.stringify(data)); } catch (e) {}
        }).start();
    },
    get: function(room, hash, isGroupChat) {
        if (!this.sessions[hash]) {
            this.sessions[hash] = { data: null, waitAction: null, tempId: null, userListCache: [], targetUser: null, lastMenu: null, selectedRole: null };
        }
        var s = this.sessions[hash];
        if (room === Config.AdminRoom) s.type = "ADMIN";
        else if (isGroupChat && room === Config.GroupRoom) s.type = "GROUP";
        else if (!isGroupChat) s.type = "DIRECT";
        else s.type = "OTHER";
        return s;
    }
};

// ━━━━━━━━ [4. 모듈: 관리자 로직] ━━━━━━━━
var AdminManager = {
    handle: function(msg, session, replier) {
        if (session.waitAction === "관리_유저선택") {
            var idx = parseInt(msg) - 1;
            if (session.userListCache[idx]) {
                session.targetUser = session.userListCache[idx];
                var d = Database.data[session.targetUser];
                session.waitAction = "관리_유저제어";
                var profile = "👤 대상: " + session.targetUser + "\n💰 골드: " + d.gold.toLocaleString() + " G";
                SessionManager.save();
                return replier.reply(UI.make("유저 관제", profile, "1. 골드 초기화\n2. 계정 삭제\n🔙 돌아가기"));
            }
        }
        if (msg === "1") return replier.reply(UI.make("시스템 정보", "📡 서버: ACTIVE\n👥 유저: " + Object.keys(Database.data).length + "명"));
        if (msg === "2") {
            var list = Object.keys(Database.data);
            session.userListCache = list;
            session.waitAction = "관리_유저선택";
            SessionManager.save();
            return replier.reply(UI.make("유저 목록", list.map(function(id, idx) { return (idx + 1) + ". " + id; }).join("\n"), "🔙 돌아가기"));
        }
        return replier.reply(UI.renderMenu(session));
    }
};

// ━━━━━━━━ [5. 모듈: 단체톡방 전용 로직] ━━━━━━━━
var GroupManager = {
    handle: function(msg, session, replier, sender) {
        if (msg === "1") {
            var d = Database.data[sender]; 
            if (!d) {
                return replier.reply(UI.make("안내", "⚠️ 가입 정보가 없습니다.", "📌 이용 방법:\n1. 봇에게 개인톡을 보냅니다.\n2. 회원가입 시 [현재 채팅방 닉네임]과 똑같은 ID로 가입하세요.\n\n현재 닉네임: " + sender));
            }
            var info = "👤 닉네임: " + sender + "\n🏅 칭호: [" + d.title + "]\n" + Config.LINE + "\n⭐ 레벨: Lv." + d.level + "\n⚔️ 전적: " + d.win + "승 " + d.lose + "패 (" + calculateWinRate(d.win, d.lose) + "%)\n💰 보유 골드: " + d.gold.toLocaleString() + " G";
            return replier.reply(UI.make("내 정보 확인", info, "🔙 메뉴"));
        }
        return replier.reply(UI.renderMenu(session));
    }
};

// ━━━━━━━━ [6. 모듈: 개인톡방 전용 로직 (UserManager)] ━━━━━━━━
var UserManager = {
    handle: function(msg, session, replier, sender) {
        var d = session.data;
        if (!d) {
            if (session.waitAction === "가입_ID") { session.tempId = msg; session.waitAction = "가입_PW"; SessionManager.save(); return replier.reply("비밀번호를 입력하세요."); }
            if (session.waitAction === "가입_PW") {
                Database.data[session.tempId] = { pw: msg, gold: 1000, level: 1, exp: 0, win: 0, lose: 0, title: "뉴비", collection: { titles: ["뉴비"], characters: [] } };
                Database.save(Database.data); session.waitAction = null; SessionManager.save(); return replier.reply("회원가입 완료!");
            }
            if (session.waitAction === "로그인_ID") { session.tempId = msg; session.waitAction = "로그인_PW"; SessionManager.save(); return replier.reply("비밀번호를 입력하세요."); }
            if (session.waitAction === "로그인_PW") {
                var user = Database.data[session.tempId];
                if (user && user.pw === msg) { session.data = user; session.waitAction = null; SessionManager.save(); return replier.reply(UI.renderMenu(session)); }
                return replier.reply("로그인 실패!");
            }
            if (msg === "1") { session.waitAction = "가입_ID"; return replier.reply("사용할 ID를 입력하세요."); } // 불필요한 안내 문구 삭제됨
            if (msg === "2") { session.waitAction = "로그인_ID"; return replier.reply("ID를 입력하세요."); }
        } else {
            if (msg === "1") return replier.reply(UI.make("내 정보 상세", "👤 " + session.tempId + "\n💰 " + d.gold.toLocaleString() + " G", "🔙 메뉴"));
            if (msg === "2") { session.lastMenu = "COLLECTION"; SessionManager.save(); return replier.reply(UI.make("컬렉션", "1. 보유 칭호\n2. 보유 캐릭터", "🔙 메뉴")); }
            if (msg === "3") { session.lastMenu = "SHOP"; SessionManager.save(); return replier.reply(UI.make("상점", "1. 캐릭터 구매", "🔙 메뉴")); }
            if (msg === "4") { session.data = null; session.lastMenu = null; SessionManager.save(); return replier.reply("로그아웃 되었습니다."); }
        }
        return replier.reply(UI.renderMenu(session));
    }
};

// ━━━━━━━━ [7. 메인 응답 핸들러] ━━━━━━━━
Database.data = Database.load();
SessionManager.load();

function response(room, msg, sender, isGroupChat, replier, imageDB) {
    if (!msg) return;
    var hash = String(imageDB.getProfileHash());
    var session = SessionManager.get(room, hash, isGroupChat);
    msg = msg.trim();

    if (msg === "취소") { session.waitAction = null; session.lastMenu = null; SessionManager.save(); return replier.reply("취소되었습니다."); }
    if (msg === "메뉴" || msg === "돌아가기") { session.waitAction = null; session.lastMenu = null; SessionManager.save(); return replier.reply(UI.renderMenu(session)); }

    if (session.type === "ADMIN") return AdminManager.handle(msg, session, replier);
    if (session.type === "GROUP") return GroupManager.handle(msg, session, replier, sender);
    if (session.type === "DIRECT") return UserManager.handle(msg, session, replier, sender);
}
