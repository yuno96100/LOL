/**
 * [main.js] v7.0.2
 * 모든 요청 사항(칭호 복구, 티어 중단 배치, 구분선 15, 입력 필터링)이 통합된 최종본입니다.
 */

var Config = {
    Prefix: ".",
    AdminHash: "2056407147",      
    AdminRoom: "소환사의협곡관리",   
    GroupRoom: "소환사의협곡",     
    BotName: "소환사의 협곡",
    DB_PATH: "/sdcard/msgbot/Bots/main/database.json",
    SESSION_PATH: "/sdcard/msgbot/Bots/main/sessions.json",
    LINE_CHAR: "━",
    LINE_LEN: 15, 
    get LINE() {
        var line = "";
        for(var i=0; i<this.LINE_LEN; i++) line += this.LINE_CHAR;
        return line;
    },
    NAV: "\n\n🔙 되돌아가기 | ❌ 취소 | 🏠 메뉴"
};

var TierData = [
    { name: "챌린저", icon: "✨", minLp: 3000 },
    { name: "그랜드마스터", icon: "🔴", minLp: 2500 },
    { name: "마스터", icon: "🟣", minLp: 2000 },
    { name: "다이아몬드", icon: "💎", minLp: 1700 },
    { name: "에메랄드", icon: "💚", minLp: 1400 },
    { name: "플래티넘", icon: "💿", minLp: 1100 },
    { name: "골드", icon: "🟡", minLp: 800 },
    { name: "실버", icon: "⚪", minLp: 500 },
    { name: "브론즈", icon: "🟤", minLp: 200 },
    { name: "아이언", icon: "⚫", minLp: 0 }
];

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

var RoleKeys = Object.keys(SystemData.roles);

function getTierInfo(lp) {
    lp = lp || 0;
    for (var i = 0; i < TierData.length; i++) {
        if (lp >= TierData[i].minLp) return TierData[i].icon + " " + TierData[i].name;
    }
    return "⚫ 아이언";
}

function calculateWinRate(win, lose) {
    var total = win + lose;
    return total === 0 ? "0.0" : ((win / total) * 100).toFixed(1);
}

var UI = {
    make: function(title, content, help) {
        var line = Config.LINE;
        var base = "『 " + title + " 』\n" + line + "\n" + content + "\n" + line;
        if (help) base += "\n" + help;
        base += Config.NAV;
        return base;
    },
    renderMenu: function(session) {
        if (session.type === "ADMIN") return this.make("관리자 메뉴", "1. 시스템 정보\n2. 유저 관리", "⚙️ 관제 모드");
        if (session.type === "GROUP") return this.make("메인 메뉴", "1. 내 정보 확인", "⚔️ 협곡 광장");
        if (session.type === "DIRECT") {
            if (!session.data) return this.make("접속 메뉴", "1. 회원가입\n2. 로그인", "🚪 로그인이 필요합니다.");
            return this.make("소환사 메뉴", "1. 내 정보\n2. 컬렉션\n3. 상점\n4. 로그아웃", "🕹️ 메뉴를 선택하세요.");
        }
    }
};

var Utils = {
    isMenuInput: function(msg) {
        return /^\d+$/.test(msg) || ["메뉴", "취소", "되돌아가기"].indexOf(msg) !== -1;
    }
};

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
            this.sessions[hash] = { data: null, waitAction: null, tempId: null, userListCache: [], targetUser: null, selectedRole: null, editTargetField: null };
        }
        var s = this.sessions[hash];
        if (room === Config.AdminRoom) s.type = "ADMIN";
        else if (isGroupChat && room === Config.GroupRoom) s.type = "GROUP";
        else if (!isGroupChat) s.type = "DIRECT";
        else s.type = "OTHER";
        return s;
    }
};

var AdminManager = {
    handle: function(msg, session, replier) {
        if (session.waitAction === "관리_유저선택") {
            var idx = parseInt(msg) - 1;
            if (session.userListCache[idx]) {
                session.targetUser = session.userListCache[idx];
                session.waitAction = "관리_유저제어_메뉴";
                SessionManager.save();
                var d = Database.data[session.targetUser];
                var profile = "👤 대상: " + session.targetUser + "\n🏅 칭호: [" + (d.title || "뉴비") + "]\n" + Config.LINE + "\n🏆 티어: " + getTierInfo(d.lp) + " (" + (d.lp || 0) + " LP)\n" + Config.LINE + "\n💰 골드: " + (d.gold || 0).toLocaleString() + " G\n⭐ 레벨: Lv." + (d.level || 1) + "\n⚔️ 전적: " + (d.win || 0) + "승 " + (d.lose || 0) + "패";
                return replier.reply(UI.make("유저 상세 관리", profile, "1. 데이터 수정\n2. 데이터 초기화\n3. 계정 삭제"));
            }
        }
        if (msg === "1") return replier.reply(UI.make("시스템 정보", "📡 서버: ACTIVE\n👥 등록: " + Object.keys(Database.data).length + "명", ""));
        if (msg === "2") {
            var list = Object.keys(Database.data);
            session.userListCache = list; session.waitAction = "관리_유저선택"; SessionManager.save();
            return replier.reply(UI.make("소환사 명부", list.map(function(id, idx) { return (idx + 1) + ". " + id; }).join("\n"), "💡 번호 입력"));
        }
    }
};

var GroupManager = {
    handle: function(msg, session, replier, sender) {
        if (msg === "1") {
            var d = Database.data[sender]; 
            if (!d) return replier.reply(UI.make("안내", "⚠️ 개인톡에서 가입을 진행해주세요.", ""));
            var info = "👤 소환사: " + sender + "\n🏅 칭호: [" + (d.title || "뉴비") + "]\n" + Config.LINE + "\n🏆 티어: " + getTierInfo(d.lp) + " (" + (d.lp || 0) + " LP)\n" + Config.LINE + "\n⭐ 레벨: Lv." + d.level + "\n⚔️ 전적: " + d.win + "승 " + d.lose + "패";
            return replier.reply(UI.make("내 정보 확인", info, ""));
        }
    }
};

var UserManager = {
    handle: function(msg, session, replier, sender) {
        var d = session.data;
        if (!d) {
            if (session.waitAction === "가입_ID") { session.tempId = msg; session.waitAction = "가입_PW"; SessionManager.save(); return replier.reply(UI.make("가입", "비밀번호를 입력하세요.", "")); }
            if (session.waitAction === "가입_PW") {
                Database.data[session.tempId] = { pw: msg, gold: 1000, level: 1, lp: 0, win: 0, lose: 0, title: "뉴비", collection: { titles: ["뉴비"], characters: [] } };
                Database.save(Database.data); session.waitAction = null; SessionManager.save(); return replier.reply(UI.make("알림", "회원가입 완료!", ""));
            }
            if (session.waitAction === "로그인_ID") { session.tempId = msg; session.waitAction = "로그인_PW"; SessionManager.save(); return replier.reply(UI.make("로그인", "비밀번호를 입력하세요.", "")); }
            if (session.waitAction === "로그인_PW") {
                var user = Database.data[session.tempId];
                if (user && user.pw === msg) { session.data = user; session.waitAction = null; SessionManager.save(); return replier.reply(UI.renderMenu(session)); }
                session.waitAction = null; SessionManager.save(); return replier.reply(UI.make("알림", "로그인 정보가 틀립니다.", ""));
            }
            if (msg === "1") { session.waitAction = "가입_ID"; SessionManager.save(); return replier.reply(UI.make("가입", "ID를 입력하세요.", "")); }
            if (msg === "2") { session.waitAction = "로그인_ID"; SessionManager.save(); return replier.reply(UI.make("로그인", "ID를 입력하세요.", "")); }
        } else {
            if (msg === "1") {
                var info = "👤 계정: " + session.tempId + "\n🏅 칭호: [" + (d.title || "뉴비") + "]\n" + Config.LINE + "\n🏆 티어: " + getTierInfo(d.lp) + " (" + (d.lp || 0) + " LP)\n" + Config.LINE + "\n💰 골드: " + d.gold.toLocaleString() + " G\n⭐ 레벨: Lv." + d.level + "\n⚔️ 전적: " + d.win + "승 " + d.lose + "패";
                return replier.reply(UI.make("마이 페이지", info, ""));
            }
            if (msg === "4") { session.data = null; session.waitAction = null; SessionManager.save(); return replier.reply(UI.make("알림", "로그아웃 되었습니다.", "")); }
        }
        if (Utils.isMenuInput(msg)) return replier.reply(UI.renderMenu(session));
    }
};

Database.data = Database.load();
SessionManager.load();

function response(room, msg, sender, isGroupChat, replier, imageDB) {
    if (!msg) return;
    var hash = String(imageDB.getProfileHash());
    var session = SessionManager.get(room, hash, isGroupChat);
    msg = msg.trim();

    if (msg === "취소") { session.waitAction = null; SessionManager.save(); return replier.reply(UI.make("알림", "명령 취소", "")); }
    if (msg === "되돌아가기" || msg === "메뉴") { session.waitAction = null; SessionManager.save(); return replier.reply(UI.renderMenu(session)); }

    if (session.type === "DIRECT" && !session.data && !session.waitAction && msg !== "메뉴" && !/^[12]$/.test(msg)) return;
    if (!session.waitAction && !Utils.isMenuInput(msg)) return;

    if (session.type === "ADMIN") return AdminManager.handle(msg, session, replier);
    if (session.type === "GROUP") return GroupManager.handle(msg, session, replier, sender);
    if (session.type === "DIRECT") return UserManager.handle(msg, session, replier, sender);
}
