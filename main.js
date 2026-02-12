/**
 * [main.js] v0.0.16 (Final Patch)
 * 1. 완전 복구: v0.0.11의 모든 관리자 기능(수정/초기화/삭제) 및 유저 로직 복구
 * 2. 전 카테고리 UI 고정: 프로필, 상점, 컬렉션 진입 시 상단 정보 영역 상시 노출
 * 3. 구조 유지: 섹션 1~9 및 매니저 핸들링 구조 100% 유지
 * 4. 보완: 관리자 타겟 유저 고정 로직 및 실시간 DB 로드 최적화
 */

// ━━━━━━━━ [1. 설정 및 상수] ━━━━━━━━
var Config = {
    Version: "v0.0.16",
    Prefix: ".",
    AdminRoom: "소환사의협곡관리", 
    BotName: "소환사의 협곡",
    DB_PATH: "/sdcard/msgbot/Bots/main/database.json",
    SESSION_PATH: "/sdcard/msgbot/Bots/main/sessions.json",
    LINE_CHAR: "━",
    FIXED_LINE: 14,
    WRAP_LIMIT: 18,
    NAV_ITEMS: ["⬅️이전", "❌취소", "🏠메뉴"],
    TIMEOUT: 300000 
};

var MAX_LEVEL = 30;

var Utils = {
    getFixedDivider: function() { return Array(Config.FIXED_LINE + 1).join(Config.LINE_CHAR); },
    getNav: function() { return " " + Config.NAV_ITEMS.join("  ") + " "; },
    wrapText: function(str) {
        if (!str) return "";
        var lines = str.split("\n"), result = [];
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (line.length <= Config.WRAP_LIMIT) { result.push(line); } 
            else { for (var j = 0; j < line.length; j += Config.WRAP_LIMIT) { result.push(line.substring(j, j + Config.WRAP_LIMIT)); } }
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
    champions: ["알리스타", "말파이트", "레오나", "가렌", "다리우스", "잭스", "제드", "카타리나", "탈론", "럭스", "아리", "빅토르", "애쉬", "베인", "카이사", "소라카", "유미", "쓰레쉬"]
};

function getTierInfo(lp) {
    lp = lp || 0;
    for (var i = 0; i < TierData.length; i++) { if (lp >= TierData[i].minLp) return TierData[i]; }
    return { name: "아이언", icon: "⚫" };
}

// ━━━━━━━━ [2. 모듈: UI 엔진] ━━━━━━━━
var UI = {
    make: function(title, content, help, isRoot) {
        var div = Utils.getFixedDivider();
        var res = "『 " + title + " 』\n" + div + "\n" + Utils.wrapText(content) + "\n" + div + "\n";
        if (help) res += "💡 " + Utils.wrapText(help);
        if (!isRoot) res += "\n" + div + "\n" + Utils.getNav();
        return res;
    },

    renderCategoryUI: function(session, help, content) {
        // [수정] 관리자 모드인 경우 targetUser를 최우선으로 참조하도록 변경
        var targetId = (session.type === "ADMIN" && session.targetUser) ? session.targetUser : session.tempId;
        
        // [실시간 동기화] UI 출력 직전에 DB를 다시 로드하여 데이터 누락 방지
        Database.data = Database.load();
        var data = Database.data[targetId];
        var div = Utils.getFixedDivider();
        var scr = session.screen;
        
        if (!data) {
            return this.make("데이터 오류", "대상: [" + targetId + "]\n데이터를 찾을 수 없습니다.", "메뉴로 돌아가기", false);
        }

        if (!data.collection) data.collection = { titles: ["뉴비"], champions: [] };
        if (!data.collection.champions) data.collection.champions = [];

        var title = "정보", head = "", body = "";

        // [프로필/관리 상세 화면]
        if (scr.indexOf("PROFILE") !== -1 || scr.indexOf("STAT") !== -1 || scr.indexOf("ADMIN_USER_DETAIL") !== -1) {
            title = (session.type === "ADMIN") ? "[관리] " + targetId : "프로필";
            var tier = getTierInfo(data.lp);
            var win = data.win || 0, lose = data.lose || 0, total = win + lose;
            var winRate = total === 0 ? 0 : Math.floor((win / total) * 100);
            var st = data.stats || { acc: 50, ref: 50, com: 50, int: 50 };
            
            head = "👤 계정: " + targetId + "\n🏅 칭호: [" + (data.title || "없음") + "]\n" + div + "\n" +
                   "🏆 티어: " + tier.icon + tier.name + " (" + data.lp + ")\n💰 골드: " + (data.gold || 0).toLocaleString() + " G\n⚔️ 전적: " + win + "승 " + lose + "패 (" + winRate + "%)\n" + div + "\n" +
                   "🆙 레벨: Lv." + data.level + " (" + data.exp + "/" + (data.level * 100) + ")\n" + div + "\n" +
                   "🎯정확:" + st.acc + " | ⚡반응:" + st.ref + "\n🧘침착:" + st.com + " | 🧠직관:" + st.int;
            
            if (scr === "PROFILE_VIEW") body = "1. 능력치 강화";
            else if (scr === "STAT_UP_MENU") body = "1. 정확 2. 반응 3. 침착 4. 직관";
            else if (scr === "ADMIN_USER_DETAIL") body = "1. 정보 수정\n2. 답변 작성\n3. 초기화\n4. 계정 삭제";
        }
        else if (scr.indexOf("SHOP") !== -1) {
            title = "상점";
            var owned = data.collection.champions.length;
            head = "💰 보유 골드: " + (data.gold || 0).toLocaleString() + " G\n📦 보유 챔피언: " + owned + " / " + SystemData.champions.length;
            if (scr === "SHOP_MAIN") body = "1. 챔피언 영입";
        }
        else if (scr.indexOf("COL") !== -1) {
            title = "컬렉션";
            var owned = data.collection.champions.length;
            head = "🏅 현재 칭호: [" + (data.title || "없음") + "]\n🏆 수집율: " + Math.floor((owned / SystemData.champions.length) * 100) + "%";
            if (scr === "COL_MAIN") body = "1. 보유 칭호\n2. 보유 챔피언";
        }

        var fullContent = head + (body ? "\n" + div + "\n" + body : "") + (content ? "\n" + div + "\n" + content : "");
        return this.make(title, fullContent, help, false);
    },

    go: function(session, screen, title, content, help) {
        session.screen = screen;
        var fixedScreens = ["PROFILE", "STAT", "DETAIL", "SHOP", "COL", "ADMIN_USER"];
        for (var i=0; i<fixedScreens.length; i++) {
            if (screen.indexOf(fixedScreens[i]) !== -1) return this.renderCategoryUI(session, help, content);
        }
        var isRoot = (["USER_MAIN", "ADMIN_MAIN", "GUEST_MAIN", "SUCCESS_IDLE"].indexOf(screen) !== -1);
        return this.make(title, content, help, isRoot);
    },

    renderMenu: function(session) {
        if (session.type === "ADMIN") return this.go(session, "ADMIN_MAIN", "관리 센터", "1. 시스템 정보\n2. 유저 관리", "항목 번호 입력");
        if (!session.data) return this.go(session, "GUEST_MAIN", "환영합니다", "1. 회원가입\n2. 로그인\n3. 운영진 문의", "메뉴 선택");
        return this.go(session, "USER_MAIN", "메인 로비", "1. 프로필 조회\n2. 컬렉션 확인\n3. 대전 모드\n4. 상점 이용\n5. 운영진 문의\n6. 로그아웃", "번호 입력");
    }
};

// ━━━━━━━━ [3. DB 및 세션 매니저] ━━━━━━━━
var Database = {
    data: {},
    load: function() { 
        try { 
            var file = FileStream.read(Config.DB_PATH);
            return file ? JSON.parse(file) : {}; 
        } catch(e) { return {}; } 
    },
    save: function(d) { 
        this.data = d; 
        FileStream.write(Config.DB_PATH, JSON.stringify(d, null, 4)); 
    },
    getInitData: function(pw) { 
        return { pw: pw, gold: 1000, level: 1, exp: 0, lp: 0, win: 0, lose: 0, title: "뉴비", point: 0, stats: { acc: 50, ref: 50, com: 50, int: 50 }, collection: { titles: ["뉴비"], champions: [] }, inquiryCount: 0 }; 
    },
    addExp: function(userId, amount) {
        var d = this.data[userId]; if (!d || d.level >= MAX_LEVEL) return;
        d.exp += amount;
        while (d.exp >= d.level * 100 && d.level < MAX_LEVEL) { d.exp -= (d.level * 100); d.level++; d.point += 5; }
        this.save(this.data);
    }
};

var SessionManager = {
    sessions: {},
    load: function() { try { this.sessions = JSON.parse(FileStream.read(Config.SESSION_PATH)); } catch(e) { this.sessions = {}; } },
    save: function() { FileStream.write(Config.SESSION_PATH, JSON.stringify(this.sessions)); },
    get: function(room, hash) {
        if (!this.sessions[hash]) { this.sessions[hash] = { data: null, screen: "IDLE", tempId: "비회원", userListCache: [], targetUser: null, editType: null, room: room, lastTime: Date.now() }; }
        var s = this.sessions[hash]; s.room = room; s.type = (room === Config.AdminRoom) ? "ADMIN" : "DIRECT";
        var now = Date.now(); if (s.screen !== "IDLE" && (now - (s.lastTime || 0) > Config.TIMEOUT)) { this.reset(s); }
        s.lastTime = now; return s;
    },
    reset: function(session) { session.screen = "IDLE"; session.targetUser = null; session.editType = null; session.userListCache = []; },
    findUserRoom: function(userId) { for (var h in this.sessions) { if (this.sessions[h].tempId === userId) return this.sessions[h].room; } return userId; },
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
        replier.reply(UI.go(session, "ADMIN_SYS_INFO", "시스템 정보", "📟 메모리: " + used + "MB\n👥 유저: " + Object.keys(Database.data).length + "명\n🛡️ 버전: " + Config.Version, "조회 완료"));
    },
    showUserList: function(session, replier) {
        Database.data = Database.load(); // 리스트 출력 전 최신화
        session.userListCache = Object.keys(Database.data);
        var list = session.userListCache.map(function(id, i){ 
            var d = Database.data[id];
            var badge = (d && d.inquiryCount > 0) ? " [🔔" + d.inquiryCount + "]" : "";
            return (i+1) + ". " + id + badge; 
        }).join("\n");
        replier.reply(UI.go(session, "ADMIN_USER_LIST", "유저 목록", list, "관리할 유저 번호 선택"));
    },
    submitAnswer: function(msg, session, replier) {
        var targetRoom = SessionManager.findUserRoom(session.targetUser);
        Api.replyRoom(targetRoom, UI.make("운영진 회신", "문의하신 내용에 대한 답변입니다.\n\n" + msg, "소환사의 협곡 팀", true));
        if(Database.data[session.targetUser]) { 
            Database.data[session.targetUser].inquiryCount = 0; 
            Database.save(Database.data); 
        }
        SessionManager.reset(session);
        replier.reply(UI.go(session, "SUCCESS_IDLE", "전송 완료", "알림이 해제되었습니다.", "메인으로 복귀"));
    },
    editUserData: function(msg, session, replier) {
        var val = parseInt(msg);
        if (isNaN(val)) return replier.reply(UI.make("오류", "숫자만 입력 가능합니다.", "다시 입력"));
        Database.data[session.targetUser][session.editType] = val; 
        Database.save(Database.data);
        SessionManager.reset(session); 
        replier.reply(UI.go(session, "SUCCESS_IDLE", "수정 완료", "데이터가 정상 반영되었습니다.", "메인으로 복귀"));
    },
    resetConfirm: function(msg, session, replier) {
        if (msg === "확인") {
            var pw = Database.data[session.targetUser].pw;
            Database.data[session.targetUser] = Database.getInitData(pw); 
            Database.save(Database.data);
            Api.replyRoom(SessionManager.findUserRoom(session.targetUser), UI.make("알림", "데이터가 초기화되었습니다.", "관리자 조치", true));
            SessionManager.reset(session); 
            replier.reply(UI.go(session, "SUCCESS_IDLE", "초기화 완료", "성공했습니다.", "메인으로 복귀"));
        }
    },
    deleteConfirm: function(msg, session, replier) {
        if (msg === "삭제확인") {
            Api.replyRoom(SessionManager.findUserRoom(session.targetUser), UI.make("알림", "계정이 삭제되었습니다.", "관리자 조치", true));
            delete Database.data[session.targetUser]; 
            Database.save(Database.data);
            SessionManager.forceLogout(session.targetUser); 
            SessionManager.reset(session);
            replier.reply(UI.go(session, "SUCCESS_IDLE", "삭제 완료", "영구 삭제되었습니다.", "메인으로 복귀"));
        }
    }
};

// ━━━━━━━━ [5. 유저 액션 모듈] ━━━━━━━━
var UserActions = {
    handleInquiry: function(msg, session, replier) {
        if (session.data) {
            session.data.inquiryCount = (session.data.inquiryCount || 0) + 1;
            Database.save(Database.data);
            Api.replyRoom(Config.AdminRoom, UI.make("문의 알림", "유저: " + session.tempId + "\n내용: " + msg, "관리자 메뉴에서 확인", true));
        }
        SessionManager.reset(session); replier.reply(UI.make("접수 완료", "내용이 전달되었습니다", "감사합니다", true));
    },
    showCollection: function(msg, session, replier) {
        var d = session.data;
        if (session.screen === "COL_MAIN") {
            if (msg === "1") {
                var tList = d.collection.titles.map(function(t, i) { return (i+1) + ". " + (t === d.title ? "✅" : "") + t; }).join("\n");
                return replier.reply(UI.go(session, "COL_TITLE_ACTION", "칭호 관리", tList, "번호 입력"));
            }
            if (msg === "2") {
                var champs = d.collection.champions || [];
                var cList = (champs.length > 0) ? champs.map(function(c, i){ return (i+1) + ". " + c; }).join("\n") : "보유 챔피언 없음";
                return replier.reply(UI.go(session, "COL_CHAR_VIEW", "보유 챔피언", cList, "목록 확인"));
            }
        }
        if (session.screen === "COL_TITLE_ACTION") {
            var idx = parseInt(msg) - 1;
            if (d.collection.titles[idx]) {
                d.title = d.collection.titles[idx]; Database.save(Database.data); SessionManager.reset(session);
                return replier.reply(UI.make("설정 완료", "[" + d.title + "]를 장착하였습니다", "프로필 확인 가능", true));
            }
        }
    },
    handleShop: function(msg, session, replier) {
        var d = session.data;
        if (session.screen === "SHOP_MAIN" && msg === "1") {
            var shopList = SystemData.champions.map(function(name, i) {
                var isOwned = d.collection.champions.indexOf(name) !== -1 ? " [보유중]" : "";
                return (i+1) + ". " + name + isOwned;
            }).join("\n");
            return replier.reply(UI.go(session, "SHOP_BUY_ACTION", "챔피언 구매", shopList, "구매할 번호 입력 (500G)"));
        }
        if (session.screen === "SHOP_BUY_ACTION") {
            var uIdx = parseInt(msg) - 1;
            if (SystemData.champions[uIdx]) {
                var target = SystemData.champions[uIdx];
                if (d.collection.champions.indexOf(target) !== -1) return replier.reply(UI.make("구매 불가", "이미 보유 중입니다", "다른 대상 선택"));
                if (d.gold < 500) return replier.reply(UI.make("잔액 부족", "골드가 부족합니다", "현재: " + d.gold + "G"));
                d.gold -= 500;
                d.collection.champions.push(target);
                Database.save(Database.data);
                SessionManager.reset(session);
                return replier.reply(UI.make("구매 성공", "[" + target + "]을(를) 구매하였습니다", "잔액: "+d.gold+"G", true));
            }
        }
    },
    handleStatUp: function(msg, session, replier) {
        var d = session.data;
        if (session.screen === "STAT_UP_MENU") {
            var keys = ["acc", "ref", "com", "int"], names = ["정확", "반응", "침착", "직관"];
            var idx = parseInt(msg) - 1;
            if (keys[idx]) {
                session.selectedStat = keys[idx]; session.selectedStatName = names[idx];
                return replier.reply(UI.go(session, "STAT_UP_INPUT", "", "보유 포인트: " + d.point + "P", "강화 수치 입력"));
            }
        }
        if (session.screen === "STAT_UP_INPUT") {
            var amt = parseInt(msg);
            if (isNaN(amt) || amt <= 0) return replier.reply(UI.make("오류", "1 이상의 숫자만 가능합니다", "다시 입력"));
            if (amt > d.point) return replier.reply(UI.make("실패", "포인트가 부족합니다", "현재: " + d.point));
            d.stats[session.selectedStat] += amt; d.point -= amt; Database.save(Database.data);
            return replier.reply(UI.go(session, "PROFILE_VIEW", "", "", "강화 성공"));
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
                if (session.userListCache && session.userListCache[idx]) {
                    // [수정 핵심] 타겟 아이디를 세션에 즉시 고정
                    session.targetUser = String(session.userListCache[idx]);
                    session.screen = "ADMIN_USER_DETAIL";
                    return replier.reply(UI.renderCategoryUI(session, "작업 선택", ""));
                }
                break;

            case "ADMIN_USER_DETAIL":
                if (msg === "1") return replier.reply(UI.go(session, "ADMIN_EDIT_MENU", "정보 수정", "1. 골드 수정\n2. LP 수정\n3. 레벨 수정", "항목 선택"));
                if (msg === "2") return replier.reply(UI.go(session, "ADMIN_ANSWER_INPUT", "답변 작성", "["+session.targetUser+"] 유저 답변 내용 입력", "전송 대기"));
                if (msg === "3") return replier.reply(UI.go(session, "ADMIN_RESET_CONFIRM", "초기화", "해당 계정을 초기화하시겠습니까?", "'확인' 입력 시 실행"));
                if (msg === "4") return replier.reply(UI.go(session, "ADMIN_DELETE_CONFIRM", "계정 삭제", "해당 계정을 삭제하시겠습니까?", "'삭제확인' 입력 시 실행"));
                break;

            case "ADMIN_EDIT_MENU":
                var map = {"1": "gold", "2": "lp", "3": "level"};
                if (map[msg]) {
                    session.editType = map[msg];
                    return replier.reply(UI.go(session, "ADMIN_EDIT_INPUT", "수치 수정", "수정할 값을 숫자로 입력하세요.", "입력 대기"));
                }
                break;

            case "ADMIN_EDIT_INPUT": return AdminActions.editUserData(msg, session, replier);
            case "ADMIN_ANSWER_INPUT": return AdminActions.submitAnswer(msg, session, replier);
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
                if (msg === "1") return replier.reply(UI.go(session, "JOIN_ID", "회원가입", "ID 입력 (최대 10자)", "아이디 입력"));
                if (msg === "2") return replier.reply(UI.go(session, "LOGIN_ID", "로그인", "ID 입력", "아이디 입력"));
                if (msg === "3") return replier.reply(UI.go(session, "GUEST_INQUIRY", "문의 접수", "내용 입력", "내용 입력"));
                break;
            case "JOIN_ID":
                if (msg.length > 10) return replier.reply(UI.make("오류", "10자 이내만 가능합니다", "다시 입력"));
                if (Database.data[msg]) return replier.reply(UI.make("오류", "중복된 ID입니다", "다른 ID 입력"));
                session.tempId = msg; return replier.reply(UI.go(session, "JOIN_PW", "회원가입", "비밀번호 설정", "비밀번호 입력"));
            case "JOIN_PW":
                Database.data[session.tempId] = Database.getInitData(msg); Database.save(Database.data);
                session.data = Database.data[session.tempId]; replier.reply(UI.make("성공", session.tempId + "님 가입 환영!", "자동 로그인 완료", true));
                SessionManager.reset(session); return replier.reply(UI.renderMenu(session));
            case "LOGIN_ID": session.tempId = msg; return replier.reply(UI.go(session, "LOGIN_PW", "본인 확인", "비밀번호 입력", "비밀번호 입력"));
            case "LOGIN_PW":
                if (Database.data[session.tempId] && Database.data[session.tempId].pw === msg) {
                    session.data = Database.data[session.tempId]; replier.reply(UI.make("성공", session.tempId + "님 환영합니다!", "입장 완료", true));
                    SessionManager.reset(session); return replier.reply(UI.renderMenu(session));
                }
                return replier.reply(UI.make("실패", "정보가 틀립니다", "다시 시도"));
            case "GUEST_INQUIRY": return UserActions.handleInquiry(msg, session, replier);
        }
    }
};

// ━━━━━━━━ [8. 매니저: 유저 핸들러] ━━━━━━━━
var UserManager = {
    handle: function(msg, session, replier) {
        switch(session.screen) {
            case "USER_MAIN":
                if (msg === "1") return replier.reply(UI.go(session, "PROFILE_VIEW", "", "", "조회 완료"));
                if (msg === "2") return replier.reply(UI.go(session, "COL_MAIN", "", "", "항목 선택"));
                if (msg === "3") return replier.reply(UI.go(session, "BATTLE_MAIN", "대전 모드", "1. AI 대전 시작", "모드 선택"));
                if (msg === "4") return replier.reply(UI.go(session, "SHOP_MAIN", "", "", "이용할 번호 입력"));
                if (msg === "5") return replier.reply(UI.go(session, "USER_INQUIRY", "문의 접수", "내용 입력", "운영진 전송"));
                if (msg === "6") { SessionManager.forceLogout(session.tempId); return replier.reply(UI.make("알림", "로그아웃되었습니다", "종료", true)); }
                break;
            case "PROFILE_VIEW": if (msg === "1") return replier.reply(UI.go(session, "STAT_UP_MENU", "", "", "강화 항목 선택")); break;
            case "STAT_UP_MENU": case "STAT_UP_INPUT": return UserActions.handleStatUp(msg, session, replier);
            case "USER_INQUIRY": return UserActions.handleInquiry(msg, session, replier);
            case "COL_MAIN": case "COL_TITLE_ACTION": return UserActions.showCollection(msg, session, replier);
            case "SHOP_MAIN": case "SHOP_BUY_ACTION": return UserActions.handleShop(msg, session, replier);
            case "BATTLE_MAIN": if (msg === "1") replier.reply(UI.make("알림", "전투 시스템은 현재 점검 중입니다", "메인 복귀", true)); break;
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
        
        var session = SessionManager.get(room, String(imageDB.getProfileHash())); 
        msg = msg.trim();
        
        if (msg === "메뉴" || msg === "취소" || (room === Config.AdminRoom && msg === "관리자")) { 
            SessionManager.reset(session); 
            return replier.reply(UI.renderMenu(session)); 
        }
        
        if (msg === "이전") {
            var curr = session.screen;
            if (curr.indexOf("JOIN_") !== -1 || curr.indexOf("LOGIN_") !== -1 || curr === "GUEST_INQUIRY") 
                return replier.reply(UI.go(session, "GUEST_MAIN", "환영합니다", "1. 회원가입\n2. 로그인\n3. 운영진 문의", "메뉴 선택"));
            if (curr === "STAT_UP_MENU" || curr === "STAT_UP_INPUT") 
                return replier.reply(UI.go(session, "PROFILE_VIEW", "", "", "프로필 복귀"));
            if (curr === "COL_TITLE_ACTION" || curr === "COL_CHAR_VIEW") 
                return replier.reply(UI.go(session, "COL_MAIN", "", "", "컬렉션 복귀"));
            if (curr === "SHOP_BUY_ACTION") 
                return replier.reply(UI.go(session, "SHOP_MAIN", "", "", "상점 복귀"));
            if (curr === "ADMIN_USER_DETAIL") 
                return AdminActions.showUserList(session, replier);
            if (curr.indexOf("ADMIN_EDIT") !== -1 || curr === "ADMIN_ANSWER_INPUT" || curr.indexOf("CONFIRM") !== -1) 
                return replier.reply(UI.go(session, "ADMIN_USER_DETAIL", "", "", "상세 정보 복귀"));
            
            SessionManager.reset(session); 
            return replier.reply(UI.renderMenu(session));
        }

        if (session.screen === "IDLE") { 
            if (msg === "메뉴" || room === Config.AdminRoom) return replier.reply(UI.renderMenu(session)); 
            return; 
        }
        
        if (session.type === "ADMIN") AdminManager.handle(msg, session, replier);
        else if (!session.data) LoginManager.handle(msg, session, replier);
        else UserManager.handle(msg, session, replier);
        
        SessionManager.save();
    } catch (e) { 
        Api.replyRoom(Config.AdminRoom, "🚨 오류: " + e.message + " (L:" + e.lineNumber + ")"); 
    }
}
