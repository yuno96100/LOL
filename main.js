/**
 * [main.js] v8.9.24
 * 1. UI 조정: 네비게이션 바 정렬을 위해 왼쪽 여백을 늘려 우측으로 2칸 이동.
 * 2. 동적 시스템: 카테고리 추가 시 UI 자동 렌더링 및 가입 알림 유지.
 * 3. 무생략: 전체 DB 관리, 세션, 관리자 및 유저 핸들러 포함.
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
    FIXED_LINE: 17, 
    // ★ 네비게이션 바를 오른쪽으로 2칸 이동 (공백 추가)
    NAV_LEFT: "     ", 
    NAV_RIGHT: " ",
    NAV_ITEMS: ["⬅️ 이전", "❌ 취소", "🏠 메뉴"]
};

var Utils = {
    getFixedDivider: function() { 
        return Array(Config.FIXED_LINE + 1).join(Config.LINE_CHAR); 
    },
    getNav: function() { 
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
    renderProfile: function(id, data, help, content) {
        var lp = data.lp || 0;
        var tier = getTierInfo(lp);
        var win = data.win || 0, lose = data.lose || 0, total = win + lose;
        var winRate = total === 0 ? 0 : Math.floor((win / total) * 100);
        var s1 = "👤 계정: " + id + "\n🏅 칭호: [" + data.title + "]";
        var s2 = "🏆 티어: " + tier.icon + " " + tier.name + " (" + lp + " LP)\n💰 골드: " + (data.gold || 0).toLocaleString() + " G\n⚔️ 전적: " + win + "승 " + lose + "패 (" + winRate + "%)";
        var div = Utils.getFixedDivider();
        var res = "『 " + id + " 』\n" + div + "\n" + s1 + "\n" + div + "\n" + s2 + "\n" + div + "\n";
        if (content) res += content + "\n" + div + "\n";
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
            return UI.renderProfile(tid, td, help, content);
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
                    replier.reply(UI.make("시스템 정보", "⚡ 속도: " + (new Date().getTime() - startTime) + "ms\n📟 RAM: " + used + " MB\n👥 총원: " + Object.keys(Database.data).length + "명", "시스템 모니터링"));
                } else if (msg === "2") {
                    session.userListCache = Object.keys(Database.data);
                    replier.reply(UI.go(session, "ADMIN_USER_LIST", "유저 관리", session.userListCache.map(function(id, i){ return (i+1)+". "+id; }).join("\n"), "조회할 번호 입력"));
                }
                break;
            case "ADMIN_USER_LIST":
                var idx = parseInt(msg) - 1;
                if (session.userListCache[idx]) {
                    session.targetUser = session.userListCache[idx];
                    replier.reply(UI.go(session, "ADMIN_USER_DETAIL", session.targetUser, "1. 정보 수정\n2. 데이터 초기화\n3. 계정 삭제", "기능 번호 선택"));
                }
                break;
            case "ADMIN_USER_DETAIL":
                if (msg === "1") replier.reply(UI.go(session, "ADMIN_EDIT_SELECT", "수정 항목", "1. 골드\n2. LP\n3. 레벨", "항목 선택"));
                else if (msg === "2") replier.reply(UI.go(session, "ADMIN_RESET_CONFIRM", "초기화", "[확인] 입력 시 리셋", "경고: 복구 불가"));
                else if (msg === "3") replier.reply(UI.go(session, "ADMIN_DELETE_CONFIRM", "삭제", "[삭제확인] 입력 시 삭제", "경고: 영구 삭제"));
                break;
            case "ADMIN_RESET_CONFIRM":
                if (msg === "확인") {
                    var pw = Database.data[session.targetUser].pw;
                    Database.data[session.targetUser] = Database.getInitData(pw); Database.save(Database.data);
                    replier.reply(UI.make("완료", "데이터 초기화가\n성공하였습니다.", "시스템 동기화"));
                }
                break;
            case "ADMIN_DELETE_CONFIRM":
                if (msg === "삭제확인") {
                    delete Database.data[session.targetUser]; Database.save(Database.data);
                    SessionManager.forceLogout(session.targetUser);
                    replier.reply(UI.make("완료", "해당 계정이\n영구 삭제되었습니다.", "DB 업데이트"));
                }
                break;
            case "ADMIN_EDIT_SELECT":
                var types = ["gold", "lp", "level"], tIdx = parseInt(msg) - 1;
                if (types[tIdx]) { session.editType = types[tIdx]; replier.reply(UI.go(session, "ADMIN_EDIT_INPUT", "값 수정", "대상 유저: " + session.targetUser + "\n현재 값: " + Database.data[session.targetUser][session.editType], "새로운 숫자 입력")); }
                break;
            case "ADMIN_EDIT_INPUT":
                var val = parseInt(msg);
                if (!isNaN(val)) { Database.data[session.targetUser][session.editType] = val; Database.save(Database.data); replier.reply(UI.make("완료", "수정 사항이\n반영되었습니다.", "데이터 적용 완료")); }
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
                case "GUEST_MAIN": if (msg === "1") replier.reply(UI.go(session, "JOIN_ID", "회원가입", "아이디를\n입력해주세요.", "가입 대기 중")); else if (msg === "2") replier.reply(UI.go(session, "LOGIN_ID", "인증", "아이디를\n입력해주세요.", "보안 인증")); break;
                case "JOIN_ID": if (Database.data[msg]) return replier.reply(UI.make("오류", "이미 가입된\n아이디입니다.", "다른 아이디 입력")); session.tempId = msg; replier.reply(UI.go(session, "JOIN_PW", "회원가입", "비밀번호를\n설정해주세요.", "설정 중...")); break;
                case "JOIN_PW": 
                    Database.data[session.tempId] = Database.getInitData(msg); 
                    Database.save(Database.data); 
                    session.data = Database.data[session.tempId];
                    var joinNotice = UI.make("신규 유저", "유저 [" + session.tempId + "]\n회원가입 완료!", "협곡에 오신걸 환영합니다");
                    Api.replyRoom(Config.AdminRoom, joinNotice);
                    replier.reply(UI.renderMenu(session)); 
                    break;
                case "LOGIN_ID": session.tempId = msg; replier.reply(UI.go(session, "LOGIN_PW", "인증", "비밀번호를\n입력해주세요.", "인증 중...")); break;
                case "LOGIN_PW": if (Database.data[session.tempId] && Database.data[session.tempId].pw === msg) { session.data = Database.data[session.tempId]; replier.reply(UI.renderMenu(session)); } else replier.reply(UI.make("오류", "정보가\n일치하지 않습니다.", "인증 실패")); break;
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
                    if (msg === "1") replier.reply(UI.go(session, "PROFILE_VIEW", session.tempId, "", "내 정보 조회"));
                    else if (msg === "2") replier.reply(UI.go(session, "COL_MAIN", "컬렉션", "1. 칭호 장착\n2. 보유 캐릭터", "나의 수집함"));
                    else if (msg === "3") replier.reply(UI.go(session, "SHOP_MAIN", "상점", "1. 캐릭터 구매", "구매 대기 중"));
                    else if (msg === "4") { SessionManager.forceLogout(session.tempId); replier.reply(UI.make("알림", "로그아웃이\n완료되었습니다.", "시스템 종료")); }
                    break;
                case "SHOP_MAIN": if (msg === "1") replier.reply(UI.go(session, "SHOP_ROLES", "상점 카테고리", RoleKeys.map(function(r, i){ return (i+1)+". "+r; }).join("\n"), "카테고리 선택")); break;
                case "SHOP_ROLES":
                    var rIdx = parseInt(msg) - 1;
                    if (RoleKeys[rIdx]) {
                        session.selectedRole = RoleKeys[rIdx];
                        var uList = SystemData.roles[session.selectedRole].units.map(function(u, i) {
                            var owned = d.collection.characters.indexOf(u) !== -1;
                            return (i+1) + ". " + u + (owned ? " [보유]" : " (500G)");
                        }).join("\n");
                        replier.reply(UI.go(session, "SHOP_BUY_ACTION", session.selectedRole, uList, "구매할 유닛 번호"));
                    }
                    break;
                case "SHOP_BUY_ACTION":
                    var units = SystemData.roles[session.selectedRole].units, uIdx = parseInt(msg) - 1;
                    if (units[uIdx]) {
                        var target = units[uIdx];
                        if (d.collection.characters.indexOf(target) !== -1) replier.reply(UI.make("알림", "이미 보유 중인\n유닛입니다.", "영입 취소"));
                        else if (d.gold < 500) replier.reply(UI.make("알림", "골드가 부족하여\n구매할 수 없습니다.", "잔액 부족"));
                        else { d.gold -= 500; d.collection.characters.push(target); Database.save(Database.data); replier.reply(UI.make("성공", target + " 유닛을\n영입 완료했습니다!", "잔액: "+d.gold+"G")); }
                    }
                    break;
                case "COL_MAIN":
                    if (msg === "1") {
                        var tList = d.collection.titles.map(function(t, i) { return (i+1) + ". " + (t === d.title ? "✅ " : "") + t; }).join("\n");
                        replier.reply(UI.go(session, "COL_TITLE_ACTION", "칭호 변경", tList, "장착할 번호 선택"));
                    } else if (msg === "2") {
                        var cList = d.collection.characters.length > 0 ? d.collection.characters.join("\n") : "보유 유닛이\n없습니다.";
                        replier.reply(UI.go(session, "COL_CHAR_VIEW", "보유 리스트", cList, "전략적 팀원"));
                    }
                    break;
                case "COL_TITLE_ACTION":
                    var tIdx = parseInt(msg) - 1;
                    if (d.collection.titles[tIdx]) { d.title = d.collection.titles[tIdx]; Database.save(Database.data); replier.reply(UI.make("성공", "칭호 변경이\n반영되었습니다.", "프로필 업데이트")); }
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
                if (msg === "1") replier.reply(UI.go(session, "GROUP_PROFILE", session.tempId, "", "전적 및 상태"));
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
    } catch (e) { 
        Api.replyRoom(Config.AdminRoom, UI.make("시스템 오류", "런타임 에러:\n" + e.message, "v8.9.24")); 
    }
}
