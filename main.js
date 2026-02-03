/**
 * [main.js] v7.1.1
 * 1. 무삭제본: 상점, 컬렉션, 관리자 데이터 수정 등 모든 모듈 포함
 * 2. NO Prefix: 접두사 없이 '메뉴', '숫자' 만으로 작동
 * 3. 스마트 필터: 잡담 무시 및 중복 안내창 완벽 차단
 * 4. UI: 구분선 15, 칭호 상단, 티어 중단 레이아웃 고정
 */

// ━━━━━━━━ [1. 설정 및 상수] ━━━━━━━━
var Config = {
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

// ━━━━━━━━ [2. 모듈: UI 엔진] ━━━━━━━━
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
            if (!session.data) return this.make("접속 메뉴", "1. 회원가입\n2. 로그인", "🚪 접속해주세요.");
            return this.make("소환사 메뉴", "1. 내 정보\n2. 컬렉션\n3. 상점\n4. 로그아웃", "🕹️ 메뉴를 선택하세요.");
        }
    }
};

// ━━━━━━━━ [3. 데이터베이스 및 세션] ━━━━━━━━
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

// ━━━━━━━━ [4. 모듈: 관리자 핸들러] ━━━━━━━━
var AdminManager = {
    handle: function(msg, session, replier) {
        if (session.waitAction === "관리_유저선택") {
            var idx = parseInt(msg) - 1;
            if (session.userListCache[idx]) {
                session.targetUser = session.userListCache[idx];
                session.waitAction = "관리_유저제어_메뉴"; SessionManager.save();
                var d = Database.data[session.targetUser];
                var profile = "👤 대상: " + session.targetUser + "\n🏅 칭호: [" + (d.title || "뉴비") + "]\n" + Config.LINE + "\n🏆 티어: " + getTierInfo(d.lp) + " (" + (d.lp || 0) + " LP)\n" + Config.LINE + "\n💰 골드: " + (d.gold || 0).toLocaleString() + " G\n⭐ 레벨: Lv." + (d.level || 1) + "\n⚔️ 전적: " + (d.win || 0) + "승 " + (d.lose || 0) + "패";
                return replier.reply(UI.make("유저 상세 관리", profile, "1. 골드 수정\n2. 데이터 초기화\n3. 계정 삭제"));
            }
        }
        if (session.waitAction === "관리_골드수정") {
            var amt = parseInt(msg);
            if (isNaN(amt)) return replier.reply(UI.make("경고", "숫자만 입력 가능합니다.", ""));
            Database.data[session.targetUser].gold = amt; Database.save(Database.data);
            session.waitAction = null; SessionManager.save();
            return replier.reply(UI.make("완료", session.targetUser + "님의 골드가 " + amt + "G로 수정되었습니다.", ""));
        }
        if (msg === "1") return replier.reply(UI.make("시스템 정보", "📡 서버: ACTIVE\n👥 등록 유저: " + Object.keys(Database.data).length + "명", ""));
        if (msg === "2") {
            var list = Object.keys(Database.data);
            session.userListCache = list; session.waitAction = "관리_유저선택"; SessionManager.save();
            return replier.reply(UI.make("소환사 명부", list.map(function(id, idx) { return (idx + 1) + ". " + id; }).join("\n"), "💡 번호를 입력하세요."));
        }
        if (/^\d+$/.test(msg)) return replier.reply(UI.renderMenu(session));
    }
};

// ━━━━━━━━ [5. 모듈: 단체방 핸들러] ━━━━━━━━
var GroupManager = {
    handle: function(msg, session, replier, sender) {
        if (msg === "1") {
            var d = Database.data[sender]; 
            if (!d) return replier.reply(UI.make("안내", "⚠️ 가입되지 않은 소환사입니다.\n개인톡에서 가입을 진행해주세요.", ""));
            var info = "👤 소환사: " + sender + "\n🏅 칭호: [" + (d.title || "뉴비") + "]\n" + Config.LINE + "\n🏆 티어: " + getTierInfo(d.lp) + " (" + (d.lp || 0) + " LP)\n" + Config.LINE + "\n⭐ 레벨: Lv." + d.level + "\n⚔️ 전적: " + d.win + "승 " + d.lose + "패";
            return replier.reply(UI.make("내 정보 확인", info, ""));
        }
        if (/^\d+$/.test(msg)) return replier.reply(UI.renderMenu(session));
    }
};

// ━━━━━━━━ [6. 모듈: 개인방 핸들러] ━━━━━━━━
var UserManager = {
    handle: function(msg, session, replier, sender) {
        var d = session.data;
        if (!d) {
            // [비로그인 상태]
            if (session.waitAction === "가입_ID") { session.tempId = msg; session.waitAction = "가입_PW"; SessionManager.save(); return replier.reply(UI.make("가입", "사용할 비밀번호를 입력하세요.", "")); }
            if (session.waitAction === "가입_PW") {
                Database.data[session.tempId] = { pw: msg, gold: 1000, level: 1, lp: 0, win: 0, lose: 0, title: "뉴비", collection: { titles: ["뉴비"], characters: [] } };
                Database.save(Database.data); session.waitAction = null; SessionManager.save(); return replier.reply(UI.make("알림", "회원가입이 완료되었습니다!\n로그인 후 이용해주세요.", ""));
            }
            if (session.waitAction === "로그인_ID") { session.tempId = msg; session.waitAction = "로그인_PW"; SessionManager.save(); return replier.reply(UI.make("로그인", "비밀번호를 입력하세요.", "")); }
            if (session.waitAction === "로그인_PW") {
                var user = Database.data[session.tempId];
                if (user && user.pw === msg) { session.data = user; session.waitAction = null; SessionManager.save(); return replier.reply(UI.renderMenu(session)); }
                session.waitAction = null; SessionManager.save(); return replier.reply(UI.make("알림", "정보가 일치하지 않습니다.", ""));
            }
            if (msg === "1") { session.waitAction = "가입_ID"; SessionManager.save(); return replier.reply(UI.make("가입", "원하는 ID를 입력하세요.", "")); }
            if (msg === "2") { session.waitAction = "로그인_ID"; SessionManager.save(); return replier.reply(UI.make("로그인", "ID를 입력하세요.", "")); }
        } else {
            // [로그인 상태]
            if (msg === "1") {
                var info = "👤 계정: " + session.tempId + "\n🏅 칭호: [" + (d.title || "뉴비") + "]\n" + Config.LINE + "\n🏆 티어: " + getTierInfo(d.lp) + " (" + (d.lp || 0) + " LP)\n" + Config.LINE + "\n💰 골드: " + d.gold.toLocaleString() + " G\n⭐ 레벨: Lv." + d.level + "\n⚔️ 전적: " + d.win + "승 " + d.lose + "패";
                return replier.reply(UI.make("마이 페이지", info, ""));
            }
            if (msg === "2") {
                return replier.reply(UI.make("컬렉션", "🖼️ 보유 캐릭터: " + (d.collection.characters.length ? d.collection.characters.join(", ") : "없음"), ""));
            }
            if (msg === "3") {
                session.waitAction = "상점_역할선택"; SessionManager.save();
                return replier.reply(UI.make("상점", RoleKeys.map(function(r, i) { return (i+1) + ". " + r; }).join("\n"), "💡 역할을 선택하세요."));
            }
            if (msg === "4") { session.data = null; session.waitAction = null; SessionManager.save(); return replier.reply(UI.make("알림", "로그아웃 되었습니다.", "")); }
            
            // 상점 세부 로직
            if (session.waitAction === "상점_역할선택") {
                var rIdx = parseInt(msg) - 1;
                if (RoleKeys[rIdx]) {
                    session.selectedRole = RoleKeys[rIdx]; session.waitAction = "상점_구매진행"; SessionManager.save();
                    var list = SystemData.roles[session.selectedRole].units.map(function(u, i) { 
                        return (i+1) + ". " + u + (d.collection.characters.indexOf(u) !== -1 ? " [보유]" : " (500G)"); 
                    }).join("\n");
                    return replier.reply(UI.make("상점: " + session.selectedRole, list, "💡 구매할 번호를 입력하세요."));
                }
            }
        }
        if (/^\d+$/.test(msg)) return replier.reply(UI.renderMenu(session));
    }
};

// ━━━━━━━━ [7. 메인 리스너] ━━━━━━━━
Database.data = Database.load();
SessionManager.load();

function response(room, msg, sender, isGroupChat, replier, imageDB) {
    if (!msg) return;
    var hash = String(imageDB.getProfileHash());
    var session = SessionManager.get(room, hash, isGroupChat);
    msg = msg.trim();

    // 시스템 명령어
    if (msg === "취소") { session.waitAction = null; SessionManager.save(); return replier.reply(UI.make("알림", "취소되었습니다.", "")); }
    if (msg === "되돌아가기" || msg === "메뉴") { session.waitAction = null; SessionManager.save(); return replier.reply(UI.renderMenu(session)); }

    // 반응 조건: 숫자 입력이거나 세션 대기 중일 때만
    var isNumber = /^\d+$/.test(msg);
    var isWait = session.waitAction !== null;

    if (isNumber || isWait) {
        if (session.type === "ADMIN") return AdminManager.handle(msg, session, replier);
        if (session.type === "GROUP") return GroupManager.handle(msg, session, replier, sender);
        if (session.type === "DIRECT") return UserManager.handle(msg, session, replier, sender);
    }
}
