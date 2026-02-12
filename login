/**
 * [main.js] v0.0.19
 * 1. 문의 관리: 문의 내역 없을 시 예외 문구 출력 및 메뉴 숨김
 * 2. UI 최적화: 관리자 상세 조회 시 불필요한 상세 안내 문구 제거
 * 3. 안정성: 모든 매니저 로직 간의 상태 동기화 유지
 */

// ━━━━━━━━ [1. 설정 및 상수] ━━━━━━━━
var Config = {
    Version: "v0.0.19",
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
        var id = session.targetUser || session.tempId;
        var data = (session.targetUser) ? Database.data[session.targetUser] : session.data;
        var div = Utils.getFixedDivider();
        var scr = session.screen;
        
        if (!data) return this.make("알림", "유저 데이터를 찾을 수 없습니다", "메뉴로 이동", false);

        var title = "정보", head = "", body = "";

        if (scr.indexOf("PROFILE") !== -1 || scr.indexOf("STAT") !== -1 || scr === "ADMIN_USER_DETAIL" || scr === "ADMIN_INQUIRY_VIEW") {
            title = (session.targetUser) ? id + " 님" : "프로필";
            var tier = getTierInfo(data.lp);
            var win = data.win || 0, lose = data.lose || 0, total = win + lose;
            var winRate = total === 0 ? 0 : Math.floor((win / total) * 100);
            var st = data.stats || { acc: 50, ref: 50, com: 50, int: 50 };
            
            head = "👤 계정: " + id + "\n" +
                   "🏅 칭호: [" + data.title + "]\n" +
                   div + "\n" +
                   "🏆 티어: " + tier.icon + tier.name + " (" + data.lp + ")\n" +
                   "💰 골드: " + (data.gold || 0).toLocaleString() + " G\n" +
                   "⚔️ 전적: " + win + "승 " + lose + "패 (" + winRate + "%)\n" + 
                   div + "\n" +
                   "🆙 레벨: Lv." + data.level + "\n" +
                   "🔷 경험: (" + data.exp + "/" + (data.level * 100) + ")\n" +
                   div + "\n" +
                   "🎯정확:" + st.acc + " | ⚡반응:" + st.ref + "\n" +
                   "🧘침착:" + st.com + " | 🧠직관:" + st.int + "\n" +
                   "✨포인트: " + (data.point || 0) + " P";
            
            if (scr === "PROFILE_VIEW") body = "1. 능력치 강화";
            else if (scr === "STAT_UP_MENU") body = "1. 정확 강화\n2. 반응 강화\n3. 침착 강화\n4. 직관 강화";
            else if (scr === "ADMIN_USER_DETAIL") {
                var alarm = (data.inquiryCount > 0) ? " [🔔" + data.inquiryCount + "]" : "";
                body = "1. 정보 수정\n2. 문의 내역" + alarm + "\n3. 초기화\n4. 계정 삭제";
            }
            else if (scr === "ADMIN_INQUIRY_VIEW") {
                title = "문의 내역";
                // 문의가 있을 때만 답변 버튼 출력, 없을 시 안내 문구만 출력
                if (session.hasInquiryFlag) {
                    body = "✉️ 새로운 문의가 접수되어 있습니다.";
                    content = "1. 답변 작성하기";
                } else {
                    body = "📭 접수된 문의 내역이 없습니다.";
                    content = ""; 
                }
            }
        }
        else if (scr.indexOf("SHOP") !== -1) {
            title = "상점";
            var ownedCount = (data.collection && data.collection.champions) ? data.collection.champions.length : 0;
            head = "💰 보유 골드: " + (data.gold || 0).toLocaleString() + " G\n📦 보유 챔피언: " + ownedCount + " / " + SystemData.champions.length;
            if (scr === "SHOP_MAIN") body = "1. 챔피언 영입";
        }
        else if (scr.indexOf("COL") !== -1) {
            title = "컬렉션";
            var ownedCount = (data.collection && data.collection.champions) ? data.collection.champions.length : 0;
            head = "🏅 현재 칭호: [" + data.title + "]\n🏆 수집율: " + Math.floor((ownedCount / SystemData.champions.length) * 100) + "%";
            if (scr === "COL_MAIN") body = "1. 보유 칭호\n2. 보유 챔피언";
        }

        var fullContent = head + (body ? "\n" + div + "\n" + body : "") + (content ? "\n" + div + "\n" + content : "");
        return this.make(title, fullContent, help, false);
    },
    
    go: function(session, screen, title, content, help) {
        session.screen = screen;
        var fixedScreens = ["PROFILE", "STAT", "DETAIL", "SHOP", "COL", "INQUIRY_VIEW"];
        for (var i=0; i<fixedScreens.length; i++) {
            if (screen.indexOf(fixedScreens[i]) !== -1) return this.renderCategoryUI(session, help, content);
        }
        var isRoot = (["USER_MAIN", "ADMIN_MAIN", "GUEST_MAIN", "SUCCESS_IDLE"].indexOf(screen) !== -1);
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
        if (!this.sessions[hash]) { this.sessions[hash] = { data: null, screen: "IDLE", tempId: "비회원", userListCache: [], targetUser: null, editType: null, room: room, lastTime: Date.now(), hasInquiryFlag: false }; }
        var s = this.sessions[hash]; s.room = room; s.type = (room === Config.AdminRoom) ? "ADMIN" : "DIRECT";
        var now = Date.now(); if (s.screen !== "IDLE" && (now - (s.lastTime || 0) > Config.TIMEOUT)) { this.reset(s); }
        s.lastTime = now; return s;
    },
    reset: function(session) { session.screen = "IDLE"; session.targetUser = null; session.editType = null; session.userListCache = []; session.hasInquiryFlag = false; },
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
        session.userListCache = Object.keys(Database.data);
        var list = session.userListCache.map(function(id, i){ 
            var badge = (Database.data[id].inquiryCount > 0) ? " [🔔문의]" : "";
            return (i+1) + ". " + id + badge; 
        }).join("\n");
        replier.reply(UI.go(session, "ADMIN_USER_LIST", "유저 목록", list, "관리할 유저 선택"));
    },
    submitAnswer: function(msg, session, replier) {
        var targetRoom = SessionManager.findUserRoom(session.targetUser);
        Api.replyRoom(targetRoom, UI.make("운영진 회신", "보내신 문의에 대한 답변입니다\n\n" + msg, "소환사의 협곡 드림", true));
        if(Database.data[session.targetUser]) { Database.data[session.targetUser].inquiryCount = 0; Database.save(Database.data); }
        SessionManager.reset(session);
        replier.reply(UI.go(session, "SUCCESS_IDLE", "전송 완료", "답변이 유저에게 전달되었습니다", "메인 복귀"));
    },
    editUserData: function(msg, session, replier) {
        var val = parseInt(msg);
        if (isNaN(val)) return replier.reply(UI.make("입력 오류", "숫자만 입력해 주십시오", "다시 입력"));
        Database.data[session.targetUser][session.editType] = val; Database.save(Database.data);
        Api.replyRoom(SessionManager.findUserRoom(session.targetUser), UI.make("알림", "[" + (session.editType === "gold" ? "골드" : "LP") + "] 정보가 조정되었습니다", "운영 정책 조치", true));
        SessionManager.reset(session); replier.reply(UI.go(session, "SUCCESS_IDLE", "수정 완료", "반영되었습니다", "메인 복귀"));
    },
    resetConfirm: function(msg, session, replier) {
        if (msg === "확인") {
            var pw = Database.data[session.targetUser].pw;
            Database.data[session.targetUser] = Database.getInitData(pw); Database.save(Database.data);
            Api.replyRoom(SessionManager.findUserRoom(session.targetUser), UI.make("알림", "데이터가 초기화되었습니다", "관리자 조치", true));
            SessionManager.reset(session); replier.reply(UI.go(session, "SUCCESS_IDLE", "초기화 완료", "성공했습니다", "메인 복귀"));
        }
    },
    deleteConfirm: function(msg, session, replier) {
        if (msg === "삭제확인") {
            Api.replyRoom(SessionManager.findUserRoom(session.targetUser), UI.make("알림", "계정이 삭제되었습니다", "관리자 조치", true));
            delete Database.data[session.targetUser]; Database.save(Database.data);
            SessionManager.forceLogout(session.targetUser); SessionManager.reset(session);
            replier.reply(UI.go(session, "SUCCESS_IDLE", "삭제 완료", "영구 삭제되었습니다", "메인 복귀"));
        }
    }
};

// ━━━━━━━━ [5. 유저 액션 모듈] ━━━━━━━━
var UserActions = {
    handleInquiry: function(msg, session, replier) {
        if (session.data) {
            session.data.inquiryCount = (session.data.inquiryCount || 0) + 1; Database.save(Database.data);
            Api.replyRoom(Config.AdminRoom, UI.make("문의 접수", "유저: " + session.tempId + "\n내용: " + msg, "조속히 답변 바랍니다", true));
        } else {
            Api.replyRoom(Config.AdminRoom, UI.make("비회원 문의", "발신: " + session.room + "\n내용: " + msg, "회신 불가 세션", true));
        }
        SessionManager.reset(session); replier.reply(UI.make("접수 성공", "문의 내용이 전달되었습니다", "감사합니다", true));
    },

    showCollection: function(msg, session, replier) {
        var d = session.data;
        if (!d.collection) d.collection = { titles: ["뉴비"], champions: [] };
        if (!d.collection.champions) d.collection.champions = [];

        if (session.screen === "COL_MAIN") {
            if (msg === "1") {
                var tList = d.collection.titles.map(function(t, i) { return (i+1) + ". " + (t === d.title ? "✅" : "") + t; }).join("\n");
                return replier.reply(UI.go(session, "COL_TITLE_ACTION", "", tList, "장착할 번호 입력"));
            }
            if (msg === "2") {
                var champs = d.collection.champions;
                var cList = (champs && champs.length > 0) ? champs.map(function(c, i){ return (i+1) + ". " + c; }).join("\n") : "보유 챔피언 없음";
                return replier.reply(UI.go(session, "COL_CHAR_VIEW", "", cList, "목록 확인"));
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
        if (!d.collection) d.collection = { titles: ["뉴비"], champions: [] };
        if (!d.collection.champions) d.collection.champions = [];

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
        var data = Database.data[session.targetUser];
        switch(session.screen) {
            case "ADMIN_MAIN":
                if (msg === "1") return AdminActions.showSysInfo(session, replier);
                if (msg === "2") return AdminActions.showUserList(session, replier);
                break;
            case "ADMIN_USER_LIST":
                var idx = parseInt(msg) - 1;
                if (session.userListCache[idx]) {
                    session.targetUser = session.userListCache[idx];
                    return replier.reply(UI.go(session, "ADMIN_USER_DETAIL", "", "", "작업 선택"));
                }
                break;
            case "ADMIN_USER_DETAIL":
                if (msg === "1") return replier.reply(UI.go(session, "ADMIN_EDIT_MENU", "정보 수정", "1. 골드 수정\n2. LP 수정", "항목 선택"));
                if (msg === "2") {
                    // 문의 진입 전 상태 체크
                    var hasInq = data && (data.inquiryCount > 0);
                    session.hasInquiryFlag = hasInq; // 플래그 기록
                    if(data) { data.inquiryCount = 0; Database.save(Database.data); }
                    return replier.reply(UI.go(session, "ADMIN_INQUIRY_VIEW", "문의 확인", "", hasInq ? "답변 여부 선택" : "내역 없음"));
                }
                if (msg === "3") return replier.reply(UI.go(session, "ADMIN_RESET_CONFIRM", "초기화", "해당 계정을 초기화하시겠습니까?", "'확인' 입력 시 실행"));
                if (msg === "4") return replier.reply(UI.go(session, "ADMIN_DELETE_CONFIRM", "계정 삭제", "해당 계정을 삭제하시겠습니까?", "'삭제확인' 입력 시 실행"));
                break;
            case "ADMIN_INQUIRY_VIEW":
                if (msg === "1" && session.hasInquiryFlag) {
                    return replier.reply(UI.go(session, "ADMIN_ANSWER_INPUT", "답변 작성", "["+session.targetUser+"] 유저에게 보낼 내용 입력", "내용 입력 후 전송"));
                }
                break;
            case "ADMIN_ANSWER_INPUT": return AdminActions.submitAnswer(msg, session, replier);
            case "ADMIN_EDIT_MENU":
                if (msg === "1") { session.editType = "gold"; return replier.reply(UI.go(session, "ADMIN_EDIT_INPUT", "골드 수정", "수치 입력", "입력 대기")); }
                if (msg === "2") { session.editType = "lp"; return replier.reply(UI.go(session, "ADMIN_EDIT_INPUT", "LP 수정", "수치 입력", "입력 대기")); }
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
Database.data = Database.load(); SessionManager.load();

function response(room, msg, sender, isGroupChat, replier, imageDB) {
    try {
        if (!msg) return; if (isGroupChat && room !== Config.AdminRoom) return;
        var session = SessionManager.get(room, String(imageDB.getProfileHash())); msg = msg.trim();
        
        if (msg === "메뉴" || msg === "취소" || (room === Config.AdminRoom && msg === "관리자")) { SessionManager.reset(session); return replier.reply(UI.renderMenu(session)); }
        if (msg === "이전") {
            var curr = session.screen;
            if (curr.indexOf("JOIN_") !== -1 || curr.indexOf("LOGIN_") !== -1 || curr === "GUEST_INQUIRY") return replier.reply(UI.go(session, "GUEST_MAIN", "환영합니다", "1. 회원가입\n2. 로그인\n3. 운영진 문의", "메뉴 선택"));
            if (curr === "STAT_UP_MENU" || curr === "STAT_UP_INPUT") return replier.reply(UI.go(session, "PROFILE_VIEW", "", "", "프로필 복귀"));
            if (curr === "COL_TITLE_ACTION" || curr === "COL_CHAR_VIEW") return replier.reply(UI.go(session, "COL_MAIN", "", "", "컬렉션 복귀"));
            if (curr === "SHOP_BUY_ACTION") return replier.reply(UI.go(session, "SHOP_MAIN", "", "", "상점 복귀"));
            if (curr === "ADMIN_USER_DETAIL") return AdminActions.showUserList(session, replier);
            if (curr.indexOf("ADMIN_EDIT") !== -1 || curr === "ADMIN_ANSWER_INPUT" || curr === "ADMIN_INQUIRY_VIEW" || curr.indexOf("CONFIRM") !== -1) return replier.reply(UI.go(session, "ADMIN_USER_DETAIL", "", "", "상세 정보 복귀"));
            SessionManager.reset(session); return replier.reply(UI.renderMenu(session));
        }

        if (session.screen === "IDLE") { if (msg === "메뉴" || room === Config.AdminRoom) return replier.reply(UI.renderMenu(session)); return; }
        if (session.type === "ADMIN") AdminManager.handle(msg, session, replier);
        else if (!session.data) LoginManager.handle(msg, session, replier);
        else UserManager.handle(msg, session, replier);
        SessionManager.save();
    } catch (e) { Api.replyRoom(Config.AdminRoom, "🚨 오류: " + e.message + " (L:" + e.lineNumber + ")"); }
}        if (!isRoot) res += "\n" + div + "\n" + Utils.getNav();
        return res;
    },
    renderProfile: function(id, data, help, content, isRoot) {
        var lp = data.lp || 0;
        var tier = getTierInfo(lp);
        var win = data.win || 0, lose = data.lose || 0, total = win + lose;
        var winRate = total === 0 ? 0 : Math.floor((win / total) * 100);
        var div = Utils.getFixedDivider();
        var s1 = "👤 계정: " + id + "\n🏅 칭호: [" + data.title + "]";
        var s2 = "🏆 티어: " + tier.icon + " " + tier.name + " (" + lp + " LP)\n💰 골드: " + (data.gold || 0).toLocaleString() + " G\n⚔️ 전적: " + win + "승 " + lose + "패 (" + winRate + "%)";
        var res = "『 " + id + " 』\n" + div + "\n" + s1 + "\n" + div + "\n" + s2 + "\n" + div + "\n";
        if (content) res += content + "\n" + div + "\n"; 
        if (help) res += "💡 " + help;
        if (!isRoot) res += "\n" + div + "\n" + Utils.getNav();
        return res;
    },
    go: function(session, screen, title, content, help) {
        var rootScreens = ["USER_MAIN", "ADMIN_MAIN", "GUEST_MAIN", "GROUP_MAIN", "SUCCESS_IDLE"];
        var isRoot = (rootScreens.indexOf(screen) !== -1);
        
        if (session.screen && session.screen !== screen && session.screen !== "IDLE") {
            if (!session.history) session.history = [];
            session.history.push({ screen: session.screen, title: session.lastTitle });
        }
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
        session.history = []; 
        if (session.type === "ADMIN") return this.go(session, "ADMIN_MAIN", "관리자 메뉴", "1. 시스템 정보\n2. 유저 관리", "번호를 입력하세요.");
        if (session.type === "GROUP") {
            if (!session.data) { session.screen = "IDLE"; return UI.make("알림", "'시스템' 개인톡에서\n로그인을 해주세요.", "보안이 필요합니다.", true); }
            return this.go(session, "GROUP_MAIN", "단톡방 메뉴", "1. 내 정보 확인", "번호를 입력하세요.");
        }
        if (!session.data) return this.go(session, "GUEST_MAIN", "환영합니다", "1. 회원가입\n2. 로그인\n3. 문의하기", "번호를 선택하세요.");
        return this.go(session, "USER_MAIN", "메인 메뉴", "1. 프로필\n2. 컬렉션\n3. 대전\n4. 상점\n5. 문의하기\n6. 로그아웃", "작업 번호를 입력하세요.");
    }
};

// ━━━━━━━━ [3. DB 및 세션 매니저] ━━━━━━━━
var Database = {
    data: {},
    load: function() { try { return JSON.parse(FileStream.read(Config.DB_PATH)); } catch(e) { return {}; } },
    save: function(d) { this.data = d; FileStream.write(Config.DB_PATH, JSON.stringify(d, null, 4)); },
    getInitData: function(pw) { return { pw: pw, gold: 1000, level: 1, lp: 0, win: 0, lose: 0, title: "뉴비", collection: { titles: ["뉴비"], characters: [] }, inquiryCount: 0 }; }
};

var SessionManager = {
    sessions: {},
    load: function() { try { this.sessions = JSON.parse(FileStream.read(Config.SESSION_PATH)); } catch(e) { this.sessions = {}; } },
    save: function() { FileStream.write(Config.SESSION_PATH, JSON.stringify(this.sessions)); },
    get: function(r, h, g) {
        if (!this.sessions[h]) this.sessions[h] = { data: null, screen: "IDLE", history: [], lastTitle: "메뉴", tempId: "비회원", userListCache: [], targetUser: null, editType: null, room: r };
        var s = this.sessions[h];
        if (r.indexOf("direct") !== -1 || !g) s.room = r;
        if (r === Config.AdminRoom) s.type = "ADMIN";
        else if (g && r === Config.GroupRoom) s.type = "GROUP";
        else s.type = "DIRECT";
        return s;
    },
    reset: function(session) { session.screen = "IDLE"; session.history = []; session.userListCache = []; session.targetUser = null; session.editType = null; },
    findUserRoom: function(userId) {
        for (var h in this.sessions) { if (this.sessions[h].tempId === userId) return this.sessions[h].room; }
        return userId;
    },
    forceLogout: function(userId) {
        for (var h in this.sessions) { if (this.sessions[h].tempId === userId) { this.sessions[h].data = null; this.sessions[h].tempId = "비회원"; this.reset(this.sessions[h]); } }
        this.save();
    }
};

// ━━━━━━━━ [4. 매니저: 관리자 시스템] ━━━━━━━━
var AdminManager = {
    handle: function(msg, session, replier) {
        var screen = session.screen;
        if (screen === "ADMIN_MAIN") {
            if (msg === "1") {
                var rt = java.lang.Runtime.getRuntime();
                var used = Math.floor((rt.totalMemory() - rt.freeMemory()) / 1024 / 1024);
                return replier.reply(UI.go(session, "ADMIN_SYS_INFO", "시스템 정보", "📟 RAM: " + used + " MB\n👥 총원: " + Object.keys(Database.data).length + "명", "조회 완료"));
            }
            if (msg === "2") {
                session.userListCache = Object.keys(Database.data);
                var list = session.userListCache.map(function(id, i){ 
                    // [핵심] DB에서 실시간으로 해당 유저의 문의 개수를 가져와서 뱃지로 표시
                    var qCount = Database.data[id].inquiryCount || 0;
                    var badge = (qCount > 0) ? " [🔔" + qCount + "]" : "";
                    return (i+1)+". "+id + badge; 
                }).join("\n");
                return replier.reply(UI.go(session, "ADMIN_USER_LIST", "유저 관리", list, "번호 입력"));
            }
        }
        if (screen === "ADMIN_USER_LIST") {
            var idx = parseInt(msg) - 1;
            if (session.userListCache[idx]) {
                session.targetUser = session.userListCache[idx];
                return replier.reply(UI.go(session, "ADMIN_USER_DETAIL", session.targetUser, "1. 정보 수정\n2. 답변 하기\n3. 데이터 초기화\n4. 계정 삭제", "기능 선택"));
            }
        }
        if (screen === "ADMIN_USER_DETAIL") {
            if (msg === "1") return replier.reply(UI.go(session, "ADMIN_EDIT_MENU", "정보 수정", "1. 골드 수정\n2. LP 수정", "항목 선택"));
            if (msg === "2") return replier.reply(UI.go(session, "ADMIN_ANSWER_INPUT", "답변 하기", "["+session.targetUser+"] 유저에게 보낼 내용을 입력하세요.", "내용 입력"));
            if (msg === "3") return replier.reply(UI.go(session, "ADMIN_RESET_CONFIRM", "초기화", "[" + session.targetUser + "] 리셋하시겠습니까?", "'확인' 입력"));
            if (msg === "4") return replier.reply(UI.go(session, "ADMIN_DELETE_CONFIRM", "계정 삭제", "[" + session.targetUser + "] 삭제하시겠습니까?", "'삭제확인' 입력"));
        }
        if (screen === "ADMIN_ANSWER_INPUT") {
            var targetRoom = SessionManager.findUserRoom(session.targetUser);
            Api.replyRoom(targetRoom, UI.make("운영진 답변", "문의하신 내용에 대한 답변입니다.\n\n[내용]\n" + msg, "관리자 드림", true));
            // 답변 시 해당 유저의 문의 카운트 초기화
            if(Database.data[session.targetUser]) { Database.data[session.targetUser].inquiryCount = 0; Database.save(Database.data); }
            SessionManager.reset(session);
            return replier.reply(UI.go(session, "SUCCESS_IDLE", "성공", "답변 전송 및 알림 뱃지 제거 완료.", "메뉴 복귀"));
        }
        if (screen === "ADMIN_EDIT_MENU") {
            if (msg === "1") { session.editType = "gold"; return replier.reply(UI.go(session, "ADMIN_EDIT_INPUT", "골드 수정", "설정 값을 입력하세요.", "숫자 입력")); }
            if (msg === "2") { session.editType = "lp"; return replier.reply(UI.go(session, "ADMIN_EDIT_INPUT", "LP 수정", "설정 값을 입력하세요.", "숫자 입력")); }
        }
        if (screen === "ADMIN_EDIT_INPUT") {
            var val = parseInt(msg);
            if (isNaN(val)) return replier.reply(UI.make("오류", "숫자만 가능합니다.", "재입력"));
            Database.data[session.targetUser][session.editType] = val; Database.save(Database.data);
            Api.replyRoom(SessionManager.findUserRoom(session.targetUser), UI.make("시스템 알림", "운영진에 의해 [" + (session.editType === "gold" ? "골드" : "LP") + "] 수치가 [" + val + "] (으)로 변경되었습니다.", "관리자 조치", true));
            SessionManager.reset(session); return replier.reply(UI.go(session, "SUCCESS_IDLE", "성공", "수정 완료", "메뉴 복귀"));
        }
        if (screen === "ADMIN_RESET_CONFIRM" && msg === "확인") {
            Database.data[session.targetUser] = Database.getInitData(Database.data[session.targetUser].pw); Database.save(Database.data);
            Api.replyRoom(SessionManager.findUserRoom(session.targetUser), UI.make("알림", "귀하의 게임 데이터가 초기화되었습니다.", "관리자 조치", true));
            SessionManager.reset(session); return replier.reply(UI.go(session, "SUCCESS_IDLE", "성공", "초기화 완료", "메뉴 복귀"));
        }
        if (screen === "ADMIN_DELETE_CONFIRM" && msg === "삭제확인") {
            Api.replyRoom(SessionManager.findUserRoom(session.targetUser), UI.make("알림", "운영진에 의해 계정이 삭제되었습니다.", "관리자 조치", true));
            delete Database.data[session.targetUser]; Database.save(Database.data);
            SessionManager.forceLogout(session.targetUser);
            SessionManager.reset(session); return replier.reply(UI.go(session, "SUCCESS_IDLE", "성공", "삭제 완료", "메뉴 복귀"));
        }
    }
};

// ━━━━━━━━ [5. 매니저: 개인톡(User) 시스템] ━━━━━━━━
var UserManager = {
    handle: function(msg, session, replier) {
        var d = session.data;
        if (!d) {
            switch(session.screen) {
                case "GUEST_MAIN": 
                    if (msg === "1") return replier.reply(UI.go(session, "JOIN_ID", "회원가입", "아이디를 입력하세요. (최대 10자)", "가입"));
                    if (msg === "2") return replier.reply(UI.go(session, "LOGIN_ID", "인증", "아이디를 입력하세요.", "로그인"));
                    if (msg === "3") return replier.reply(UI.go(session, "GUEST_INQUIRY", "비회원 문의", "관리자에게 보낼 내용을 입력하세요.", "내용 입력"));
                    break;
                case "GUEST_INQUIRY":
                    Api.replyRoom(Config.AdminRoom, UI.make("비회원 문의", "방: " + session.room + "\n내용: " + msg, "회신 불가", true));
                    SessionManager.reset(session); return replier.reply(UI.make("완료", "문의가 전송되었습니다.", "메뉴 복귀", true));
                case "JOIN_ID": 
                    // [핵심] 아이디(닉네임) 길이 10자 제한 로직
                    if (msg.length > 10) return replier.reply(UI.make("오류", "아이디는 10글자까지만\n가능합니다. ("+msg.length+"자 입력함)", "재입력"));
                    if (Database.data[msg]) return replier.reply(UI.make("오류", "이미 존재하는 ID", "재입력"));
                    session.tempId = msg; return replier.reply(UI.go(session, "JOIN_PW", "회원가입", "비밀번호 설정", "보안"));
                case "JOIN_PW": 
                    Database.data[session.tempId] = Database.getInitData(msg); Database.save(Database.data);
                    session.data = Database.data[session.tempId];
                    replier.reply(UI.make("성공", "가입 성공!\n환영합니다, " + session.tempId + "님.", "로그인 완료", true));
                    SessionManager.reset(session); return replier.reply(UI.renderMenu(session));
                case "LOGIN_ID": session.tempId = msg; return replier.reply(UI.go(session, "LOGIN_PW", "인증", "비밀번호 입력", "인증"));
                case "LOGIN_PW": 
                    if (Database.data[session.tempId] && Database.data[session.tempId].pw === msg) {
                        session.data = Database.data[session.tempId];
                        replier.reply(UI.make("성공", "반갑습니다, " + session.tempId + "님!", "메뉴 로드", true));
                        SessionManager.reset(session); return replier.reply(UI.renderMenu(session));
                    }
                    return replier.reply(UI.make("실패", "인증 정보 오류", "재시도"));
            }
            return;
        }

        if (session.screen === "USER_MAIN") {
            if (msg === "1") return replier.reply(UI.go(session, "PROFILE_VIEW", session.tempId, "", "내 정보 조회"));
            if (msg === "2") return replier.reply(UI.go(session, "COL_MAIN", "컬렉션", "1. 보유 칭호\n2. 보유 캐릭터", "조회"));
            if (msg === "3") return replier.reply(UI.go(session, "BATTLE_MAIN", "대전", "1. AI 봇 매칭", "전투"));
            if (msg === "4") return replier.reply(UI.go(session, "SHOP_MAIN", "상점", "1. 캐릭터 구매", "구매"));
            if (msg === "5") return replier.reply(UI.go(session, "USER_INQUIRY", "문의하기", "내용을 입력하세요.", "내용 입력"));
            if (msg === "6") { SessionManager.forceLogout(session.tempId); return replier.reply(UI.make("알림", "로그아웃 되었습니다.", "종료", true)); }
        }

        if (session.screen === "USER_INQUIRY") {
            // [핵심] 유저가 문의하면 DB의 해당 유저 데이터에 카운트 누적
            d.inquiryCount = (d.inquiryCount || 0) + 1; Database.save(Database.data);
            Api.replyRoom(Config.AdminRoom, UI.make("유저 문의", "ID: " + session.tempId + "\n내용: " + msg, "답변 대기", true));
            SessionManager.reset(session); return replier.reply(UI.make("성공", "문의가 성공적으로 전달되었습니다.", "메뉴 복귀", true));
        }

        // 컬렉션
        if (session.screen === "COL_MAIN") {
            if (msg === "1") {
                var tList = d.collection.titles.map(function(t, i) { return (i+1) + ". " + (t === d.title ? "✅ " : "") + t; }).join("\n");
                return replier.reply(UI.go(session, "COL_TITLE_ACTION", "보유 칭호", tList, "장착할 번호 선택"));
            }
            if (msg === "2") {
                var cList = (d.collection.characters.length > 0) ? d.collection.characters.join("\n") : "보유 유닛 없음";
                return replier.reply(UI.go(session, "COL_CHAR_VIEW", "보유 리스트", cList, "나의 팀원"));
            }
        }
        if (session.screen === "COL_TITLE_ACTION") {
            var tIdx = parseInt(msg) - 1;
            if (d.collection.titles[tIdx]) {
                d.title = d.collection.titles[tIdx]; Database.save(Database.data);
                SessionManager.reset(session); return replier.reply(UI.make("성공", "[" + d.title + "] 장착 완료!", "메뉴 복귀", true));
            }
        }

        // 상점 (생략 없음)
        if (session.screen === "SHOP_MAIN" && msg === "1") return replier.reply(UI.go(session, "SHOP_ROLES", "상점 카테고리", RoleKeys.map(function(r, i){ return (i+1)+". "+r; }).join("\n"), "선택"));
        if (session.screen === "SHOP_ROLES") {
            var rIdx = parseInt(msg) - 1;
            if (RoleKeys[rIdx]) {
                session.selectedRole = RoleKeys[rIdx];
                var uList = SystemData.roles[session.selectedRole].units.map(function(u, i) {
                    var owned = d.collection.characters.indexOf(u) !== -1;
                    return (i+1) + ". " + u + (owned ? " [보유]" : " (500G)");
                }).join("\n");
                return replier.reply(UI.go(session, "SHOP_BUY_ACTION", session.selectedRole, uList, "구매 번호 입력"));
            }
        }
        if (session.screen === "SHOP_BUY_ACTION") {
            var units = SystemData.roles[session.selectedRole].units, uIdx = parseInt(msg) - 1;
            if (units[uIdx]) {
                var target = units[uIdx];
                if (d.collection.characters.indexOf(target) !== -1) return replier.reply(UI.make("알림", "보유 중입니다.", "취소"));
                if (d.gold < 500) return replier.reply(UI.make("알림", "골드 부족", "잔액 부족"));
                d.gold -= 500; d.collection.characters.push(target); Database.save(Database.data);
                SessionManager.reset(session); return replier.reply(UI.make("성공", target + " 구매 완료!", "남은 골드: "+d.gold+"G", true));
            }
        }

        // 대전 (생략 없음)
        if (session.screen === "BATTLE_MAIN" && msg === "1") return replier.reply(UI.go(session, "BATTLE_AI_SEARCH", "매칭 중", "🤖 AI 검색 중...", "대기"));
        if (session.screen === "BATTLE_AI_SEARCH") return replier.reply(UI.go(session, "BATTLE_PREP", "전투 준비", "⚔️ [중급] 봇 유미 발견.\n시작하시겠습니까?", "'시작' 입력"));
        if (session.screen === "BATTLE_PREP" && msg === "시작") {
            SessionManager.reset(session); return replier.reply(UI.make("알림", "전투 시스템 점검 중", "메뉴 복귀", true));
        }
    }
};

// ━━━━━━━━ [6. 단체방/메인 응답 핸들러] ━━━━━━━━
Database.data = Database.load(); SessionManager.load();         

function response(room, msg, sender, isGroupChat, replier, imageDB) {
    try {
        if (!msg) return; 
        var hash = String(imageDB.getProfileHash()); 
        var session = SessionManager.get(room, hash, isGroupChat); 
        msg = msg.trim(); 
        
        if (msg === "메뉴" || msg === "취소") {
            if (isGroupChat) {
                for (var k in SessionManager.sessions) {
                    var s = SessionManager.sessions[k];
                    if (s.type === "DIRECT" && s.tempId === sender && s.data) {
                        session.data = s.data; session.tempId = s.tempId; break;
                    }
                }
            }
            SessionManager.reset(session); return replier.reply(UI.renderMenu(session)); 
        }

        if (msg === "이전" && session.history && session.history.length > 0) {
            var p = session.history.pop(); session.screen = p.screen; session.lastTitle = p.title;
            return replier.reply(UI.renderMenu(session));
        }

        // 단톡방 세션 동기화
        if (isGroupChat && room === Config.GroupRoom) {
            for (var key in SessionManager.sessions) {
                var target = SessionManager.sessions[key];
                if (target.type === "DIRECT" && target.tempId === sender && target.data) {
                    session.data = target.data; session.tempId = target.tempId; break;
                }
            }
        }

        if (session.screen === "IDLE") return;
        if (session.type === "ADMIN" && hash === Config.AdminHash) return AdminManager.handle(msg, session, replier);
        UserManager.handle(msg, session, replier);
        SessionManager.save();
    } catch (e) { 
        Api.replyRoom(Config.AdminRoom, "오류: " + e.message + " (L:" + e.lineNumber + ")"); 
    }
}
