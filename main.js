/**
 * [main.js] v9.0.14
 * 1. 문의 뱃지: 유저 관리 목록에서 문의 개수 실시간 표시 ([🔔n])
 * 2. 가입 제한: 아이디(닉네임) 글자수 10자 제한 로직 적용
 * 3. 고객센터: 비회원 문의 및 관리자 1:1 답변 알림 시스템
 * 4. UI 자동화: 모든 화면 및 알림에 규격 UI 적용
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
    FIXED_LINE: 17,
    NAV_LEFT: "    ",
    NAV_RIGHT: "  ",
    NAV_ITEMS: ["⬅️ 이전", "❌ 취소", "🏠 메뉴"]
};

var Utils = {
    getFixedDivider: function() { return Array(Config.FIXED_LINE + 1).join(Config.LINE_CHAR); },
    getNav: function() { return Config.NAV_LEFT + Config.NAV_ITEMS.join("      ") + Config.NAV_RIGHT; }
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
    make: function(title, content, help, isRoot) {
        var div = Utils.getFixedDivider();
        var res = "『 " + title + " 』\n" + div + "\n" + content + "\n" + div + "\n";
        if (help) res += "💡 " + help;
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
