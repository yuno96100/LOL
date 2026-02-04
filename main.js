/**
 * [main.js] v7.5.0
 * 1. 모듈 분리: Admin, Group, User 매니저를 명확히 분리하여 관리 편의성 증대.
 * 2. 간섭 차단: 각 모듈 내부에서 session.screen을 체크하여 동일 번호 간섭 원천 봉쇄.
 * 3. 기능 완비: 프로필 명칭, 컬렉션, 상점(구매 포함) 전체 로직 무생략 탑재.
 * 4. 리소스 실측: 시스템 정보 메뉴에서 RAM/DB/속도 실측 데이터 출력 유지.
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
    NAV_ITEMS: ["🔙 이전", "❌ 취소", "🏠 메뉴"],
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
    getLineData: function(content, isPc) {
        var lines = content.split("\n");
        var maxW = 18;
        for (var i = 0; i < lines.length; i++) {
            var w = this.getVisualWidth(lines[i]);
            if (w > maxW) maxW = w;
        }
        var limit = isPc ? Config.LIMITS.PC : Config.LIMITS.MOBILE;
        var finalLen = Math.min(Math.floor(maxW / 1.7), limit); 
        return { line: Array(finalLen + 1).join(Config.LINE_CHAR), width: finalLen };
    },
    getDynamicNav: function(lineWidth) {
        var spaceCount = Math.max(1, Math.floor((lineWidth - 12) / 3));
        var spaces = Array(spaceCount + 1).join(" ");
        return Config.NAV_ITEMS.join(spaces + "|" + spaces);
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
        var lineData = Utils.getLineData(title + "\n" + content + (help || ""), isPc);
        var navBar = Utils.getDynamicNav(lineData.width);
        return "『 " + title + " 』\n" + lineData.line + "\n" + content + "\n" + lineData.line + "\n" + (help ? "💡 " + help + "\n" + lineData.line + "\n" : "") + navBar;
    },
    renderMenu: function(session, isPc) {
        if (session.type === "ADMIN") {
            session.screen = "ADMIN_MAIN";
            return this.make("관리자 메뉴", "1. 시스템 정보\n2. 유저 관리", "보안 등급: 최고 권한", isPc);
        }
        if (session.type === "GROUP") {
            session.screen = "GROUP_MAIN";
            return this.make("메인 메뉴", "1. 내 정보 확인", "소환사의 협곡", isPc);
        }
        if (session.type === "DIRECT") {
            if (!session.data) {
                session.screen = "GUEST_MAIN";
                return this.make("메인 메뉴", "1. 회원가입\n2. 로그인", "계정 접속 필요", isPc);
            }
            session.screen = "USER_MAIN";
            return this.make("메인 메뉴", "1. 프로필\n2. 컬렉션\n3. 상점\n4. 로그아웃", "환영합니다!", isPc);
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
            this.sessions[h] = { data: null, screen: "IDLE", tempId: null, userListCache: [], targetUser: null, selectedRole: null };
        }
        var s = this.sessions[h];
        if (r === Config.AdminRoom) s.type = "ADMIN";
        else if (g && r === Config.GroupRoom) s.type = "GROUP";
        else if (!g) s.type = "DIRECT";
        else s.type = "OTHER";
        return s;
    }
};

// ━━━━━━━━ [4. 모듈: 관리자 매니저] ━━━━━━━━
var AdminManager = {
    handle: function(msg, session, replier, isPc, startTime) {
        if (session.screen === "ADMIN_MAIN") {
            if (msg === "1") {
                var rt = java.lang.Runtime.getRuntime();
                var used = Math.floor((rt.totalMemory() - rt.freeMemory()) / 1024 / 1024);
                var res = "⚡ 속도: " + (new Date().getTime() - startTime) + "ms\n💾 DB: " + (new java.io.File(Config.DB_PATH).length() / 1024).toFixed(2) + " KB\n📟 RAM: " + used + " MB\n👥 총원: " + Object.keys(Database.data).length + "명";
                return replier.reply(UI.make("시스템 정보", res, "실시간 관제 데이터", isPc));
            }
            if (msg === "2") {
                session.userListCache = Object.keys(Database.data);
                session.screen = "ADMIN_USER_LIST";
                return replier.reply(UI.make("소환사 명부", session.userListCache.map(function(id, i){ return (i+1)+". "+id; }).join("\n"), "조회할 번호 입력", isPc));
            }
        }
        if (session.screen === "ADMIN_USER_LIST") {
            var idx = parseInt(msg) - 1;
            if (session.userListCache[idx]) {
                session.targetUser = session.userListCache[idx];
                session.screen = "ADMIN_USER_DETAIL";
                var ud = Database.data[session.targetUser];
                var detail = "👤 대상: " + session.targetUser + "\n🏆 " + getTierInfo(ud.lp) + "\n💰 " + ud.gold.toLocaleString() + " G";
                return replier.reply(UI.make("유저 관리", detail, "1. 수정 | 2. 초기화 | 3. 삭제", isPc));
            }
        }
    }
};

// ━━━━━━━━ [5. 모듈: 단체방 매니저] ━━━━━━━━
var GroupManager = {
    handle: function(msg, session, replier, sender, isPc) {
        if (session.screen === "GROUP_MAIN") {
            if (msg === "1") {
                var d = Database.data[sender];
                if (!d) return replier.reply(UI.make("알림", "가입 정보가 없습니다.", "개인톡에서 가입해 주세요.", isPc));
                var info = "👤 " + sender + "\n🏆 " + getTierInfo(d.lp) + "\n⭐ Lv." + d.level + "\n💰 " + d.gold.toLocaleString() + " G";
                return replier.reply(UI.make("내 정보 확인", info, "전투 데이터", isPc));
            }
        }
    }
};

// ━━━━━━━━ [6. 모듈: 개인방 매니저] ━━━━━━━━
var UserManager = {
    handle: function(msg, session, replier, sender, isPc) {
        var d = session.data;
        if (!d) {
            if (session.screen === "GUEST_MAIN") {
                if (msg === "1") { session.screen = "JOIN_ID"; return replier.reply(UI.make("가입", "아이디를 입력하세요.", "", isPc)); }
                if (msg === "2") { session.screen = "LOGIN_ID"; return replier.reply(UI.make("로그인", "아이디를 입력하세요.", "", isPc)); }
            }
            if (session.screen === "JOIN_ID") { session.tempId = msg; session.screen = "JOIN_PW"; return replier.reply(UI.make("가입", "비밀번호를 입력하세요.", "", isPc)); }
            if (session.screen === "JOIN_PW") {
                Database.data[session.tempId] = { pw: msg, gold: 1000, level: 1, lp: 0, win: 0, lose: 0, title: "뉴비", collection: { titles: ["뉴비"], characters: [] } };
                Database.save(Database.data); session.screen = "GUEST_MAIN";
                return replier.reply(UI.make("성공", "회원가입 완료!", "로그인 하세요.", isPc));
            }
            if (session.screen === "LOGIN_ID") {
                if (Database.data[msg]) { session.tempId = msg; session.screen = "LOGIN_PW"; return replier.reply(UI.make("로그인", "비밀번호를 입력하세요.", "", isPc)); }
                else return replier.reply(UI.make("오류", "존재하지 않는 ID입니다.", "", isPc));
            }
            if (session.screen === "LOGIN_PW") {
                if (Database.data[session.tempId].pw === msg) {
                    session.data = Database.data[session.tempId];
                    return replier.reply(UI.renderMenu(session, isPc));
                } else return replier.reply(UI.make("오류", "비밀번호가 틀렸습니다.", "", isPc));
            }
        } else {
            // 로그인 상태 - 화면별 라우팅
            if (session.screen === "USER_MAIN") {
                if (msg === "1") { // 프로필
                    var p = "👤 " + session.tempId + "\n🏅 [" + d.title + "]\n🏆 " + getTierInfo(d.lp) + "\n⭐ Lv." + d.level + "\n💰 " + d.gold.toLocaleString() + " G";
                    return replier.reply(UI.make("프로필", p, "정보 조회 완료", isPc));
                }
                if (msg === "2") {
                    session.screen = "COL_MAIN";
                    return replier.reply(UI.make("컬렉션", "1. 보유 칭호\n2. 보유 캐릭터", "번호 선택", isPc));
                }
                if (msg === "3") {
                    session.screen = "SHOP_ROLES";
                    return replier.reply(UI.make("상점", RoleKeys.map(function(r, i){ return (i+1)+". "+r; }).join("\n"), "역할 선택", isPc));
                }
                if (msg === "4") { session.data = null; session.screen = "GUEST_MAIN"; return replier.reply(UI.make("알림", "로그아웃 되었습니다.", "", isPc)); }
            }
            if (session.screen === "COL_MAIN") {
                if (msg === "1") return replier.reply(UI.make("보유 칭호", d.collection.titles.join(", "), "내 칭호 목록", isPc));
                if (msg === "2") return replier.reply(UI.make("보유 캐릭터", d.collection.characters.length > 0 ? d.collection.characters.join("\n") : "없음", "내 캐릭터 목록", isPc));
            }
            if (session.screen === "SHOP_ROLES") {
                var rIdx = parseInt(msg) - 1;
                if (RoleKeys[rIdx]) {
                    session.selectedRole = RoleKeys[rIdx]; session.screen = "SHOP_BUY";
                    var list = SystemData.roles[session.selectedRole].units.map(function(u, i) {
                        return (i+1) + ". " + u + (d.collection.characters.indexOf(u) !== -1 ? " [보유]" : " (500G)");
                    }).join("\n");
                    return replier.reply(UI.make("상점: " + session.selectedRole, list, "구매할 번호 입력", isPc));
                }
            }
            if (session.screen === "SHOP_BUY") {
                var units = SystemData.roles[session.selectedRole].units;
                var uIdx = parseInt(msg) - 1;
                if (units[uIdx]) {
                    var target = units[uIdx];
                    if (d.collection.characters.indexOf(target) !== -1) return replier.reply(UI.make("알림", "이미 보유 중입니다.", "", isPc));
                    if (d.gold < 500) return replier.reply(UI.make("알림", "골드가 부족합니다.", "", isPc));
                    d.gold -= 500; d.collection.characters.push(target); Database.save(Database.data);
                    return replier.reply(UI.make("구매 성공", target + " 영입 완료!", "잔액: " + d.gold + "G", isPc));
                }
            }
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
        if (msg === "취소") { return replier.reply(UI.renderMenu(session, isPc)); }
        if (msg === "메뉴" || msg === "이전" || msg === "돌아가기") { return replier.reply(UI.renderMenu(session, isPc)); }

        // 매니저별 호출
        if (session.type === "ADMIN" && hash === Config.AdminHash) AdminManager.handle(msg, session, replier, isPc, startTime);
        else if (session.type === "GROUP") GroupManager.handle(msg, session, replier, sender, isPc);
        else if (session.type === "DIRECT") UserManager.handle(msg, session, replier, sender, isPc);
        
        SessionManager.save();
    } catch (e) {
        Api.replyRoom(Config.AdminRoom, "⚠️ [v7.5.0 에러]: " + e.message + " (L:" + e.lineNumber + ")");
    }
}
