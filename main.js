/**
 * [main.js] 
 * - 세션 종료 5분 (300000ms)
 * - 에러 발생 시 UI.make 적용
 * - 관리자 유저 정보 + 메뉴 동시 노출
 * - 관리자/로그인/유저 핸들러 완전 분리 유지
 */

// ━━━━━━━━ [1. 설정 및 상수] ━━━━━━━━
var Config = {
    Version: "v0.0.26",
    Prefix: ".",
    AdminRoom: "소환사의협곡관리", 
    BotName: "소환사의 협곡",
    DB_PATH: "/sdcard/msgbot/Bots/main/database.json",
    SESSION_PATH: "/sdcard/msgbot/Bots/main/sessions.json",
    LINE_CHAR: "━",
    FIXED_LINE: 14,
    WRAP_LIMIT: 18,
    NAV_ITEMS: ["⬅️이전", "❌취소", "🏠메뉴"],
    TIMEOUT: 300000 // 5분 설정
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
            if (line.length <= Config.WRAP_LIMIT) { 
                result.push(line); 
            } else { 
                for (var j = 0; j < line.length; j += Config.WRAP_LIMIT) {
                    var chunk = line.substring(j, j + Config.WRAP_LIMIT);
                    if (j + Config.WRAP_LIMIT < line.length && line[j + Config.WRAP_LIMIT] === ".") {
                        chunk = line.substring(j, j + Config.WRAP_LIMIT - 1);
                        j--;
                    }
                    result.push(chunk);
                }
            }
        }
        return result.join("\n");
    }
};

var TierData = [
    { name: "챌린저", icon: "✨", minLp: 3000 }, { name: "그랜드마스터", icon: "🔴", minLp: 2500 },
    { name: "마스터", icon: "🟣", minLp: 2000 }, { name: "다이아몬드", icon: "💎", minLp: 1700 },
    { name: "에메럴드", icon: "💚", minLp: 1400 }, { name: "플래티넘", icon: "💿", minLp: 1100 },
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
    make: function(top, mid, isRoot, help) {
        var div = Utils.getFixedDivider();
        var res = "『 " + top + " 』\n" + div + "\n";
        if (mid) res += Utils.wrapText(mid) + "\n" + div + "\n";
        if (!isRoot) res += "⬅️ 이전\n❌ 취소\n" + div + "\n";
        if (help) res += "💡 " + Utils.wrapText(help);
        return res;
    },

    go: function(session, screen, title, content, help) {
        session.screen = screen;
        var data = (session.targetUser) ? Database.data[session.targetUser] : session.data;
        var isRoot = (["USER_MAIN", "ADMIN_MAIN", "GUEST_MAIN", "IDLE"].indexOf(screen) !== -1);
        var top = title;
        var info = "";

        if (data) {
            if (screen === "PROFILE_VIEW" || screen === "ADMIN_USER_DETAIL" || screen.indexOf("STAT") !== -1 || screen.indexOf("ADMIN_EDIT") !== -1) {
                var targetId = session.targetUser || session.tempId;
                var tier = getTierInfo(data.lp);
                top = (screen.indexOf("ADMIN_") !== -1) ? "👤 유저 관리: " + targetId : "👤 내 프로필";
                info = "🏅 티어: " + tier.icon + tier.name + " (" + (data.lp || 0) + ")\n" +
                       "💰 골드: " + (data.gold || 0).toLocaleString() + " G\n" +
                       "⚔️ 전적: " + (data.win || 0) + "승 " + (data.lose || 0) + "패\n" +
                       "🆙 레벨: Lv." + data.level + " (" + data.exp + "/" + (data.level * 100) + ")\n" +
                       Utils.getFixedDivider() + "\n" +
                       "🎯 정확:" + data.stats.acc + " | ⚡ 반응:" + data.stats.ref + "\n" +
                       "🧘 침착:" + data.stats.com + " | 🧠 직관:" + data.stats.int + "\n" +
                       "✨ 포인트: " + (data.point || 0) + " P\n" +
                       Utils.getFixedDivider() + "\n";
            } 
            else if (screen === "COL_TITLE_ACTION") {
                top = "🎖️ 칭호 설정";
                info = "현재 장착: [" + (data.title || "없음") + "]\n보유 칭호: " + (data.collection.titles.length) + "개\n" + Utils.getFixedDivider() + "\n";
            }
            else if (screen === "COL_CHAR_VIEW") {
                top = "📦 보유 챔피언";
                info = "수집 현황: " + (data.collection.champions.length) + " / 18\n" + Utils.getFixedDivider() + "\n";
            }
            else if (screen === "SHOP_BUY_ACTION") {
                top = "💰 챔피언 영입";
                info = "보유 자산: " + (data.gold || 0).toLocaleString() + " G\n" + Utils.getFixedDivider() + "\n";
            }
        }
        return this.make(top || title, info + (content || ""), isRoot, help);
    },

    renderMenu: function(session) {
        if (session.type === "ADMIN") return this.go(session, "ADMIN_MAIN", "관리자 메뉴", "1. 시스템 정보\n2. 유저 조회\n3. 문의 관리", "관리 항목 번호 입력");
        if (!session.data) return this.go(session, "GUEST_MAIN", "환영합니다", "1. 회원가입\n2. 로그인\n3. 관리자 문의", "번호 선택");
        return this.go(session, "USER_MAIN", "메인 메뉴", "1. 프로필 조회\n2. 컬렉션\n3. 대전 모드\n4. 상점\n5. 관리자 문의\n6. 로그아웃", "번호 선택");
    }
};

// ━━━━━━━━ [3. DB 및 세션 매니저] ━━━━━━━━
var Database = {
    data: {}, inquiries: [],
    load: function() { 
        try { 
            var content = FileStream.read(Config.DB_PATH);
            if (!content) { this.data = {}; this.inquiries = []; return; }
            var d = JSON.parse(content);
            this.data = d.users || {}; this.inquiries = d.inquiries || [];
        } catch(e) { this.data = {}; this.inquiries = []; }
    },
    save: function() { var obj = { users: this.data, inquiries: this.inquiries }; FileStream.write(Config.DB_PATH, JSON.stringify(obj, null, 4)); },
    getInitData: function(pw) { return { pw: pw, gold: 1000, level: 1, exp: 0, lp: 0, win: 0, lose: 0, title: "뉴비", point: 0, stats: { acc: 50, ref: 50, com: 50, int: 50 }, collection: { titles: ["뉴비"], champions: [] } }; },
    addExp: function(userId, amount) {
        var d = this.data[userId]; if (!d || d.level >= MAX_LEVEL) return;
        d.exp += amount;
        while (d.exp >= d.level * 100 && d.level < MAX_LEVEL) { d.exp -= (d.level * 100); d.level++; d.point += 5; }
        this.save();
    }
};

var SessionManager = {
    sessions: {}, timers: {},
    load: function() { try { var content = FileStream.read(Config.SESSION_PATH); this.sessions = content ? JSON.parse(content) : {}; } catch(e) { this.sessions = {}; } },
    save: function() { FileStream.write(Config.SESSION_PATH, JSON.stringify(this.sessions)); },
    get: function(room, hash, replier) {
        if (!this.sessions[hash]) this.sessions[hash] = { screen: "IDLE", tempId: "비회원", type: (room === Config.AdminRoom ? "ADMIN" : "USER"), data: null };
        var s = this.sessions[hash]; s.room = room; s.hash = hash;
        if (this.timers[hash]) { clearTimeout(this.timers[hash]); delete this.timers[hash]; }
        var self = this;
        if (s.screen !== "IDLE") {
            this.timers[hash] = setTimeout(function() {
                if (s.screen !== "IDLE") {
                    self.reset(s, hash); self.save();
                    replier.reply(UI.make("⏰ 세션 자동 종료", "입력 시간이 5분을 초과하여\n데이터 보호를 위해 세션을 종료합니다", true, "다시 시작하려면 '메뉴'를 입력하세요"));
                }
            }, Config.TIMEOUT);
        }
        return s;
    },
    reset: function(session, hash) {
        session.screen = "IDLE"; session.targetUser = null; session.targetInquiryIdx = null; session.editType = null; session.userListCache = [];
        if (hash && this.timers[hash]) { clearTimeout(this.timers[hash]); delete this.timers[hash]; }
    },
    findUserRoom: function(userId) { for (var h in this.sessions) { if (this.sessions[h].tempId === userId) return this.sessions[h].room; } return userId; },
    forceLogout: function(userId) { for (var h in this.sessions) { if (this.sessions[h].tempId === userId) { this.sessions[h].data = null; this.sessions[h].tempId = "비회원"; this.reset(this.sessions[h], h); } } this.save(); }
};

// ━━━━━━━━ [4. 관리자 액션 모듈] ━━━━━━━━
var AdminActions = {
    showSysInfo: function(session, replier) {
        var rt = java.lang.Runtime.getRuntime();
        var used = Math.floor((rt.totalMemory() - rt.freeMemory()) / 1024 / 1024);
        replier.reply(UI.go(session, "ADMIN_SYS_INFO", "시스템 정보", "📟 메모리: " + used + "MB\n👥 유저: " + Object.keys(Database.data).length + "명", "조회 완료"));
    },
    showUserList: function(session, replier) {
        var userIds = Object.keys(Database.data || {});
        if (userIds.length === 0) return replier.reply(UI.make("알림", "등록된 유저가 없습니다.", true));
        session.userListCache = userIds;
        var listStr = userIds.map(function(id, i) { return (i + 1) + ". " + id; }).join("\n");
        replier.reply(UI.go(session, "ADMIN_USER_LIST", "유저 목록", listStr, "관리할 유저 선택"));
    },
    showInquiryList: function(session, replier) {
        if (!Database.inquiries || Database.inquiries.length === 0) return replier.reply(UI.make("알림", "문의가 없습니다.", true));
        var groups = {};
        Database.inquiries.forEach(function(iq, index) {
            var date = iq.time ? iq.time.split(" ")[0] : "날짜미상"; 
            if (!groups[date]) groups[date] = [];
            groups[date].push({ idx: index, data: iq });
        });
        var listText = "";
        var dateKeys = Object.keys(groups);
        for (var i = 0; i < dateKeys.length; i++) {
            var date = dateKeys[i];
            listText += "📅 [ " + date + " ]\n" + groups[date].map(function(item) {
                var iq = item.data;
                var icon = iq.read ? "✅" : "🆕";
                var timeOnly = iq.time.split(" ")[1] || "00:00";
                return (item.idx + 1) + ". " + icon + " " + iq.sender + " (" + timeOnly + ")";
            }).join("\n");
            if (i < dateKeys.length - 1) listText += "\n" + Utils.getFixedDivider() + "\n";
        }
        replier.reply(UI.go(session, "ADMIN_INQUIRY_LIST", "문의 센터", listText, "번호 입력"));
    },
    viewInquiryDetail: function(idx, session, replier) {
        var iq = Database.inquiries[idx];
        if (!iq) return;
        iq.read = true; Database.save();
        session.targetInquiryIdx = idx; session.targetUser = iq.sender;
        replier.reply(UI.go(session, "ADMIN_INQUIRY_DETAIL", "문의 상세", "👤 발신: " + iq.sender + "\n⏰ 시간: " + iq.time + "\n📝 내용: " + iq.content, "1. 답변 2. 삭제"));
    },
    editUserData: function(msg, session, replier) {
        var val = parseInt(msg);
        if (isNaN(val)) return replier.reply(UI.make("오류", "숫자만 입력 가능합니다", false));
        Database.data[session.targetUser][session.editType] = val; Database.save();
        replier.reply(UI.make("수정 완료", "정보가 반영되었습니다.", true));
        return this.showUserList(session, replier);
    }
};

// ━━━━━━━━ [5. 유저 액션 모듈] ━━━━━━━━
var UserActions = {
    handleInquiry: function(msg, session, replier) {
        var now = new Date();
        var hours = now.getHours() < 10 ? "0" + now.getHours() : now.getHours();
        var min = now.getMinutes() < 10 ? "0" + now.getMinutes() : now.getMinutes();
        var timeStr = (now.getMonth()+1) + "/" + now.getDate() + " " + hours + ":" + min;
        Database.inquiries.push({ sender: session.tempId || "비회원", room: session.room, content: msg, time: timeStr, read: false });
        Database.save();
        replier.reply(UI.make("접수 성공", "문의가 운영진에게 전달되었습니다", true));
        SessionManager.reset(session);
    },
    showCollection: function(msg, session, replier) {
        var d = session.data;
        if (session.screen === "COL_MAIN") {
            if (msg === "1") {
                var tList = d.collection.titles.map(function(t, i) { return (i+1) + ". " + (t === d.title ? "✅" : "") + t; }).join("\n");
                return replier.reply(UI.go(session, "COL_TITLE_ACTION", "", tList, "장착할 번호 입력"));
            }
            if (msg === "2") {
                var cList = (d.collection.champions.length > 0) ? d.collection.champions.map(function(c, i){ return (i+1) + ". " + c; }).join("\n") : "보유 챔피언 없음";
                return replier.reply(UI.go(session, "COL_CHAR_VIEW", "", cList, "목록 확인"));
            }
        }
        if (session.screen === "COL_TITLE_ACTION") {
            var idx = parseInt(msg) - 1;
            if (d.collection.titles[idx]) { 
                d.title = d.collection.titles[idx]; Database.save(); SessionManager.reset(session);
                return replier.reply(UI.make("설정 완료", "[" + d.title + "] 장착!", true)); 
            }
        }
    },
    handleShop: function(msg, session, replier) {
        var d = session.data;
        if (session.screen === "SHOP_MAIN" && msg === "1") {
            var shopList = SystemData.champions.map(function(name, i) { return (i+1) + ". " + name + (d.collection.champions.indexOf(name) !== -1 ? " [보유중]" : ""); }).join("\n");
            return replier.reply(UI.go(session, "SHOP_BUY_ACTION", "", shopList, "구매 번호 입력 (500G)"));
        }
        if (session.screen === "SHOP_BUY_ACTION") {
            var target = SystemData.champions[parseInt(msg)-1];
            if (target) {
                if (d.collection.champions.indexOf(target) !== -1) return replier.reply(UI.make("알림", "이미 보유 중입니다", false));
                if (d.gold < 500) return replier.reply(UI.make("잔액 부족", "골드가 부족합니다", false));
                d.gold -= 500; d.collection.champions.push(target); Database.save(); SessionManager.reset(session);
                return replier.reply(UI.make("구매 성공", "[" + target + "] 영입 완료!", true));
            }
        }
    },
    handleStatUp: function(msg, session, replier) {
        var d = session.data;
        if (session.screen === "STAT_UP_MENU") {
            var keys = ["acc", "ref", "com", "int"], names = ["정확", "반응", "침착", "직관"];
            var idx = parseInt(msg) - 1;
            if (keys[idx]) { 
                session.selectedStat = keys[idx]; 
                session.selectedStatName = names[idx]; 
                return replier.reply(UI.go(session, "STAT_UP_INPUT", "", "보유 포인트: " + d.point + "P", "강화 수치 입력")); 
            }
        }
        if (session.screen === "STAT_UP_INPUT") {
            var amt = parseInt(msg);
            if (isNaN(amt) || amt <= 0 || amt > d.point) return replier.reply(UI.make("오류", "포인트 범위를 확인하세요", false));
            d.stats[session.selectedStat] += amt; d.point -= amt; Database.save();
            return replier.reply(UI.go(session, "PROFILE_VIEW", "", "", "강화 성공"));
        }
    }
};

// ━━━━━━━━ [6. 매니저: 관리자 핸들러] ━━━━━━━━
var AdminManager = {
    handle: function(msg, session, replier) {
        var screen = session.screen;
        if (screen === "ADMIN_MAIN") {
            if (msg === "1") return AdminActions.showSysInfo(session, replier);
            if (msg === "2") return AdminActions.showUserList(session, replier);
            if (msg === "3") return AdminActions.showInquiryList(session, replier);
        }
        if (screen === "ADMIN_USER_LIST") {
            var idx = parseInt(msg) - 1;
            if (session.userListCache[idx]) {
                session.targetUser = session.userListCache[idx];
                return replier.reply(UI.go(session, "ADMIN_USER_DETAIL", "", "1. 정보 수정\n2. 초기화\n3. 계정 삭제", "작업 선택"));
            }
        }
        switch(screen) {
            case "ADMIN_USER_DETAIL":
                if (msg === "1") return replier.reply(UI.go(session, "ADMIN_EDIT_MENU", "정보 수정", "1. 골드 수정\n2. LP 수정", "항목 선택"));
                if (msg === "2") return replier.reply(UI.go(session, "ADMIN_RESET_CONF", "초기화", "정말 초기화하시겠습니까?", "'확인' 입력"));
                if (msg === "3") return replier.reply(UI.go(session, "ADMIN_DEL_CONF", "계정 삭제", "정말 삭제하시겠습니까?", "'삭제확인' 입력"));
                break;
            case "ADMIN_EDIT_MENU":
                session.editType = (msg === "1") ? "gold" : (msg === "2") ? "lp" : null;
                if (session.editType) return replier.reply(UI.go(session, "ADMIN_EDIT_INPUT", "수정", "변경할 수치 입력", "숫자 입력"));
                break;
            case "ADMIN_EDIT_INPUT": return AdminActions.editUserData(msg, session, replier);
            case "ADMIN_RESET_CONF":
                if (msg === "확인") {
                    var pw = Database.data[session.targetUser].pw;
                    Database.data[session.targetUser] = Database.getInitData(pw); Database.save();
                    replier.reply(UI.make("완료", "초기화되었습니다.", true)); return AdminActions.showUserList(session, replier);
                }
                break;
            case "ADMIN_DEL_CONF":
                if (msg === "삭제확인") {
                    delete Database.data[session.targetUser]; Database.save(); SessionManager.forceLogout(session.targetUser);
                    replier.reply(UI.make("완료", "삭제되었습니다.", true)); return AdminActions.showUserList(session, replier);
                }
                break;
            case "ADMIN_INQUIRY_LIST":
                var idx = parseInt(msg) - 1;
                if (Database.inquiries[idx]) AdminActions.viewInquiryDetail(idx, session, replier);
                break;
            case "ADMIN_INQUIRY_DETAIL":
                if (msg === "1") return replier.reply(UI.go(session, "ADMIN_ANS_INPUT", "답변 작성", "["+session.targetUser+"]님에게 회신", "내용 입력"));
                if (msg === "2") { Database.inquiries.splice(session.targetInquiryIdx, 1); Database.save(); return AdminActions.showInquiryList(session, replier); }
                break;
            case "ADMIN_ANS_INPUT":
                var targetRoom = SessionManager.findUserRoom(session.targetUser);
                Api.replyRoom(targetRoom, UI.make("운영진 회신", msg, true));
                replier.reply(UI.make("전송 완료", "답변을 보냈습니다.", true));
                return AdminActions.showInquiryList(session, replier);
        }
    }
};

// ━━━━━━━━ [7. 로그인 핸들러] ━━━━━━━━
var LoginManager = {
    handle: function(msg, session, replier) {
        switch(session.screen) {
            case "GUEST_MAIN":
                if (msg === "1") return replier.reply(UI.go(session, "JOIN_ID", "회원가입", "ID 입력", "ID 입력"));
                if (msg === "2") return replier.reply(UI.go(session, "LOGIN_ID", "로그인", "ID 입력", "ID 입력"));
                if (msg === "3") return replier.reply(UI.go(session, "GUEST_INQUIRY", "문의", "내용 입력", "내용 입력"));
                break;
            case "JOIN_ID": session.tempId = msg; return replier.reply(UI.go(session, "JOIN_PW", "비번 설정", "비번 입력", "비번 입력"));
            case "JOIN_PW":
                Database.data[session.tempId] = Database.getInitData(msg); Database.save();
                session.data = Database.data[session.tempId]; SessionManager.reset(session); return replier.reply(UI.renderMenu(session));
            case "LOGIN_ID": session.tempId = msg; return replier.reply(UI.go(session, "LOGIN_PW", "본인 확인", "비번 입력", "비번 입력"));
            case "LOGIN_PW":
                if (Database.data[session.tempId] && Database.data[session.tempId].pw === msg) { session.data = Database.data[session.tempId]; SessionManager.reset(session); return replier.reply(UI.renderMenu(session)); }
                return replier.reply(UI.make("실패", "정보가 일치하지 않습니다", false));
            case "GUEST_INQUIRY": return UserActions.handleInquiry(msg, session, replier);
        }
    }
};

// ━━━━━━━━ [8. 유저 핸들러] ━━━━━━━━
var UserManager = {
    handle: function(msg, session, replier) {
        switch(session.screen) {
            case "USER_MAIN":
                if (msg === "1") return replier.reply(UI.go(session, "PROFILE_VIEW", "", "1. 스탯 강화", "조회 완료"));
                if (msg === "2") return replier.reply(UI.go(session, "COL_MAIN", "컬렉션", "1. 칭호 관리\n2. 챔피언 도감", "항목 선택"));
                if (msg === "4") return replier.reply(UI.go(session, "SHOP_MAIN", "상점", "1. 챔피언 영입", "이용 선택"));
                if (msg === "5") return replier.reply(UI.go(session, "USER_INQUIRY", "문의", "내용 입력", "운영진 전송"));
                if (msg === "6") { SessionManager.forceLogout(session.tempId); return replier.reply(UI.make("알림", "로그아웃 완료", true)); }
                break;
            case "PROFILE_VIEW": if (msg === "1") return replier.reply(UI.go(session, "STAT_UP_MENU", "강화", "1. 정확 2. 반응 3. 침착 4. 직관", "항목 선택")); break;
            case "STAT_UP_MENU": case "STAT_UP_INPUT": return UserActions.handleStatUp(msg, session, replier);
            case "COL_MAIN": case "COL_TITLE_ACTION": case "COL_CHAR_VIEW": return UserActions.showCollection(msg, session, replier);
            case "SHOP_MAIN": case "SHOP_BUY_ACTION": return UserActions.handleShop(msg, session, replier);
            case "USER_INQUIRY": return UserActions.handleInquiry(msg, session, replier);
        }
    }
};

// ━━━━━━━━ [9. 메인 응답 핸들러] ━━━━━━━━
Database.load(); SessionManager.load();
function response(room, msg, sender, isGroupChat, replier, imageDB) {
    try {
        if (!msg) return; if (isGroupChat && room !== Config.AdminRoom) return;
        var session = SessionManager.get(room, String(imageDB.getProfileHash()), replier);
        msg = msg.trim();
        
        if (msg === "메뉴" || msg === "취소" || (room === Config.AdminRoom && msg === "관리자")) { SessionManager.reset(session, String(imageDB.getProfileHash())); return replier.reply(UI.renderMenu(session)); }
        if (msg === "이전") {
            var curr = session.screen;
            if (curr === "ADMIN_USER_DETAIL" || curr === "ADMIN_SYS_INFO" || curr === "ADMIN_INQUIRY_LIST") return AdminActions.showUserList(session, replier);
            SessionManager.reset(session, String(imageDB.getProfileHash())); return replier.reply(UI.renderMenu(session));
        }

        if (session.screen === "IDLE") { if (msg === "메뉴") return replier.reply(UI.renderMenu(session)); return; }

        if (session.type === "ADMIN") AdminManager.handle(msg, session, replier);
        else if (!session.data) LoginManager.handle(msg, session, replier);
        else UserManager.handle(msg, session, replier);
        
        SessionManager.save();
    } catch (e) { 
        replier.reply(UI.make("🚨 시스템 에러", "오류: " + e.message + "\n위치: L" + e.lineNumber, true, "관리자에게 문의하세요"));
    }
}
