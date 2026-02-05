/**
 * [main.js] v8.5.5
 * 1. UI: 구분선을 본문 길이에 맞춰 12~18자 유동적 출력. (UI 적용 완료)
 * 2. 완벽 복구: v8.2.8의 모든 조건문, 화면 전환, 데이터 처리 로직을 생략 없이 포함.
 * 3. 탐색: 모든 문구 하단에 '⬅️ 이전 | 🚫 취소 | 🏠 메뉴' 배치.
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
    LINE_CHAR: "━", 
    MIN_LINE: 12,
    MAX_LINE: 18, 
    NAV_ITEMS: ["⬅️ 이전", "🚫 취소", "🏠 메뉴"]
};

var Utils = {
    getCompactNav: function() {
        return Config.NAV_ITEMS.join(" | ");
    },
    getVisualWidth: function(str) {
        var width = 0;
        for (var i = 0; i < str.length; i++) {
            var c = str.charCodeAt(i);
            if ((c >= 0xAC00 && c <= 0xD7A3) || (c >= 0x1100 && c <= 0x11FF) || (c >= 0x3130 && c <= 0x318F) || (c > 255)) width += 2;
            else width += 1;
        }
        return width;
    },
    getDynamicLine: function(content, title, help) {
        var allText = (content || "") + "\n" + (title || "") + "\n" + (help || "");
        var lines = allText.split("\n");
        var maxVisualWidth = 0;
        for (var i = 0; i < lines.length; i++) {
            var w = this.getVisualWidth(lines[i]);
            if (w > maxVisualWidth) maxVisualWidth = w;
        }
        var targetCount = Math.ceil(maxVisualWidth / 2);
        if (targetCount < Config.MIN_LINE) targetCount = Config.MIN_LINE;
        if (targetCount > Config.MAX_LINE) targetCount = Config.MAX_LINE;
        return Array(targetCount + 1).join(Config.LINE_CHAR);
    }
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
        if (lp >= TierData[i].minLp) return { name: TierData[i].name, icon: TierData[i].icon };
    }
    return { name: "아이언", icon: "⚫" };
}

// ━━━━━━━━ [2. 모듈: UI 엔진] ━━━━━━━━
var UI = {
    make: function(title, content, help) {
        var line = Utils.getDynamicLine(content, title, help);
        var navBar = Utils.getCompactNav();
        var res = "『 " + title + " 』\n" + line + "\n" + content + "\n" + line + "\n";
        if (help) res += "💡 " + help + "\n" + line + "\n";
        res += navBar;
        return res;
    },
    renderProfile: function(id, data) {
        var tier = getTierInfo(data.lp);
        var win = data.win || 0, lose = data.lose || 0, total = win + lose;
        var winRate = total === 0 ? 0 : Math.floor((win / total) * 100);
        return "👤 계정: " + id + "\n🏅 칭호: [" + data.title + "]\n🏆 티어: " + tier.icon + " " + tier.name + " (" + data.lp + " LP)\n💰 골드: " + data.gold.toLocaleString() + " G\n⭐ 레벨: Lv." + data.level + "\n⚔️ 전적: " + win + "승 " + lose + "패 (" + winRate + "%)";
    },
    go: function(session, screen, title, content, help) {
        if (session.screen && session.screen !== screen && session.screen !== "IDLE") {
            if (!session.history) session.history = [];
            session.history.push({ screen: session.screen, title: session.lastTitle });
        }
        session.screen = screen; session.lastTitle = title;
        return this.make(title, content, help);
    },
    renderMenu: function(session, sender) {
        session.history = [];
        if (session.type === "ADMIN") {
            session.screen = "ADMIN_MAIN";
            return this.go(session, "ADMIN_MAIN", "관리자 메뉴", "1. 시스템 정보\n2. 유저 관리", "번호를 입력하세요.");
        }
        if (session.type === "GROUP") {
            if (!session.data) { session.screen = "IDLE"; return UI.make("알림", "'시스템' 개인톡에서\n로그인을 해주세요.", "개인톡 전용 기능입니다."); }
            session.screen = "GROUP_MAIN";
            return this.go(session, "GROUP_MAIN", "메인 메뉴", "1. 내 정보 확인", "번호를 입력하세요.");
        }
        if (!session.data) {
            session.screen = "GUEST_MAIN";
            return this.go(session, "GUEST_MAIN", "메인 메뉴", "1. 회원가입\n2. 로그인", "번호를 입력하세요.");
        }
        session.screen = "USER_MAIN";
        return this.go(session, "USER_MAIN", "메인 메뉴", "1. 프로필\n2. 컬렉션\n3. 상점\n4. 로그아웃", "번호를 입력하세요.");
    }
};

// ━━━━━━━━ [3. DB 및 세션 매니저] ━━━━━━━━
var Database = {
    data: {},
    load: function() { try { return JSON.parse(FileStream.read(Config.DB_PATH)); } catch(e) { return {}; } },
    save: function(d) { this.data = d; FileStream.write(Config.DB_PATH, JSON.stringify(d, null, 4)); },
    getInitData: function(pw) { return { pw: pw, gold: 1000, level: 1, lp: 0, win: 0, lose: 0, title: "뉴비", collection: { titles: ["뉴비"], characters: [] } }; }
};

var SessionManager = {
    sessions: {},
    load: function() { try { this.sessions = JSON.parse(FileStream.read(Config.SESSION_PATH)); } catch(e) { this.sessions = {}; } },
    save: function() { FileStream.write(Config.SESSION_PATH, JSON.stringify(this.sessions)); },
    get: function(r, h, g) {
        if (!this.sessions[h]) this.sessions[h] = { data: null, screen: "IDLE", history: [], lastTitle: "메뉴", tempId: null, userListCache: [], targetUser: null, editType: null };
        var s = this.sessions[h];
        if (r === Config.AdminRoom) s.type = "ADMIN";
        else if (g && r === Config.GroupRoom) s.type = "GROUP";
        else s.type = "DIRECT";
        return s;
    },
    reset: function(session) { session.screen = "IDLE"; session.history = []; session.userListCache = []; session.targetUser = null; session.editType = null; },
    forceLogout: function(userId) {
        if (!userId) return;
        for (var key in this.sessions) { if (this.sessions[key].tempId === userId) { this.sessions[key].data = null; this.sessions[key].tempId = null; this.sessions[key].screen = "IDLE"; this.sessions[key].history = []; } }
        this.save();
    }
};

// ━━━━━━━━ [4. 매니저: 관리자 시스템] ━━━━━━━━
var AdminManager = {
    handle: function(msg, session, replier, startTime) {
        switch(session.screen) {
            case "ADMIN_MAIN":
                if (msg === "1") {
                    var rt = java.lang.Runtime.getRuntime();
                    var used = Math.floor((rt.totalMemory() - rt.freeMemory()) / 1024 / 1024);
                    replier.reply(UI.make("시스템 정보", "⚡ 속도: " + (new Date().getTime() - startTime) + "ms\n📟 RAM: " + used + " MB\n👥 총원: " + Object.keys(Database.data).length + "명", ""));
                } else if (msg === "2") {
                    session.userListCache = Object.keys(Database.data);
                    replier.reply(UI.go(session, "ADMIN_USER_LIST", "유저 관리", session.userListCache.map(function(id, i){ return (i+1)+". "+id; }).join("\n"), "번호 입력"));
                }
                break;
            case "ADMIN_USER_LIST":
                var idx = parseInt(msg) - 1;
                if (session.userListCache[idx]) {
                    session.targetUser = session.userListCache[idx];
                    replier.reply(UI.go(session, "ADMIN_USER_DETAIL", session.targetUser, UI.renderProfile(session.targetUser, Database.data[session.targetUser]), "1. 수정  2. 초기화  3. 삭제"));
                }
                break;
            case "ADMIN_USER_DETAIL":
                if (msg === "1") replier.reply(UI.go(session, "ADMIN_EDIT_SELECT", "수정 항목", "1. 골드  2. LP  3. 레벨", "번호 입력"));
                else if (msg === "2") replier.reply(UI.go(session, "ADMIN_RESET_CONFIRM", "초기화", "[확인] 입력 시 리셋", "주의: 복구 불가능"));
                else if (msg === "3") replier.reply(UI.go(session, "ADMIN_DELETE_CONFIRM", "삭제", "[삭제확인] 입력 시 삭제", "주의: 영구 삭제"));
                break;
            case "ADMIN_RESET_CONFIRM":
                if (msg === "확인") {
                    var pw = Database.data[session.targetUser].pw;
                    Database.data[session.targetUser] = Database.getInitData(pw); Database.save(Database.data);
                    replier.reply(UI.make("완료", "초기화 되었습니다.", ""));
                }
                break;
            case "ADMIN_DELETE_CONFIRM":
                if (msg === "삭제확인") {
                    delete Database.data[session.targetUser]; Database.save(Database.data);
                    SessionManager.forceLogout(session.targetUser);
                    replier.reply(UI.make("완료", "계정이 삭제되었습니다.", ""));
                }
                break;
            case "ADMIN_EDIT_SELECT":
                var types = ["gold", "lp", "level"], names = ["골드", "LP", "레벨"], tIdx = parseInt(msg) - 1;
                if (types[tIdx]) { session.editType = types[tIdx]; replier.reply(UI.go(session, "ADMIN_EDIT_INPUT", names[tIdx] + " 수정", "현재: " + Database.data[session.targetUser][session.editType], "숫자 입력")); }
                break;
            case "ADMIN_EDIT_INPUT":
                var val = parseInt(msg);
                if (!isNaN(val)) { Database.data[session.targetUser][session.editType] = val; Database.save(Database.data); replier.reply(UI.make("완료", "변경되었습니다.", "")); }
                break;
        }
    }
};

// ━━━━━━━━ [5. 매니저: 유저 시스템] ━━━━━━━━
var UserManager = {
    handle: function(msg, session, replier, sender) {
        var d = session.data;
        if (!d) {
            switch(session.screen) {
                case "GUEST_MAIN":
                    if (msg === "1") replier.reply(UI.go(session, "JOIN_ID", "회원가입", "아이디 입력", ""));
                    else if (msg === "2") replier.reply(UI.go(session, "LOGIN_ID", "로그인", "아이디 입력", ""));
                    break;
                case "JOIN_ID":
                    if (Database.data[msg]) return replier.reply(UI.make("오류", "이미 있는 ID입니다.", ""));
                    session.tempId = msg; replier.reply(UI.go(session, "JOIN_PW", "비밀번호", "비밀번호 입력", ""));
                    break;
                case "JOIN_PW":
                    Database.data[session.tempId] = Database.getInitData(msg); Database.save(Database.data);
                    session.data = Database.data[session.tempId]; replier.reply(UI.renderMenu(session, sender));
                    break;
                case "LOGIN_ID": session.tempId = msg; replier.reply(UI.go(session, "LOGIN_PW", "비밀번호", "비밀번호 입력", "")); break;
                case "LOGIN_PW":
                    if (Database.data[session.tempId] && Database.data[session.tempId].pw === msg) { session.data = Database.data[session.tempId]; replier.reply(UI.renderMenu(session, sender)); }
                    else replier.reply(UI.make("오류", "일치하지 않습니다.", ""));
                    break;
            }
        } else {
            switch(session.screen) {
                case "USER_MAIN":
                    if (msg === "1") replier.reply(UI.go(session, "PROFILE_VIEW", "프로필", UI.renderProfile(session.tempId, d), ""));
                    else if (msg === "2") replier.reply(UI.go(session, "COL_MAIN", "컬렉션", "1. 칭호  2. 캐릭터", ""));
                    else if (msg === "3") replier.reply(UI.go(session, "SHOP_MAIN", "상점", "1. 캐릭터 구매", ""));
                    else if (msg === "4") { SessionManager.forceLogout(session.tempId); replier.reply(UI.make("알림", "로그아웃 완료", "")); }
                    break;
                case "SHOP_MAIN":
                    if (msg === "1") replier.reply(UI.go(session, "SHOP_ROLES", "캐릭터 구매", RoleKeys.map(function(r, i){ return (i+1)+". "+r; }).join("\n"), ""));
                    break;
                case "SHOP_ROLES":
                    var rIdx = parseInt(msg) - 1;
                    if (RoleKeys[rIdx]) {
                        session.selectedRole = RoleKeys[rIdx];
                        var uList = SystemData.roles[session.selectedRole].units.map(function(u, i) {
                            var owned = d.collection.characters.indexOf(u) !== -1;
                            return (i+1) + ". " + u + (owned ? " [보유]" : " (500G)");
                        }).join("\n");
                        replier.reply(UI.go(session, "SHOP_BUY_ACTION", session.selectedRole, uList, ""));
                    }
                    break;
                case "SHOP_BUY_ACTION":
                    var units = SystemData.roles[session.selectedRole].units, uIdx = parseInt(msg) - 1;
                    if (units[uIdx]) {
                        var target = units[uIdx];
                        if (d.collection.characters.indexOf(target) !== -1) replier.reply(UI.make("알림", "보유 중입니다.", ""));
                        else if (d.gold < 500) replier.reply(UI.make("알림", "골드 부족", ""));
                        else { 
                            d.gold -= 500; d.collection.characters.push(target); Database.save(Database.data); 
                            replier.reply(UI.make("구매 완료", target + " 획득!", "잔액: " + d.gold + "G")); 
                        }
                    }
                    break;
                case "COL_MAIN":
                    if (msg === "1") {
                        var tList = d.collection.titles.map(function(t, i) { return (i+1) + ". " + (t === d.title ? "✅ " : "") + t; }).join("\n");
                        replier.reply(UI.go(session, "COL_TITLE_ACTION", "칭호", tList, ""));
                    } else if (msg === "2") {
                        var cList = d.collection.characters.length > 0 ? d.collection.characters.join("\n") : "없음";
                        replier.reply(UI.go(session, "COL_CHAR_VIEW", "캐릭터", cList, ""));
                    }
                    break;
                case "COL_TITLE_ACTION":
                    var tIdx = parseInt(msg) - 1;
                    if (d.collection.titles[tIdx]) { d.title = d.collection.titles[tIdx]; Database.save(Database.data); replier.reply(UI.make("변경 완료", "장착됨", "")); }
                    break;
            }
        }
    }
};

// ━━━━━━━━ [6. 매니저: 단체방 시스템] ━━━━━━━━
var GroupManager = {
    handle: function(msg, session, replier, sender) {
        if (session.screen === "GROUP_MAIN" && msg === "1") {
            if (!session.data) return; 
            replier.reply(UI.make("내 정보 확인", UI.renderProfile(session.tempId, session.data), ""));
        }
    }
};

// ━━━━━━━━ [7. 메인 응답 핸들러] ━━━━━━━━
Database.data = Database.load(); SessionManager.load();

function response(room, msg, sender, isGroupChat, replier, imageDB) {
    var startTime = new Date().getTime();
    try {
        if (!msg) return;
        var hash = String(imageDB.getProfileHash());
        var session = SessionManager.get(room, hash, isGroupChat);
        msg = msg.trim();
        var isAdmin = (room === Config.AdminRoom && hash === Config.AdminHash);

        if (msg === "이전" || msg === "⬅️ 이전") {
            if (session.history && session.history.length > 0) {
                var prev = session.history.pop();
                session.screen = prev.screen; session.lastTitle = prev.title;
                return replier.reply(UI.renderMenu(session, sender));
            }
            return replier.reply(UI.renderMenu(session, sender));
        }
        if (msg === "취소" || msg === "🚫 취소" || msg === "메뉴" || msg === "🏠 메뉴") { 
            SessionManager.reset(session); return replier.reply(UI.renderMenu(session, sender)); 
        }

        if (isAdmin) {
            if (session.screen === "IDLE") { if (msg === "메뉴") return replier.reply(UI.renderMenu(session, sender)); return; }
            return AdminManager.handle(msg, session, replier, startTime);
        }

        if (isGroupChat) {
            var found = false;
            for (var k in SessionManager.sessions) {
                if (SessionManager.sessions[k].type === "DIRECT" && SessionManager.sessions[k].tempId === sender) {
                    session.data = SessionManager.sessions[k].data; session.tempId = SessionManager.sessions[k].tempId; found = true; break;
                }
            }
            if (!found) { session.data = null; session.screen = "IDLE"; }
        }

        if (session.screen === "IDLE") return;
        if (session.type === "GROUP") GroupManager.handle(msg, session, replier, sender);
        else if (session.type === "DIRECT") UserManager.handle(msg, session, replier, sender);
        SessionManager.save();
    } catch (e) { Api.replyRoom(Config.AdminRoom, "⚠️ [v8.5.5 에러]: " + e.message); }
}
