/**
 * [main.js] v6.8.7
 * 1. UI 일관성: 모든 메시지에 UI.make() 적용 및 하단 공통 네비게이션 안내
 * 2. 하단 메뉴: 🔙 되돌아가기 | ❌ 취소 | 🏠 메뉴 기능 상시 포함
 * 3. 통합 관리: 관리자, 단체톡, 개인톡 로직 전체 포함
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
    LINE: "ㅡㅡㅡㅡㅡㅡㅡ",
    NAV: "\n\n🔙 되돌아가기 | ❌ 취소 | 🏠 메뉴"
};

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

function calculateWinRate(win, lose) {
    var total = win + lose;
    return total === 0 ? "0.0" : ((win / total) * 100).toFixed(1);
}

// ━━━━━━━━ [2. 모듈: UI 엔진] ━━━━━━━━
var UI = {
    make: function(title, content, help) {
        var base = "『 " + title + " 』\n" + Config.LINE + "\n" + content + "\n" + Config.LINE;
        if (help) base += "\n" + help;
        base += Config.NAV;
        return base;
    },
    renderMenu: function(session) {
        if (session.type === "ADMIN") return this.make("관리자 메뉴", "1. 시스템 정보\n2. 유저 관리", "💡 관리자 전용 관제 모드입니다.");
        if (session.type === "GROUP") return this.make("메인 메뉴", "1. 내 정보 확인", "💡 단체톡방 전용 메뉴입니다.");
        if (session.type === "DIRECT") {
            if (!session.data) return this.make("메인 메뉴", "1. 회원가입\n2. 로그인", "💡 가입 후 소환사의 협곡에 참여하세요.");
            return this.make("메인 메뉴", "1. 내 정보\n2. 컬렉션\n3. 상점\n4. 로그아웃", "💡 원하시는 항목을 선택하세요.");
        }
        return this.make("알림", "등록되지 않은 방입니다.", "");
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
                return replier.reply(UI.make("유저 관제", profile, "1. 골드 초기화\n2. 계정 삭제"));
            }
        }
        
        if (session.waitAction === "관리_유저제어") {
            if (msg === "1") { Database.data[session.targetUser].gold = 0; Database.save(Database.data); session.waitAction = null; return replier.reply(UI.make("알림", "골드 초기화 완료", "")); }
            if (msg === "2") { delete Database.data[session.targetUser]; Database.save(Database.data); session.waitAction = null; return replier.reply(UI.make("알림", "계정 삭제 완료", "")); }
        }

        if (msg === "1") return replier.reply(UI.make("시스템 정보", "📡 서버: ACTIVE\n👥 유저: " + Object.keys(Database.data).length + "명", ""));
        if (msg === "2") {
            var list = Object.keys(Database.data);
            if (list.length === 0) return replier.reply(UI.make("알림", "등록된 유저가 없습니다.", ""));
            session.userListCache = list;
            session.waitAction = "관리_유저선택";
            SessionManager.save();
            return replier.reply(UI.make("유저 목록", list.map(function(id, idx) { return (idx + 1) + ". " + id; }).join("\n"), "💡 관리할 유저 번호를 입력하세요."));
        }
        return replier.reply(UI.renderMenu(session));
    }
};

// ━━━━━━━━ [5. 모듈: 단체톡방 로직] ━━━━━━━━
var GroupManager = {
    handle: function(msg, session, replier, sender) {
        if (msg === "1") {
            var d = Database.data[sender]; 
            if (!d) return replier.reply(UI.make("안내", "⚠️ 가입 정보가 없습니다.", "📌 이용 방법:\n1. 봇에게 개인톡을 보냅니다.\n2. 현재 닉네임[" + sender + "]과 똑같은 ID로 가입하세요."));
            
            var info = "👤 닉네임: " + sender + "\n🏅 칭호: [" + d.title + "]\n⭐ 레벨: Lv." + d.level + "\n⚔️ 전적: " + d.win + "승 " + d.lose + "패\n💰 보유 골드: " + d.gold.toLocaleString() + " G";
            return replier.reply(UI.make("내 정보 확인", info, "🏠 광장 메인 메뉴로 돌아가려면 '메뉴' 입력"));
        }
        return replier.reply(UI.renderMenu(session));
    }
};

// ━━━━━━━━ [6. 모듈: 개인톡방 로직] ━━━━━━━━
var UserManager = {
    handle: function(msg, session, replier, sender) {
        var d = session.data;
        if (!d) {
            if (session.waitAction === "가입_ID") { session.tempId = msg; session.waitAction = "가입_PW"; SessionManager.save(); return replier.reply(UI.make("가입", "비밀번호를 입력하세요.", "🔑 보안을 위해 정확히 입력하세요.")); }
            if (session.waitAction === "가입_PW") {
                Database.data[session.tempId] = { pw: msg, gold: 1000, level: 1, exp: 0, win: 0, lose: 0, title: "뉴비", collection: { titles: ["뉴비"], characters: [] } };
                Database.save(Database.data); session.waitAction = null; SessionManager.save(); return replier.reply(UI.make("알림", "회원가입 완료!", "이제 로그인을 진행해주세요."));
            }
            if (session.waitAction === "로그인_ID") { session.tempId = msg; session.waitAction = "로그인_PW"; SessionManager.save(); return replier.reply(UI.make("로그인", "비밀번호를 입력하세요.", "🔐 계정 보안을 확인합니다.")); }
            if (session.waitAction === "로그인_PW") {
                var user = Database.data[session.tempId];
                if (user && user.pw === msg) { session.data = user; session.waitAction = null; SessionManager.save(); return replier.reply(UI.renderMenu(session)); }
                return replier.reply(UI.make("알림", "로그인 실패!", "정보를 다시 확인해주세요."));
            }
            if (msg === "1") { session.waitAction = "가입_ID"; SessionManager.save(); return replier.reply(UI.make("가입", "사용할 ID를 입력하세요.", "👤 닉네임과 동일하게 만드는 것을 권장합니다.")); }
            if (msg === "2") { session.waitAction = "로그인_ID"; SessionManager.save(); return replier.reply(UI.make("로그인", "ID를 입력하세요.", "🔐 등록된 정보를 입력하세요.")); }
        } else {
            if (session.waitAction === "상점_구매진행") {
                var roleData = SystemData.roles[session.selectedRole];
                var cIdx = parseInt(msg) - 1;
                if (roleData && roleData.units[cIdx]) {
                    var targetName = roleData.units[cIdx];
                    if (d.collection.characters.indexOf(targetName) !== -1) return replier.reply(UI.make("상점", "이미 보유한 캐릭터입니다.", ""));
                    if (d.gold < 500) return replier.reply(UI.make("상점", "골드가 부족합니다.", ""));
                    d.gold -= 500; d.collection.characters.push(targetName); Database.save(Database.data);
                    return replier.reply(UI.make("구매 완료", targetName + "을 영입했습니다!", "💰 잔액: " + d.gold.toLocaleString() + " G"));
                }
            }
            if (session.waitAction === "상점_역할선택") {
                var rIdx = parseInt(msg) - 1;
                if (RoleKeys[rIdx]) {
                    session.selectedRole = RoleKeys[rIdx]; session.waitAction = "상점_구매진행"; SessionManager.save();
                    var list = SystemData.roles[session.selectedRole].units.map(function(u, i) { return (i+1) + ". " + u + (d.collection.characters.indexOf(u) !== -1 ? " [보유]" : " (500G)"); }).join("\n");
                    return replier.reply(UI.make("상점: " + session.selectedRole, list, "💡 번호를 입력하여 구매하세요."));
                }
            }

            if (msg === "1") return replier.reply(UI.make("내 정보", "👤 ID: " + session.tempId + "\n💰 골드: " + d.gold.toLocaleString() + " G\n⭐ 레벨: Lv." + d.level, ""));
            if (msg === "2") { session.lastMenu = "COLLECTION"; SessionManager.save(); return replier.reply(UI.make("컬렉션", "1. 보유 칭호\n2. 보유 캐릭터", "🏆 수집 현황입니다.")); }
            if (msg === "3") { session.waitAction = "상점_역할선택"; SessionManager.save(); return replier.reply(UI.make("상점", RoleKeys.map(function(r, i) { return (i+1) + ". " + r; }).join("\n"), "💡 역할군을 선택하세요.")); }
            if (msg === "4") { session.data = null; session.lastMenu = null; session.waitAction = null; SessionManager.save(); return replier.reply(UI.make("알림", "로그아웃 되었습니다.", "👋 이용해주셔서 감사합니다.")); }
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

    if (msg === "취소") { session.waitAction = null; SessionManager.save(); return replier.reply(UI.make("알림", "명령이 취소되었습니다.", "")); }
    if (msg === "되돌아가기") { session.waitAction = null; SessionManager.save(); return replier.reply(UI.renderMenu(session)); }
    if (msg === "메뉴") { session.waitAction = null; session.lastMenu = null; SessionManager.save(); return replier.reply(UI.renderMenu(session)); }

    if (session.type === "ADMIN") return AdminManager.handle(msg, session, replier);
    if (session.type === "GROUP") return GroupManager.handle(msg, session, replier, sender);
    if (session.type === "DIRECT") return UserManager.handle(msg, session, replier, sender);
}
