/**
 * [main.js] v8.2.3~v8.2.5
 * 1. 수정: 하단 문구를 다음 단계 진행을 위한 안내 가이드로 변경.
 * 2. 유지: 상점 -> 캐릭터 구매 -> 역할군 -> 구매 확정 흐름.
 * 3. 규격: 자동 줄바꿈 없음, 12칸 구분선, 하단 고정 UI 적용.
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
    LINE_COUNT: 12, 
    NAV_ITEMS: ["⬅️ 이전", "🚫 취소", "🏠 메뉴"]
};

var Utils = {
    getFixedNav: function() {
        var sp = " "; 
        return Config.NAV_ITEMS[0] + sp + "|" + sp + Config.NAV_ITEMS[1] + sp + "|" + sp + Config.NAV_ITEMS[2];
    },
    getFixedLine: function() {
        return Array(Config.LINE_COUNT + 1).join(Config.LINE_CHAR);
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
        var line = Utils.getFixedLine();
        var navBar = Utils.getFixedNav();
        var res = "『 " + title + " 』\n" + line + "\n" + content + "\n" + line + "\n";
        if (help) res += "💡 " + help + "\n" + line + "\n";
        res += navBar;
        return res;
    },
    renderProfile: function(id, data) {
        var tier = getTierInfo(data.lp);
        var win = data.win || 0;
        var lose = data.lose || 0;
        var total = win + lose;
        var winRate = total === 0 ? 0 : Math.floor((win / total) * 100);

        return "👤 계정: " + id + "\n" +
               "🏅 칭호: [" + data.title + "]\n" +
               Utils.getFixedLine() + "\n" +
               "🏆 티어: " + tier.icon + " " + tier.name + " (" + data.lp + " LP)\n" +
               "💰 골드: " + data.gold.toLocaleString() + " G\n" +
               "⭐ 레벨: Lv." + data.level + "\n" +
               "⚔️ 전적: " + win + "승 " + lose + "패 (" + winRate + "%)";
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
        if (session.type === "ADMIN") {
            session.screen = "ADMIN_MAIN";
            return this.go(session, "ADMIN_MAIN", "관리자 메뉴", "1. 시스템 정보\n2. 유저 관리", "관리할 항목의 번호를 입력하세요.");
        }
        if (session.type === "GROUP") {
            if (!session.data) {
                session.screen = "IDLE";
                return UI.make("알림", "'시스템'에게 1대1 채팅을 걸어\n가입 및 로그인을 먼저 해주세요.", "개인톡에서 로그인이 필요합니다.");
            }
            session.screen = "GROUP_MAIN";
            return this.go(session, "GROUP_MAIN", "메인 메뉴", "1. 내 정보 확인", "번호를 입력하여 내 정보를 확인하세요.");
        }
        if (session.type === "DIRECT") {
            if (!session.data) {
                session.screen = "GUEST_MAIN";
                return this.go(session, "GUEST_MAIN", "메인 메뉴", "1. 회원가입\n2. 로그인", "진행할 서비스의 번호를 입력하세요.");
            }
            session.screen = "USER_MAIN";
            return this.go(session, "USER_MAIN", "메인 메뉴", "1. 프로필\n2. 컬렉션\n3. 상점\n4. 로그아웃", "이용할 메뉴의 번호를 입력하세요.");
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
    },
    forceLogout: function(userId) {
        if (!userId) return;
        for (var key in this.sessions) {
            if (this.sessions[key].tempId === userId) {
                this.sessions[key].data = null;
                this.sessions[key].tempId = null;
                this.sessions[key].screen = "IDLE";
                this.sessions[key].history = [];
            }
        }
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
                    var sysInfo = "⚡ 속도: " + (new Date().getTime() - startTime) + "ms\n📟 RAM: " + used + " MB\n👥 총원: " + Object.keys(Database.data).length + "명";
                    replier.reply(UI.make("시스템 정보", sysInfo, "다른 메뉴로 가려면 하단 버튼을 누르세요."));
                } else if (msg === "2") {
                    session.userListCache = Object.keys(Database.data);
                    replier.reply(UI.go(session, "ADMIN_USER_LIST", "유저 관리", session.userListCache.map(function(id, i){ return (i+1)+". "+id; }).join("\n"), "상세 관리할 유저의 번호를 입력하세요."));
                }
                break;
            case "ADMIN_USER_LIST":
                var idx = parseInt(msg) - 1;
                if (session.userListCache[idx]) {
                    session.targetUser = session.userListCache[idx];
                    var ud = Database.data[session.targetUser];
                    var adminMenu = "1. 수정 (정보 변경)\n2. 초기화 (데이터 리셋)\n3. 삭제 (계정 제거)";
                    replier.reply(UI.go(session, "ADMIN_USER_DETAIL", session.targetUser, UI.renderProfile(session.targetUser, ud), "실행할 관리 작업의 번호를 입력하세요."));
                }
                break;
            case "ADMIN_USER_DETAIL":
                if (msg === "1") replier.reply(UI.go(session, "ADMIN_EDIT_SELECT", "수정 항목 선택", "1. 골드 수정\n2. LP 수정\n3. 레벨 수정", "변경하고자 하는 항목의 번호를 입력하세요."));
                else if (msg === "2") replier.reply(UI.go(session, "ADMIN_RESET_CONFIRM", "초기화 확인", "정말로 데이터를 리셋하시겠습니까?\n진행하려면 [확인]을 입력하세요.", "취소하려면 하단 취소 버튼을 누르세요."));
                else if (msg === "3") replier.reply(UI.go(session, "ADMIN_DELETE_CONFIRM", "계정 삭제 확인", "계정을 영구 삭제하시겠습니까?\n진행하려면 [삭제확인]을 입력하세요.", "취소하려면 하단 취소 버튼을 누르세요."));
                break;
            case "ADMIN_EDIT_SELECT":
                var types = ["gold", "lp", "level"], names = ["골드", "LP", "레벨"], tIdx = parseInt(msg) - 1;
                if (types[tIdx]) {
                    session.editType = types[tIdx];
                    replier.reply(UI.go(session, "ADMIN_EDIT_INPUT", names[tIdx] + " 수정", "현재 값: " + Database.data[session.targetUser][session.editType], "새로 설정할 수치(숫자)를 입력하세요."));
                }
                break;
            case "ADMIN_EDIT_INPUT":
                var val = parseInt(msg);
                if (!isNaN(val)) {
                    Database.data[session.targetUser][session.editType] = val; Database.save(Database.data);
                    replier.reply(UI.make("수정 완료", session.targetUser + "님의 정보가 변경되었습니다.", "이전 화면으로 돌아가려면 '이전'을 입력하세요."));
                }
                break;
            case "ADMIN_RESET_CONFIRM":
                if (msg === "확인") {
                    var oldPw = Database.data[session.targetUser].pw;
                    Database.data[session.targetUser] = Database.getInitData(oldPw); Database.save(Database.data);
                    replier.reply(UI.make("초기화 완료", "유저 데이터가 초기화되었습니다.", "메뉴로 돌아가려면 '메뉴'를 입력하세요."));
                }
                break;
            case "ADMIN_DELETE_CONFIRM":
                if (msg === "삭제확인") {
                    delete Database.data[session.targetUser]; Database.save(Database.data);
                    SessionManager.forceLogout(session.targetUser); 
                    replier.reply(UI.make("삭제 완료", "계정이 영구 삭제되었습니다.", "메인으로 이동합니다."));
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
                    if (msg === "1") replier.reply(UI.go(session, "JOIN_ID", "회원가입", "사용하실 아이디를 입력하세요.", "닉네임으로 사용될 고유 아이디입니다."));
                    else if (msg === "2") replier.reply(UI.go(session, "LOGIN_ID", "로그인", "아이디를 입력하세요.", "회원가입 시 등록한 아이디입니다."));
                    break;
                case "JOIN_ID":
                    if (Database.data[msg]) return replier.reply(UI.make("오류", "이미 사용 중인 아이디입니다.", "다른 아이디를 입력해 주세요."));
                    session.tempId = msg; 
                    replier.reply(UI.go(session, "JOIN_PW", "비밀번호 설정", "비밀번호를 입력하세요.", "로그인 시 필요한 비밀번호입니다.")); 
                    break;
                case "JOIN_PW": 
                    Database.data[session.tempId] = Database.getInitData(msg); Database.save(Database.data);
                    session.data = Database.data[session.tempId];
                    replier.reply(UI.renderMenu(session, sender)); break;
                case "LOGIN_ID": session.tempId = msg; replier.reply(UI.go(session, "LOGIN_PW", "비밀번호 입력", "비밀번호를 입력하세요.", "계정 정보를 확인합니다.")); break;
                case "LOGIN_PW":
                    if (Database.data[session.tempId] && Database.data[session.tempId].pw === msg) {
                        session.data = Database.data[session.tempId];
                        replier.reply(UI.renderMenu(session, sender));
                    } else replier.reply(UI.make("오류", "비밀번호가 틀렸거나 없는 계정입니다.", "아이디를 다시 확인해 주세요."));
                    break;
            }
        } else {
            switch(session.screen) {
                case "USER_MAIN":
                    if (msg === "1") replier.reply(UI.go(session, "PROFILE_VIEW", "프로필", UI.renderProfile(session.tempId, d), "상세 정보를 보려면 이전 버튼을 누르세요."));
                    else if (msg === "2") replier.reply(UI.go(session, "COL_MAIN", "컬렉션", "1. 보유 칭호 관리\n2. 보유 캐릭터 목록", "관리할 항목의 번호를 입력하세요."));
                    else if (msg === "3") replier.reply(UI.go(session, "SHOP_MAIN", "상점", "1. 캐릭터 구매", "구매를 원하는 카테고리의 번호를 입력하세요."));
                    else if (msg === "4") { 
                        SessionManager.forceLogout(session.tempId); 
                        replier.reply(UI.make("알림", "로그아웃 되었습니다.", "이용해 주셔서 감사합니다.")); 
                    }
                    break;
                case "SHOP_MAIN":
                    if (msg === "1") replier.reply(UI.go(session, "SHOP_ROLES", "캐릭터 구매", RoleKeys.map(function(r, i){ return (i+1)+". "+r; }).join("\n"), "원하는 역할군의 번호를 입력하세요."));
                    break;
                case "SHOP_ROLES":
                    var rIdx = parseInt(msg) - 1;
                    if (RoleKeys[rIdx]) {
                        session.selectedRole = RoleKeys[rIdx];
                        var uList = SystemData.roles[session.selectedRole].units.map(function(u, i) {
                            var owned = d.collection.characters.indexOf(u) !== -1;
                            return (i+1) + ". " + u + (owned ? " [보유]" : " (500G)");
                        }).join("\n");
                        replier.reply(UI.go(session, "SHOP_BUY_ACTION", session.selectedRole, uList, "구매할 캐릭터의 번호를 입력하세요."));
                    }
                    break;
                case "SHOP_BUY_ACTION":
                    var units = SystemData.roles[session.selectedRole].units, uIdx = parseInt(msg) - 1;
                    if (units[uIdx]) {
                        var target = units[uIdx];
                        if (d.collection.characters.indexOf(target) !== -1) replier.reply(UI.make("알림", "이미 보유한 캐릭터입니다.", "다른 캐릭터를 선택해 주세요."));
                        else if (d.gold < 500) replier.reply(UI.make("알림", "골드가 부족합니다.", "전투를 통해 골드를 획득하세요."));
                        else {
                            d.gold -= 500; d.collection.characters.push(target); Database.save(Database.data);
                            replier.reply(UI.make("구매 완료", target + "을(를) 구매했습니다!", "잔액: " + d.gold + "G"));
                        }
                    }
                    break;
                case "COL_MAIN":
                    if (msg === "1") {
                        var tList = d.collection.titles.map(function(t, i) { return (i+1) + ". " + (t === d.title ? "✅ " : "") + t; }).join("\n");
                        replier.reply(UI.go(session, "COL_TITLE_ACTION", "칭호 관리", tList, "장착할 칭호의 번호를 입력하세요."));
                    } else if (msg === "2") {
                        var cList = d.collection.characters.length > 0 ? d.collection.characters.join("\n") : "보유 캐릭터가 없습니다.";
                        replier.reply(UI.go(session, "COL_CHAR_VIEW", "캐릭터 목록", cList, "목록 확인 후 이전을 눌러주세요."));
                    }
                    break;
                case "COL_TITLE_ACTION":
                    var tIdx = parseInt(msg) - 1;
                    if (d.collection.titles[tIdx]) {
                        d.title = d.collection.titles[tIdx]; Database.save(Database.data);
                        replier.reply(UI.make("장착 완료", "칭호가 [" + d.title + "](으)로 변경되었습니다.", "메뉴로 이동하려면 '메뉴'를 입력하세요."));
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
            if (!session.data) return; 
            replier.reply(UI.make("내 정보 확인", UI.renderProfile(session.tempId, session.data), "닫으려면 하단 취소 버튼을 누르세요."));
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

        var isAdmin = (room === Config.AdminRoom && hash === Config.AdminHash);
        if (isAdmin) session.type = "ADMIN";

        if (msg === "이전" || msg === "⬅️ 이전") {
            if (session.history && session.history.length > 0) {
                var prev = session.history.pop();
                session.screen = prev.screen; session.lastTitle = prev.title;
                var content = "항목을 선택하세요.", help = "번호를 입력하여 진행하세요.";
                if(session.screen === "USER_MAIN") { content = "1. 프로필\n2. 컬렉션\n3. 상점\n4. 로그아웃"; help = "이용할 메뉴의 번호를 입력하세요."; }
                else if(session.screen === "SHOP_MAIN") { content = "1. 캐릭터 구매"; help = "구매를 원하는 카테고리 번호를 입력하세요."; }
                return replier.reply(UI.make(session.lastTitle, content, help));
            }
            return replier.reply(UI.renderMenu(session, sender));
        }
        
        if (msg === "취소" || msg === "🚫 취소") { 
            SessionManager.reset(session); 
            SessionManager.save();
            return replier.reply(UI.make("알림", "현재 진행 중인 작업이 취소되었습니다.", "메뉴로 돌아가려면 '메뉴'를 입력하세요."));
        }
        
        if (msg === "메뉴" || msg === "🏠 메뉴") { 
            SessionManager.reset(session); 
            return replier.reply(UI.renderMenu(session, sender)); 
        }

        if (isAdmin) {
            if (session.screen === "IDLE") {
                if (msg === "메뉴") return replier.reply(UI.renderMenu(session, sender));
                return;
            }
            return AdminManager.handle(msg, session, replier, startTime);
        }

        if (isGroupChat) {
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
        if (session.type === "GROUP") GroupManager.handle(msg, session, replier, sender);
        else if (session.type === "DIRECT") UserManager.handle(msg, session, replier, sender);
        
        SessionManager.save();
    } catch (e) {
        Api.replyRoom(Config.AdminRoom, "⚠️ [v8.2.5 에러]: " + e.message);
    }
}
