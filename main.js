/**
 * [main.js] v7.1.9
 * 1. 로직 우선순위 교정: 컬렉션/상점 조작이 일반 메뉴(1~4)보다 먼저 체크됨
 * 2. 상점 복구: 역할 선택 및 캐릭터 구매 로직 정상 작동 확인
 * 3. 일반 대화 유지: 메뉴 조작 중이 아닐 때는 봇이 반응하지 않음
 */

// ... (Config, TierData, SystemData 등 설정부 v6.9.9와 동일)
var Config = {
    Prefix: ".",
    AdminHash: "2056407147",      
    AdminRoom: "소환사의협곡관리",   
    GroupRoom: "소환사의협곡",     
    BotName: "소환사의 협곡",
    DB_PATH: "/sdcard/msgbot/Bots/main/database.json",
    SESSION_PATH: "/sdcard/msgbot/Bots/main/sessions.json",
    LINE_CHAR: "━",
    LINE_LEN: 12, 
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
        if (session.type === "ADMIN") return this.make("관리자 메뉴", "1. 시스템 정보\n2. 유저 관리", "⚙️ 시스템 관제 중");
        if (session.type === "GROUP") return this.make("메인 메뉴", "1. 내 정보 확인", "⚔️ 소환사의 협곡");
        if (session.type === "DIRECT") {
            if (!session.data) return this.make("메인 메뉴", "1. 회원가입\n2. 로그인", "🚪 접속해주세요.");
            return this.make("메인 메뉴", "1. 내 정보\n2. 컬렉션\n3. 상점\n4. 로그아웃", "🕹️ 메뉴 선택");
        }
        return this.make("알림", "등록되지 않은 방입니다.", "");
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
            this.sessions[hash] = { data: null, waitAction: null, tempId: null, userListCache: [], targetUser: null, lastMenu: null, selectedRole: null, editTargetField: null };
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
                session.waitAction = "관리_유저제어_메뉴";
                SessionManager.save();
                var d = Database.data[session.targetUser];
                var profile = "👤 대상: " + session.targetUser + "\n🏅 칭호: [" + (d.title || "뉴비") + "]\n" + Config.LINE + "\n🏆 티어: " + getTierInfo(d.lp) + " (" + (d.lp || 0) + " LP)\n" + Config.LINE + "\n💰 골드: " + (d.gold || 0).toLocaleString() + " G\n⭐ 레벨: Lv." + (d.level || 1) + "\n⚔️ 전적: " + (d.win || 0) + "승 " + (d.lose || 0) + "패";
                replier.reply(UI.make("유저 상세 관리", profile, "1. 데이터 수정\n2. 데이터 초기화\n3. 계정 삭제"));
                return true;
            }
        }
        if (session.waitAction === "관리_유저제어_메뉴") {
            if (msg === "1") { session.waitAction = "관리_항목선택_수정"; SessionManager.save(); replier.reply(UI.make("수정 항목 선택", "1. 골드\n2. 레벨\n3. 승수\n4. 패수\n5. LP(점수)", "")); return true; }
            if (msg === "2") { session.waitAction = "관리_항목선택_초기화"; SessionManager.save(); replier.reply(UI.make("초기화 항목 선택", "1. 골드\n2. 레벨(1)\n3. 전적(0승0패)\n4. 전체 초기화", "")); return true; }
            if (msg === "3") { session.waitAction = "관리_삭제확인"; SessionManager.save(); replier.reply(UI.make("경고", "해당 유저를 삭제하시겠습니까?", "'네' 입력 시 삭제됩니다.")); return true; }
        }
        if (session.waitAction === "관리_항목선택_수정") {
            var fields = ["gold", "level", "win", "lose", "lp"];
            var targetIdx = parseInt(msg) - 1;
            if (fields[targetIdx]) { session.editTargetField = fields[targetIdx]; session.waitAction = "관리_수정값입력"; SessionManager.save(); replier.reply(UI.make("수정값 입력", "현재 값: " + (Database.data[session.targetUser][fields[targetIdx]] || 0), "숫자를 입력하세요.")); return true; }
        }
        if (session.waitAction === "관리_수정값입력") {
            var newVal = parseInt(msg);
            if (isNaN(newVal)) return true;
            Database.data[session.targetUser][session.editTargetField] = newVal;
            Database.save(Database.data);
            session.waitAction = "관리_유저제어_메뉴"; SessionManager.save();
            replier.reply(UI.make("완료", "데이터가 변경되었습니다.", "")); return true;
        }
        if (session.waitAction === "관리_삭제확인" && msg === "네") {
            delete Database.data[session.targetUser]; Database.save(Database.data);
            session.waitAction = null; SessionManager.save(); replier.reply(UI.make("완료", "삭제되었습니다.", "")); return true;
        }
        if (msg === "1") { replier.reply(UI.make("시스템 정보", "👥 등록 유저: " + Object.keys(Database.data).length + "명", "")); return true; }
        if (msg === "2") {
            var list = Object.keys(Database.data);
            session.userListCache = list; session.waitAction = "관리_유저선택"; SessionManager.save();
            replier.reply(UI.make("소환사 명부", list.map(function(id, idx) { return (idx + 1) + ". " + id; }).join("\n"), "번호 입력")); return true;
        }
        return false;
    }
};

// ━━━━━━━━ [5. 모듈: 단체톡방 로직] ━━━━━━━━
var GroupManager = {
    handle: function(msg, session, replier, sender) {
        if (msg === "1") {
            var d = Database.data[sender];
            if (!d) { replier.reply(UI.make("안내", "⚠️ 등록되지 않은 소환사입니다.", "")); return true; }
            var info = "👤 소환사: " + sender + "\n🏅 칭호: [" + (d.title || "뉴비") + "]\n" + Config.LINE + "\n🏆 티어: " + getTierInfo(d.lp) + "\n⚔️ 전적: " + d.win + "승 " + d.lose + "패";
            replier.reply(UI.make("내 정보 확인", info, "")); return true;
        }
        return false;
    }
};

// ━━━━━━━━ [6. 모듈: 개인톡방 로직] ━━━━━━━━
var UserManager = {
    handle: function(msg, session, replier, sender) {
        var d = session.data;
        if (!d) {
            if (session.waitAction === "가입_ID") { session.tempId = msg; session.waitAction = "가입_PW"; SessionManager.save(); replier.reply(UI.make("가입", "비밀번호를 입력하세요.", "")); return true; }
            if (session.waitAction === "가입_PW") {
                Database.data[session.tempId] = { pw: msg, gold: 1000, level: 1, lp: 0, win: 0, lose: 0, title: "뉴비", collection: { titles: ["뉴비"], characters: [] } };
                Database.save(Database.data); session.waitAction = null; SessionManager.save(); replier.reply(UI.make("알림", "회원가입 완료!", "")); return true;
            }
            if (session.waitAction === "로그인_ID") { session.tempId = msg; session.waitAction = "로그인_PW"; SessionManager.save(); replier.reply(UI.make("로그인", "비밀번호를 입력하세요.", "")); return true; }
            if (session.waitAction === "로그인_PW") {
                var user = Database.data[session.tempId];
                if (user && user.pw === msg) { session.data = user; session.waitAction = null; SessionManager.save(); replier.reply(UI.renderMenu(session)); return true; }
                replier.reply(UI.make("알림", "로그인 실패!", "")); return true;
            }
            if (msg === "1") { session.waitAction = "가입_ID"; SessionManager.save(); replier.reply(UI.make("가입", "아이디를 입력하세요.", "")); return true; }
            if (msg === "2") { session.waitAction = "로그인_ID"; SessionManager.save(); replier.reply(UI.make("로그인", "아이디를 입력하세요.", "")); return true; }
        } else {
            // [상점/컬렉션 세부 로직을 일반 메뉴 번호보다 먼저 처리]
            if (session.waitAction === "상점_역할선택") {
                var rIdx = parseInt(msg) - 1;
                if (RoleKeys[rIdx]) {
                    session.selectedRole = RoleKeys[rIdx]; session.waitAction = "상점_구매진행"; SessionManager.save();
                    var list = SystemData.roles[session.selectedRole].units.map(function(u, i) { return (i+1) + ". " + u + (d.collection.characters.indexOf(u) !== -1 ? " [보유]" : " (500G)"); }).join("\n");
                    replier.reply(UI.make("상점: " + session.selectedRole, list, "")); return true;
                }
            }
            if (session.waitAction === "상점_구매진행") {
                var units = SystemData.roles[session.selectedRole].units;
                var cIdx = parseInt(msg) - 1;
                if (units[cIdx]) {
                    var name = units[cIdx];
                    if (d.collection.characters.indexOf(name) !== -1) { replier.reply(UI.make("상점", "이미 보유 중입니다.", "")); return true; }
                    if (d.gold < 500) { replier.reply(UI.make("상점", "골드 부족!", "")); return true; }
                    d.gold -= 500; d.collection.characters.push(name); Database.save(Database.data);
                    replier.reply(UI.make("구매 완료", name + " 영입!", "")); return true;
                }
            }
            if (session.lastMenu === "COLLECTION") {
                if (msg === "1") { replier.reply(UI.make("보유 칭호", d.collection.titles.join(", "), "")); return true; }
                if (msg === "2") { replier.reply(UI.make("보유 캐릭터", d.collection.characters.length === 0 ? "없음" : d.collection.characters.join(", "), "")); return true; }
            }

            // [일반 메뉴 번호 처리]
            if (msg === "1") {
                var info = "👤 계정: " + session.tempId + "\n🏅 칭호: [" + (d.title || "뉴비") + "]\n" + Config.LINE + "\n🏆 티어: " + getTierInfo(d.lp) + "\n💰 골드: " + d.gold.toLocaleString() + " G";
                replier.reply(UI.make("마이 페이지", info, "")); return true;
            }
            if (msg === "2") { session.lastMenu = "COLLECTION"; SessionManager.save(); replier.reply(UI.make("컬렉션", "1. 보유 칭호\n2. 보유 캐릭터", "")); return true; }
            if (msg === "3") { session.waitAction = "상점_역할선택"; SessionManager.save(); replier.reply(UI.make("상점", RoleKeys.map(function(r, i) { return (i+1) + ". " + r; }).join("\n"), "")); return true; }
            if (msg === "4") { session.data = null; session.waitAction = null; session.lastMenu = null; SessionManager.save(); replier.reply(UI.make("알림", "로그아웃 되었습니다.", "")); return true; }
        }
        return false;
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

    if (msg === "취소") { session.waitAction = null; session.editTargetField = null; SessionManager.save(); return replier.reply(UI.make("알림", "취소되었습니다.", "")); }
    if (msg === "메뉴" || msg === "되돌아가기") { session.waitAction = null; session.lastMenu = null; SessionManager.save(); return replier.reply(UI.renderMenu(session)); }

    var isProcessed = false;
    if (session.type === "ADMIN") isProcessed = AdminManager.handle(msg, session, replier);
    else if (session.type === "GROUP") isProcessed = GroupManager.handle(msg, session, replier, sender);
    else if (session.type === "DIRECT") isProcessed = UserManager.handle(msg, session, replier, sender);
}
