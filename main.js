/**
 * [main.js] v7.9.2
 * 1. UI 수정: 관리자 상세 메뉴 명칭 변경 ([수정]   [초기화]   [삭제]) 및 번호 제거.
 * 2. 삭제 기능: 관리자 전용 '계정 삭제' 로직 유지.
 * 3. 고정 UI: 네비게이션 간격 1칸 및 고정 구분선 유지.
 * 4. 무생략: 모든 관리자/유저/시스템 매니저 코드 포함.
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
    NAV_ITEMS: ["⬅️ 이전", "🚫 취소", "🏠 메뉴"]
};

var Utils = {
    getFixedNav: function() {
        var sp = " "; 
        return Config.NAV_ITEMS[0] + sp + "|" + sp + Config.NAV_ITEMS[1] + sp + "|" + sp + Config.NAV_ITEMS[2];
    },
    getFixedLine: function() {
        return Array(15).join(Config.LINE_CHAR);
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
    { name: "아이언", icon: "⚫" }
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
        var line = Utils.getFixedLine();
        var navBar = Utils.getFixedNav();
        var res = "『 " + title + " 』\n" + line + "\n" + content + "\n" + line + "\n";
        if (help) res += "💡 " + help + "\n" + line + "\n";
        res += navBar;
        return res;
    },
    renderProfile: function(id, data) {
        var tier = getTierInfo(data.lp);
        return "👤 닉네임: " + id + "\n🏅 칭호: [" + data.title + "]\n" +
               "🏆 티어: " + tier.icon + " " + tier.name + " (" + data.lp + " LP)\n" +
               "💰 골드: " + data.gold.toLocaleString() + " G\n" +
               "⭐ 레벨: Lv." + data.level + "\n" +
               "⚔️ 전적: " + (data.win || 0) + "승 " + (data.lose || 0) + "패";
    },
    go: function(session, screen, title, content, help) {
        if (session.screen && session.screen !== screen && session.screen !== "IDLE") {
            if (!session.history) session.history = [];
            session.history.push({ screen: session.screen, title: session.lastTitle });
        }
        session.screen = screen;
        session.lastTitle = title;
        return this.make(title, content, help);
    },
    renderMenu: function(session, sender) {
        session.history = [];
        if (session.type === "ADMIN") return this.go(session, "ADMIN_MAIN", "관리자 메뉴", "1. 시스템 정보\n2. 유저 관리", "보안 등급: 최고 권한");
        if (session.type === "GROUP") {
            var userData = Database.data[sender];
            if (!userData) {
                session.screen = "IDLE";
                return UI.make("알림", "'시스템'에게 1대1 채팅을 걸어\n개인톡에서 가입 및 로그인을 진행해 주세요.", "가입 정보가 없습니다.");
            }
            return this.go(session, "GROUP_MAIN", "메인 메뉴", "1. 내 정보 확인", "소환사의 협곡");
        }
        if (session.type === "DIRECT") {
            if (!session.data) return this.go(session, "GUEST_MAIN", "메인 메뉴", "1. 회원가입\n2. 로그인", "계정 접속 필요");
            return this.go(session, "USER_MAIN", "메인 메뉴", "1. 프로필\n2. 컬렉션\n3. 상점\n4. 로그아웃", "환영합니다!");
        }
    }
};

// ━━━━━━━━ [3. DB 및 세션 매니저] ━━━━━━━━
var Database = {
    data: {},
    load: function() { try { return JSON.parse(FileStream.read(Config.DB_PATH)); } catch(e) { return {}; } },
    save: function(d) { this.data = d; FileStream.write(Config.DB_PATH, JSON.stringify(d, null, 4)); },
    getInitData: function(pw) {
        return { pw: pw, gold: 1000, level: 1, lp: 0, win: 0, lose: 0, title: "뉴비", collection: { titles: ["뉴비"], characters: [] } };
    }
};

var SessionManager = {
    sessions: {},
    load: function() { try { this.sessions = JSON.parse(FileStream.read(Config.SESSION_PATH)); } catch(e) { this.sessions = {}; } },
    save: function() { FileStream.write(Config.SESSION_PATH, JSON.stringify(this.sessions)); },
    get: function(r, h, g) {
        if (!this.sessions[h]) {
            this.sessions[h] = { data: null, screen: "IDLE", history: [], lastTitle: "메뉴", tempId: null, userListCache: [], targetUser: null, editType: null };
        }
        var s = this.sessions[h];
        if (r === Config.AdminRoom) s.type = "ADMIN";
        else if (g && r === Config.GroupRoom) s.type = "GROUP";
        else if (!g) s.type = "DIRECT";
        return s;
    },
    reset: function(session) {
        session.screen = "IDLE";
        session.history = []; session.userListCache = [];
        session.targetUser = null; session.editType = null;
        if (!session.data) session.tempId = null;
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
                    var sysInfo = "⚡ 속도: " + (new Date().getTime() - startTime) + "ms\n📟 RAM: " + used + " MB\n👥 총원: " + Object.keys(Database.data).length + "명";
                    replier.reply(UI.make("시스템 정보", sysInfo, "서버 리소스 관제"));
                } else if (msg === "2") {
                    session.userListCache = Object.keys(Database.data);
                    replier.reply(UI.go(session, "ADMIN_USER_LIST", "유저 관리", session.userListCache.map(function(id, i){ return (i+1)+". "+id; }).join("\n"), "조회할 유저 선택"));
                }
                break;
            case "ADMIN_USER_LIST":
                var idx = parseInt(msg) - 1;
                if (session.userListCache[idx]) {
                    session.targetUser = session.userListCache[idx];
                    var ud = Database.data[session.targetUser];
                    // 명칭 변경: [수정]   [초기화]   [삭제] (공백 3칸)
                    var adminMenu = "[수정]   [초기화]   [삭제]";
                    replier.reply(UI.go(session, "ADMIN_USER_DETAIL", session.targetUser, UI.renderProfile(session.targetUser, ud), adminMenu));
                }
                break;
            case "ADMIN_USER_DETAIL":
                if (msg === "수정") replier.reply(UI.go(session, "ADMIN_EDIT_SELECT", "수정 항목 선택", "1. 골드 수정\n2. LP 수정\n3. 레벨 수정", "변경할 속성 선택"));
                else if (msg === "초기화") replier.reply(UI.go(session, "ADMIN_RESET_CONFIRM", "초기화 확인", "정말로 " + session.targetUser + "님의 데이터를 초기화하시겠습니까?\n(입력: 확인)", "취소는 하단 취소"));
                else if (msg === "삭제") replier.reply(UI.go(session, "ADMIN_DELETE_CONFIRM", "계정 삭제 확인", session.targetUser + "님의 계정을 영구 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.\n(입력: 삭제확인)", "취소는 하단 취소"));
                break;
            case "ADMIN_EDIT_SELECT":
                var types = ["gold", "lp", "level"], names = ["골드", "LP", "레벨"], tIdx = parseInt(msg) - 1;
                if (types[tIdx]) {
                    session.editType = types[tIdx];
                    replier.reply(UI.go(session, "ADMIN_EDIT_INPUT", names[tIdx] + " 수정", "현재 값: " + Database.data[session.targetUser][session.editType] + "\n변경할 수치를 입력하세요.", "숫자만 입력"));
                }
                break;
            case "ADMIN_EDIT_INPUT":
                var val = parseInt(msg);
                if (!isNaN(val)) {
                    Database.data[session.targetUser][session.editType] = val; Database.save(Database.data);
                    replier.reply(UI.make("수정 완료", session.targetUser + "님의 데이터가 변경되었습니다.", ""));
                    session.screen = "ADMIN_USER_DETAIL";
                    replier.reply(UI.make(session.targetUser, UI.renderProfile(session.targetUser, Database.data[session.targetUser]), "[수정]   [초기화]   [삭제]"));
                }
                break;
            case "ADMIN_RESET_CONFIRM":
                if (msg === "확인") {
                    var oldPw = Database.data[session.targetUser].pw;
                    Database.data[session.targetUser] = Database.getInitData(oldPw); Database.save(Database.data);
                    replier.reply(UI.make("초기화 완료", session.targetUser + "님의 데이터가 리셋되었습니다.", ""));
                    session.screen = "ADMIN_USER_DETAIL";
                    replier.reply(UI.make(session.targetUser, UI.renderProfile(session.targetUser, Database.data[session.targetUser]), "[수정]   [초기화]   [삭제]"));
                }
                break;
            case "ADMIN_DELETE_CONFIRM":
                if (msg === "삭제확인") {
                    delete Database.data[session.targetUser]; Database.save(Database.data);
                    replier.reply(UI.make("삭제 완료", session.targetUser + "님의 계정이 삭제되었습니다.", ""));
                    session.userListCache = Object.keys(Database.data);
                    replier.reply(UI.go(session, "ADMIN_USER_LIST", "유저 관리", session.userListCache.map(function(id, i){ return (i+1)+". "+id; }).join("\n"), "조회할 유저 선택"));
                }
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
                    if (msg === "1") replier.reply(UI.go(session, "JOIN_ID", "회원가입", "아이디를 입력하세요.\n(아이디는 닉네임으로 사용됩니다.)", "공백 없이 입력"));
                    else if (msg === "2") replier.reply(UI.go(session, "LOGIN_ID", "로그인", "아이디를 입력하세요.", ""));
                    break;
                case "JOIN_ID":
                    if (Database.data[msg]) return replier.reply(UI.make("오류", "이미 존재하는 아이디입니다.", "다른 아이디 입력"));
                    session.tempId = msg; 
                    replier.reply(UI.go(session, "JOIN_PW", "비밀번호 설정", "비밀번호를 입력하세요.", "")); 
                    break;
                case "JOIN_PW": 
                    Database.data[session.tempId] = Database.getInitData(msg); Database.save(Database.data);
                    session.data = Database.data[session.tempId];
                    replier.reply(UI.renderMenu(session, sender)); break;
                case "LOGIN_ID": session.tempId = msg; replier.reply(UI.go(session, "LOGIN_PW", "비밀번호 입력", "비밀번호를 입력하세요.", "")); break;
                case "LOGIN_PW":
                    if (Database.data[session.tempId] && Database.data[session.tempId].pw === msg) {
                        session.data = Database.data[session.tempId];
                        replier.reply(UI.renderMenu(session, sender));
                    } else replier.reply(UI.make("오류", "정보가 일치하지 않습니다.", ""));
                    break;
            }
        } else {
            switch(session.screen) {
                case "USER_MAIN":
                    if (msg === "1") replier.reply(UI.go(session, "PROFILE_VIEW", "프로필", UI.renderProfile(session.tempId, d), "전투 정보 요약"));
                    else if (msg === "2") replier.reply(UI.go(session, "COL_MAIN", "컬렉션", "1. 보유 칭호 관리\n2. 보유 캐릭터 목록", "항목 선택"));
                    else if (msg === "3") replier.reply(UI.go(session, "SHOP_ROLES", "상점", RoleKeys.map(function(r, i){ return (i+1)+". "+r; }).join("\n"), "역할군 선택"));
                    else if (msg === "4") { session.data = null; session.tempId = null; replier.reply(UI.renderMenu(session, sender)); }
                    break;
                case "COL_MAIN":
                    if (msg === "1") {
                        var tList = d.collection.titles.map(function(t, i) { return (i+1) + ". " + (t === d.title ? "✅ " : "") + t; }).join("\n");
                        replier.reply(UI.go(session, "COL_TITLE_ACTION", "보유 칭호 관리", tList, "번호 입력 시 즉시 장착"));
                    } else if (msg === "2") {
                        var cList = d.collection.characters.length > 0 ? d.collection.characters.join("\n") : "보유한 캐릭터가 없습니다.";
                        replier.reply(UI.go(session, "COL_CHAR_VIEW", "보유 캐릭터 목록", cList, "조회 전용"));
                    }
                    break;
                case "COL_TITLE_ACTION":
                    var tIdx = parseInt(msg) - 1;
                    if (d.collection.titles[tIdx]) {
                        d.title = d.collection.titles[tIdx]; Database.save(Database.data);
                        replier.reply(UI.make("장착 완료", "[" + d.title + "] 칭호로 변경되었습니다.", ""));
                    }
                    break;
                case "SHOP_ROLES":
                    var rIdx = parseInt(msg) - 1;
                    if (RoleKeys[rIdx]) {
                        session.selectedRole = RoleKeys[rIdx];
                        var uList = SystemData.roles[session.selectedRole].units.map(function(u, i) {
                            var owned = d.collection.characters.indexOf(u) !== -1;
                            return (i+1) + ". " + u + (owned ? " [보유]" : " (500G)");
                        }).join("\n");
                        replier.reply(UI.go(session, "SHOP_BUY_ACTION", session.selectedRole, uList, "번호 입력 시 즉시 구매"));
                    }
                    break;
                case "SHOP_BUY_ACTION":
                    var units = SystemData.roles[session.selectedRole].units, uIdx = parseInt(msg) - 1;
                    if (units[uIdx]) {
                        var target = units[uIdx];
                        if (d.collection.characters.indexOf(target) !== -1) replier.reply(UI.make("알림", "이미 보유 중인 캐릭터입니다.", ""));
                        else if (d.gold < 500) replier.reply(UI.make("알림", "골드가 부족합니다.", "잔액: " + d.gold + "G"));
                        else {
                            d.gold -= 500; d.collection.characters.push(target); Database.save(Database.data);
                            replier.reply(UI.make("영입 성공", target + " 소환 완료!", "잔액: " + d.gold + "G"));
                        }
                    }
                    break;
            }
        }
    }
};

// ━━━━━━━━ [6. 매니저: 단체방 시스템] ━━━━━━━━
var GroupManager = {
    handle: function(msg, session, replier, sender) {
        if (session.screen === "GROUP_MAIN" && msg === "1") {
            var d = Database.data[sender];
            if (!d) return; 
            replier.reply(UI.make("내 정보 확인", UI.renderProfile(sender, d), "전투 데이터"));
        }
    }
};

// ━━━━━━━━ [7. 메인 응답 핸들러] ━━━━━━━━
Database.data = Database.load();
SessionManager.load();

function response(room, msg, sender, isGroupChat, replier, imageDB) {
    var startTime = new Date().getTime();
    try {
        if (!msg) return;
        var hash = String(imageDB.getProfileHash());
        var session = SessionManager.get(room, hash, isGroupChat);
        msg = msg.trim();

        if (msg === "이전" || msg === "⬅️ 이전") {
            if (session.history && session.history.length > 0) {
                var prev = session.history.pop();
                session.screen = prev.screen; session.lastTitle = prev.title;
                return replier.reply(UI.renderMenu(session, sender));
            } else return replier.reply(UI.renderMenu(session, sender));
        }
        if (msg === "취소" || msg === "🚫 취소") { 
            SessionManager.reset(session); 
            SessionManager.save();
            return replier.reply("작업이 중지되었습니다.");
        }
        if (msg === "메뉴" || msg === "🏠 메뉴") { 
            SessionManager.reset(session); 
            return replier.reply(UI.renderMenu(session, sender)); 
        }

        if (session.screen === "IDLE") return; 

        if (session.type === "ADMIN" && hash === Config.AdminHash) AdminManager.handle(msg, session, replier, startTime);
        else if (session.type === "GROUP") GroupManager.handle(msg, session, replier, sender);
        else if (session.type === "DIRECT") UserManager.handle(msg, session, replier, sender);
        
        SessionManager.save();
    } catch (e) {
        Api.replyRoom(Config.AdminRoom, "⚠️ [v7.9.2 에러]: " + e.message + " (L:" + e.lineNumber + ")");
    }
}
