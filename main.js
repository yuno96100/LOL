/**
 * [main.js] v8.9.16
 * 1. UI 조정: 구분선 17자 고정 및 네비게이션 바 양쪽 공백을 통한 중앙 정렬.
 * 2. 완전성: 모든 관리자, 유저, 단체방 로직을 생략 없이 포함.
 * 3. 가독성: 유저 상세 메뉴 등에서 세로 작대기(|) 제거 상태 유지.
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
    FIXED_LINE: 17, // ★ 17글자 고정
    // 양쪽에 공백을 주어 중앙 정렬 효과
    NAV_LEFT: "   ",
    NAV_RIGHT: "   ",
    NAV_ITEMS: ["⬅️ 이전", "❌ 취소", "🏠 메뉴"]
};

var Utils = {
    getFixedDivider: function() { 
        return Array(Config.FIXED_LINE + 1).join(Config.LINE_CHAR); 
    },
    getNav: function() { 
        // 아이콘 사이 간격 유지 + 양쪽 사이드 공백 추가
        return Config.NAV_LEFT + Config.NAV_ITEMS.join("      ") + Config.NAV_RIGHT; 
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
        var div = Utils.getFixedDivider();
        var res = "『 " + title + " 』\n" + div + "\n" + content + "\n" + div + "\n";
        if (help) res += "💡 " + help + "\n" + div + "\n";
        return res + Utils.getNav();
    },
    renderProfile: function(id, data, help) {
        var tier = getTierInfo(data.lp);
        var win = data.win || 0, lose = data.lose || 0, total = win + lose;
        var winRate = total === 0 ? 0 : Math.floor((win / total) * 100);
        var s1 = "👤 계정: " + id + "\n🏅 칭호: [" + data.title + "]";
        var s2 = "🏆 티어: " + tier.icon + " " + tier.name + " (" + data.lp + " LP)\n💰 골드: " + data.gold.toLocaleString() + " G\n⚔️ 전적: " + win + "승 " + lose + "패 (" + winRate + "%)";
        var div = Utils.getFixedDivider();
        var res = "『 " + id + " 』\n" + div + "\n" + s1 + "\n" + div + "\n" + s2 + "\n" + div + "\n";
        if (help) res += "💡 " + help + "\n" + div + "\n";
        return res + Utils.getNav();
    },
    go: function(session, screen, title, content, help) {
        if (session.screen && session.screen !== screen && session.screen !== "IDLE") {
            if (!session.history) session.history = [];
            session.history.push({ screen: session.screen, title: session.lastTitle });
        }
        session.screen = screen; session.lastTitle = title;
        if (screen.indexOf("PROFILE") !== -1 || screen.indexOf("DETAIL") !== -1) {
            var tid = session.targetUser || session.tempId;
            var td = (session.targetUser) ? Database.data[session.targetUser] : session.data;
            return UI.renderProfile(tid, td, help);
        }
        return this.make(title, content, help);
    },
    renderMenu: function(session) {
        session.history = [];
        if (session.type === "ADMIN") return this.go(session, "ADMIN_MAIN", "관리자 메뉴", "1. 시스템 정보\n2. 유저 관리", "번호를 입력하세요.");
        if (session.type === "GROUP") {
            if (!session.data) { session.screen = "IDLE"; return UI.make("알림", "'시스템' 개인톡에서\n로그인을 해주세요.", "보안이 필요합니다."); }
            return this.go(session, "GROUP_MAIN", "단톡방 메뉴", "1. 내 정보 확인", "번호를 입력하세요.");
        }
        if (!session.data) return this.go(session, "GUEST_MAIN", "환영합니다", "1. 회원가입\n2. 로그인", "번호를 선택하세요.");
        return this.go(session, "USER_MAIN", "메인 메뉴", "1. 프로필\n2. 컬렉션\n3. 상점\n4. 로그아웃", "작업 번호를 입력하세요.");
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
        if (msg.indexOf("이전") !== -1) {
            if (session.screen === "ADMIN_USER_LIST") return replier.reply(UI.renderMenu(session));
            if (session.screen === "ADMIN_USER_DETAIL") { session.screen = "ADMIN_MAIN"; return this.handle("2", session, replier, startTime); }
            if (session.history && session.history.length > 0) { var p = session.history.pop(); session.screen = p.screen; return replier.reply(UI.renderMenu(session)); }
        }
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
                    replier.reply(UI.go(session, "ADMIN_USER_DETAIL", session.targetUser, "", "1. 수정   2. 초기화   3. 삭제"));
                }
                break;
            case "ADMIN_USER_DETAIL":
                if (msg === "1") replier.reply(UI.go(session, "ADMIN_EDIT_SELECT", "수정 항목", "1. 골드   2. LP   3. 레벨", "항목 선택"));
                else if (msg === "2") replier.reply(UI.go(session, "ADMIN_RESET_CONFIRM", "초기화", "[확인] 입력 시 리셋", "주의: 복구 불가"));
                else if (msg === "3") replier.reply(UI.go(session, "ADMIN_DELETE_CONFIRM", "삭제", "[삭제확인] 입력 시 삭제", "주의: 영구 삭제"));
                break;
            case "ADMIN_RESET_CONFIRM":
                if (msg === "확인") {
                    var pw = Database.data[session.targetUser].pw;
                    Database.data[session.targetUser] = Database.getInitData(pw); Database.save(Database.data);
                    replier.reply(UI.make("완료", "초기화 완료", ""));
                }
                break;
            case "ADMIN_DELETE_CONFIRM":
                if (msg === "삭제확인") {
                    delete Database.data[session.targetUser]; Database.save(Database.data);
                    SessionManager.forceLogout(session.targetUser);
                    replier.reply(UI.make("완료", "삭제 완료", ""));
                }
                break;
            case "ADMIN_EDIT_SELECT":
                var types = ["gold", "lp", "level"], tIdx = parseInt(msg) - 1;
                if (types[tIdx]) { session.editType = types[tIdx]; replier.reply(UI.go(session, "ADMIN_EDIT_INPUT", "값 수정", "현재: " + Database.data[session.targetUser][session.editType], "숫자 입력")); }
                break;
            case "ADMIN_EDIT_INPUT":
                var val = parseInt(msg);
                if (!isNaN(val)) { Database.data[session.targetUser][session.editType] = val; Database.save(Database.data); replier.reply(UI.make("완료", "수정 완료", "")); }
                break;
        }
    }
};

// ━━━━━━━━ [5. 매니저: 개인톡(DIRECT) 시스템] ━━━━━━━━
var UserManager = {
    handle: function(msg, session, replier) {
        var d = session.data;
        if (!d) {
            switch(session.screen) {
                case "GUEST_MAIN": if (msg === "1") replier.reply(UI.go(session, "JOIN_ID", "가입", "ID 입력", "")); else if (msg === "2") replier.reply(UI.go(session, "LOGIN_ID", "인증", "ID 입력", "")); break;
                case "JOIN_ID": if (Database.data[msg]) return replier.reply(UI.make("오류", "중복 ID", "")); session.tempId = msg; replier.reply(UI.go(session, "JOIN_PW", "가입", "PW 설정", "")); break;
                case "JOIN_PW": Database.data[session.tempId] = Database.getInitData(msg); Database.save(Database.data); session.data = Database.data[session.tempId]; replier.reply(UI.renderMenu(session)); break;
                case "LOGIN_ID": session.tempId = msg; replier.reply(UI.go(session, "LOGIN_PW", "인증", "PW 입력", "")); break;
                case "LOGIN_PW": if (Database.data[session.tempId] && Database.data[session.tempId].pw === msg) { session.data = Database.data[session.tempId]; replier.reply(UI.renderMenu(session)); } else replier.reply(UI.make("오류", "불일치", "")); break;
            }
        } else {
            if (msg.indexOf("이전") !== -1) {
                if (session.screen === "SHOP_ROLES") return this.handle("3", {data:d, screen:"USER_MAIN", history:[]}, replier);
                if (session.screen === "SHOP_BUY_ACTION") return this.handle("1", {data:d, screen:"SHOP_MAIN", history:[]}, replier);
                if (session.screen === "COL_TITLE_ACTION" || session.screen === "COL_CHAR_VIEW") return this.handle("2", {data:d, screen:"USER_MAIN", history:[]}, replier);
                if (session.history && session.history.length > 0) { var p = session.history.pop(); session.screen = p.screen; return replier.reply(UI.renderMenu(session)); }
                return replier.reply(UI.renderMenu(session));
            }
            switch(session.screen) {
                case "USER_MAIN":
                    if (msg === "1") replier.reply(UI.go(session, "PROFILE_VIEW", session.tempId, "", "전적 확인"));
                    else if (msg === "2") replier.reply(UI.go(session, "COL_MAIN", "컬렉션", "1. 칭호 장착\n2. 보유 캐릭터", ""));
                    else if (msg === "3") replier.reply(UI.go(session, "SHOP_MAIN", "상점", "1. 캐릭터 구매", ""));
                    else if (msg === "4") { SessionManager.forceLogout(session.tempId); replier.reply(UI.make("알림", "로그아웃 완료", "")); }
                    break;
                case "SHOP_MAIN": if (msg === "1") replier.reply(UI.go(session, "SHOP_ROLES", "포지션", RoleKeys.map(function(r, i){ return (i+1)+". "+r; }).join("\n"), "")); break;
                case "SHOP_ROLES":
                    var rIdx = parseInt(msg) - 1;
                    if (RoleKeys[rIdx]) {
                        session.selectedRole = RoleKeys[rIdx];
                        var uList = SystemData.roles[session.selectedRole].units.map(function(u, i) {
                            var owned = d.collection.characters.indexOf(u) !== -1;
                            return (i+1) + ". " + u + (owned ? " [보유]" : " (500G)");
                        }).join("\n");
                        replier.reply(UI.go(session, "SHOP_BUY_ACTION", session.selectedRole, uList, "번호 입력"));
                    }
                    break;
                case "SHOP_BUY_ACTION":
                    var units = SystemData.roles[session.selectedRole].units, uIdx = parseInt(msg) - 1;
                    if (units[uIdx]) {
                        var target = units[uIdx];
                        if (d.collection.characters.indexOf(target) !== -1) replier.reply(UI.make("알림", "보유 중", ""));
                        else if (d.gold < 500) replier.reply(UI.make("알림", "골드 부족", ""));
                        else { d.gold -= 500; d.collection.characters.push(target); Database.save(Database.data); replier.reply(UI.make("성공", target + " 영입!", "잔액: "+d.gold+"G")); }
                    }
                    break;
                case "COL_MAIN":
                    if (msg === "1") {
                        var tList = d.collection.titles.map(function(t, i) { return (i+1) + ". " + (t === d.title ? "✅ " : "") + t; }).join("\n");
                        replier.reply(UI.go(session, "COL_TITLE_ACTION", "보유 칭호", tList, "번호 입력"));
                    } else if (msg === "2") {
                        var cList = d.collection.characters.length > 0 ? d.collection.characters.join("\n") : "없음";
                        replier.reply(UI.go(session, "COL_CHAR_VIEW", "보유 캐릭터", cList, ""));
                    }
                    break;
                case "COL_TITLE_ACTION":
                    var tIdx = parseInt(msg) - 1;
                    if (d.collection.titles[tIdx]) { d.title = d.collection.titles[tIdx]; Database.save(Database.data); replier.reply(UI.make("완료", "칭호 변경됨", "")); }
                    break;
            }
        }
    }
};

// ━━━━━━━━ [6. 매니저: 단체방(GROUP) 시스템] ━━━━━━━━
var GroupManager = {
    handle: function(msg, session, replier) {
        if (msg.indexOf("이전") !== -1) {
            if (session.history && session.history.length > 0) { var p = session.history.pop(); session.screen = p.screen; return replier.reply(UI.renderMenu(session)); }
            return replier.reply(UI.renderMenu(session));
        }
        switch(session.screen) {
            case "GROUP_MAIN":
                if (msg === "1") replier.reply(UI.go(session, "GROUP_PROFILE", session.tempId, "", "나의 정보입니다."));
                break;
        }
    }
};

// ━━━━━━━━ [7. 메인 응답 핸들러] ━━━━━━━━
Database.data = Database.load(); SessionManager.load();
function response(room, msg, sender, isGroupChat, replier, imageDB) {
    var startTime = new Date().getTime();
    try {
        if (!msg) return;
        var hash = String(imageDB.getProfileHash()), session = SessionManager.get(room, hash, isGroupChat);
        msg = msg.trim();
        
        if (msg.indexOf("취소") !== -1 || msg.indexOf("메뉴") !== -1) { SessionManager.reset(session); return replier.reply(UI.renderMenu(session)); }
        if (session.type === "ADMIN" && hash === Config.AdminHash) return AdminManager.handle(msg, session, replier, startTime);
        
        if (isGroupChat && room === Config.GroupRoom) {
            var found = false;
            for (var k in SessionManager.sessions) {
                if (SessionManager.sessions[k].type === "DIRECT" && SessionManager.sessions[k].tempId === sender) {
                    session.data = SessionManager.sessions[k].data;
                    session.tempId = SessionManager.sessions[k].tempId;
                    found = true; break;
                }
            }
            if (!found) { session.data = null; session.screen = "IDLE"; }
        }

        if (session.screen === "IDLE") return;
        if (session.type === "GROUP") GroupManager.handle(msg, session, replier);
        else UserManager.handle(msg, session, replier);
        SessionManager.save();
    } catch (e) { Api.replyRoom(Config.AdminRoom, "⚠️ v8.9.16 에러: " + e.message); }
}
