/**
 * [main.js] v0.0.09_Fixed_Navigation
 * 1. 자동 줄바꿈 엔진: Utils.wrapText (16자 한도)
 * 2. 레이아웃 고정: 구분선 14개 (FIXED_LINE)
 * 3. 내비게이션 최적화: '이전' 시 상위 카테고리 이동 적용
 * 4. 텍스트 정제: 문장 끝 마침표 제거
 */

// ━━━━━━━━ [1. 설정 및 상수] ━━━━━━━━
var Config = {
    Version: "v0.0.09",
    Prefix: ".",
    AdminRoom: "소환사의협곡관리", 
    BotName: "소환사의 협곡",
    DB_PATH: "/sdcard/msgbot/Bots/main/database.json",
    SESSION_PATH: "/sdcard/msgbot/Bots/main/sessions.json",
    LINE_CHAR: "━",
    FIXED_LINE: 14,
    WRAP_LIMIT: 16,
    NAV_ITEMS: ["⬅️이전", "❌취소", "🏠메뉴"],
    TIMEOUT: 300000 
};

var Utils = {
    getFixedDivider: function() { return Array(Config.FIXED_LINE + 1).join(Config.LINE_CHAR); },
    getNav: function() { return " " + Config.NAV_ITEMS.join("  ") + " "; },
    
    wrapText: function(str) {
        if (!str) return "";
        var lines = str.split("\n");
        var result = [];
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (line.length <= Config.WRAP_LIMIT) {
                result.push(line);
            } else {
                for (var j = 0; j < line.length; j += Config.WRAP_LIMIT) {
                    result.push(line.substring(j, j + Config.WRAP_LIMIT));
                }
            }
        }
        return result.join("\n");
    }
};

var TierData = [
    { name: "챌린저", icon: "✨", minLp: 3000 }, { name: "그랜드마스터", icon: "🔴", minLp: 2500 },
    { name: "마스터", icon: "🟣", minLp: 2000 }, { name: "다이아몬드", icon: "💎", minLp: 1700 },
    { name: "에메랄드", icon: "💚", minLp: 1400 }, { name: "플래티넘", icon: "💿", minLp: 1100 },
    { name: "골드", icon: "🟡", minLp: 800 }, { name: "실버", icon: "⚪", minLp: 500 },
    { name: "브론즈", icon: "🟤", minLp: 200 }, { name: "아이언", icon: "⚫", minLp: 0 }
];

var SystemData = {
    roles: {
        "탱커": { icon: "🛡️", champions: ["알리스타", "말파이트", "레오나"] },
        "전사": { icon: "⚔️", champions: ["가렌", "다리우스", "잭스"] },
        "암살자": { icon: "🗡️", champions: ["제드", "카타리나", "탈론"] },
        "마법사": { icon: "🔮", champions: ["럭스", "아리", "빅토르"] },
        "원거리딜러": { icon: "🏹", champions: ["애쉬", "베인", "카이사"] },
        "서포터": { icon: "✨", champions: ["소라카", "유미", "쓰레쉬"] }
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
    make: function(title, content, help, isRoot) {
        var div = Utils.getFixedDivider();
        var wrappedContent = Utils.wrapText(content);
        var wrappedHelp = Utils.wrapText(help);
        
        var res = "『 " + title + " 』\n" + div + "\n" + wrappedContent + "\n" + div + "\n";
        if (help) res += "💡 " + wrappedHelp;
        if (!isRoot) res += "\n" + div + "\n" + Utils.getNav();
        return res;
    },
    renderProfile: function(id, data, help, content, isRoot) {
        var lp = data.lp || 0;
        var tier = getTierInfo(lp);
        var win = data.win || 0, lose = data.lose || 0, total = win + lose;
        var winRate = total === 0 ? 0 : Math.floor((win / total) * 100);
        var div = Utils.getFixedDivider();
        
        var s1 = "👤 계정: " + id + "\n🏅 칭호: [" + data.title + "]";
        var s2 = "🏆 티어: " + tier.icon + tier.name + " (" + lp + ")\n💰 골드: " + (data.gold || 0).toLocaleString() + " G\n⚔️ 전적: " + win + "승 " + lose + "패 (" + winRate + "%)";
        
        var wrappedContent = Utils.wrapText(content);
        var wrappedHelp = Utils.wrapText(help);

        var res = "『 " + id + " 님 』\n" + div + "\n" + s1 + "\n" + div + "\n" + s2 + "\n" + div + "\n";
        if (content) res += wrappedContent + "\n" + div + "\n"; 
        if (help) res += "💡 " + wrappedHelp;
        if (!isRoot) res += "\n" + div + "\n" + Utils.getNav();
        return res;
    },
    go: function(session, screen, title, content, help) {
        var rootScreens = ["USER_MAIN", "ADMIN_MAIN", "GUEST_MAIN", "SUCCESS_IDLE"];
        var isRoot = (rootScreens.indexOf(screen) !== -1);
        
        session.screen = screen;
        session.lastTitle = title;
        if (screen.indexOf("PROFILE") !== -1 || screen.indexOf("DETAIL") !== -1) {
            var tid = session.targetUser || session.tempId;
            var td = (session.targetUser) ? Database.data[session.targetUser] : session.data;
            return UI.renderProfile(tid, td, help, content, isRoot);
        }
        return this.make(title, content, help, isRoot);
    },
    renderMenu: function(session) {
        if (session.type === "ADMIN") return this.go(session, "ADMIN_MAIN", "관리 센터", "1. 시스템 정보\n2. 유저 관리", "원하시는 관리 항목의 번호를 입력해 주십시오");
        if (!session.data) return this.go(session, "GUEST_MAIN", "환영합니다", "1. 회원가입\n2. 로그인\n3. 운영진 문의", "진행하실 메뉴 번호를 선택해 주십시오");
        return this.go(session, "USER_MAIN", "메인 로비", "1. 프로필 조회\n2. 컬렉션 확인\n3. 대전 모드\n4. 상점 이용\n5. 운영진 문의\n6. 로그아웃", "진행하실 작업 번호를 입력해 주십시오");
    }
};

// ━━━━━━━━ [3. DB 및 세션 매니저] ━━━━━━━━
var Database = {
    data: {},
    load: function() { try { return JSON.parse(FileStream.read(Config.DB_PATH)); } catch(e) { return {}; } },
    save: function(d) { this.data = d; FileStream.write(Config.DB_PATH, JSON.stringify(d, null, 4)); },
    getInitData: function(pw) { return { pw: pw, gold: 1000, level: 1, lp: 0, win: 0, lose: 0, title: "뉴비", collection: { titles: ["뉴비"], champions: [] }, inquiryCount: 0 }; }
};

var SessionManager = {
    sessions: {},
    load: function() { try { this.sessions = JSON.parse(FileStream.read(Config.SESSION_PATH)); } catch(e) { this.sessions = {}; } },
    save: function() { FileStream.write(Config.SESSION_PATH, JSON.stringify(this.sessions)); },
    get: function(room, hash) {
        if (!this.sessions[hash]) {
            this.sessions[hash] = { data: null, screen: "IDLE", lastTitle: "메뉴", tempId: "비회원", userListCache: [], targetUser: null, editType: null, room: room, lastTime: Date.now() };
        }
        var s = this.sessions[hash];
        s.room = room;
        s.type = (room === Config.AdminRoom) ? "ADMIN" : "DIRECT";
        var now = Date.now();
        if (s.screen !== "IDLE" && (now - (s.lastTime || 0) > Config.TIMEOUT)) { this.reset(s); }
        s.lastTime = now;
        return s;
    },
    reset: function(session) { session.screen = "IDLE"; session.userListCache = []; session.targetUser = null; session.editType = null; },
    findUserRoom: function(userId) {
        for (var h in this.sessions) { if (this.sessions[h].tempId === userId) return this.sessions[h].room; }
        return userId;
    },
    forceLogout: function(userId) {
        for (var h in this.sessions) { if (this.sessions[h].tempId === userId) { this.sessions[h].data = null; this.sessions[h].tempId = "비회원"; this.reset(this.sessions[h]); } }
        this.save();
    }
};

// ━━━━━━━━ [4. 관리자 액션 모듈] ━━━━━━━━
var AdminActions = {
    showSysInfo: function(session, replier) {
        var rt = java.lang.Runtime.getRuntime();
        var used = Math.floor((rt.totalMemory() - rt.freeMemory()) / 1024 / 1024);
        var info = "📟 메모리: " + used + "MB\n👥 유저: " + Object.keys(Database.data).length + "명\n🛡️ 버전: " + Config.Version;
        replier.reply(UI.go(session, "ADMIN_SYS_INFO", "시스템 정보", info, "정보 조회가 완료되었습니다"));
    },
    showUserList: function(session, replier) {
        session.userListCache = Object.keys(Database.data);
        var list = session.userListCache.map(function(id, i){ 
            var qCount = Database.data[id].inquiryCount || 0;
            var badge = (qCount > 0) ? " [🔔문의]" : "";
            return (i+1) + ". " + id + badge; 
        }).join("\n");
        replier.reply(UI.go(session, "ADMIN_USER_LIST", "유저 목록", list, "관리할 유저 번호를 선택해 주십시오"));
    },
    submitAnswer: function(msg, session, replier) {
        var targetRoom = SessionManager.findUserRoom(session.targetUser);
        Api.replyRoom(targetRoom, UI.make("운영진 회신", "보내신 문의에 대한 답변입니다\n\n" + msg, "소환사의 협곡 드림", true));
        if(Database.data[session.targetUser]) { Database.data[session.targetUser].inquiryCount = 0; Database.save(Database.data); }
        SessionManager.reset(session);
        replier.reply(UI.go(session, "SUCCESS_IDLE", "전송 완료", "답변이 유저에게 성공적으로 전달되었습니다", "메인으로 복귀합니다"));
    },
    editUserData: function(msg, session, replier) {
        var val = parseInt(msg);
        if (isNaN(val)) return replier.reply(UI.make("입력 오류", "수치 수정을 위해 숫자만 입력해 주시기 바랍니다", "다시 입력해 주십시오"));
        Database.data[session.targetUser][session.editType] = val;
        Database.save(Database.data);
        Api.replyRoom(SessionManager.findUserRoom(session.targetUser), UI.make("알림", "[" + (session.editType === "gold" ? "골드" : "LP") + "] 정보가 조정되었습니다", "운영 정책 조치", true));
        SessionManager.reset(session);
        replier.reply(UI.go(session, "SUCCESS_IDLE", "수정 완료", "데이터가 정상적으로 반영되었습니다", "메인으로 복귀합니다"));
    },
    resetConfirm: function(msg, session, replier) {
        if (msg === "확인") {
            Database.data[session.targetUser] = Database.getInitData(Database.data[session.targetUser].pw);
            Database.save(Database.data);
            Api.replyRoom(SessionManager.findUserRoom(session.targetUser), UI.make("알림", "모든 데이터가 초기화되었습니다", "관리자 조치 안내", true));
            SessionManager.reset(session);
            replier.reply(UI.go(session, "SUCCESS_IDLE", "초기화 완료", "성공적으로 초기화되었습니다", "메인으로 복귀합니다"));
        }
    },
    deleteConfirm: function(msg, session, replier) {
        if (msg === "삭제확인") {
            Api.replyRoom(SessionManager.findUserRoom(session.targetUser), UI.make("알림", "계정이 삭제 처리 되었습니다", "관리자 조치 안내", true));
            delete Database.data[session.targetUser];
            Database.save(Database.data);
            SessionManager.forceLogout(session.targetUser);
            SessionManager.reset(session);
            replier.reply(UI.go(session, "SUCCESS_IDLE", "삭제 완료", "계정이 영구 삭제되었습니다", "메인으로 복귀합니다"));
        }
    }
};

// ━━━━━━━━ [5. 유저 액션 모듈] ━━━━━━━━
var UserActions = {
    handleInquiry: function(msg, session, replier) {
        if (session.data) {
            session.data.inquiryCount = (session.data.inquiryCount || 0) + 1;
            Database.save(Database.data);
            Api.replyRoom(Config.AdminRoom, UI.make("문의 접수", "유저: " + session.tempId + "\n내용: " + msg, "조속히 답변 바랍니다", true));
        } else {
            Api.replyRoom(Config.AdminRoom, UI.make("비회원 문의", "발신: " + session.room + "\n내용: " + msg, "회신 불가 세션", true));
        }
        SessionManager.reset(session);
        replier.reply(UI.make("접수 성공", "문의 내용이 전달되었습니다", "이용해 주셔서 감사합니다", true));
    },
    showCollection: function(msg, session, replier) {
        var d = session.data;
        if (session.screen === "COL_MAIN") {
            if (msg === "1") {
                var tList = d.collection.titles.map(function(t, i) { return (i+1) + ". " + (t === d.title ? "✅" : "") + t; }).join("\n");
                return replier.reply(UI.go(session, "COL_TITLE_ACTION", "보유 칭호", tList, "장착할 번호를 입력해 주십시오"));
            }
            if (msg === "2") {
                var cList = (d.collection.champions.length > 0) ? d.collection.champions.join("\n") : "보유 챔피언 없음";
                return replier.reply(UI.go(session, "COL_CHAR_VIEW", "나의 챔피언", cList, "수집하신 챔피언 목록입니다"));
            }
        }
        if (session.screen === "COL_TITLE_ACTION") {
            var idx = parseInt(msg) - 1;
            if (d.collection.titles[idx]) {
                d.title = d.collection.titles[idx];
                Database.save(Database.data);
                SessionManager.reset(session);
                return replier.reply(UI.make("설정 완료", "[" + d.title + "]를 장착하였습니다", "프로필에서 확인 가능합니다", true));
            }
        }
    },
    handleShop: function(msg, session, replier) {
        var d = session.data;
        if (session.screen === "SHOP_MAIN" && msg === "1") {
            return replier.reply(UI.go(session, "SHOP_ROLES", "카테고리", RoleKeys.map(function(r, i){ return (i+1)+". "+r; }).join("\n"), "카테고리를 선택해 주십시오"));
        }
        if (session.screen === "SHOP_ROLES") {
            var rIdx = parseInt(msg) - 1;
            if (RoleKeys[rIdx]) {
                session.selectedRole = RoleKeys[rIdx];
                var uList = SystemData.roles[session.selectedRole].champions.map(function(u, i) {
                    var owned = d.collection.champions.indexOf(u) !== -1;
                    return (i+1) + ". " + u + (owned ? " [보유]" : " (500G)");
                }).join("\n");
                return replier.reply(UI.go(session, "SHOP_BUY_ACTION", session.selectedRole + " 상점", uList, "구매할 번호를 입력해 주십시오"));
            }
        }
        if (session.screen === "SHOP_BUY_ACTION") {
            var units = SystemData.roles[session.selectedRole].champions, uIdx = parseInt(msg) - 1;
            if (units[uIdx]) {
                var target = units[uIdx];
                if (d.collection.champions.indexOf(target) !== -1) return replier.reply(UI.make("구매 불가", "이미 보유 중인 챔피언입니다", "다른 대상을 선택해 주십시오"));
                if (d.gold < 500) return replier.reply(UI.make("잔액 부족", "골드가 부족합니다", "보유: " + d.gold + "G"));
                d.gold -= 500; d.collection.champions.push(target);
                Database.save(Database.data);
                SessionManager.reset(session);
                return replier.reply(UI.make("구매 성공", "[" + target + "]을(를) 영입하였습니다", "잔액: "+d.gold+"G", true));
            }
        }
    },
    handleBattle: function(msg, session, replier) {
        if (session.screen === "BATTLE_MAIN" && msg === "1") {
            return replier.reply(UI.go(session, "BATTLE_AI_SEARCH", "매칭 진행", "🤖 상대 검색 중...", "잠시 대기 바랍니다"));
        }
        if (session.screen === "BATTLE_AI_SEARCH") {
            return replier.reply(UI.go(session, "BATTLE_PREP", "전투 준비", "⚔️ AI 유미 발견\n시작하시겠습니까?", "'시작'을 입력해 주십시오"));
        }
        if (session.screen === "BATTLE_PREP" && msg === "시작") {
            SessionManager.reset(session);
            return replier.reply(UI.make("알림", "전투 시스템은 현재 점검 중입니다", "메인 복귀", true));
        }
    }
};

// ━━━━━━━━ [6. 매니저: 관리자 핸들러] ━━━━━━━━
var AdminManager = {
    handle: function(msg, session, replier) {
        switch(session.screen) {
            case "ADMIN_MAIN":
                if (msg === "1") return AdminActions.showSysInfo(session, replier);
                if (msg === "2") return AdminActions.showUserList(session, replier);
                break;
            case "ADMIN_USER_LIST":
                var idx = parseInt(msg) - 1;
                if (session.userListCache[idx]) {
                    session.targetUser = session.userListCache[idx];
                    return replier.reply(UI.go(session, "ADMIN_USER_DETAIL", session.targetUser, "1. 정보 수정\n2. 답변 전송\n3. 초기화\n4. 계정 삭제", "수행할 작업을 선택해 주십시오"));
                }
                break;
            case "ADMIN_USER_DETAIL":
                if (msg === "1") return replier.reply(UI.go(session, "ADMIN_EDIT_MENU", "정보 수정", "1. 골드 수정\n2. LP 수정", "항목을 선택해 주십시오"));
                if (msg === "2") return replier.reply(UI.go(session, "ADMIN_ANSWER_INPUT", "답변 작성", "["+session.targetUser+"] 유저 답변 내용을 입력하십시오", "전송 대기 중입니다"));
                if (msg === "3") return replier.reply(UI.go(session, "ADMIN_RESET_CONFIRM", "초기화", "해당 계정을 초기화하시겠습니까?", "'확인'을 입력해 주십시오"));
                if (msg === "4") return replier.reply(UI.go(session, "ADMIN_DELETE_CONFIRM", "계정 삭제", "해당 계정을 삭제하시겠습니까?", "'삭제확인'을 입력해 주십시오"));
                break;
            case "ADMIN_ANSWER_INPUT": return AdminActions.submitAnswer(msg, session, replier);
            case "ADMIN_EDIT_MENU":
                if (msg === "1") { session.editType = "gold"; return replier.reply(UI.go(session, "ADMIN_EDIT_INPUT", "골드 수정", "금액을 입력하십시오", "입력 대기 중입니다")); }
                if (msg === "2") { session.editType = "lp"; return replier.reply(UI.go(session, "ADMIN_EDIT_INPUT", "LP 수정", "점수를 입력하십시오", "입력 대기 중입니다")); }
                break;
            case "ADMIN_EDIT_INPUT": return AdminActions.editUserData(msg, session, replier);
            case "ADMIN_RESET_CONFIRM": return AdminActions.resetConfirm(msg, session, replier);
            case "ADMIN_DELETE_CONFIRM": return AdminActions.deleteConfirm(msg, session, replier);
        }
    }
};

// ━━━━━━━━ [7. 매니저: 로그인 핸들러] ━━━━━━━━
var LoginManager = {
    handle: function(msg, session, replier) {
        switch(session.screen) {
            case "GUEST_MAIN":
                if (msg === "1") return replier.reply(UI.go(session, "JOIN_ID", "회원가입", "ID 입력 (최대 10자)", "아이디를 입력해 주십시오"));
                if (msg === "2") return replier.reply(UI.go(session, "LOGIN_ID", "로그인", "ID 입력", "아이디를 입력해 주십시오"));
                if (msg === "3") return replier.reply(UI.go(session, "GUEST_INQUIRY", "문의 접수", "내용 입력", "문의 내용을 입력해 주십시오"));
                break;
            case "JOIN_ID":
                if (msg.length > 10) return replier.reply(UI.make("오류", "10자까지만 가능합니다", "다시 입력해 주십시오"));
                if (Database.data[msg]) return replier.reply(UI.make("오류", "이미 존재하는 ID입니다", "다른 ID 입력"));
                session.tempId = msg;
                return replier.reply(UI.go(session, "JOIN_PW", "회원가입", "비밀번호 설정", "비밀번호를 입력해 주십시오"));
            case "JOIN_PW":
                Database.data[session.tempId] = Database.getInitData(msg);
                Database.save(Database.data);
                session.data = Database.data[session.tempId];
                replier.reply(UI.make("성공", session.tempId + "님,\n가입 환영합니다!", "자동 로그인 완료", true));
                SessionManager.reset(session);
                return replier.reply(UI.renderMenu(session));
            case "LOGIN_ID":
                session.tempId = msg;
                return replier.reply(UI.go(session, "LOGIN_PW", "본인 확인", "비밀번호 입력", "비밀번호를 입력해 주십시오"));
            case "LOGIN_PW":
                if (Database.data[session.tempId] && Database.data[session.tempId].pw === msg) {
                    session.data = Database.data[session.tempId];
                    replier.reply(UI.make("성공", session.tempId + "님, 환영합니다!", "협곡에 오신 것을 환영합니다", true));
                    SessionManager.reset(session);
                    return replier.reply(UI.renderMenu(session));
                }
                return replier.reply(UI.make("실패", "정보가 일치하지 않습니다", "다시 시도해 주십시오"));
            case "GUEST_INQUIRY": return UserActions.handleInquiry(msg, session, replier);
        }
    }
};

// ━━━━━━━━ [8. 매니저: 유저 핸들러] ━━━━━━━━
var UserManager = {
    handle: function(msg, session, replier) {
        switch(session.screen) {
            case "USER_MAIN":
                if (msg === "1") return replier.reply(UI.go(session, "PROFILE_VIEW", "내 프로필", "", "정보 조회가 완료되었습니다"));
                if (msg === "2") return replier.reply(UI.go(session, "COL_MAIN", "컬렉션", "1. 보유 칭호\n2. 보유 챔피언", "확인할 항목 번호를 입력해 주십시오"));
                if (msg === "3") return replier.reply(UI.go(session, "BATTLE_MAIN", "대전 모드", "1. AI 대전 시작", "모드를 선택해 주십시오"));
                if (msg === "4") return replier.reply(UI.go(session, "SHOP_MAIN", "상점", "1. 챔피언 영입", "이용할 메뉴 번호를 입력해 주십시오"));
                if (msg === "5") return replier.reply(UI.go(session, "USER_INQUIRY", "문의 접수", "내용 입력", "운영진에게 보낼 내용을 입력하십시오"));
                if (msg === "6") { SessionManager.forceLogout(session.tempId); return replier.reply(UI.make("알림", "로그아웃되었습니다", "이용해 주셔서 감사합니다", true)); }
                break;
            case "USER_INQUIRY": return UserActions.handleInquiry(msg, session, replier);
            case "COL_MAIN": case "COL_TITLE_ACTION": return UserActions.showCollection(msg, session, replier);
            case "SHOP_MAIN": case "SHOP_ROLES": case "SHOP_BUY_ACTION": return UserActions.handleShop(msg, session, replier);
            case "BATTLE_MAIN": case "BATTLE_AI_SEARCH": case "BATTLE_PREP": return UserActions.handleBattle(msg, session, replier);
        }
    }
};

// ━━━━━━━━ [9. 메인 응답 핸들러] ━━━━━━━━
Database.data = Database.load(); 
SessionManager.load();          

function response(room, msg, sender, isGroupChat, replier, imageDB) {
    try {
        if (!msg) return; 
        if (isGroupChat && room !== Config.AdminRoom) return; 

        var hash = String(imageDB.getProfileHash()); 
        var session = SessionManager.get(room, hash); 
        msg = msg.trim(); 
        
        if (msg === "메뉴" || msg === "취소" || (room === Config.AdminRoom && msg === "관리자")) {
            SessionManager.reset(session); 
            return replier.reply(UI.renderMenu(session)); 
        }

        // [상위 카테고리 이동형 '이전' 로직]
        if (msg === "이전") {
            var curr = session.screen;
            // 게스트 관련
            if (curr.indexOf("JOIN_") !== -1 || curr.indexOf("LOGIN_") !== -1 || curr === "GUEST_INQUIRY") {
                return replier.reply(UI.go(session, "GUEST_MAIN", "환영합니다", "1. 회원가입\n2. 로그인\n3. 운영진 문의", "메뉴를 선택해 주십시오"));
            }
            // 유저 컬렉션/상점/대전
            if (curr === "COL_TITLE_ACTION" || curr === "COL_CHAR_VIEW") {
                return replier.reply(UI.go(session, "COL_MAIN", "컬렉션", "1. 보유 칭호\n2. 보유 챔피언", "항목을 선택해 주십시오"));
            }
            if (curr === "SHOP_ROLES") return replier.reply(UI.renderMenu(session));
            if (curr === "SHOP_BUY_ACTION") {
                return replier.reply(UI.go(session, "SHOP_ROLES", "카테고리", RoleKeys.map(function(r, i){ return (i+1)+". "+r; }).join("\n"), "카테고리를 선택해 주십시오"));
            }
            if (curr.indexOf("BATTLE_") !== -1) {
                return replier.reply(UI.go(session, "BATTLE_MAIN", "대전 모드", "1. AI 대전 시작", "모드를 선택해 주십시오"));
            }
            // 관리자 관련
            if (curr === "ADMIN_USER_DETAIL") return AdminActions.showUserList(session, replier);
            if (curr.indexOf("ADMIN_EDIT") !== -1 || curr === "ADMIN_ANSWER_INPUT" || curr.indexOf("CONFIRM") !== -1) {
                return replier.reply(UI.go(session, "ADMIN_USER_DETAIL", session.targetUser, "1. 정보 수정\n2. 답변 전송\n3. 초기화\n4. 계정 삭제", "수행할 작업을 선택해 주십시오"));
            }
            // 기본값
            SessionManager.reset(session);
            return replier.reply(UI.renderMenu(session));
        }

        if (session.screen === "IDLE") {
            if (msg === "메뉴" || room === Config.AdminRoom) return replier.reply(UI.renderMenu(session));
            return;
        }
        
        if (session.type === "ADMIN") {
            AdminManager.handle(msg, session, replier);
        } else if (!session.data) {
            LoginManager.handle(msg, session, replier);
        } else {
            UserManager.handle(msg, session, replier);
        }

        SessionManager.save();
    } catch (e) { 
        Api.replyRoom(Config.AdminRoom, "🚨 시스템 오류\n내용: " + e.message + "\n라인: " + e.lineNumber); 
    }
}
