/**
 * [main.js] v7.6.9
 * 1. UI 일체화: 칭호-티어 사이 구분선을 시스템 공통 구분선 로직으로 통합.
 * 2. 최소 길이 보장: 모든 구분선의 최소 길이를 네비게이션 바 너비 이상으로 설정.
 * 3. 네비게이션 최적화: 버튼 사이 간격을 2칸으로 조정하여 가독성 향상.
 * 4. 세션 강화: 프로필 계정명 null 방지 로직 유지.
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
    NAV_ITEMS: ["⬅️ 이전", "🚫 취소", "🏠 메뉴"],
    LIMITS: { MOBILE: 23, PC: 45 },
    MIN_LINE_LEN: 16 // 네비게이션 바 길이를 고려한 최소 구분선 길이
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
    getLineData: function(content, isPc) {
        var lines = content.split("\n");
        var maxW = 0; 
        for (var i = 0; i < lines.length; i++) {
            var w = this.getVisualWidth(lines[i]);
            if (w > maxW) maxW = w;
        }
        var limit = isPc ? Config.LIMITS.PC : Config.LIMITS.MOBILE;
        // 최소 길이를 네비게이션 바 너비(약 16칸)에 맞춤
        var finalLen = Math.max(Config.MIN_LINE_LEN, Math.min(Math.floor(maxW / 1.7), limit)); 
        return { line: Array(finalLen + 1).join(Config.LINE_CHAR), width: finalLen };
    },
    // 네비게이션 바: 간격을 2칸으로 소폭 축소
    getFixedNav: function() {
        var space = "  "; 
        return Config.NAV_ITEMS[0] + space + "|" + space + Config.NAV_ITEMS[1] + space + "|" + space + Config.NAV_ITEMS[2];
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
    make: function(title, content, help, isPc) {
        var fullText = title + "\n" + content + (help ? "\n" + help : "");
        var lineData = Utils.getLineData(fullText, isPc);
        var navBar = Utils.getFixedNav();
        
        var res = "『 " + title + " 』\n" + lineData.line + "\n" + content + "\n" + lineData.line + "\n";
        if (help) res += "💡 " + help + "\n" + lineData.line + "\n";
        res += navBar;
        return res;
    },
    // 프로필 렌더링 시 내부 구분선도 시스템 공통 길이 적용
    renderProfile: function(id, data, isPc) {
        var tier = getTierInfo(data.lp);
        var accountId = id || "알 수 없음";
        
        var body = "👤 계정: " + accountId + "\n🏅 칭호: [" + data.title + "]";
        var lineData = Utils.getLineData(body, isPc); // 기준선 계산
        
        // 칭호와 티어 사이 구분선을 시스템 공통 기호로 교체
        return body + "\n" + lineData.line + "\n" +
               "🏆 티어: " + tier.icon + " " + tier.name + " (" + data.lp + " LP)\n" +
               "💰 골드: " + data.gold.toLocaleString() + " G\n" +
               "⭐ 레벨: Lv." + data.level + "\n" +
               "⚔️ 전적: " + (data.win || 0) + "승 " + (data.lose || 0) + "패";
    },
    go: function(session, screen, title, content, help, isPc) {
        if (session.screen && session.screen !== screen) {
            if (!session.history) session.history = [];
            session.history.push({ screen: session.screen, title: session.lastTitle });
        }
        session.screen = screen;
        session.lastTitle = title;
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
        session.history = []; session.tempId = null; session.userListCache = [];
        session.targetUser = null; session.editType = null;
    }
};

// ━━━━━━━━ [4. 매니저: 관리자 시스템] ━━━━━━━━
var AdminManager = {
    handle: function(msg, session, replier, isPc, startTime) {
        switch(session.screen) {
            case "ADMIN_MAIN":
                if (msg === "1") {
                    var rt = java.lang.Runtime.getRuntime();
                    var used = Math.floor((rt.totalMemory() - rt.freeMemory()) / 1024 / 1024);
                    var sysInfo = "⚡ 속도: " + (new Date().getTime() - startTime) + "ms\n📟 RAM: " + used + " MB\n👥 총원: " + Object.keys(Database.data).length + "명\n🛰️ 상태: 정상 작동 중";
                    replier.reply(UI.make("시스템 정보", sysInfo, "서버 리소스 관제", isPc));
                } else if (msg === "2") {
                    session.userListCache = Object.keys(Database.data);
                    replier.reply(UI.go(session, "ADMIN_USER_LIST", "유저 관리", session.userListCache.map(function(id, i){ return (i+1)+". "+id; }).join("\n"), "조회할 유저 선택", isPc));
                }
                break;
            case "ADMIN_USER_LIST":
                var idx = parseInt(msg) - 1;
                if (session.userListCache[idx]) {
                    session.targetUser = session.userListCache[idx];
                    var ud = Database.data[session.targetUser];
                    replier.reply(UI.go(session, "ADMIN_USER_DETAIL", session.targetUser, UI.renderProfile(session.targetUser, ud, isPc), "1. 정보 수정 | 2. 전체 초기화", isPc));
                }
                break;
            case "ADMIN_USER_DETAIL":
                if (msg === "1") replier.reply(UI.go(session, "ADMIN_EDIT_SELECT", "수정 항목 선택", "1. 골드 수정\n2. LP 수정\n3. 레벨 수정", "변경할 속성 선택", isPc));
                else if (msg === "2") replier.reply(UI.go(session, "ADMIN_RESET_CONFIRM", "초기화 확인", "정말로 " + session.targetUser + "님의 데이터를 초기화하시겠습니까?\n(입력: 확인)", "취소는 '이전'", isPc));
                break;
            case "ADMIN_EDIT_SELECT":
                var types = ["gold", "lp", "level"], names = ["골드", "LP", "레벨"], tIdx = parseInt(msg) - 1;
                if (types[tIdx]) {
                    session.editType = types[tIdx];
                    replier.reply(UI.go(session, "ADMIN_EDIT_INPUT", names[tIdx] + " 수정", "현재 값: " + Database.data[session.targetUser][session.editType] + "\n변경할 수치를 입력하세요.", "숫자만 입력", isPc));
                }
                break;
            case "ADMIN_EDIT_INPUT":
                var val = parseInt(msg);
                if (!isNaN(val)) {
                    Database.data[session.targetUser][session.editType] = val; Database.save(Database.data);
                    replier.reply(UI.make("수정 완료", session.targetUser + "님의 데이터가 변경되었습니다.", "", isPc));
                    session.screen = "ADMIN_USER_DETAIL";
                    replier.reply(UI.make(session.targetUser, UI.renderProfile(session.targetUser, Database.data[session.targetUser], isPc), "1. 정보 수정 | 2. 전체 초기화", isPc));
                }
                break;
            case "ADMIN_RESET_CONFIRM":
                if (msg === "확인") {
                    var oldPw = Database.data[session.targetUser].pw;
                    Database.data[session.targetUser] = Database.getInitData(oldPw); Database.save(Database.data);
                    replier.reply(UI.make("초기화 완료", session.targetUser + "님의 데이터가 리셋되었습니다.", "", isPc));
                    session.screen = "ADMIN_USER_DETAIL";
                    replier.reply(UI.make(session.targetUser, UI.renderProfile(session.targetUser, Database.data[session.targetUser], isPc), "1. 정보 수정 | 2. 전체 초기화", isPc));
                }
                break;
        }
    }
};

// ━━━━━━━━ [5. 매니저: 유저 시스템] ━━━━━━━━
var UserManager = {
    handle: function(msg, session, replier, sender, isPc) {
        var d = session.data;
        if (!d) {
            switch(session.screen) {
                case "GUEST_MAIN":
                    if (msg === "1") replier.reply(UI.go(session, "JOIN_ID", "회원가입", "아이디를 입력하세요.", "", isPc));
                    else if (msg === "2") replier.reply(UI.go(session, "LOGIN_ID", "로그인", "아이디를 입력하세요.", "", isPc));
                    break;
                case "JOIN_ID": session.tempId = msg; replier.reply(UI.go(session, "JOIN_PW", "회원가입", "비밀번호를 입력하세요.", "", isPc)); break;
                case "JOIN_PW": 
                    Database.data[session.tempId] = Database.getInitData(msg); Database.save(Database.data); 
                    replier.reply(UI.renderMenu(session, isPc)); break;
                case "LOGIN_ID": session.tempId = msg; replier.reply(UI.go(session, "LOGIN_PW", "로그인", "비밀번호를 입력하세요.", "", isPc)); break;
                case "LOGIN_PW":
                    if (Database.data[session.tempId] && Database.data[session.tempId].pw === msg) {
                        session.data = Database.data[session.tempId]; session.tempId = session.tempId; 
                        replier.reply(UI.renderMenu(session, isPc));
                    } else replier.reply(UI.make("오류", "정보가 일치하지 않습니다.", "", isPc));
                    break;
            }
        } else {
            switch(session.screen) {
                case "USER_MAIN":
                    if (msg === "1") replier.reply(UI.go(session, "PROFILE_VIEW", "마이 페이지", UI.renderProfile(session.tempId, d, isPc), "조회 전용 화면", isPc));
                    else if (msg === "2") replier.reply(UI.go(session, "COL_MAIN", "컬렉션", "1. 보유 칭호 관리\n2. 보유 캐릭터 목록", "카테고리 선택", isPc));
                    else if (msg === "3") replier.reply(UI.go(session, "SHOP_ROLES", "상점", RoleKeys.map(function(r, i){ return (i+1)+". "+r; }).join("\n"), "역할군 선택", isPc));
                    else if (msg === "4") { session.data = null; session.tempId = null; replier.reply(UI.renderMenu(session, isPc)); }
                    break;
                case "COL_MAIN":
                    if (msg === "1") {
                        var tList = d.collection.titles.map(function(t, i) { return (i+1) + ". " + (t === d.title ? "✅ " : "") + t; }).join("\n");
                        replier.reply(UI.go(session, "COL_TITLE_ACTION", "보유 칭호 관리", tList, "번호 입력 시 즉시 장착", isPc));
                    } else if (msg === "2") {
                        var cList = d.collection.characters.length > 0 ? d.collection.characters.join("\n") : "보유한 캐릭터가 없습니다.";
                        replier.reply(UI.go(session, "COL_CHAR_VIEW", "보유 캐릭터 목록", cList, "조회 전용", isPc));
                    }
                    break;
                case "COL_TITLE_ACTION":
                    var tIdx = parseInt(msg) - 1;
                    if (d.collection.titles[tIdx]) {
                        d.title = d.collection.titles[tIdx]; Database.save(Database.data);
                        replier.reply(UI.make("장착 완료", "[" + d.title + "] 칭호로 변경되었습니다.", "", isPc));
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
                        replier.reply(UI.go(session, "SHOP_BUY_ACTION", session.selectedRole, uList, "번호 입력 시 즉시 구매", isPc));
                    }
                    break;
                case "SHOP_BUY_ACTION":
                    var units = SystemData.roles[session.selectedRole].units, uIdx = parseInt(msg) - 1;
                    if (units[uIdx]) {
                        var target = units[uIdx];
                        if (d.collection.characters.indexOf(target) !== -1) replier.reply(UI.make("알림", "이미 보유 중인 캐릭터입니다.", "", isPc));
                        else if (d.gold < 500) replier.reply(UI.make("알림", "골드가 부족합니다.", "잔액: " + d.gold + "G", isPc));
                        else {
                            d.gold -= 500; d.collection.characters.push(target); Database.save(Database.data);
                            replier.reply(UI.make("영입 성공", target + " 소환 완료!", "잔액: " + d.gold + "G", isPc));
                        }
                    }
                    break;
            }
        }
    }
};

// ━━━━━━━━ [6. 매니저: 단체방 시스템] ━━━━━━━━
var GroupManager = {
    handle: function(msg, session, replier, sender, isPc) {
        if (session.screen === "GROUP_MAIN" && msg === "1") {
            var d = Database.data[sender];
            if (!d) return replier.reply(UI.make("알림", "가입 정보가 없습니다.", "개인톡에서 가입해 주세요.", isPc));
            replier.reply(UI.make("내 정보 확인", UI.renderProfile(sender, d, isPc), "전투 데이터", isPc));
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

        // 네비게이션
        if (msg === "이전" || msg === "⬅️ 이전") {
            if (session.history && session.history.length > 0) {
                var prev = session.history.pop();
                session.screen = prev.screen; session.lastTitle = prev.title;
                return replier.reply(UI.renderMenu(session, isPc));
            } else return replier.reply(UI.renderMenu(session, isPc));
        }
        if (msg === "취소" || msg === "🚫 취소") { SessionManager.reset(session); return replier.reply(UI.renderMenu(session, isPc)); }
        if (msg === "메뉴" || msg === "🏠 메뉴") return replier.reply(UI.renderMenu(session, isPc));

        if (session.type === "ADMIN" && hash === Config.AdminHash) AdminManager.handle(msg, session, replier, isPc, startTime);
        else if (session.type === "GROUP") GroupManager.handle(msg, session, replier, sender, isPc);
        else if (session.type === "DIRECT") UserManager.handle(msg, session, replier, sender, isPc);
        
        SessionManager.save();
    } catch (e) {
        Api.replyRoom(Config.AdminRoom, "⚠️ [v7.6.9 에러]: " + e.message + " (L:" + e.lineNumber + ")");
    }
}
