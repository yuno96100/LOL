// ━━━━━━━━ [1. 설정 및 시스템 데이터] ━━━━━━━━
var Config = {
    Prefix: ".", 
    AdminHash: "2056407147", 
    AdminRoom: "소환사의협곡관리", 
    GroupRoom: "소환사의협곡",
    BotName: "소환사의 협곡", 
    DB_PATH: "/sdcard/msgbot/Bots/main/database.json",
    SESSION_PATH: "/sdcard/msgbot/Bots/main/sessions.json",
    LINE_CHAR: "━", 
    WRAP_LIMIT: 18, 
    DIVIDER_LINE: 14,
    NAV_LEFT: "  ", 
    NAV_RIGHT: " ", 
    NAV_ITEMS: ["⬅️이전", "❌취소", "🏠메뉴"]
};

var MAX_LEVEL = 30;

var UnitSpecs = {
    "알리스타": { hp: 650, mp: 350, atk: 55, def: 47, range: 125, spd: 330, as: 0.62 },
    "가렌": { hp: 620, mp: 0, atk: 60, def: 38, range: 175, spd: 340, as: 0.63 },
    "제드": { hp: 580, mp: 200, atk: 63, def: 32, range: 125, spd: 345, as: 0.65 },
    "애쉬": { hp: 540, mp: 280, atk: 59, def: 26, range: 600, spd: 325, as: 0.65 },
    "럭스": { hp: 490, mp: 480, atk: 52, def: 22, range: 550, spd: 330, as: 0.61 }
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

// ━━━━━━━━ [2. 유틸리티 및 UI 엔진] ━━━━━━━━
var Utils = {
    getFixedDivider: function() { return Array(Config.DIVIDER_LINE + 1).join(Config.LINE_CHAR); },
    getNav: function() { return Config.NAV_LEFT + Config.NAV_ITEMS.join("    ") + Config.NAV_RIGHT; },
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

function getTierInfo(lp) {
    lp = lp || 0;
    for (var i = 0; i < TierData.length; i++) {
        if (lp >= TierData[i].minLp) return { name: TierData[i].name, icon: TierData[i].icon };
    }
    return { name: "아이언", icon: "⚫" };
}

var UI = {
    make: function(title, content, help, isRoot) {
        var div = Utils.getFixedDivider();
        var res = "『 " + title + " 』\n" + div + "\n" + Utils.wrapText(content) + "\n" + div + "\n";
        if (help) res += "💡 " + Utils.wrapText(help);
        if (!isRoot) res += "\n" + div + "\n" + Utils.getNav();
        return res;
    },
    renderProfile: function(id, data, help, content, isRoot, session) {
        if (!data) return "데이터 로드 오류";
        var lp = data.lp || 0, tier = getTierInfo(lp);
        var win = data.win || 0, lose = data.lose || 0, total = win + lose;
        var winRate = total === 0 ? 0 : Math.floor((win / total) * 100);
        var st = data.stats || { acc: 50, ref: 50, com: 50, int: 50 };
        var lv = data.level || 1, exp = data.exp || 0, maxExp = lv * 100;
        var div = Utils.getFixedDivider();
        var lvLabel = (lv >= MAX_LEVEL) ? "Lv." + MAX_LEVEL + " [Max]" : "Lv." + lv;
        var expBar = (lv >= MAX_LEVEL) ? "Max / Max" : exp + " / " + maxExp;
        var s1 = "👤 계정: " + id + "\n🏅 칭호: [" + (data.title || "뉴비") + "]";
        var s2 = "🏆 티어: " + tier.icon + " " + tier.name + " (" + lp + " LP)\n🆙 레벨: " + lvLabel + "\n📊 경험: " + expBar + " EXP\n💰 골드: " + (data.gold || 0).toLocaleString() + " G";
        var s3 = "⚔️ 전적: " + win + "승 " + lose + "패 (" + winRate + "%)\n" + div + "\n🎯 정확: " + st.acc + " | ⚡ 반응: " + st.ref + "\n🧘 침착: " + st.com + " | 🧠 직관: " + st.int + "\n✨ 포인트: " + (data.point || 0) + " P";
        var res = "『 " + id + " 』\n" + div + "\n" + s1 + "\n" + div + "\n" + s2 + "\n" + div + "\n" + s3 + "\n" + div + "\n";
        if (session && (session.screen === "ADMIN_USER_DETAIL" || session.screen === "PROFILE_VIEW")) {
            if (session.type === "ADMIN") res += "1. 정보 수정\n2. 답변 하기\n3. 데이터 초기화\n4. 계정 삭제\n" + div + "\n";
            else res += "1. 능력치 강화\n2. 능력치 초기화\n" + div + "\n";
        } else if (session && (session.screen === "STAT_UP_MENU" || session.screen === "STAT_UP_INPUT")) {
            res += "1. 정확 강화\n2. 반응 강화\n3. 침착 강화\n4. 직관 강화\n" + div + "\n";
        }
        if (content) res += Utils.wrapText(content.trim()) + "\n" + div + "\n";
        if (help) res += "💡 " + Utils.wrapText(help);
        if (!isRoot) res += "\n" + div + "\n" + Utils.getNav();
        return res;
    },
    go: function(session, screen, title, content, help, skipHistory) {
        var rootScreens = ["USER_MAIN", "ADMIN_MAIN", "GUEST_MAIN", "GROUP_MAIN"];
        var isRoot = (rootScreens.indexOf(screen) !== -1);
        if (session.tempId && Database.data[session.tempId]) session.data = Database.data[session.tempId];
        if (!skipHistory && session.screen && session.screen !== "IDLE" && session.screen !== screen) {
            if (!session.history) session.history = [];
            session.history.push({ screen: session.screen, title: session.lastTitle, content: session.lastContent, help: session.lastHelp });
        }
        session.screen = screen; session.lastTitle = title; session.lastContent = content || ""; session.lastHelp = help || "";
        if (screen.indexOf("PROFILE") !== -1 || screen.indexOf("STAT") !== -1 || screen === "ADMIN_USER_DETAIL") {
            var tid = session.targetUser || session.tempId;
            return UI.renderProfile(tid, Database.data[tid], help, content, isRoot, session);
        }
        return this.make(title, content, help, isRoot);
    },
    renderMenu: function(session) {
        session.history = [];
        if (session.type === "ADMIN") return this.go(session, "ADMIN_MAIN", "관리자 메뉴", "1. 시스템 정보\n2. 유저 관리", "번호 입력");
        if (session.type === "GROUP") return this.go(session, "GROUP_MAIN", "단톡방 메뉴", "1. 내 정보 확인\n2. 티어 랭킹", "번호 입력");
        if (!session.data) return this.go(session, "GUEST_MAIN", "환영합니다", "1. 회원가입\n2. 로그인\n3. 문의하기", "번호 선택");
        return this.go(session, "USER_MAIN", "메인 메뉴", "1. 프로필\n2. 컬렉션\n3. 대전\n4. 상점\n5. 문의하기\n6. 로그아웃", "번호 입력");
    }
};

// ━━━━━━━━ [3. DB 및 세션 관리] ━━━━━━━━
var Database = {
    data: {},
    load: function() { try { return JSON.parse(FileStream.read(Config.DB_PATH)); } catch(e) { return {}; } },
    save: function(d) { this.data = d; FileStream.write(Config.DB_PATH, JSON.stringify(d, null, 4)); },
    getInitData: function(pw) { 
        return { pw: pw, gold: 1000, level: 1, exp: 0, lp: 0, win: 0, lose: 0, title: "뉴비", point: 0, stats: { acc: 50, ref: 50, com: 50, int: 50 }, inventory: { "RESET_TICKET": 0 }, collection: { titles: ["뉴비"], characters: [] } };
    },
    addExp: function(userId, amount) {
        var d = this.data[userId];
        if (!d || d.level >= MAX_LEVEL) return;
        d.exp += amount;
        while (d.exp >= d.level * 100 && d.level < MAX_LEVEL) {
            d.exp -= (d.level * 100);
            d.level++; d.point += 5;
            if (d.level >= MAX_LEVEL) { d.exp = 0; break; }
        }
        this.save(this.data);
    }
};

var SessionManager = {
    sessions: {},
    load: function() { try { this.sessions = JSON.parse(FileStream.read(Config.SESSION_PATH)); } catch(e) { this.sessions = {}; } },
    save: function() { FileStream.write(Config.SESSION_PATH, JSON.stringify(this.sessions)); },
    get: function(r, h, g) {
        if (!this.sessions[h]) this.sessions[h] = { data: null, screen: "IDLE", history: [], lastTitle: "메뉴", lastContent: "", lastHelp: "", tempId: "비회원", userListCache: [], targetUser: null, editType: null, room: r, isDirect: !g, battle: null };
        var s = this.sessions[h]; s.room = r;
        if (r === Config.AdminRoom) s.type = "ADMIN";
        else if (g && r === Config.GroupRoom) s.type = "GROUP";
        else { s.type = "DIRECT"; s.isDirect = true; }
        return s;
    },
    reset: function(session) { 
        session.screen = "IDLE";
        session.history = []; session.userListCache = [];
        session.targetUser = null; session.editType = null; session.battle = null;
    },
    forceLogout: function(userId) {
        for (var key in this.sessions) { if (this.sessions[key].tempId === userId) { this.sessions[key].data = null; this.sessions[key].tempId = "비회원"; this.reset(this.sessions[key]); } }
        this.save();
    }
};

// ━━━━━━━━ [4. 매칭매니저] ━━━━━━━━
var MatchingManager = {
    renderDraftUI: function(session, content, help) {
        var div = Utils.getFixedDivider();
        var selectedName = (session.battle && session.battle.playerUnit) ? session.battle.playerUnit : "선택 안함";
        var header = "전투를 준비하세요.\n상대방이 당신의 선택을 기다리고 있습니다.\n선택 캐릭터: [" + selectedName + "]\n" + div + "\n";
        session.lastTitle = "전투 준비"; session.lastContent = content; session.lastHelp = help;
        return UI.make("전투 준비", header + content, help, false);
    },
    initDraft: function(session, replier) {
        session.battle = { playerUnit: null, aiUnit: null, selectedRole: null };
        session.history = []; session.screen = "BATTLE_DRAFT_CAT";
        return replier.reply(this.renderDraftUI(session, "1. 보유 캐릭터", "'준비완료' 입력 시 게임을 시작합니다."));
    },
    handleDraft: function(msg, session, replier) {
        if (msg === "취소" || msg === "이전") {
            if (session.history && session.history.length > 0) {
                var prev = session.history.pop(); session.screen = prev.screen;
                return replier.reply(this.renderDraftUI(session, prev.content, prev.help));
            } else { return showCancelConfirm(session, replier); }
        }
        var d = Database.data[session.tempId];
        var helpText = "'준비완료' 입력 시 게임을 시작합니다.";
        if (msg === "준비완료") {
            if (!session.battle.playerUnit) return replier.reply(UI.make("알림", "⚠️ 캐릭터를 선택하지 않았습니다."));
            return LoadingManager.start(session, replier);
        }
        if (session.screen === "BATTLE_DRAFT_CAT" && msg === "1") {
            session.history.push({ screen: "BATTLE_DRAFT_CAT", content: "1. 보유 캐릭터", help: helpText });
            session.screen = "BATTLE_DRAFT_ROLE";
            var content = "📢 역할군을 선택하세요.\n" + RoleKeys.map(function(r, i){ return (i+1)+". "+r; }).join("\n");
            return replier.reply(this.renderDraftUI(session, content, "역할군 번호를 입력하세요."));
        }
        if (session.screen === "BATTLE_DRAFT_ROLE") {
            var idx = parseInt(msg) - 1;
            if (RoleKeys[idx]) {
                var roleName = RoleKeys[idx];
                var myUnits = SystemData.roles[roleName].units.filter(function(u){ return d.collection.characters.indexOf(u) !== -1; });
                if (myUnits.length === 0) return replier.reply(UI.make("알림", "[" + roleName + "] 보유 캐릭터가 없습니다."));
                session.history.push({ screen: "BATTLE_DRAFT_ROLE", content: session.lastContent, help: session.lastHelp });
                session.battle.selectedRole = roleName; session.screen = "BATTLE_DRAFT_UNIT";
                var content = "📢 [" + roleName + "] 캐릭터를 선택하세요.\n" + myUnits.map(function(u, i){ return (i+1)+". "+u; }).join("\n");
                return replier.reply(this.renderDraftUI(session, content, "캐릭터 번호를 입력하세요."));
            }
        }
        if (session.screen === "BATTLE_DRAFT_UNIT") {
            var roleName = session.battle.selectedRole;
            var myUnits = SystemData.roles[roleName].units.filter(function(u){ return d.collection.characters.indexOf(u) !== -1; });
            var idx = parseInt(msg) - 1;
            if (myUnits[idx]) {
                session.battle.playerUnit = myUnits[idx];
                session.screen = "BATTLE_DRAFT_CAT";
                return replier.reply(this.renderDraftUI(session, "✅ [" + myUnits[idx] + "] 선택 완료!\n\n1. 보유 캐릭터 (다시 선택)", helpText));
            }
        }
    }
};

// ━━━━━━━━ [5. 로딩매니저] ━━━━━━━━
var LoadingManager = {
    start: function(session, replier) {
        session.screen = "BATTLE_LOADING";
        var aiUnits = ["가렌", "애쉬", "럭스", "다리우스", "제드"];
        session.battle.aiUnit = aiUnits[Math.floor(Math.random() * aiUnits.length)];
        var res = "⚔️ 전투가 시작됩니다!\n\n" + "[플레이어] " + session.battle.playerUnit + "\n" + "      VS      \n" + "[인공지능] " + session.battle.aiUnit + "\n\n" + "전장 데이터 동기화 중...";
        replier.reply(UI.make("진입 중", res, "잠시만 기다려주세요", true));
        java.lang.Thread.sleep(2000);
        return replier.reply(UI.make("전장 도착", "🚩 전투가 시작되었습니다!", "메뉴를 입력하여 종료", true));
    }
};

// ━━━━━━━━ [6. 관리자 매니저] ━━━━━━━━
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
                return replier.reply(UI.go(session, "ADMIN_USER_DETAIL", session.targetUser, "기능을 선택하세요.", "조회 중"));
            }
        }
        if (screen === "ADMIN_USER_DETAIL") {
            if (msg === "1") return replier.reply(UI.go(session, "ADMIN_EDIT_MENU", "정보 수정", "1. 골드 수정\n2. LP 수정\n3. 레벨 수정", "항목 선택"));
            if (msg === "2") return replier.reply(UI.go(session, "ADMIN_ANSWER_INPUT", "답변 하기", "["+session.targetUser+"] 답변 입력", "내용 입력"));
            if (msg === "3") return replier.reply(UI.go(session, "ADMIN_RESET_CONFIRM", "초기화", "[" + session.targetUser + "] 초기화 하시겠습니까?", "'확인' 입력"));
            if (msg === "4") return replier.reply(UI.go(session, "ADMIN_DELETE_CONFIRM", "계정 삭제", "[" + session.targetUser + "] 삭제 하시겠습니까?", "'삭제확인' 입력"));
        }
        if (screen === "ADMIN_ANSWER_INPUT") {
            Api.replyRoom(session.targetUser, UI.make("운영진 답변", msg, "시스템 메시지", true));
            SessionManager.reset(session); return replier.reply(UI.make("성공", "전송완료", "대기", true));
        }
        if (screen === "ADMIN_EDIT_MENU") {
            var types = ["gold", "lp", "level"];
            if (types[parseInt(msg)-1]) { session.editType = types[parseInt(msg)-1]; return replier.reply(UI.go(session, "ADMIN_EDIT_INPUT", "값 수정", "새로운 수치를 입력하세요.", "숫자 입력")); }
        }
        if (screen === "ADMIN_EDIT_INPUT") {
            var val = parseInt(msg);
            if (isNaN(val) || val < 1) return replier.reply(UI.make("오류", "1 이상의 숫자를 입력하세요."));
            Database.data[session.targetUser][session.editType] = val; Database.save(Database.data);
            SessionManager.reset(session); return replier.reply(UI.make("수정 완료", "정보가 업데이트되었습니다.", "대기", true));
        }
        if (screen === "ADMIN_RESET_CONFIRM" && msg === "확인") {
            Database.data[session.targetUser] = Database.getInitData("1234");
            Database.save(Database.data); SessionManager.reset(session); return replier.reply(UI.make("초기화 완료", "기본 데이터로 리셋되었습니다.", "대기", true));
        }
        if (screen === "ADMIN_DELETE_CONFIRM" && msg === "삭제확인") {
            delete Database.data[session.targetUser];
            Database.save(Database.data); SessionManager.reset(session); return replier.reply(UI.make("삭제 완료", "계정이 영구 삭제되었습니다.", "대기", true));
        }
    }
};

// ━━━━━━━━ [7. 로그인매니저] ━━━━━━━━
// 유저가 로그인하기 전(GUEST 상태)의 모든 로직을 전담합니다.
var LoginManager = {
    handle: function(msg, session, replier) {
        // 1. 비로그인 메인 메뉴 처리 (GUEST_MAIN)
        if (session.screen === "GUEST_MAIN") {
            if (msg === "1") return replier.reply(UI.go(session, "JOIN_ID", "회원가입", "사용하실 아이디를 입력하세요.", "가입 신청"));
            if (msg === "2") return replier.reply(UI.go(session, "LOGIN_ID", "인증", "아이디를 입력하세요.", "로그인"));
            if (msg === "3") return replier.reply(UI.go(session, "GUEST_INQUIRY", "문의하기", "관리자에게 보낼 내용을 입력하세요.", "문의 접수"));
        }

        // 2. 회원가입 상세 단계
        if (session.screen === "JOIN_ID") {
            if (msg.length > 10) return replier.reply(UI.make("오류", "아이디는 10자 이내여야 합니다."));
            if (Database.data[msg]) return replier.reply(UI.make("오류", "이미 존재하는 아이디입니다."));
            session.tempId = msg;
            return replier.reply(UI.go(session, "JOIN_PW", "회원가입", "비밀번호를 설정하세요.", "보안"));
        }
        if (session.screen === "JOIN_PW") {
            Database.data[session.tempId] = Database.getInitData(msg);
            Database.save(Database.data);
            session.data = Database.data[session.tempId];
            SessionManager.reset(session);
            return replier.reply(UI.make("성공", "회원가입이 완료되었습니다!", "메뉴를 입력하여 시작하세요.", true));
        }

        // 3. 로그인 상세 단계
        if (session.screen === "LOGIN_ID") {
            session.tempId = msg;
            return replier.reply(UI.go(session, "LOGIN_PW", "인증", "비밀번호를 입력하세요.", "인증 중"));
        }
        if (session.screen === "LOGIN_PW") {
            if (Database.data[session.tempId] && Database.data[session.tempId].pw === msg) {
                session.data = Database.data[session.tempId];
                SessionManager.reset(session);
                return replier.reply(UI.make("성공", "로그인되었습니다. 반갑습니다!", "메뉴를 입력하세요.", true));
            }
            return replier.reply(UI.make("실패", "비밀번호가 일치하지 않습니다."));
        }
        
        // 4. 비로그인 유저의 문의하기 단계
        if (session.screen === "GUEST_INQUIRY") {
            var report = "📩 [신규 문의 (미가입)]\n내용: " + msg;
            if (Config.AdminRoom) Api.replyRoom(Config.AdminRoom, UI.make("문의 알림", report, "운영진 확인 필요", true));
            SessionManager.reset(session);
            return replier.reply(UI.make("전송 완료", "문의가 전달되었습니다.", "감사합니다.", true));
        }
    }
};

// ━━━━━━━━ [8. 유저 매니저] ━━━━━━━━
var UserManager = {
    handle: function(msg, session, replier) {
        // 세션 데이터 동기화
        if (session.tempId && Database.data[session.tempId]) {
            session.data = Database.data[session.tempId];
        }
        var d = session.data;

        // [구조적 변경] 데이터가 없으면 로그인매니저로 위임하고 종료
        if (!d) {
            return LoginManager.handle(msg, session, replier);
        }

        // 1. 로그인 유저 전용 문의하기
        if (session.screen === "USER_INQUIRY") {
            var report = "📩 [신규 문의]\n유저: " + session.tempId + "\n내용: " + msg;
            if (Config.AdminRoom) Api.replyRoom(Config.AdminRoom, UI.make("문의 알림", report, "운영진 확인 필요", true));
            SessionManager.reset(session);
            return replier.reply(UI.make("전송 완료", "문의가 전달되었습니다.", "감사합니다.", true));
        }

        // 2. 유저 메인 메뉴
        if (session.screen === "USER_MAIN") {
            if (msg === "1") return replier.reply(UI.go(session, "PROFILE_VIEW", session.tempId, "", "조회"));
            if (msg === "2") return replier.reply(UI.go(session, "COL_MAIN", "컬렉션", "1. 보유 칭호\n2. 보유 챔피언", "조회"));
            if (msg === "3") return replier.reply(UI.go(session, "BATTLE_MAIN", "대전", "1. AI 대결", "전투 시작"));
            if (msg === "4") return replier.reply(UI.go(session, "SHOP_MAIN", "상점", "1. 챔피언 상점\n2. 소모품 상점", "쇼핑"));
            if (msg === "5") return replier.reply(UI.go(session, "USER_INQUIRY", "문의하기", "내용을 입력하세요.", "전송"));
            if (msg === "6") { 
                SessionManager.forceLogout(session.tempId); 
                return replier.reply(UI.make("알림", "로그아웃 되었습니다.", "종료", true)); 
            }
        }

        // 3. 대전 매칭 관련 (MatchingManager 호출)
        if (session.screen === "BATTLE_MAIN" && msg === "1") { 
            MatchingManager.initDraft(session, replier); 
            return; 
        }
        if (session.screen.indexOf("BATTLE_DRAFT") !== -1) {
            return MatchingManager.handleDraft(msg, session, replier);
        }
        
        // 4. 프로필 및 스탯 강화
        if (session.screen === "PROFILE_VIEW") {
            if (msg === "1") return replier.reply(UI.go(session, "STAT_UP_MENU", "능력치 강화", "항목 번호 입력", "보유 포인트: "+(d.point||0)));
            if (msg === "2") {
                var c = (d.inventory && d.inventory["RESET_TICKET"]) || 0;
                return replier.reply(UI.go(session, "STAT_RESET_CONFIRM", "초기화 확인", "초기화권을 사용하시겠습니까?\n보유수량: "+c, "'사용' 입력"));
            }
        }

        if (session.screen === "STAT_UP_MENU") {
            var keys = ["acc", "ref", "com", "int"], names = ["정확", "반응", "침착", "직관"];
            var idx = parseInt(msg) - 1;
            if (keys[idx]) {
                session.selectedStat = keys[idx];
                session.selectedStatName = names[idx];
                return replier.reply(UI.go(session, "STAT_UP_INPUT", names[idx] + " 강화", "강화할 수치를 입력하세요.\n(남은 포인트: " + (d.point||0) + "P)", "숫자 입력"));
            }
        }

        if (session.screen === "STAT_UP_INPUT") {
            var amt = parseInt(msg);
            if (isNaN(amt) || amt <= 0) return replier.reply(UI.make("오류", "1 이상의 숫자를 입력하세요."));
            if (amt > (d.point || 0)) return replier.reply(UI.make("실패", "보유 포인트가 부족합니다."));
            d.stats[session.selectedStat] += amt;
            d.point -= amt;
            Database.save(Database.data);
            replier.reply(UI.make("✨ 강화 성공", session.selectedStatName + " 수치가 " + amt + "만큼 증가했습니다.", "성공", true));
            // 강화 후 프로필로 복귀 (히스토리 조정)
            session.history = [{ screen: "USER_MAIN", title: "메인 메뉴", content: "1. 프로필\n2. 컬렉션\n3. 대전\n4. 상점\n5. 문의하기\n6. 로그아웃", help: "번호 입력" }];
            return replier.reply(UI.go(session, "PROFILE_VIEW", session.tempId, "", "조회", true));
        }

        // 5. 상점 시스템
        if (session.screen === "SHOP_MAIN") {
            if (msg === "1") return replier.reply(UI.go(session, "SHOP_ROLES", "역할군 선택", RoleKeys.map(function(r, i){ return (i+1)+". "+r; }).join("\n"), "번호 선택"));
            if (msg === "2") return replier.reply(UI.go(session, "SHOP_ITEM_BUY", "소모품 상점", "1. 능력치 초기화권 (10000G)", "구매 번호 선택"));
        }

        if (session.screen === "SHOP_ROLES") {
            var rIdx = parseInt(msg) - 1;
            if (RoleKeys[rIdx]) {
                session.selectedRole = RoleKeys[rIdx];
                var unitList = SystemData.roles[session.selectedRole].units.map(function(u, i){
                    var hasUnit = d.collection.characters.indexOf(u) !== -1;
                    return (i+1) + ". " + u + (hasUnit ? " [보유중]" : " (500G)");
                }).join("\n");
                return replier.reply(UI.go(session, "SHOP_BUY_ACTION", session.selectedRole, unitList, "구매할 번호 입력"));
            }
        }

        if (session.screen === "SHOP_BUY_ACTION") {
            var uIdx = parseInt(msg) - 1;
            var units = SystemData.roles[session.selectedRole].units;
            if (units[uIdx]) {
                var targetUnit = units[uIdx];
                if (d.collection.characters.indexOf(targetUnit) !== -1) return replier.reply(UI.make("알림", "이미 보유한 챔피언입니다."));
                if (d.gold < 500) return replier.reply(UI.make("실패", "골드가 부족합니다. (필요: 500G)"));
                
                d.gold -= 500;
                d.collection.characters.push(targetUnit);
                Database.save(Database.data);
                SessionManager.reset(session);
                return replier.reply(UI.make("구매 성공", "🎉 영입 완료: " + targetUnit + "\n\n소환사의 협곡에 합류했습니다!", "메뉴를 입력하여 복귀", true));
            }
        }
    }
};

// ━━━━━━━━ [9. 단체방 매니저] ━━━━━━━━
var GroupManager = {
    handle: function(msg, session, replier) {
        if (session.screen === "GROUP_MAIN") {
            if (msg === "1") return replier.reply(UI.go(session, "GROUP_PROFILE", session.tempId, "", "내 정보 조회"));
            if (msg === "2") {
                var users = Object.keys(Database.data);
                var ranking = users.map(function(id){ 
                    return { id: id, lp: Database.data[id].lp || 0 }; 
                }).sort(function(a, b){ return b.lp - a.lp; });
                
                var rankText = "", showCount = Math.min(ranking.length, 10);
                for (var i = 0; i < showCount; i++) {
                    var user = ranking[i];
                    var tier = getTierInfo(user.lp);
                    var medal = (i === 0) ? "🥇" : (i === 1) ? "🥈" : (i === 2) ? "🥉" : (i + 1) + ".";
                    rankText += medal + " " + user.id + " (" + tier.icon + " " + user.lp + " LP)\n";
                }
                return replier.reply(UI.go(session, "GROUP_RANKING", "전체 티어 랭킹", rankText, "실시간 데이터 기반"));
            }
        }
    }
};

// ━━━━━━━━ [10. 메인 핸들러] ━━━━━━━━
Database.data = Database.load(); 
if (typeof SessionManager.load === "function") SessionManager.load();

function response(room, msg, sender, isGroupChat, replier, imageDB) {
    var hash = String(imageDB.getProfileHash());
    var session = SessionManager.get(room, hash, isGroupChat);
    
    try {
        if (!msg || msg.indexOf(".업데이트") !== -1) return;
        msg = msg.trim();

        // 1. 공통 시스템 명령 (취소 확인창 등)
        if (session.screen === "CANCEL_CONFIRM") return handleCancelConfirm(msg, session, replier);
        
        if (msg === "메뉴") {
            if (session.screen === "IDLE") return replier.reply(UI.renderMenu(session));
            return showCancelConfirm(session, replier);
        }

        // 2. 특수 상황 필터링 (로딩 중 등)
        if (session.screen === "IDLE" || session.screen === "BATTLE_LOADING") return;

        // 3. 권한별 매니저 분기
        if (msg === "취소" || msg === "이전") {
            return handleBackNavigation(session, replier);
        }

        if (session.type === "ADMIN") {
            AdminManager.handle(msg, session, replier);
        } else if (session.type === "GROUP") {
            GroupManager.handle(msg, session, replier);
        } else {
            // 일반 유저 및 비로그인(GUEST)은 UserManager가 받아서 LoginManager로 토스함
            UserManager.handle(msg, session, replier);
        }

        if (typeof SessionManager.save === "function") SessionManager.save();

    } catch (e) {
        reportError(e, msg, session, sender, replier);
    }
}

// 네비게이션 처리 (이전/취소)
function handleBackNavigation(session, replier) {
    if (session.history && session.history.length > 0) {
        var prev = session.history.pop();
        session.screen = prev.screen;
        // 프로필 등 특수 UI 재렌더링이 필요한 경우
        if (session.screen.indexOf("PROFILE") !== -1 || session.screen.indexOf("STAT") !== -1) {
            return replier.reply(UI.go(session, session.screen, prev.title, prev.content, prev.help, true));
        }
        return replier.reply(UI.make(prev.title, prev.content, prev.help, false));
    }
    return replier.reply(UI.renderMenu(session));
}

// 중단 확인창 로직
function showCancelConfirm(session, replier) {
    session.preCancelScreen = session.screen;
    session.preCancelTitle = session.lastTitle;
    session.preCancelContent = session.lastContent;
    session.preCancelHelp = session.lastHelp;

    var isBattle = session.screen.indexOf("BATTLE") !== -1;
    var title = isBattle ? "⚠️ 탈주 확인" : "중단 확인";
    var body = isBattle ? "정말 전장을 이탈하시겠습니까?\n매칭 정보가 사라집니다." : "진행 중인 작업을 중단하고 메인 메뉴로 돌아갈까요?";
    
    return replier.reply(UI.go(session, "CANCEL_CONFIRM", title, body, "'예'/'아니오' 입력", true));
}

function handleCancelConfirm(msg, session, replier) {
    if (msg === "예" || msg === "1" || msg === "확인") { 
        SessionManager.reset(session); 
        return replier.reply(UI.renderMenu(session)); 
    } else if (msg === "아니오" || msg === "2") {
        session.screen = session.preCancelScreen;
        // 매칭 화면이었다면 전용 렌더러 사용
        if (session.screen.indexOf("BATTLE_DRAFT") !== -1) {
            return replier.reply(MatchingManager.renderDraftUI(session, session.preCancelContent, session.preCancelHelp));
        }
        return replier.reply(UI.make(session.preCancelTitle || session.lastTitle, session.preCancelContent, session.preCancelHelp, false));
    }
}

// 에러 보고 시스템
function reportError(e, msg, session, sender, replier) {
    var errLog = "📍 위치: " + (session.screen || "알 수 없음") + 
                 "\n💬 입력: " + msg + 
                 "\n👤 유저: " + (session.tempId || sender) + 
                 "\n🛠 내용: " + e.message;
    replier.reply(UI.make("알림", "오류가 발생했습니다.\n메뉴를 입력하여 복귀하세요.", "에러 코드: " + e.lineNumber, true));
    if (Config.AdminRoom && Api.replyRoom) {
        Api.replyRoom(Config.AdminRoom, UI.make("🚨 시스템 오류", errLog, "Line: " + e.lineNumber, true));
    }
}
