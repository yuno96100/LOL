/**
 * [main.js] v9.9.0
 * 1. 히스토리 버그 해결: "취소" 입력 시 현재 화면을 중복 저장하지 않도록 수정
 * 2. 업데이트 무시: ".업데이트" 포함 메시지 즉시 차단
 * 3. UI 복구: '아니오' 선택 시 Content/Help/히스토리 상태 완벽 보존
 * 4. 무생략: v9.2.8의 모든 세부 로직 (관리자 수정/삭제, 가입 10자 제한 등) 포함
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
    WRAP_LIMIT: 17,
    DIVIDER_LINE: 14,
    NAV_LEFT: "  ", 
    NAV_RIGHT: " ",
    NAV_ITEMS: ["⬅️이전", "❌취소", "🏠메뉴"]
};

var Utils = {
    getFixedDivider: function() { return Array(Config.DIVIDER_LINE + 1).join(Config.LINE_CHAR); },
    getNav: function() { return Config.NAV_LEFT + Config.NAV_ITEMS.join("   ") + Config.NAV_RIGHT; },
    wrapText: function(str) {
        if (!str) return "";
        var lines = str.split('\n'), result = [], limit = Config.WRAP_LIMIT;
        for (var i = 0; i < lines.length; i++) {
            var words = lines[i].split(' '), currentLine = "";
            for (var j = 0; j < words.length; j++) {
                var word = words[j];
                if (word.length > limit) {
                    if (currentLine.length > 0) { result.push(currentLine.trim()); currentLine = ""; }
                    var start = 0;
                    while (start < word.length) { result.push(word.substring(start, start + limit)); start += limit; }
                    continue;
                }
                if ((currentLine + word).length > limit) { result.push(currentLine.trim()); currentLine = word + " "; }
                else { currentLine += word + " "; }
            }
            if (currentLine.trim().length > 0) result.push(currentLine.trim());
        }
        return result.join('\n');
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
        var res = "『 " + title + " 』\n" + div + "\n" + Utils.wrapText(content) + "\n" + div + "\n";
        if (help) res += "💡 " + Utils.wrapText(help);
        if (!isRoot) res += "\n" + div + "\n" + Utils.getNav();
        return res;
    },
    renderProfile: function(id, data, help, content, isRoot) {
        var lp = data.lp || 0, tier = getTierInfo(lp);
        var win = data.win || 0, lose = data.lose || 0, total = win + lose;
        var winRate = total === 0 ? 0 : Math.floor((win / total) * 100);
        var div = Utils.getFixedDivider();
        var s1 = "👤 계정: " + id + "\n🏅 칭호: [" + data.title + "]";
        var s2 = "🏆 티어: " + tier.icon + " " + tier.name + " (" + lp + " LP)\n💰 골드: " + (data.gold || 0).toLocaleString() + " G\n⚔️ 전적: " + win + "승 " + lose + "패 (" + winRate + "%)";
        var res = "『 " + id + " 』\n" + div + "\n" + s1 + "\n" + div + "\n" + s2 + "\n" + div + "\n";
        if (content) res += Utils.wrapText(content.trim()) + "\n" + div + "\n"; 
        if (help) res += "💡 " + Utils.wrapText(help);
        if (!isRoot) res += "\n" + div + "\n" + Utils.getNav();
        return res;
    },
    go: function(session, screen, title, content, help, skipHistory) {
        var rootScreens = ["USER_MAIN", "ADMIN_MAIN", "GUEST_MAIN", "GROUP_MAIN"];
        var isRoot = (rootScreens.indexOf(screen) !== -1);
        
        // skipHistory가 true가 아닐 때만 히스토리 저장 (취소 화면 등은 저장 제외)
        if (!skipHistory && session.screen && session.screen !== "IDLE" && session.screen !== screen) {
            if (!session.history) session.history = [];
            session.history.push({ 
                screen: session.screen, 
                title: session.lastTitle, 
                content: session.lastContent, 
                help: session.lastHelp 
            });
        }

        session.screen = screen;
        session.lastTitle = title;
        session.lastContent = content || "";
        session.lastHelp = help || "";

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
            if (!session.data) { session.screen = "IDLE"; return UI.make("알림", "'시스템' 개인톡에서 로그인을 해주세요.", "보안이 필요합니다.", true); }
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
    getInitData: function(pw) { return { pw: pw, gold: 1000, level: 1, lp: 0, win: 0, lose: 0, title: "뉴비", collection: { titles: ["뉴비"], characters: [] } }; }
};

var SessionManager = {
    sessions: {},
    load: function() { try { this.sessions = JSON.parse(FileStream.read(Config.SESSION_PATH)); } catch(e) { this.sessions = {}; } },
    save: function() { FileStream.write(Config.SESSION_PATH, JSON.stringify(this.sessions)); },
    get: function(r, h, g) {
        if (!this.sessions[h]) this.sessions[h] = { data: null, screen: "IDLE", history: [], lastTitle: "메뉴", lastContent: "", lastHelp: "", tempId: "비회원", userListCache: [], targetUser: null, editType: null, room: r, isDirect: !g };
        var s = this.sessions[h];
        s.room = r;
        if (r === Config.AdminRoom) s.type = "ADMIN";
        else if (g && r === Config.GroupRoom) s.type = "GROUP";
        else { s.type = "DIRECT"; s.isDirect = true; }
        return s;
    },
    reset: function(session) { 
        session.screen = "IDLE"; session.history = []; session.userListCache = []; 
        session.targetUser = null; session.editType = null;
        session.lastContent = ""; session.lastHelp = "";
    },
    findUserDirectRoom: function(userId) {
        for (var key in this.sessions) { if (this.sessions[key].tempId === userId && this.sessions[key].isDirect) return this.sessions[key].room; }
        return userId;
    },
    forceLogout: function(userId) {
        for (var key in this.sessions) { if (this.sessions[key].tempId === userId) { this.sessions[key].data = null; this.sessions[key].tempId = "비회원"; this.reset(this.sessions[key]); } }
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
                var list = session.userListCache.map(function(id, i){ return (i+1)+". "+id; }).join("\n");
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
            if (msg === "2") return replier.reply(UI.go(session, "ADMIN_ANSWER_INPUT", "답변 하기", "["+session.targetUser+"] 유저에게 보낼 답변을 입력하세요.", "내용 입력"));
            if (msg === "3") return replier.reply(UI.go(session, "ADMIN_RESET_CONFIRM", "초기화", "[" + session.targetUser + "] 리셋합니까?", "'확인' 입력"));
            if (msg === "4") return replier.reply(UI.go(session, "ADMIN_DELETE_CONFIRM", "계정 삭제", "[" + session.targetUser + "] 삭제합니까?", "'삭제확인' 입력"));
        }
        if (screen === "ADMIN_ANSWER_INPUT") {
            var uDirectRoom = SessionManager.findUserDirectRoom(session.targetUser);
            Api.replyRoom(uDirectRoom, UI.make("운영진 답변", "문의하신 내용에 대한 답변입니다.\n\n" + msg, "관리자 알림", true));
            SessionManager.reset(session); return replier.reply(UI.make("성공", "유저 개인톡으로 답변이 전송되었습니다.", "대기 상태 전환", true));
        }
        if (screen === "ADMIN_EDIT_MENU") {
            if (msg === "1") { session.editType = "gold"; return replier.reply(UI.go(session, "ADMIN_EDIT_INPUT", "골드 수정", "수정할 값을 입력하세요.", "숫자 입력")); }
            if (msg === "2") { session.editType = "lp"; return replier.reply(UI.go(session, "ADMIN_EDIT_INPUT", "LP 수정", "수정할 값을 입력하세요.", "숫자 입력")); }
        }
        if (screen === "ADMIN_EDIT_INPUT") {
            var val = parseInt(msg);
            if (isNaN(val)) return replier.reply(UI.make("오류", "숫자만 가능합니다.", "재입력"));
            Database.data[session.targetUser][session.editType] = val; Database.save(Database.data);
            var uDirectRoom = SessionManager.findUserDirectRoom(session.targetUser);
            Api.replyRoom(uDirectRoom, UI.make("알림", "[" + (session.editType === "gold" ? "골드" : "LP") + "]가 " + val + " (으)로 변경되었습니다.", "시스템 조치", true));
            SessionManager.reset(session); return replier.reply(UI.make("성공", "수정 완료", "대기 상태 전환", true));
        }
        if (screen === "ADMIN_RESET_CONFIRM" && msg === "확인") {
            Database.data[session.targetUser] = Database.getInitData(Database.data[session.targetUser].pw); Database.save(Database.data);
            var uDirectRoom = SessionManager.findUserDirectRoom(session.targetUser);
            Api.replyRoom(uDirectRoom, UI.make("알림", "데이터가 초기화되었습니다.", "시스템 조치", true));
            SessionManager.reset(session); return replier.reply(UI.make("성공", "초기화 완료", "대기 상태 전환", true));
        }
        if (screen === "ADMIN_DELETE_CONFIRM" && msg === "삭제확인") {
            delete Database.data[session.targetUser]; Database.save(Database.data);
            SessionManager.forceLogout(session.targetUser);
            SessionManager.reset(session); return replier.reply(UI.make("성공", "삭제 완료", "대기 상태 전환", true));
        }
    }
};

// ━━━━━━━━ [5. 매니저: 개인톡(User) 시스템] ━━━━━━━━
var UserManager = {
    handle: function(msg, session, replier) {
        var d = session.data;
        if (!d) {
            if (session.screen === "GUEST_MAIN") {
                if (msg === "1") return replier.reply(UI.go(session, "JOIN_ID", "회원가입", "아이디를 입력하세요. (최대 10자)", "가입"));
                if (msg === "2") return replier.reply(UI.go(session, "LOGIN_ID", "인증", "아이디를 입력하세요.", "로그인"));
                if (msg === "3") return replier.reply(UI.go(session, "GUEST_INQUIRY", "비회원 문의", "내용을 입력하세요.", "전송"));
            }
            if (session.screen === "GUEST_INQUIRY") {
                Api.replyRoom(Config.AdminRoom, UI.make("비회원 문의", "내용: " + msg, "회신 불가", true));
                SessionManager.reset(session); return replier.reply(UI.make("완료", "문의가 전송되었습니다.", "대기 상태 전환", true));
            }
            if (session.screen === "JOIN_ID") { 
                if (msg.length > 10) return replier.reply(UI.make("오류", "10자 이내로 입력하세요."));
                if (Database.data[msg]) return replier.reply(UI.make("오류", "중복된 아이디입니다."));
                session.tempId = msg; return replier.reply(UI.go(session, "JOIN_PW", "회원가입", "비밀번호를 설정하세요.", "보안")); 
            }
            if (session.screen === "JOIN_PW") { 
                Database.data[session.tempId] = Database.getInitData(msg); Database.save(Database.data);
                session.data = Database.data[session.tempId];
                Api.replyRoom(Config.AdminRoom, UI.make("신규 가입 알림", "신규 유저 [" + session.tempId + "]님이 가입했습니다.", "관리 알림", true));
                SessionManager.reset(session); return replier.reply(UI.make("성공", "가입 성공!", "대기 상태 전환", true));
            }
            if (session.screen === "LOGIN_ID") { session.tempId = msg; return replier.reply(UI.go(session, "LOGIN_PW", "인증", "비밀번호를 입력하세요.", "인증")); }
            if (session.screen === "LOGIN_PW") {
                if (Database.data[session.tempId] && Database.data[session.tempId].pw === msg) {
                    session.data = Database.data[session.tempId]; SessionManager.reset(session);
                    return replier.reply(UI.make("성공", "로그인 성공!", "대기 상태 전환", true));
                }
                return replier.reply(UI.make("실패", "인증 정보가 틀립니다."));
            }
            return;
        }

        if (session.screen === "USER_MAIN") {
            if (msg === "1") return replier.reply(UI.go(session, "PROFILE_VIEW", session.tempId, "", "내 정보 조회"));
            if (msg === "2") return replier.reply(UI.go(session, "COL_MAIN", "컬렉션", "1. 보유 칭호\n2. 보유 캐릭터", "조회"));
            if (msg === "3") return replier.reply(UI.go(session, "BATTLE_MAIN", "대전", "1. AI 봇 매칭", "전투"));
            if (msg === "4") return replier.reply(UI.go(session, "SHOP_ROLES", "상점", RoleKeys.map(function(r,i){return (i+1)+". "+r;}).join("\n"), "카테고리 선택"));
            if (msg === "5") return replier.reply(UI.go(session, "USER_INQUIRY", "문의하기", "내용을 입력하세요.", "내용 입력"));
            if (msg === "6") { SessionManager.forceLogout(session.tempId); return replier.reply(UI.make("알림", "로그아웃 되었습니다.", "종료", true)); }
        }

        if (session.screen === "USER_INQUIRY") {
            Api.replyRoom(Config.AdminRoom, UI.make("유저 문의", "ID: " + session.tempId + "\n내용: " + msg, "답변 대기", true));
            SessionManager.reset(session); return replier.reply(UI.make("성공", "문의가 전달되었습니다.", "대기 상태 전환", true));
        }

        if (session.screen === "COL_MAIN") {
            if (msg === "1") {
                var tList = d.collection.titles.map(function(t, i) { return (i+1) + ". " + (t === d.title ? "✅ " : "") + t; }).join("\n");
                return replier.reply(UI.go(session, "COL_TITLE_ACTION", "보유 칭호", tList, "번호 선택"));
            }
            if (msg === "2") {
                var cList = (d.collection.characters.length > 0) ? d.collection.characters.join("\n") : "보유 유닛 없음";
                return replier.reply(UI.go(session, "COL_CHAR_VIEW", "보유 리스트", cList, "유닛 목록"));
            }
        }
        
        if (session.screen === "SHOP_ROLES") {
            var rIdx = parseInt(msg) - 1;
            if (RoleKeys[rIdx]) {
                session.selectedRole = RoleKeys[rIdx];
                var uList = SystemData.roles[session.selectedRole].units.map(function(u, i) {
                    var owned = d.collection.characters.indexOf(u) !== -1;
                    return (i+1) + ". " + u + (owned ? " [보유]" : " (500G)");
                }).join("\n");
                return replier.reply(UI.go(session, "SHOP_BUY_ACTION", session.selectedRole, uList, "번호 입력"));
            }
        }
    }
};

// ━━━━━━━━ [6. 매니저: 단체방 시스템] ━━━━━━━━
var GroupManager = {
    handle: function(msg, session, replier) {
        if (session.screen === "GROUP_MAIN" && msg === "1") return replier.reply(UI.go(session, "GROUP_PROFILE", session.tempId, "", "전적 확인"));
    }
};

// ━━━━━━━━ [7. 메인 응답 핸들러] ━━━━━━━━
Database.data = Database.load(); SessionManager.load();         

function response(room, msg, sender, isGroupChat, replier, imageDB) {
    try {
        if (!msg) return; 
        
        // [.업데이트] 무시 로직
        if (msg.indexOf(".업데이트") !== -1) return;

        var hash = String(imageDB.getProfileHash()); 
        var session = SessionManager.get(room, hash, isGroupChat); 
        msg = msg.trim(); 
        
        if (msg === "메뉴") return replier.reply(UI.renderMenu(session)); 

        // ❌ 취소 요청 시: go 함수에 true를 넘겨서 히스토리에 현재 창을 저장하지 않음
        if (msg === "취소") {
            if (session.screen === "IDLE") return replier.reply(UI.make("알림", "현재 진행 중인 작업이 없습니다.", "대기 중", true));
            
            // 현재 상태 백업 (철회용)
            session.preCancelScreen = session.screen;
            session.preCancelTitle = session.lastTitle;
            session.preCancelContent = session.lastContent;
            session.preCancelHelp = session.lastHelp;

            // skipHistory 파라미터(6번째)를 true로 전달하여 중복 적재 방지
            return replier.reply(UI.go(session, "CANCEL_CONFIRM", "취소 확인", 
                "정말로 현재 작업을 취소하시겠습니까?\n\n'예'를 입력하면 초기 상태로 전환됩니다.", "'예' 또는 '아니오' 입력", true));
        }

        // 🛡️ 취소 컨펌 화면 처리
        if (session.screen === "CANCEL_CONFIRM") {
            if (msg === "예" || msg === "1") {
                SessionManager.reset(session);
                return replier.reply(UI.make("시스템 알림", "작업이 완전히 취소되었습니다.\n초기 상태로 전환합니다.", "'메뉴'를 입력하세요.", true));
            } else if (msg === "아니오" || msg === "2") {
                // 철회 시 백업해둔 데이터 복원 (이때 UI.go를 안 쓰기 때문에 히스토리에 변화 없음)
                var s = session.preCancelScreen;
                var t = session.preCancelTitle;
                var c = session.preCancelContent;
                var h = session.preCancelHelp;

                replier.reply(UI.make("철회 알림", "취소를 철회했습니다.\n이전 작업을 계속 진행하세요.", "진행 중", true));
                
                session.screen = s; 
                session.lastTitle = t; session.lastContent = c; session.lastHelp = h;
                
                var isRoot = (["USER_MAIN","ADMIN_MAIN","GUEST_MAIN","GROUP_MAIN"].indexOf(s) !== -1);
                if (s.indexOf("PROFILE") !== -1 || s.indexOf("DETAIL") !== -1) {
                    var tid = session.targetUser || session.tempId;
                    var td = (session.targetUser) ? Database.data[session.targetUser] : session.data;
                    return replier.reply(UI.renderProfile(tid, td, h, c, isRoot));
                }
                return replier.reply(UI.make(t, c, h, isRoot));
            }
            return;
        }

        // ⬅️ 이전 버튼 처리: 이미 팝(Pop)한 데이터를 직접 세션에 주입하여 중복 방지
        if (msg === "이전" && session.history && session.history.length > 0) {
            var p = session.history.pop();
            session.screen = p.screen;
            session.lastTitle = p.title;
            session.lastContent = p.content;
            session.lastHelp = p.help;
            
            var isRoot = (["USER_MAIN","ADMIN_MAIN","GUEST_MAIN","GROUP_MAIN"].indexOf(p.screen) !== -1);
            if (p.screen.indexOf("PROFILE") !== -1 || p.screen.indexOf("DETAIL") !== -1) {
                var tid = session.targetUser || session.tempId;
                var td = (session.targetUser) ? Database.data[session.targetUser] : session.data;
                return replier.reply(UI.renderProfile(tid, td, p.help, p.content, isRoot));
            }
            return replier.reply(UI.make(p.title, p.content, p.help, isRoot));
        }

        if (session.screen === "IDLE") return;

        if (session.type === "ADMIN" && hash === Config.AdminHash) return AdminManager.handle(msg, session, replier);
        if (session.type === "GROUP") GroupManager.handle(msg, session, replier);
        else UserManager.handle(msg, session, replier);
        
        SessionManager.save();
    } catch (e) { Api.replyRoom(Config.AdminRoom, "오류: " + e.message); }
}
