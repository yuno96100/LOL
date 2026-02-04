/**
 * [main.js] v7.5.5
 * 1. 네비게이션 최적화: '돌아가기' 제거, '이전 | 취소 | 메뉴' 체제 확립.
 * 2. 취소 로직 강화: 작업 중인 모든 임시 데이터(selectedRole, tempId 등)를 null 처리하여 기능 중단.
 * 3. 메뉴 로직: 히스토리는 비우되 유저 로그인 상태는 유지하며 메인 화면으로 이동.
 * 4. UI 동기화: 모든 구분선을 네비게이션 길이에 맞춰 유동적 조절 유지.
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
    NAV_ITEMS: ["이전", "취소", "메뉴"], // 돌아가기 제거
    LIMITS: { MOBILE: 23, PC: 45 }
};

var Utils = {
    getVisualWidth: function(str) {
        if (!str) return 0;
        var w = 0;
        for (var i = 0; i < str.length; i++) {
            var c = str.charCodeAt(i);
            if ((c >= 0xAC00 && c <= 0xD7A3) || (c >= 0x1100 && c <= 0x11FF) || c > 255) w += 2;
            else w += 1.0; 
        }
        return w;
    },
    getTargetLineWidth: function(contentWidth, isPc) {
        var limit = isPc ? Config.LIMITS.PC : Config.LIMITS.MOBILE;
        return Math.min(Math.max(18, contentWidth), limit);
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
        if (lp >= TierData[i].minLp) return TierData[i].icon + " " + TierData[i].name;
    }
    return "⚫ 아이언";
}

// ━━━━━━━━ [2. 모듈: UI 엔진] ━━━━━━━━
var UI = {
    make: function(title, content, help, isPc) {
        var rawLines = (title + "\n" + content + (help || "")).split("\n");
        var maxContentWidth = 0;
        for (var i = 0; i < rawLines.length; i++) {
            var w = Utils.getVisualWidth(rawLines[i]);
            if (w > maxContentWidth) maxContentWidth = w;
        }

        var targetWidth = Utils.getTargetLineWidth(Math.ceil(maxContentWidth), isPc);
        var navTextLen = Utils.getVisualWidth(Config.NAV_ITEMS.join("|"));
        var spaceCount = Math.max(1, Math.floor((targetWidth - navTextLen) / 2));
        var spaces = Array(spaceCount + 1).join(" ");
        var navBar = Config.NAV_ITEMS.join(spaces + "|" + spaces);

        var line = Array(Math.floor(targetWidth / 1.1) + 1).join(Config.LINE_CHAR);

        var ui = "『 " + title + " 』\n" + line + "\n" + content + "\n" + line + "\n";
        if (help) ui += "💡 " + help + "\n" + line + "\n";
        ui += navBar;
        return ui;
    },
    go: function(session, screen, title, content, help, isPc) {
        if (session.screen && session.screen !== screen) {
            if (!session.history) session.history = [];
            session.history.push(session.screen);
        }
        session.screen = screen;
        return this.make(title, content, help, isPc);
    },
    renderMenu: function(session, isPc) {
        session.history = [];
        if (session.type === "ADMIN") return this.go(session, "ADMIN_MAIN", "관리자 메뉴", "1. 시스템 정보\n2. 유저 관리", "보안 등급: 최고 권한", isPc);
        if (session.type === "GROUP") return this.go(session, "GROUP_MAIN", "메인 메뉴", "1. 내 정보 확인", "소환사의 협곡", isPc);
        if (session.type === "DIRECT") {
            if (!session.data) return this.go(session, "GUEST_MAIN", "메인 메뉴", "1. 회원가입\n2. 로그인", "계정 접속 필요", isPc);
            return this.go(session, "USER_MAIN", "메인 메뉴", "1. 프로필\n2. 컬렉션\n3. 상점\n4. 로그아웃", "환영합니다!", isPc);
        }
    }
};

// ━━━━━━━━ [3. DB 및 세션 매니저] ━━━━━━━━
var Database = {
    data: {},
    load: function() { try { return JSON.parse(FileStream.read(Config.DB_PATH)); } catch(e) { return {}; } },
    save: function(d) { this.data = d; FileStream.write(Config.DB_PATH, JSON.stringify(d, null, 4)); }
};

var SessionManager = {
    sessions: {},
    load: function() { try { this.sessions = JSON.parse(FileStream.read(Config.SESSION_PATH)); } catch(e) { this.sessions = {}; } },
    save: function() { FileStream.write(Config.SESSION_PATH, JSON.stringify(this.sessions)); },
    get: function(r, h, g) {
        if (!this.sessions[h]) {
            this.sessions[h] = { data: null, screen: "IDLE", history: [], tempId: null, userListCache: [], targetUser: null, selectedRole: null };
        }
        var s = this.sessions[h];
        if (r === Config.AdminRoom) s.type = "ADMIN";
        else if (g && r === Config.GroupRoom) s.type = "GROUP";
        else if (!g) s.type = "DIRECT";
        else s.type = "OTHER";
        return s;
    },
    // [신규] 세션 초기화 (취소 기능)
    reset: function(session) {
        session.history = [];
        session.tempId = null;
        session.userListCache = [];
        session.targetUser = null;
        session.selectedRole = null;
        // 로그인된 data는 유지 (로그아웃이 아니므로)
    }
};

// ━━━━━━━━ [4. 매니저: 관리자] ━━━━━━━━
var AdminManager = {
    handle: function(msg, session, replier, isPc, startTime) {
        switch(session.screen) {
            case "ADMIN_MAIN":
                if (msg === "1") {
                    var rt = java.lang.Runtime.getRuntime();
                    var used = Math.floor((rt.totalMemory() - rt.freeMemory()) / 1024 / 1024);
                    var res = "⚡ 속도: " + (new Date().getTime() - startTime) + "ms\n💾 DB: " + (new java.io.File(Config.DB_PATH).length() / 1024).toFixed(2) + " KB\n📟 RAM: " + used + " MB\n👥 총원: " + Object.keys(Database.data).length + "명";
                    replier.reply(UI.make("시스템 정보", res, "실시간 관제", isPc));
                } else if (msg === "2") {
                    session.userListCache = Object.keys(Database.data);
                    replier.reply(UI.go(session, "ADMIN_USER_LIST", "소환사 명부", session.userListCache.map(function(id, i){ return (i+1)+". "+id; }).join("\n"), "조회할 번호 입력", isPc));
                }
                break;
            case "ADMIN_USER_LIST":
                var idx = parseInt(msg) - 1;
                if (session.userListCache[idx]) {
                    session.targetUser = session.userListCache[idx];
                    var ud = Database.data[session.targetUser];
                    var detail = "👤 대상: " + session.targetUser + "\n🏆 " + getTierInfo(ud.lp) + "\n💰 " + ud.gold.toLocaleString() + " G";
                    replier.reply(UI.go(session, "ADMIN_USER_DETAIL", "유저 관리", detail, "1. 수정 | 2. 삭제", isPc));
                }
                break;
        }
    }
};

// ━━━━━━━━ [5. 매니저: 개인톡] ━━━━━━━━
var UserManager = {
    handle: function(msg, session, replier, sender, isPc) {
        var d = session.data;
        if (!d) {
            switch(session.screen) {
                case "GUEST_MAIN":
                    if (msg === "1") replier.reply(UI.go(session, "JOIN_ID", "가입", "아이디를 입력하세요.", "", isPc));
                    else if (msg === "2") replier.reply(UI.go(session, "LOGIN_ID", "로그인", "아이디를 입력하세요.", "", isPc));
                    break;
                case "JOIN_ID": session.tempId = msg; replier.reply(UI.go(session, "JOIN_PW", "가입", "비밀번호를 입력하세요.", "", isPc)); break;
                case "JOIN_PW":
                    Database.data[session.tempId] = { pw: msg, gold: 1000, level: 1, lp: 0, win: 0, lose: 0, title: "뉴비", collection: { titles: ["뉴비"], characters: [] } };
                    Database.save(Database.data); replier.reply(UI.renderMenu(session, isPc)); break;
                case "LOGIN_ID": session.tempId = msg; replier.reply(UI.go(session, "LOGIN_PW", "로그인", "비밀번호를 입력하세요.", "", isPc)); break;
                case "LOGIN_PW":
                    if (Database.data[session.tempId] && Database.data[session.tempId].pw === msg) {
                        session.data = Database.data[session.tempId];
                        session.tempId = session.tempId; // 캐시 유지
                        replier.reply(UI.renderMenu(session, isPc));
                    } else replier.reply(UI.make("오류", "정보가 일치하지 않습니다.", "", isPc));
                    break;
            }
        } else {
            switch(session.screen) {
                case "USER_MAIN":
                    if (msg === "1") {
                        var p = "👤 " + (session.tempId || "소환사") + "\n🏅 [" + d.title + "]\n🏆 " + getTierInfo(d.lp) + "\n⭐ Lv." + d.level + "\n💰 " + d.gold.toLocaleString() + " G";
                        replier.reply(UI.make("프로필", p, "정보 조회 완료", isPc));
                    } else if (msg === "2") {
                        replier.reply(UI.go(session, "COL_MAIN", "컬렉션", "1. 보유 칭호\n2. 보유 캐릭터", "번호 선택", isPc));
                    } else if (msg === "3") {
                        replier.reply(UI.go(session, "SHOP_ROLES", "상점", RoleKeys.map(function(r, i){ return (i+1)+". "+r; }).join("\n"), "역할 선택", isPc));
                    } else if (msg === "4") { session.data = null; replier.reply(UI.renderMenu(session, isPc)); }
                    break;

                case "COL_MAIN":
                    if (msg === "1") {
                        var tList = d.collection.titles.map(function(t, i) {
                            return (i+1) + ". " + (t === d.title ? "✅ " : "") + t;
                        }).join("\n");
                        replier.reply(UI.go(session, "COL_TITLE", "보유 칭호", tList, "장착할 번호 입력", isPc));
                    } else if (msg === "2") {
                        var cList = d.collection.characters.length > 0 ? d.collection.characters.join("\n") : "보유한 캐릭터가 없습니다.";
                        replier.reply(UI.go(session, "COL_CHAR", "보유 캐릭터", cList, "내 유닛 목록", isPc));
                    }
                    break;

                case "COL_TITLE":
                    var tIdx = parseInt(msg) - 1;
                    if (d.collection.titles[tIdx]) {
                        d.title = d.collection.titles[tIdx]; Database.save(Database.data);
                        replier.reply(UI.make("장착 완료", "[" + d.title + "] 칭호를 장착했습니다.", "프로필에서 확인하세요.", isPc));
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
                        replier.reply(UI.go(session, "SHOP_BUY", "상점: " + session.selectedRole, uList, "구매할 번호 입력", isPc));
                    }
                    break;

                case "SHOP_BUY":
                    var units = SystemData.roles[session.selectedRole].units;
                    var uIdx = parseInt(msg) - 1;
                    if (units[uIdx]) {
                        var target = units[uIdx];
                        if (d.collection.characters.indexOf(target) !== -1) {
                            replier.reply(UI.make("알림", "이미 보유 중인 캐릭터입니다.", "", isPc));
                        } else if (d.gold < 500) {
                            replier.reply(UI.make("알림", "골드가 부족합니다.", "현재 잔액: " + d.gold + "G", isPc));
                        } else {
                            d.gold -= 500; d.collection.characters.push(target); Database.save(Database.data);
                            replier.reply(UI.make("구매 완료", target + " 영입 성공!", "잔액: " + d.gold + "G", isPc));
                        }
                    }
                    break;
            }
        }
    }
};

// ━━━━━━━━ [6. 매니저: 단체방] ━━━━━━━━
var GroupManager = {
    handle: function(msg, session, replier, sender, isPc) {
        if (session.screen === "GROUP_MAIN" && msg === "1") {
            var d = Database.data[sender];
            if (!d) return replier.reply(UI.make("알림", "가입 정보가 없습니다.", "개인톡에서 가입해 주세요.", isPc));
            var info = "👤 " + sender + "\n🏆 " + getTierInfo(d.lp) + "\n⭐ Lv." + d.level + "\n💰 " + d.gold.toLocaleString() + " G";
            replier.reply(UI.make("내 정보 확인", info, "전투 데이터", isPc));
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
        var isPc = (hash === Config.AdminHash && room === Config.AdminRoom);

        // 1. 이전 기능 (돌아가기 키워드 삭제)
        if (msg === "이전") {
            if (session.history && session.history.length > 0) {
                session.screen = session.history.pop();
                return replier.reply(UI.renderMenu(session, isPc));
            } else return replier.reply(UI.renderMenu(session, isPc));
        }

        // 2. 취소 기능 (활성화된 모든 기능 및 캐시 데이터 중단/초기화)
        if (msg === "취소") {
            SessionManager.reset(session);
            return replier.reply(UI.renderMenu(session, isPc));
        }

        // 3. 메뉴 기능 (화면만 메인으로 이동)
        if (msg === "메뉴") {
            return replier.reply(UI.renderMenu(session, isPc));
        }

        // 모듈 호출
        if (session.type === "ADMIN" && hash === Config.AdminHash) AdminManager.handle(msg, session, replier, isPc, startTime);
        else if (session.type === "GROUP") GroupManager.handle(msg, session, replier, sender, isPc);
        else if (session.type === "DIRECT") UserManager.handle(msg, session, replier, sender, isPc);
        
        SessionManager.save();
    } catch (e) {
        Api.replyRoom(Config.AdminRoom, "⚠️ [v7.5.5 에러]: " + e.message + " (L:" + e.lineNumber + ")");
    }
}
