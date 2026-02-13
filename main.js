/**
 * [main.js] v0.0.23
 * 1. 문의 목록 날짜별 그룹화 적용 (오전/오후 표기)
 * 2. 모든 알림 문구 UI 엔진(UI.make) 적용
 * 3. 카테고리 및 내비게이션 이동 로직 정교화
 */

// ━━━━━━━━ [1. 설정 및 상수] ━━━━━━━━
var Config = {
    Version: "v0.0.22",
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
            if (line.length <= Config.WRAP_LIMIT) { 
                result.push(line); 
            } else { 
                for (var j = 0; j < line.length; j += Config.WRAP_LIMIT) {
                    var chunk = line.substring(j, j + Config.WRAP_LIMIT);
                    // 마침표가 다음 줄 첫 글자가 되는 것을 방지
                    if (j + Config.WRAP_LIMIT < line.length && line[j + Config.WRAP_LIMIT] === ".") {
                        chunk = line.substring(j, j + Config.WRAP_LIMIT - 1);
                        j--; // 인덱스를 한 칸 당겨서 마침표를 이번 줄에 포함
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


// ━━━━━━━━ [2. 모듈: UI 엔진 (단계별 정보 제어)] ━━━━━━━━
var UI = {
    // 공통 프레임 (세로형 네비게이션 적용)
    make: function(top, mid, isRoot, help) {
        var div = Utils.getFixedDivider();
        var res = "『 " + top + " 』\n" + div + "\n";

        if (mid) {
            res += Utils.wrapText(mid) + "\n" + div + "\n";
        }

        // 하단바 세로형 네비게이션
        if (!isRoot) {
            res += "⬅️ 이전\n❌ 취소\n" + div + "\n";
        }

        if (help) {
            res += "💡 " + Utils.wrapText(help);
        }
        
        return res;
    },

    go: function(session, screen, title, content, help) {
        session.screen = screen;
        // 관리자가 타겟 유저를 보고 있다면 그 유저의 데이터를, 아니면 본인의 데이터를 가져옴
        var data = (session.targetUser) ? Database.data[session.targetUser] : session.data;
        var isRoot = (["USER_MAIN", "ADMIN_MAIN", "GUEST_MAIN", "IDLE"].indexOf(screen) !== -1);
        
        var top = title;
        var info = "";

        if (data) {
            // 1. [유저 상세 정보 구간] - 프로필 조회 및 관리자 유저 관리 화면
            if (screen === "PROFILE_VIEW" || screen === "ADMIN_USER_DETAIL" || screen.indexOf("STAT") !== -1) {
                var targetId = session.targetUser || session.tempId;
                var tier = getTierInfo(data.lp);
                
                // 상단 제목 결정
                top = (screen === "ADMIN_USER_DETAIL") ? "👤 유저 관리: " + targetId : "👤 내 프로필";
                
                // 중단부: 핵심 스탯 노출 (생략 없음)
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
            
            // 2. [칭호 관리 구간] - 현재 장착 칭호와 보유 수량만 집중
            else if (screen === "COL_TITLE_ACTION") {
                top = "🎖️ 칭호 설정";
                info = "현재 장착: [" + data.title + "]\n" +
                       "보유 칭호: " + (data.collection.titles.length) + "개\n" +
                       Utils.getFixedDivider() + "\n";
            }

            // 3. [챔피언 도감 구간] - 수집 현황만 집중
            else if (screen === "COL_CHAR_VIEW") {
                top = "📦 보유 챔피언";
                info = "수집 현황: " + (data.collection.champions.length) + " / 18\n" +
                       Utils.getFixedDivider() + "\n";
            }

            // 4. [상점 구간] - 구매 시 잔액 확인 용도
            else if (screen === "SHOP_BUY_ACTION") {
                top = "💰 챔피언 영입";
                info = "보유 자산: " + (data.gold || 0).toLocaleString() + " G\n" +
                       Utils.getFixedDivider() + "\n";
            }
        }

        // 최종적으로 make 함수를 통해 조립하여 반환
        return this.make(top, info + (content || ""), isRoot, help);
    },
    renderMenu: function(session) {
        if (session.type === "ADMIN") {
            return this.go(session, "ADMIN_MAIN", "관리자 메뉴", "1. 시스템 정보\n2. 유저 조회\n3. 문의 관리", "관리 항목 번호 입력");
        }
        if (!session.data) {
            return this.go(session, "GUEST_MAIN", "환영합니다", "1. 회원가입\n2. 로그인\n3. 관리자 문의", "번호 선택");
        }
        return this.go(session, "USER_MAIN", "메인 메뉴", "1. 프로필 조회\n2. 컬렉션\n3. 대전 모드\n4. 상점\n5. 관리자 문의\n6. 로그아웃", "번호 선택");
    }
};

// ━━━━━━━━ [3. DB 및 세션 매니저] ━━━━━━━━
var Database = {
    data: {},
    inquiries: [],
    load: function() { 
        try { 
            var content = FileStream.read(Config.DB_PATH);
            if (!content || content.trim() === "") {
                this.data = {};
                this.inquiries = [];
                return;
            }
            var d = JSON.parse(content); 
            
            // 데이터 구조 강제 교정 (스크린샷의 'users' 출력 문제 해결)
            if (d && typeof d === 'object') {
                this.data = d.users || {};
                this.inquiries = d.inquiries || [];
            }
            
            // 로그 확인용 (관리자 방에 로드 상태 알림)
            Api.replyRoom(Config.AdminRoom, "📊 DB 로드 완료: 유저 " + Object.keys(this.data).length + "명 / 문의 " + this.inquiries.length + "건");
        } catch(e) { 
            this.data = {}; 
            this.inquiries = [];
            Api.replyRoom(Config.AdminRoom, "⚠️ DB 로드 중 오류: " + e.message);
        } 
    },
    save: function() { 
        var obj = { users: this.data, inquiries: this.inquiries };
        FileStream.write(Config.DB_PATH, JSON.stringify(obj, null, 4)); 
    },
    getInitData: function(pw) { 
        return { pw: pw, gold: 1000, level: 1, exp: 0, lp: 0, win: 0, lose: 0, title: "뉴비", point: 0, stats: { acc: 50, ref: 50, com: 50, int: 50 }, collection: { titles: ["뉴비"], champions: [] } }; 
    },
    addExp: function(userId, amount) {
        var d = this.data[userId]; if (!d || d.level >= MAX_LEVEL) return;
        d.exp += amount;
        while (d.exp >= d.level * 100 && d.level < MAX_LEVEL) { d.exp -= (d.level * 100); d.level++; d.point += 5; }
        this.save();
    }
};

var SessionManager = {
    sessions: {},
    timers: {},

    load: function() {
        try {
            var content = FileStream.read(Config.SESSION_PATH);
            this.sessions = content ? JSON.parse(content) : {};
        } catch(e) { this.sessions = {}; }
    },

    save: function() {
        FileStream.write(Config.SESSION_PATH, JSON.stringify(this.sessions));
    },

    get: function(room, hash, replier) {
        if (!this.sessions[hash]) { 
            this.sessions[hash] = { 
                screen: "IDLE", 
                tempId: "비회원", 
                type: (room === Config.AdminRoom ? "ADMIN" : "USER"),
                data: null 
            }; 
        }
        var s = this.sessions[hash];
        s.room = room;
        s.hash = hash; 

        if (this.timers[hash]) {
            clearTimeout(this.timers[hash]);
            delete this.timers[hash];
        }

        var self = this;
        if (s.screen !== "IDLE") {
            this.timers[hash] = setTimeout(function() {
    if (s.screen !== "IDLE") {
        self.reset(s, hash); 
        self.save();
        replier.reply(UI.make("⏰ 세션 종료", 
            "입력 시간이 5분을 초과하여\n데이터 보호를 위해 세션을 종료합니다", // 끝에 마침표 제거하여 리스크 방지
            "다시 시작하려면 '메뉴'를 입력하세요", true)); // 도움말 문구도 깔끔하게 수정
    }
}, Config.TIMEOUT);
        }
        return s;
    },

    reset: function(session, hash) {
        session.screen = "IDLE";
        session.targetUser = null;
        session.targetInquiryIdx = null;
        session.editType = null;
        session.userListCache = [];
        if (hash && this.timers[hash]) {
            clearTimeout(this.timers[hash]);
            delete this.timers[hash];
        }
    },

    findUserRoom: function(userId) { 
        for (var h in this.sessions) { 
            if (this.sessions[h].tempId === userId) return this.sessions[h].room; 
        } 
        return userId; 
    },

    forceLogout: function(userId) {
        for (var h in this.sessions) { 
            if (this.sessions[h].tempId === userId) { 
                this.sessions[h].data = null; 
                this.sessions[h].tempId = "비회원"; 
                this.reset(this.sessions[h], h); 
            } 
        }
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
        // Database.data에서 유저 ID 추출 및 방어 코드 추가
        var userIds = Object.keys(Database.data || {});
        
        if (userIds.length === 0) {
            return replier.reply(UI.make("알림", "등록된 유저가 없습니다.", "관리 센터 복귀", false));
        }

        session.userListCache = userIds;
        // 목록 생성 로직 최적화
        var listStr = "";
        for (var i = 0; i < userIds.length; i++) {
            listStr += (i + 1) + ". " + userIds[i] + (i < userIds.length - 1 ? "\n" : "");
        }

        replier.reply(UI.go(session, "ADMIN_USER_LIST", "유저 목록", listStr, "관리할 유저 선택"));
    },

    showInquiryList: function(session, replier) {
        if (!Database.inquiries || Database.inquiries.length === 0) {
            return replier.reply(UI.make("알림", "접수된 문의가 없습니다.", "목록이 비어있음", false));
        }

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
            listText += "📅 [ " + date + " ]\n";
            listText += groups[date].map(function(item) {
                var iq = item.data;
                var icon = iq.read ? "✅" : "🆕";
                var timeParts = iq.time ? iq.time.split(" ") : [];
                var timeOnly = (timeParts.length > 1) ? timeParts[1] : "00:00";
                return (item.idx + 1) + ". " + icon + " " + iq.sender + " (" + timeOnly + ")";
            }).join("\n");
            if (i < dateKeys.length - 1) listText += "\n" + Utils.getFixedDivider() + "\n";
        }

        replier.reply(UI.go(session, "ADMIN_INQUIRY_LIST", "문의 센터", listText, "열람할 번호 입력"));
    },

    viewInquiryDetail: function(idx, session, replier) {
        var iq = Database.inquiries[idx];
        if (!iq) return replier.reply(UI.make("오류", "해당 문의를 찾을 수 없습니다.", "다시 시도", false));

        iq.read = true; 
        Database.save();

        session.targetInquiryIdx = idx;
        session.targetUser = iq.sender;
        
        var detail = "👤 발신: " + iq.sender + "\n⏰ 시간: " + iq.time;
        replier.reply(UI.go(session, "ADMIN_INQUIRY_DETAIL", "문의 상세", detail, "1. 답변하기\n2. 삭제하기"));
    },

    submitAnswer: function(msg, session, replier) {
        var targetRoom = SessionManager.findUserRoom(session.targetUser);
        Api.replyRoom(targetRoom, UI.make("운영진 회신", "문의하신 내용에 대한 답변입니다.\n\n" + msg, "소환사의 협곡 드림", true));
        replier.reply(UI.make("전송 완료", "[" + session.targetUser + "] 님에게 답변을 보냈습니다.", "목록으로 복귀", false));
        return this.showInquiryList(session, replier);
    },

    editUserData: function(msg, session, replier) {
        var val = parseInt(msg);
        if (isNaN(val)) return replier.reply(UI.make("입력 오류", "숫자만 입력해 주십시오", "다시 입력"));
        Database.data[session.targetUser][session.editType] = val; 
        Database.save();
        Api.replyRoom(SessionManager.findUserRoom(session.targetUser), UI.make("알림", "[" + (session.editType === "gold" ? "골드" : "LP") + "] 정보가 조정되었습니다", "운영 정책 조치", true));
        SessionManager.reset(session, String(session.hash)); 
        replier.reply(UI.make("수정 완료", "유저 정보가 반영되었습니다.", "관리 센터 복귀", false));
        return this.showUserList(session, replier);
    },

    resetConfirm: function(msg, session, replier) {
        if (msg === "확인") {
            var pw = Database.data[session.targetUser].pw;
            Database.data[session.targetUser] = Database.getInitData(pw); 
            Database.save();
            Api.replyRoom(SessionManager.findUserRoom(session.targetUser), UI.make("알림", "데이터가 초기화되었습니다", "관리자 조치", true));
            replier.reply(UI.make("초기화 완료", "성공했습니다", "목록 복귀", false));
            return this.showUserList(session, replier);
        }
    },

    deleteConfirm: function(msg, session, replier) {
        if (msg === "삭제확인") {
            Api.replyRoom(SessionManager.findUserRoom(session.targetUser), UI.make("알림", "계정이 삭제되었습니다", "관리자 조치", true));
            delete Database.data[session.targetUser]; 
            Database.save();
            SessionManager.forceLogout(session.targetUser); 
            replier.reply(UI.make("삭제 완료", "계정이 파기되었습니다.", "목록 복귀", false));
            return this.showUserList(session, replier);
        }
    }
};

// ━━━━━━━━ [5. 유저 액션 모듈] ━━━━━━━━
var UserActions = {
    handleInquiry: function(msg, session, replier) {
        var now = new Date();
        var hours = now.getHours() < 10 ? "0" + now.getHours() : now.getHours(); // 09, 13, 23 등
var min = now.getMinutes() < 10 ? "0" + now.getMinutes() : now.getMinutes();
var timeStr = (now.getMonth()+1) + "/" + now.getDate() + " " + hours + ":" + min;

        Database.inquiries.push({
            sender: session.tempId || "비회원",
            room: session.room,
            content: msg,
            time: timeStr,
            read: false
        });
        Database.save();
        Api.replyRoom(Config.AdminRoom, UI.make("알림", "📩 새로운 문의가 접수되었습니다.", "관리자 메뉴에서 확인하세요.", true));
        SessionManager.reset(session); 
        replier.reply(UI.make("접수 성공", "문의 내용이 전달되었습니다", "감사합니다", true));
    },
    showCollection: function(msg, session, replier) {
        var d = session.data;
        if (!d.collection) d.collection = { titles: ["뉴비"], champions: [] };
        if (session.screen === "COL_MAIN") {
            if (msg === "1") {
                var tList = d.collection.titles.map(function(t, i) { return (i+1) + ". " + (t === d.title ? "✅" : "") + t; }).join("\n");
                return replier.reply(UI.go(session, "COL_TITLE_ACTION", "", tList, "장착할 번호 입력"));
            }
            if (msg === "2") {
                var champs = d.collection.champions || [];
                var cList = (champs.length > 0) ? champs.map(function(c, i){ return (i+1) + ". " + c; }).join("\n") : "보유 챔피언 없음";
                return replier.reply(UI.go(session, "COL_CHAR_VIEW", "", cList, "목록 확인"));
            }
        }
        if (session.screen === "COL_TITLE_ACTION") {
            var idx = parseInt(msg) - 1;
            if (d.collection.titles[idx]) {
                d.title = d.collection.titles[idx]; Database.save(); SessionManager.reset(session);
                return replier.reply(UI.make("설정 완료", "[" + d.title + "]를 장착하였습니다", "프로필 확인 가능", true));
            }
        }
    },
    handleShop: function(msg, session, replier) {
        var d = session.data;
        if (!d.collection) d.collection = { titles: ["뉴비"], champions: [] };
        if (session.screen === "SHOP_MAIN" && msg === "1") {
            var shopList = SystemData.champions.map(function(name, i) {
                var isOwned = (d.collection.champions || []).indexOf(name) !== -1 ? " [보유중]" : "";
                return (i+1) + ". " + name + isOwned;
            }).join("\n");
            return replier.reply(UI.go(session, "SHOP_BUY_ACTION", "챔피언 영입", shopList, "구매할 번호 입력 (500G)"));
        }
        if (session.screen === "SHOP_BUY_ACTION") {
            var uIdx = parseInt(msg) - 1;
            if (SystemData.champions[uIdx]) {
                var target = SystemData.champions[uIdx];
                if ((d.collection.champions || []).indexOf(target) !== -1) return replier.reply(UI.make("구매 불가", "이미 보유 중입니다", "다른 대상 선택"));
                if (d.gold < 500) return replier.reply(UI.make("잔액 부족", "골드가 부족합니다", "현재: " + d.gold + "G"));
                d.gold -= 500; if(!d.collection.champions) d.collection.champions = [];
                d.collection.champions.push(target); Database.save(); SessionManager.reset(session);
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
            return;
        }

        if (screen === "ADMIN_INQUIRY_LIST") {
            var idx = parseInt(msg) - 1;
            if (Database.inquiries[idx]) AdminActions.viewInquiryDetail(idx, session, replier);
            else replier.reply(UI.make("번호 오류", "올바른 번호를 입력해주세요.", "목록 확인", false));
            return;
        }

        if (screen === "ADMIN_INQUIRY_DETAIL") {
            if (msg === "1") return replier.reply(UI.go(session, "ADMIN_ANSWER_INPUT", "답변 작성", "[" + session.targetUser + "] 유저에게 전송", "회신 내용을 입력하세요."));
            if (msg === "2") {
                Database.inquiries.splice(session.targetInquiryIdx, 1);
                Database.save();
                replier.reply(UI.make("삭제 완료", "해당 문의를 삭제했습니다.", "목록 복귀", false));
                return AdminActions.showInquiryList(session, replier);
            }
            return;
        }

        if (screen === "ADMIN_USER_LIST") {
            var idx = parseInt(msg) - 1;
            if (session.userListCache[idx]) {
                session.targetUser = session.userListCache[idx];
                return replier.reply(UI.go(session, "ADMIN_USER_DETAIL", "", "", "작업 선택"));
            }
        }

        switch(screen) {
            case "ADMIN_USER_DETAIL":
                if (msg === "1") return replier.reply(UI.go(session, "ADMIN_EDIT_MENU", "정보 수정", "1. 골드 수정\n2. LP 수정", "항목 선택"));
                if (msg === "2") return replier.reply(UI.go(session, "ADMIN_RESET_CONFIRM", "초기화", "계정을 초기화하시겠습니까?", "'확인' 입력"));
                if (msg === "3") return replier.reply(UI.go(session, "ADMIN_DELETE_CONFIRM", "계정 삭제", "계정을 삭제하시겠습니까?", "'삭제확인' 입력"));
                break;
            case "ADMIN_EDIT_MENU":
                if (msg === "1") { session.editType = "gold"; return replier.reply(UI.go(session, "ADMIN_EDIT_INPUT", "골드 수정", "설정할 골드 값을 입력하세요.", "숫자 입력")); }
                if (msg === "2") { session.editType = "lp"; return replier.reply(UI.go(session, "ADMIN_EDIT_INPUT", "LP 수정", "설정할 LP 값을 입력하세요.", "숫자 입력")); }
                break;
            case "ADMIN_ANSWER_INPUT": return AdminActions.submitAnswer(msg, session, replier);
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
                Database.data[session.tempId] = Database.getInitData(msg); Database.save();
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
Database.load(); 
SessionManager.load();

function response(room, msg, sender, isGroupChat, replier, imageDB) {
    try {
        if (!msg) return; 
        if (isGroupChat && room !== Config.AdminRoom) return;
        
        var session = SessionManager.get(room, String(imageDB.getProfileHash()), replier); 
        msg = msg.trim();
        
        // 공통 명령어 처리 (메뉴, 취소, 관리자)
        if (msg === "메뉴" || msg === "취소" || (room === Config.AdminRoom && msg === "관리자")) { 
            SessionManager.reset(session, String(imageDB.getProfileHash())); 
            return replier.reply(UI.renderMenu(session)); 
        }
        
        // 이전 버튼 처리
        if (msg === "이전") {
            var curr = session.screen;
            if (curr.indexOf("JOIN_") !== -1 || curr.indexOf("LOGIN_") !== -1 || curr === "GUEST_INQUIRY") return replier.reply(UI.go(session, "GUEST_MAIN", "환영합니다", "1. 회원가입\n2. 로그인\n3. 운영진 문의", "메뉴 선택"));
            if (curr === "ADMIN_INQUIRY_DETAIL") return AdminActions.showInquiryList(session, replier);
            if (curr === "ADMIN_INQUIRY_LIST" || curr === "ADMIN_USER_LIST" || curr === "ADMIN_SYS_INFO") return replier.reply(UI.renderMenu(session));
            if (curr === "STAT_UP_MENU" || curr === "STAT_UP_INPUT") return replier.reply(UI.go(session, "PROFILE_VIEW", "", "", "프로필 복귀"));
            if (curr === "COL_TITLE_ACTION" || curr === "COL_CHAR_VIEW") return replier.reply(UI.go(session, "COL_MAIN", "", "", "컬렉션 복귀"));
            if (curr === "SHOP_BUY_ACTION") return replier.reply(UI.go(session, "SHOP_MAIN", "", "", "상점 복귀"));
            if (curr === "ADMIN_USER_DETAIL") return AdminActions.showUserList(session, replier);
            if (curr.indexOf("ADMIN_EDIT") !== -1 || curr === "ADMIN_ANSWER_INPUT" || curr.indexOf("CONFIRM") !== -1) return replier.reply(UI.go(session, "ADMIN_USER_DETAIL", "", "", "상세 정보 복귀"));
            
            SessionManager.reset(session, String(imageDB.getProfileHash())); 
            return replier.reply(UI.renderMenu(session));
        }

        // IDLE 상태 처리 (세션 종료 후 '메뉴' 입력 대기)
        if (session.screen === "IDLE") { 
            if (msg === "메뉴") {
                return replier.reply(UI.renderMenu(session));
            }
            return; // '메뉴'가 아니면 응답하지 않음
        }

        // 세션 타입 및 로그인 여부에 따른 핸들러 분기
        if (session.type === "ADMIN") {
            AdminManager.handle(msg, session, replier);
        } else if (!session.data) {
            LoginManager.handle(msg, session, replier);
        } else {
            UserManager.handle(msg, session, replier);
        }

        SessionManager.save();
    } catch (e) { 
        Api.replyRoom(Config.AdminRoom, "🚨 오류 발생\n라인: " + e.lineNumber + "\n내용: " + e.message); 
    }
}
