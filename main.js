/**
 * [main.js] v8.3.9
 * 1. 구조: 관리자님이 주신 Manager 분기 구조(Admin/User/Group) 완벽 복구.
 * 2. UI: 모든 출력 문구 12자 자동 줄바꿈 및 유동 구분선 적용.
 * 3. 관리자: Config.AdminName 지정 및 유저 수정/초기화/삭제 상세 로직 유지.
 * 4. 이전: history 스택에 title/content/help를 저장하여 화면 완벽 복구.
 */

// ━━━━━━━━ [1. 설정 및 상수] ━━━━━━━━
var Config = {
    Prefix: ".",
    AdminHash: "2056407147",      
    AdminName: "관리자", // 직접 지정
    AdminRoom: "소환사의협곡관리",   
    GroupRoom: "소환사의협곡",     
    BotName: "소환사의 협곡",
    DB_PATH: "/sdcard/msgbot/Bots/main/database.json",
    SESSION_PATH: "/sdcard/msgbot/Bots/main/sessions.json",
    LINE_CHAR: "━", 
    MIN_LINE: 12,
    MAX_LINE: 18,
    NAV_BAR: "⬅️ 이전 | 🚫 취소 | 🏠 메뉴"
};

var Utils = {
    // [12자 줄바꿈 및 UI 적용]
    applyUI: function(str) {
        if (!str) return "";
        var lines = str.split("\n");
        var result = [];
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            for (var j = 0; j < line.length; j += 12) {
                result.push(line.substring(j, j + 12));
            }
        }
        return result.join("\n");
    },
    getVisualWidth: function(str) {
        var width = 0;
        for (var i = 0; i < str.length; i++) {
            var c = str.charCodeAt(i);
            if ((c >= 0xAC00 && c <= 0xD7A3) || (c >= 0x1100 && c <= 0x11FF) || (c >= 0x3130 && c <= 0x318F) || (c > 255)) width += 2;
            else width += 1;
        }
        return width;
    },
    getDynamicLine: function(content, title, help) {
        var allText = (content || "") + "\n" + (title || "") + "\n" + (help || "");
        var lines = allText.split("\n");
        var maxW = 0;
        for (var i = 0; i < lines.length; i++) {
            var w = this.getVisualWidth(lines[i]);
            if (w > maxW) maxW = w;
        }
        var count = Math.ceil(maxW / 2);
        if (count < Config.MIN_LINE) count = Config.MIN_LINE;
        if (count > Config.MAX_LINE) count = Config.MAX_LINE;
        return Array(count + 1).join(Config.LINE_CHAR);
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
    for (var i = 0; i < TierData.length; i++) if (lp >= TierData[i].minLp) return TierData[i];
    return TierData[TierData.length - 1];
}

// ━━━━━━━━ [2. 모듈: UI 엔진] ━━━━━━━━
var UI = {
    make: function(title, content, help) {
        var uTitle = Utils.applyUI(title);
        var uContent = Utils.applyUI(content);
        var uHelp = Utils.applyUI(help);
        var line = Utils.getDynamicLine(uContent, uTitle, uHelp);
        var res = "『 " + uTitle + " 』\n" + line + "\n" + uContent + "\n" + line + "\n";
        if (uHelp) res += "💡 " + uHelp + "\n" + line + "\n";
        res += Config.NAV_BAR;
        return res;
    },
    renderProfile: function(id, data) {
        if (!data) return "데이터없음";
        var t = getTierInfo(data.lp);
        return "👤계정:" + id + "\n🏅칭호:[" + data.title + "]\n🏆티어:" + t.icon + t.name + "\n📈LP:" + data.lp + "\n💰골드:" + data.gold.toLocaleString() + "\n⭐레벨:" + data.level + "\n⚔️전적:" + (data.win || 0) + "승" + (data.lose || 0) + "패";
    },
    go: function(session, screen, title, content, help) {
        if (session.screen && session.screen !== screen && session.screen !== "IDLE") {
            if (!session.history) session.history = [];
            session.history.push({ screen: session.screen, title: session.lastTitle, content: session.lastContent, help: session.lastHelp });
        }
        session.screen = screen; session.lastTitle = title; session.lastContent = content; session.lastHelp = help;
        return this.make(title, content, help);
    },
    renderMenu: function(session, sender) {
        session.history = [];
        if (session.type === "ADMIN") return this.go(session, "ADMIN_MAIN", "관리자메뉴", "1.시스템정보\n2.유저관리", "번호입력");
        if (session.type === "GROUP") {
            if (!session.data) return UI.make("알림", "개인톡에서\n로그인하세요", "");
            return this.go(session, "GROUP_MAIN", "메인메뉴", "1.내정보확인\n2.명예의전당\n3.유저목록", "번호입력");
        }
        if (!session.data) return this.go(session, "GUEST_MAIN", "메인메뉴", "1.회원가입\n2.로그인", "환영합니다");
        return this.go(session, "USER_MAIN", "메인메뉴", "1.내프로필\n2.컬렉션\n3.상점\n4.로그아웃", "메뉴선택");
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
        if (!this.sessions[h]) this.sessions[h] = { data: null, screen: "IDLE", history: [], lastTitle: "", lastContent: "", lastHelp: "", tempId: null, userListCache: [] };
        var s = this.sessions[h];
        if (r === Config.AdminRoom) s.type = "ADMIN"; else if (g && r === Config.GroupRoom) s.type = "GROUP"; else if (!g) s.type = "DIRECT";
        return s;
    },
    reset: function(session) { session.screen = "IDLE"; session.history = []; }
};

// ━━━━━━━━ [4. 매니저: 관리자 시스템] ━━━━━━━━
var AdminManager = {
    handle: function(msg, session, replier, startTime) {
        switch(session.screen) {
            case "ADMIN_MAIN":
                if (msg === "1") {
                    var rt = java.lang.Runtime.getRuntime();
                    var used = Math.floor((rt.totalMemory() - rt.freeMemory()) / 1024 / 1024);
                    replier.reply(UI.make("시스템", "속도:" + (new Date().getTime() - startTime) + "ms\n램:" + used + "MB\n총원:" + Object.keys(Database.data).length + "명", ""));
                } else if (msg === "2") {
                    session.userListCache = Object.keys(Database.data);
                    replier.reply(UI.go(session, "ADMIN_USER_LIST", "유저관리", session.userListCache.map(function(id, i){ return (i+1)+". "+id; }).join("\n"), "번호입력"));
                }
                break;
            case "ADMIN_USER_LIST":
                var idx = parseInt(msg)-1;
                if (session.userListCache[idx]) {
                    session.targetUser = session.userListCache[idx];
                    replier.reply(UI.go(session, "ADMIN_USER_DETAIL", session.targetUser, UI.renderProfile(session.targetUser, Database.data[session.targetUser]), "1.수정 2.초기화 3.삭제"));
                }
                break;
            case "ADMIN_USER_DETAIL":
                if (msg === "1") replier.reply(UI.go(session, "ADMIN_EDIT_SEL", "항목수정", "1.골드\n2.LP\n3.레벨", "번호입력"));
                else if (msg === "2") replier.reply(UI.go(session, "ADMIN_RESET_CFM", "초기화", "[확인] 입력시 리셋", ""));
                else if (msg === "3") replier.reply(UI.go(session, "ADMIN_DEL_CFM", "삭제", "[삭제확인] 입력시 삭제", ""));
                break;
            case "ADMIN_EDIT_SEL":
                var maps = {"1":"gold", "2":"lp", "3":"level"};
                if (maps[msg]) { session.editType = maps[msg]; replier.reply(UI.go(session, "ADMIN_EDIT_IN", "수정입력", "현재:" + Database.data[session.targetUser][session.editType], "숫자입력")); }
                break;
            case "ADMIN_EDIT_IN":
                var v = parseInt(msg);
                if (!isNaN(v)) { Database.data[session.targetUser][session.editType] = v; Database.save(Database.data); replier.reply(UI.make("완료", "변경됨", "")); }
                break;
            case "ADMIN_RESET_CFM":
                if (msg === "확인") { 
                    var pw = Database.data[session.targetUser].pw;
                    Database.data[session.targetUser] = Database.getInitData(pw); Database.save(Database.data); 
                    replier.reply(UI.make("완료", "초기화됨", ""));
                }
                break;
            case "ADMIN_DEL_CFM":
                if (msg === "삭제확인") { delete Database.data[session.targetUser]; Database.save(Database.data); replier.reply(UI.make("완료", "삭제됨", "")); }
                break;
        }
    }
};

// ━━━━━━━━ [5. 매니저: 유저 시스템] ━━━━━━━━
var UserManager = {
    handle: function(msg, session, replier, sender) {
        var d = session.data;
        if (!d) {
            switch(session.screen) {
                case "GUEST_MAIN":
                    if (msg === "1") replier.reply(UI.go(session, "JOIN_ID", "회원가입", "아이디입력", ""));
                    else if (msg === "2") replier.reply(UI.go(session, "LOGIN_ID", "로그인", "아이디입력", ""));
                    break;
                case "JOIN_ID": session.tempId = msg; replier.reply(UI.go(session, "JOIN_PW", "비밀번호", "비밀번호입력", "")); break;
                case "JOIN_PW": 
                    Database.data[session.tempId] = Database.getInitData(msg); Database.save(Database.data);
                    session.data = Database.data[session.tempId]; replier.reply(UI.renderMenu(session, sender)); break;
                case "LOGIN_ID": session.tempId = msg; replier.reply(UI.go(session, "LOGIN_PW", "비밀번호", "비밀번호입력", "")); break;
                case "LOGIN_PW":
                    if (Database.data[session.tempId] && Database.data[session.tempId].pw === msg) {
                        session.data = Database.data[session.tempId]; replier.reply(UI.renderMenu(session, sender));
                    } else replier.reply(UI.make("오류", "정보불일치", ""));
                    break;
            }
        } else {
            switch(session.screen) {
                case "USER_MAIN":
                    if (msg === "1") replier.reply(UI.go(session, "PROF_VIEW", "내정보", UI.renderProfile(session.tempId, d), ""));
                    else if (msg === "2") replier.reply(UI.go(session, "COL_MAIN", "컬렉션", "1.칭호\n2.캐릭터", "번호입력"));
                    else if (msg === "3") replier.reply(UI.go(session, "SHOP_MAIN", "상점", "1.캐릭터구매", ""));
                    else if (msg === "4") { session.data = null; session.screen = "IDLE"; replier.reply(UI.make("알림", "로그아웃", "")); }
                    break;
                case "COL_MAIN":
                    if (msg === "1") {
                        var tL = d.collection.titles.map(function(t, i){ return (i+1)+". "+(t===d.title?"✅":"")+t; }).join("\n");
                        replier.reply(UI.go(session, "COL_T_ACT", "칭호설정", tL, "번호입력"));
                    } else if (msg === "2") {
                        replier.reply(UI.go(session, "COL_C_VIEW", "캐릭터", d.collection.characters.join("\n") || "없음", ""));
                    }
                    break;
                case "SHOP_MAIN":
                    if (msg === "1") replier.reply(UI.go(session, "SHOP_R", "포지션", RoleKeys.map(function(r, i){return (i+1)+". "+r;}).join("\n"), ""));
                    break;
                case "SHOP_R":
                    var rI = parseInt(msg)-1;
                    if (RoleKeys[rI]) {
                        session.selectedRole = RoleKeys[rI];
                        var uL = SystemData.roles[session.selectedRole].units.map(function(u, i){ return (i+1)+". "+u+"(500G)"; }).join("\n");
                        replier.reply(UI.go(session, "SHOP_B", session.selectedRole, uL, "번호입력"));
                    }
                    break;
            }
        }
    }
};

// ━━━━━━━━ [6. 매니저: 단체방 시스템] ━━━━━━━━
var GroupManager = {
    handle: function(msg, session, replier, sender) {
        switch(session.screen) {
            case "GROUP_MAIN":
                if (msg === "1") replier.reply(UI.go(session, "G_PROF", "내정보", UI.renderProfile(session.tempId, session.data), ""));
                else if (msg === "2") {
                    var ids = Object.keys(Database.data).sort(function(a,b){return Database.data[b].lp - Database.data[a].lp;});
                    var rL = ids.slice(0,5).map(function(id, i){ return (i+1)+"."+id+"("+Database.data[id].lp+"LP)"; }).join("\n");
                    replier.reply(UI.go(session, "G_RANK", "랭킹", rL, ""));
                } else if (msg === "3") replier.reply(UI.go(session, "G_LIST", "유저목록", Object.keys(Database.data).join("\n"), ""));
                break;
        }
    }
};

// ━━━━━━━━ [7. 응답 핸들러] ━━━━━━━━
Database.data = Database.load(); SessionManager.load();

function response(room, msg, sender, isGroupChat, replier, imageDB) {
    var startTime = new Date().getTime();
    try {
        if (!msg) return;
        var hash = String(imageDB.getProfileHash());
        var session = SessionManager.get(room, hash, isGroupChat);
        msg = msg.trim();

        if (room === Config.AdminRoom && hash === Config.AdminHash) session.type = "ADMIN";

        if (msg === "이전" || msg === "⬅️ 이전") {
            if (session.history && session.history.length > 0) {
                var prev = session.history.pop();
                session.screen = prev.screen; session.lastTitle = prev.title; session.lastContent = prev.content; session.lastHelp = prev.help;
                return replier.reply(UI.make(prev.title, prev.content, prev.help));
            }
            return replier.reply(UI.renderMenu(session, sender));
        }
        if (msg === "취소" || msg === "🚫 취소" || msg === "메뉴" || msg === "🏠 메뉴") { SessionManager.reset(session); return replier.reply(UI.renderMenu(session, sender)); }

        if (isGroupChat) {
            for (var k in SessionManager.sessions) {
                if (SessionManager.sessions[k].type === "DIRECT" && SessionManager.sessions[k].tempId === sender) {
                    session.data = SessionManager.sessions[k].data; session.tempId = SessionManager.sessions[k].tempId; break;
                }
            }
        }

        if (session.screen === "IDLE") { if (msg === "메뉴") return replier.reply(UI.renderMenu(session, sender)); return; }

        if (session.type === "ADMIN") AdminManager.handle(msg, session, replier, startTime);
        else if (session.type === "GROUP") GroupManager.handle(msg, session, replier, sender);
        else if (session.type === "DIRECT") UserManager.handle(msg, session, replier, sender);
        
        SessionManager.save();
    } catch (e) { Api.replyRoom(Config.AdminRoom, "⚠️ [v8.3.9 에러]: " + e.message); }
}
