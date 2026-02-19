/*
 * 🏰 소환사의 협곡 Bot - FINAL ULTIMATE FIX (v1.4.2)
 * - 버그 수정: 유저 톡방에서 '메뉴' 입력 시 화면이 안 뜨는 현상 해결
 * - 원인: UserController 내부 조건문에 갱신 신호(menu_refresh) 누락 수정
 * - 기능: 로그인 유지, 알림 분리, 에러 방지 포함 전체 소스
 */ 

// ━━━━━━━━ [1. 설정 및 인프라] ━━━━━━━━
var Config = {
    Version: "v1.4.2 MenuFix",
    AdminRoom: "소환사의협곡관리", 
    BotName: "소환사의 협곡",
    DB_PATH: "sdcard/msgbot/Bots/main/database.json",
    SESSION_PATH: "sdcard/msgbot/Bots/main/sessions.json",
    LINE_CHAR: "━",
    FIXED_LINE: 14,
    WRAP_LIMIT: 20, 
    TIMEOUT_MS: 300000 // 5분
};

var MAX_LEVEL = 30;
var POINT_PER_LEVEL = 5;

var Utils = {
    getFixedDivider: function() { 
        return Array(Config.FIXED_LINE + 1).join(Config.LINE_CHAR); 
    },
    
    wrapText: function(str) {
        if (!str) return "";
        var lines = str.split("\n"), result = [];
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (line.length <= Config.WRAP_LIMIT) { 
                result.push(line);
            } else { 
                var currentLine = "";
                for (var j = 0; j < line.length; j++) {
                    currentLine += line[j];
                    if (currentLine.length >= Config.WRAP_LIMIT) {
                        result.push(currentLine);
                        currentLine = "";
                    }
                }
                if (currentLine) result.push(currentLine);
            }
        }
        return result.join("\n");
    },

    getTierInfo: function(lp) {
        if (lp >= 3000) return { name: "챌린저", icon: "💎" };
        if (lp >= 2500) return { name: "그랜드마스터", icon: "👑" };
        if (lp >= 2000) return { name: "마스터", icon: "🔮" };
        if (lp >= 1700) return { name: "다이아몬드", icon: "💠" };
        if (lp >= 1400) return { name: "에메럴드", icon: "💚" };
        if (lp >= 1100) return { name: "플래티넘", icon: "💿" };
        if (lp >= 800) return { name: "골드", icon: "🥇" };
        if (lp >= 500) return { name: "실버", icon: "🥈" };
        if (lp >= 200) return { name: "브론즈", icon: "🥉" };
        return { name: "아이언", icon: "⚫" };
    }
};

// ━━━━━━━━ [2. 데이터베이스] ━━━━━━━━
var Database = {
    data: {},
    inquiries: [],
    
    load: function() {
        var file = new java.io.File(Config.DB_PATH);
        if (file.exists()) {
            try {
                var content = FileStream.read(Config.DB_PATH);
                var d = JSON.parse(content);
                this.data = d.users || {};
                this.inquiries = d.inquiries || [];
            } catch (e) {
                this.data = {}; this.inquiries = [];
            }
        }
    },
    
    save: function() {
        var saveData = { users: this.data, inquiries: this.inquiries };
        FileStream.write(Config.DB_PATH, JSON.stringify(saveData, null, 4));
    },

    createUser: function(sender, pw) {
        this.data[sender] = {
            pw: pw, 
            name: sender,
            title: "뉴비",
            lp: 0, win: 0, lose: 0,
            level: 1, exp: 0,
            gold: 1000, point: 0,
            stats: { acc: 50, ref: 50, com: 50, int: 50 }, 
            inventory: { titles: ["뉴비"], champions: [] },
            banned: false
        };
        this.save();
    }
};

// 세션 매니저
var SessionManager = {
    sessions: {},
    
    init: function() {
        var file = new java.io.File(Config.SESSION_PATH);
        if (file.exists()) {
            try {
                this.sessions = JSON.parse(FileStream.read(Config.SESSION_PATH));
            } catch (e) { this.sessions = {}; }
        }
    },

    save: function() {
        FileStream.write(Config.SESSION_PATH, JSON.stringify(this.sessions, null, 4));
    },
    
    get: function(sender, replier) {
        if (!this.sessions[sender]) {
            this.sessions[sender] = { screen: "IDLE", temp: {}, lastTime: Date.now() };
        }
        var s = this.sessions[sender];
        s.lastTime = Date.now(); 
        this.save(); 
        return s;
    },

    checkTimeout: function(sender, replier) {
        var s = this.sessions[sender];
        if (s && s.screen !== "IDLE" && (Date.now() - s.lastTime > Config.TIMEOUT_MS)) {
            this.reset(sender);
            replier.reply("⌛ 세션이 만료되었습니다.\n'메뉴'를 입력해 다시 시작하세요.");
            return true; 
        }
        if (s) {
            s.lastTime = Date.now();
            this.save();
        }
        return false;
    },

    reset: function(sender) {
        // [수정] 세션 초기화 시 기존 데이터 찌꺼기 완벽 제거
        this.sessions[sender] = { screen: "IDLE", temp: {}, lastTime: Date.now() };
        this.save();
    }
};

SessionManager.init();

// ━━━━━━━━ [3. 콘텐츠 매니저] ━━━━━━━━
var ContentManager = {
    menus: {
        guest: ["1. 회원가입", "2. 로그인", "3. 운영진 문의"],
        main: ["1. 내 정보", "2. 컬렉션 확인", "3. 대전 모드", "4. 상점 이용", "5. 운영진 문의", "6. 로그아웃"],
        profileSub: ["1. 능력치 강화", "2. 능력치 초기화"],
        stats: ["1. 정확", "2. 반응", "3. 침착", "4. 직관"],
        shopMain: ["1. 아이템 상점", "2. 챔피언 상점"],
        shopItems: ["1. 닉네임 변경권 (500G)", "2. 스탯 초기화권 (1500G)"],
        adminMain: ["1. 시스템 정보", "2. 전체 유저", "3. 문의 관리"],
        adminUser: ["1. 정보 수정", "2. 데이터 초기화", "3. 계정 삭제", "4. 차단/해제"],
        adminEdit: ["1. 골드 수정", "2. LP 수정", "3. 레벨 수정"]
    },
    msg: {
        welcome: "소환사의 협곡에 오신 것을 환영합니다.\n원하시는 기능을 선택해 주세요.",
        inputID_Join: "사용하실 아이디를 입력해 주세요.",
        inputID_Login: "로그인할 아이디를 입력해 주세요.",
        inputPW: "비밀번호를 입력해 주세요.",
        registerComplete: "가입이 완료되었습니다!\n자동으로 로그인됩니다.",
        loginFail: "정보가 일치하지 않습니다.",
        notEnoughGold: "골드가 부족합니다.",
        onlyNumber: "숫자만 입력해 주세요.",
        banned: "🚫 관리자에 의해 이용이 제한된 계정입니다.",
        battlePrep: "⚔️ 대전 모드는 현재 준비 중입니다.",
        adminSelectUser: "관리할 유저의 번호를 입력하세요."
    },
    champions: ["알리스타", "말파이트", "레오나", "가렌", "다리우스", "잭스", "제드", "카타리나", "탈론", "럭스", "아리", "빅토르", "애쉬", "베인", "카이사", "소라카", "유미", "쓰레쉬"]
};

// ━━━━━━━━ [4. 레이아웃 매니저] ━━━━━━━━
var LayoutManager = {
    renderFrame: function(title, content, showNav, footer) {
        var div = Utils.getFixedDivider();
        var res = "『 " + title + " 』\n" + div + "\n" + Utils.wrapText(content);

        if (showNav === true) {
            res += "\n" + div + "\n[ ◀이전 | ✖취소 | 🏠메뉴 ]";
        } else if (Array.isArray(showNav)) {
            res += "\n" + div + "\n[ " + showNav.join(" | ") + " ]";
        }

        if (footer) {
            res += "\n" + div + "\n💡 " + footer;
        }

        return res;
    },

    renderAlert: function(title, content) {
        return this.renderFrame(title, content, false, "잠시만 기다려주세요...");
    },

    renderProfileHead: function(data, targetName) {
        var div = Utils.getFixedDivider();
        var tier = Utils.getTierInfo(data.lp);
        var win = data.win || 0, lose = data.lose || 0, total = win + lose;
        var winRate = total === 0 ? 0 : Math.floor((win / total) * 100);
        var st = data.stats;
        var expDisplay = (data.level >= MAX_LEVEL) ? "MAX" : data.exp + "/" + (data.level * 100);
        var banStatus = data.banned ? " [🚫차단]" : "";

        var lines = [
            "👤 대상: " + targetName + banStatus,
            "🏅 칭호: [" + data.title + "]",
            div,
            "🏅 티어: " + tier.icon + tier.name + " (" + data.lp + ")",
            "💰 골드: " + (data.gold || 0).toLocaleString() + " G",
            "⚔️ 전적: " + win + "승 " + lose + "패 (" + winRate + "%)",
            "🆙 레벨: Lv." + data.level,
            "🔷 경험: (" + expDisplay + ")",
            div,
            " [ 상세 능력치 ]",
            "🎯 정확: " + st.acc,
            "⚡ 반응: " + st.ref,
            "🧘 침착: " + st.com,
            "🧠 직관: " + st.int,
            div,
            "✨ 포인트: " + (data.point || 0) + " P"
        ];
        
        return lines.join("\n");
    },

    templates: {
        menuList: function(subtitle, items) {
            var list = items || [];
            return " " + list.join("\n "); 
        },
        inputRequest: function(subtitle, currentVal, info) {
            var lines = [
                " 현재 상태 : " + currentVal,
                " " + info,
                "",
                " 값을 입력하세요."
            ];
            return lines.join("\n");
        },
        result: function(subtitle, text) {
            return " " + text;
        },
        list: function(subtitle, listArray) {
            var content = (listArray && listArray.length > 0) ? listArray.join(", ") : "없음";
            return " " + content;
        }
    }
};

// ━━━━━━━━ [5. 시스템 액션] ━━━━━━━━
var SystemAction = {
    go: function(replier, title, msg, nextFunc) {
        replier.reply(LayoutManager.renderAlert(title, msg));
        java.lang.Thread.sleep(1200); 
        if (nextFunc) nextFunc();
    }
};

// ━━━━━━━━ [6. 컨트롤러] ━━━━━━━━

// 6-1. 인증 컨트롤러
var AuthController = {
    handle: function(msg, session, sender, replier) {
        if (session.screen === "IDLE" || session.screen === "GUEST_MAIN" || msg === "menu_refresh") {
            session.screen = "GUEST_MAIN";
            if (msg === "1") { 
                session.screen = "JOIN_ID"; 
                return replier.reply(LayoutManager.renderFrame("회원가입", ContentManager.msg.inputID_Join, true, "아이디 입력")); 
            }
            if (msg === "2") { 
                session.screen = "LOGIN_ID"; 
                return replier.reply(LayoutManager.renderFrame("로그인", ContentManager.msg.inputID_Login, true, "아이디 입력")); 
            }
            if (msg === "3") { 
                session.screen = "GUEST_INQUIRY"; 
                return replier.reply(LayoutManager.renderFrame("문의 접수", "운영진에게 보낼 내용을 입력하세요.", true, "내용 입력")); 
            }
            var body = LayoutManager.templates.menuList(null, ContentManager.menus.guest);
            return replier.reply(LayoutManager.renderFrame("비회원 메뉴", body, false, "번호를 선택하세요.")); 
        }

        if (session.screen === "JOIN_ID") {
            if (msg.length > 10) return SystemAction.go(replier, "오류", "아이디는 10자 이내여야 합니다.", function(){ AuthController.handle("1", session, sender, replier); });
            if (Database.data[msg]) return SystemAction.go(replier, "오류", "이미 존재하는 아이디입니다.", function(){ AuthController.handle("1", session, sender, replier); });
            session.temp.id = msg; session.screen = "JOIN_PW";
            return replier.reply(LayoutManager.renderFrame("비밀번호 설정", ContentManager.msg.inputPW, true, "비밀번호 입력"));
        }
if (session.screen === "JOIN_PW") {
            Database.createUser(session.temp.id, msg);
            Database.load(); 
            // [수정] session.data 복사본 생성 제거, 원본을 찾기 위한 id만 저장
            session.tempId = session.temp.id; 
            session.screen = "MAIN"; 
            SessionManager.save(); 
            
            try { Api.replyRoom(Config.AdminRoom, "📢 [신규 유저] " + session.temp.id + "님이 가입했습니다."); } catch(e) {}

            return SystemAction.go(replier, "가입 완료", ContentManager.msg.registerComplete, function() {
                UserController.handle("menu_refresh", session, sender, replier);
            });
        }

        if (session.screen === "LOGIN_ID") {
            if (!Database.data[msg]) return SystemAction.go(replier, "오류", "존재하지 않는 아이디입니다.", function(){ AuthController.handle("2", session, sender, replier); });
            session.temp.id = msg; session.screen = "LOGIN_PW";
            return replier.reply(LayoutManager.renderFrame("로그인", ContentManager.msg.inputPW, true, "비밀번호 입력"));
        }
        if (session.screen === "LOGIN_PW") {
            var userData = Database.data[session.temp.id];
            if (userData && userData.pw === msg) {
                // [수정] session.data 복사본 생성 제거
                session.tempId = session.temp.id;
                SessionManager.save(); 
                return SystemAction.go(replier, "로그인 성공", session.tempId + "님 환영합니다!", function() {
                    UserController.handle("menu_refresh", session, sender, replier);
                });
            } else {
                return SystemAction.go(replier, "실패", ContentManager.msg.loginFail, function(){ AuthController.handle("2", session, sender, replier); });
            }
        }
        
        if (session.screen === "GUEST_INQUIRY") {
            Database.inquiries.push({ sender: "비회원", content: msg, time: new Date().toLocaleString(), read: false });
            Database.save(); SessionManager.reset(sender);
            return SystemAction.go(replier, "접수 완료", "문의가 접수되었습니다.", function(){ AuthController.handle("메뉴", session, sender, replier); });
        }
    }
};

// 6-2. 유저 컨트롤러
var UserController = {
    handle: function(msg, session, sender, replier) {
        // [핵심] 세션 복사본이 아닌 원본 DB 데이터를 직접 조준! (모든 수정이 즉시 DB에 적용됨)
        var data = Database.data[session.tempId]; 
        
        if (!data) return AuthController.handle(msg, session, sender, replier);
        if (data.banned) return replier.reply(LayoutManager.renderFrame("알림", ContentManager.msg.banned, false, null));

        if (session.screen === "MAIN" || msg === "메뉴" || msg === "menu_refresh") {
            if (msg === "메뉴" || msg === "menu_refresh" || session.screen !== "MAIN") {
                session.screen = "MAIN";
                var body = LayoutManager.templates.menuList(null, ContentManager.menus.main);
                return replier.reply(LayoutManager.renderFrame("메인 로비", body, false, "메뉴를 선택하세요."));
            }
            if (["1","2","3","4","5","6"].indexOf(msg) === -1) return;
        }

        // [1] 내 정보
        if (session.screen === "MAIN" && msg === "1") {
            session.screen = "PROFILE_MAIN";
            var head = LayoutManager.renderProfileHead(data, session.tempId);
            var body = LayoutManager.templates.menuList(null, ContentManager.menus.profileSub);
            return replier.reply(LayoutManager.renderFrame("내 정보", head + "\n" + Utils.getFixedDivider() + "\n" + body, true, "작업을 선택하세요."));
        }
        
        if (session.screen === "PROFILE_MAIN") {
            if (msg === "1") { 
                session.screen = "STAT_SELECT"; 
                var body = LayoutManager.templates.menuList(null, ContentManager.menus.stats);
                return replier.reply(LayoutManager.renderFrame("능력치 강화", body, true, "강화할 스탯 선택"));
            }
            if (msg === "2") { 
                return replier.reply(LayoutManager.renderFrame("알림", "상점에서 '스탯 초기화권'을 구매하세요.", true, null));
            }
        }

        if (session.screen === "STAT_SELECT") {
            var sMap = {"1":"acc","2":"ref","3":"com","4":"int"}, 
                nMap = {"1":"정확","2":"반응","3":"침착","4":"직관"};
            if (sMap[msg]) {
                session.temp.statKey = sMap[msg]; 
                session.temp.statName = nMap[msg]; 
                session.screen = "STAT_INPUT";
                var body = LayoutManager.templates.inputRequest(null, data.stats[session.temp.statKey], "보유 포인트: " + data.point + " P");
                return replier.reply(LayoutManager.renderFrame(session.temp.statName + " 강화", body, true, "투자할 포인트를 입력하세요."));
            }
        }

        if (session.screen === "STAT_INPUT") {
            if (msg === "refresh_input" || msg === "refresh_stat") {
                var body = LayoutManager.templates.inputRequest(null, data.stats[session.temp.statKey], "보유 포인트: " + data.point + " P");
                return replier.reply(LayoutManager.renderFrame(session.temp.statName + " 강화", body, true, "투자할 포인트 입력"));
            }

            var amt = parseInt(msg);
            
            if (isNaN(amt) || amt <= 0) return SystemAction.go(replier, "오류", ContentManager.msg.onlyNumber, function() { UserController.handle("refresh_input", session, sender, replier); }); 
            if (data.point < amt) return SystemAction.go(replier, "실패", "포인트가 부족합니다.", function() { UserController.handle("refresh_input", session, sender, replier); });
            
            data.point -= amt; 
            data.stats[session.temp.statKey] += amt; 
            Database.save(); // 직접 DB를 수정했으므로 한방에 저장 완료
            
            return SystemAction.go(replier, "강화 성공", session.temp.statName + " 수치가 " + amt + " 상승했습니다.", function() { 
                session.screen = "STAT_SELECT"; 
                var body = LayoutManager.templates.menuList(null, ContentManager.menus.stats);
                replier.reply(LayoutManager.renderFrame("능력치 강화", body, true, "강화할 스탯 선택"));
            });
        }

        // [2] 컬렉션
        if (session.screen === "MAIN" && msg === "2") {
            session.screen = "COLLECTION_MAIN";
            if (!data.inventory.champions) data.inventory.champions = [];
            var myChamps = data.inventory.champions.length;
            var stats = ["👑 현재 칭호: [" + data.title + "]", "📊 수집 챔피언: " + myChamps + "명"].join("\n");
            var body = LayoutManager.templates.menuList(null, ["1. 보유 칭호", "2. 보유 챔피언"]);
            return replier.reply(LayoutManager.renderFrame("컬렉션", stats + "\n\n" + body, true, "번호를 선택하세요."));
        }
        if (session.screen === "COLLECTION_MAIN") {
             if (msg === "1") {
                 session.screen = "TITLE_EQUIP";
                 var list = data.inventory.titles.map(function(t, i) { 
                     return (i+1) + ". " + t + (t === data.title ? " [장착중]" : ""); 
                 }).join("\n");
                 return replier.reply(LayoutManager.renderFrame("칭호 관리", list + "\n\n장착할 칭호 이름을 정확히 입력하세요.", true, "칭호 입력"));
             }
             if (msg === "2") {
                 if (!data.inventory.champions) data.inventory.champions = [];
                 var list = (data.inventory.champions.length > 0) ? data.inventory.champions.join("\n") : "보유한 챔피언이 없습니다.";
                 return replier.reply(LayoutManager.renderFrame("챔피언 관리", list, true, "목록 확인"));
             }
        }
        if (session.screen === "TITLE_EQUIP") {
            if (data.inventory.titles.indexOf(msg) === -1) return SystemAction.go(replier, "오류", "보유하지 않은 칭호입니다.", function() { UserController.handle("refresh_title", session, sender, replier); });
            data.title = msg; 
            Database.save();
            return SystemAction.go(replier, "변경 완료", "칭호가 [" + msg + "](으)로 변경되었습니다.", function() { 
                UserController.handle("2", session, sender, replier); 
            });
        }
        if (msg === "refresh_title") {
             var list = data.inventory.titles.map(function(t, i) { return (i+1) + ". " + t + (t === data.title ? " [장착중]" : ""); }).join("\n");
             return replier.reply(LayoutManager.renderFrame("칭호 관리", list + "\n\n정확한 칭호 이름을 입력해 주세요.", true, "칭호 입력"));
        }

        // [4] 상점
        if (session.screen === "MAIN" && msg === "4") {
            session.screen = "SHOP_MAIN";
            var body = LayoutManager.templates.menuList(null, ContentManager.menus.shopMain);
            return replier.reply(LayoutManager.renderFrame("상점", body, true, "상점 카테고리를 선택하세요."));
        }
        if (session.screen === "SHOP_MAIN") {
            if (msg === "1") { 
                session.screen = "SHOP_ITEMS";
                var body = LayoutManager.templates.menuList(null, ContentManager.menus.shopItems);
                return replier.reply(LayoutManager.renderFrame("아이템 상점", body, true, "구매할 아이템 번호를 입력하세요.")); 
            }
            if (msg === "2") { 
                session.screen = "SHOP_CHAMPS";
                if (!data.inventory.champions) data.inventory.champions = [];
                var cList = ContentManager.champions.map(function(c, i){ 
                    return (i+1) + ". " + c + (data.inventory.champions.indexOf(c)!==-1?" [보유]":""); 
                }).join("\n");
                return replier.reply(LayoutManager.renderFrame("챔피언 상점 (500G)", cList, true, "영입할 챔피언 번호를 입력하세요."));
            }
        }
        if (session.screen === "SHOP_ITEMS") {
            if (msg === "refresh_shop_i") {
                var body = LayoutManager.templates.menuList(null, ContentManager.menus.shopItems);
                return replier.reply(LayoutManager.renderFrame("아이템 상점", body, true, "번호를 선택해 주세요."));
            }
            var p = 0, n = "", act = "";
            if (msg === "1") { p = 500; n = "닉네임 변경권"; act = "name"; }
            else if (msg === "2") { p = 1500; n = "스탯 초기화권"; act = "reset"; }
            
            if (p > 0) {
                if (data.gold < p) return SystemAction.go(replier, "실패", "골드가 부족합니다.", function(){ UserController.handle("refresh_shop_i", session, sender, replier); });
                data.gold -= p; 
                if (act === "reset") data.stats = { acc: 50, ref: 50, com: 50, int: 50 };
                Database.save();
                return SystemAction.go(replier, "구매 성공", n + " 구매가 완료되었습니다!", function(){ UserController.handle("refresh_shop_i", session, sender, replier); });
            }
        }

        if (session.screen === "SHOP_CHAMPS") {
            if (msg === "refresh_shop_c") {
                var cList = ContentManager.champions.map(function(c, i){ return (i+1) + ". " + c + (data.inventory.champions.indexOf(c)!==-1?" [보유]":""); }).join("\n");
                return replier.reply(LayoutManager.renderFrame("챔피언 상점 (500G)", cList, true, "번호를 선택해 주세요."));
            }
            var idx = parseInt(msg) - 1;
            if (ContentManager.champions[idx]) {
                var target = ContentManager.champions[idx];
                if (data.inventory.champions.indexOf(target) !== -1 || data.gold < 500) {
                    return SystemAction.go(replier, "실패", "이미 보유 중이거나 골드가 부족합니다.", function(){ UserController.handle("refresh_shop_c", session, sender, replier); });
                }
                data.gold -= 500; 
                data.inventory.champions.push(target); 
                Database.save();
                return SystemAction.go(replier, "영입 성공", target + "님이 합류했습니다!", function(){ UserController.handle("refresh_shop_c", session, sender, replier); });
            }
        }

        // [5] 문의
        if (session.screen === "MAIN" && msg === "5") {
            session.screen = "USER_INQUIRY";
            return replier.reply(LayoutManager.renderFrame("문의 접수", "운영진에게 보낼 내용을 입력해 주세요.", true, "내용 입력"));
        }
        if (session.screen === "USER_INQUIRY") {
            Database.inquiries.push({ sender: session.tempId, content: msg, time: new Date().toLocaleString(), read: false });
            Database.save();
            session.screen = "MAIN";
            return SystemAction.go(replier, "완료", "접수되었습니다.", function() { UserController.handle("menu_refresh", session, sender, replier); });
        }
        
        // [6] 로그아웃
        if (session.screen === "MAIN" && msg === "6") { 
            SessionManager.reset(sender); 
            return replier.reply(LayoutManager.renderFrame("알림", "성공적으로 로그아웃되었습니다.", false, "다시 이용하려면 '메뉴'를 입력하세요.")); 
        }
    }
};

// 6-3. 관리자 컨트롤러
var AdminController = {
    handle: function(msg, session, sender, replier) {
        if (session.screen === "IDLE" || msg === "menu_refresh" || msg === "메뉴") {
            session.screen = "ADMIN_MAIN";
            var body = LayoutManager.templates.menuList(null, ContentManager.menus.adminMain);
            return replier.reply(LayoutManager.renderFrame("관리 센터", body, false, "관리 메뉴 선택"));
        }

        if (session.screen === "ADMIN_MAIN" && msg === "1") {
            session.screen = "ADMIN_SYS_INFO";
            var rt = java.lang.Runtime.getRuntime();
            var used = Math.floor((rt.totalMemory() - rt.freeMemory()) / 1024 / 1024);
            var info = "📟 메모리: " + used + "MB 사용중\n👥 유저 수: " + Object.keys(Database.data).length + "명\n🛡️ 버전: " + Config.Version;
            return replier.reply(LayoutManager.renderFrame("시스템 정보", info, true, "확인 완료"));
        }

        if (session.screen === "ADMIN_MAIN" && msg === "2") {
            var users = Object.keys(Database.data);
            if (users.length === 0) return SystemAction.go(replier, "알림", "등록된 유저가 없습니다.", function(){ AdminController.handle("메뉴", session, sender, replier); });
            session.temp.userList = users; session.screen = "ADMIN_USER_SELECT";
            var listText = users.map(function(u, i) { return (i+1) + ". " + u; }).join("\n");
            return replier.reply(LayoutManager.renderFrame("유저 목록", listText, true, "번호 선택"));
        }

        if (session.screen === "ADMIN_USER_SELECT") {
            var idx = parseInt(msg) - 1;
            if (session.temp.userList && session.temp.userList[idx]) {
                var selectedUser = session.temp.userList[idx];
                session.temp.targetUser = selectedUser;
                session.screen = "ADMIN_USER_DETAIL";
                var head = LayoutManager.renderProfileHead(Database.data[selectedUser], selectedUser);
                var body = LayoutManager.templates.menuList(null, ContentManager.menus.adminUser);
                return replier.reply(LayoutManager.renderFrame(selectedUser + " 관리", head + "\n" + Utils.getFixedDivider() + "\n" + body, true, "작업 선택"));
            }
        }

        if (session.screen === "ADMIN_MAIN" && msg === "3") {
            session.screen = "ADMIN_INQUIRY";
            var list = Database.inquiries.map(function(iq, i) { return (i+1) + ". " + iq.sender + ": " + iq.content; }).join("\n");
            return replier.reply(LayoutManager.renderFrame("문의 목록", list || "문의가 없습니다.", true, "목록 확인"));
        }

        if (session.screen === "ADMIN_USER_DETAIL") {
            var target = session.temp.targetUser;
            var tData = Database.data[target];
            
            if (msg === "1") { 
                session.screen = "ADMIN_EDIT_SELECT";
                return replier.reply(LayoutManager.renderFrame("정보 수정", LayoutManager.templates.menuList(null, ContentManager.menus.adminEdit), true, "수정할 항목 선택"));
            }
            if (msg === "2") { 
                var currentPw = Database.data[target].pw;
                var currentBan = Database.data[target].banned;
                
                Database.data[target] = {
                    pw: currentPw, 
                    name: target,
                    title: "뉴비",
                    lp: 0, win: 0, lose: 0,
                    level: 1, exp: 0,
                    gold: 1000, point: 0,
                    stats: { acc: 50, ref: 50, com: 50, int: 50 }, 
                    inventory: { titles: ["뉴비"], champions: [] },
                    banned: currentBan
                };
                Database.save(); 
                
                // [알림 추가] 데이터 초기화
                try { Api.replyRoom(target, "📢 관리자에 의해 계정 데이터가 초기화되었습니다."); } catch(e) {}
                
                return SystemAction.go(replier, "완료", "모든 데이터가 완벽하게 초기화되었습니다.", function() {
                    AdminController.handle("refresh_detail", session, sender, replier);
                });
            }
            if (msg === "3") {
                delete Database.data[target]; Database.save();
                
                // [알림 추가] 계정 삭제
                try { Api.replyRoom(target, "📢 관리자에 의해 계정이 영구 삭제되었습니다."); } catch(e) {}
                
                return SystemAction.go(replier, "완료", "계정이 삭제되었습니다.", function() {
                    AdminController.handle("메뉴", session, sender, replier);
                });
            }
            if (msg === "4") {
                 tData.banned = !tData.banned; Database.save();
                 
                 // [알림 추가] 차단 및 해제
                 var banStr = tData.banned ? "이용 차단" : "차단 해제";
                 try { Api.replyRoom(target, "📢 관리자에 의해 계정이 [" + banStr + "] 상태로 변경되었습니다."); } catch(e) {}
                 
                 return SystemAction.go(replier, "완료", "차단 상태가 변경되었습니다.", function() {
                     AdminController.handle("refresh_detail", session, sender, replier);
                 });
            }
        }
        
        if (msg === "refresh_detail") {
             var head = LayoutManager.renderProfileHead(Database.data[session.temp.targetUser], session.temp.targetUser);
             var body = LayoutManager.templates.menuList(null, ContentManager.menus.adminUser);
             return replier.reply(LayoutManager.renderFrame(session.temp.targetUser + " 관리", head + "\n" + Utils.getFixedDivider() + "\n" + body, true, "작업 선택"));
        }

        if (session.screen === "ADMIN_EDIT_SELECT") {
            var typeMap = { "1": "gold", "2": "lp", "3": "level" };
            if (typeMap[msg]) {
                session.temp.editType = typeMap[msg];
                session.screen = "ADMIN_EDIT_INPUT";
                return replier.reply(LayoutManager.renderFrame("값 수정", "새로운 값을 입력하세요.", true, "숫자 입력"));
            }
        }
        if (session.screen === "ADMIN_EDIT_INPUT") {
             var val = parseInt(msg);
             if(!isNaN(val)) {
                 var target = session.temp.targetUser;
                 var typeName = {"gold":"골드", "lp":"LP", "level":"레벨"}[session.temp.editType];
                 
                 if (session.temp.editType === "level") {
                     var oldLevel = Database.data[target].level;
                     var diff = val - oldLevel;
                     if (diff !== 0) {
                         var addPoint = diff * POINT_PER_LEVEL;
                         Database.data[target].point += addPoint;
                         if(Database.data[target].point < 0) Database.data[target].point = 0;
                     }
                 }
                 
                 Database.data[target][session.temp.editType] = val;
                 Database.save();
                 
                 // [알림 추가] 정보 수정 (골드, LP, 레벨)
                 try { Api.replyRoom(target, "📢 관리자에 의해 [" + typeName + "] 정보가 " + val + "(으)로 수정되었습니다."); } catch(e) {}
                 
                 return SystemAction.go(replier, "완료", "수정되었습니다.", function() {
                     session.screen = "ADMIN_USER_DETAIL";
                     AdminController.handle("refresh_detail", session, sender, replier);
                 });
             }
        }
    }
};

// ━━━━━━━━ [7. 메인 라우터] ━━━━━━━━
function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    try {
        Database.load(); 
        var realMsg = msg.trim();
        var session = SessionManager.get(sender);

        if (realMsg === "업데이트" || realMsg === ".업데이트") return;

        // [핵심 변경] 로그인 상태 여부를 DB 원본 기반으로 판단
        var isLogged = (session.tempId && Database.data[session.tempId]);

        if (realMsg === "메뉴") {
            session.lastTime = Date.now();
            
            if (isLogged) session.screen = "MAIN"; 
            else session.screen = "GUEST_MAIN"; 
            
            if (room === Config.AdminRoom) return AdminController.handle("menu_refresh", session, sender, replier);
            if (isLogged) return UserController.handle("menu_refresh", session, sender, replier);
            return AuthController.handle("menu_refresh", session, sender, replier);
        }

        if (SessionManager.checkTimeout(sender, replier)) return;

        if (realMsg === "취소") { 
            SessionManager.reset(sender); 
            return replier.reply(LayoutManager.renderFrame("알림", "대기 상태로 돌아갑니다.", false, "재실행은 '메뉴'")); 
        }

        if (realMsg === "이전") {
            var pData = [
                "JOIN_ID:GUEST_MAIN,JOIN_PW:GUEST_MAIN,LOGIN_ID:GUEST_MAIN,LOGIN_PW:GUEST_MAIN,",
                "GUEST_INQUIRY:GUEST_MAIN,PROFILE_MAIN:MAIN,STAT_SELECT:PROFILE_MAIN,",
                "STAT_INPUT:STAT_SELECT,COLLECTION_MAIN:MAIN,TITLE_EQUIP:COLLECTION_MAIN,",
                "SHOP_MAIN:MAIN,SHOP_ITEMS:SHOP_MAIN,SHOP_CHAMPS:SHOP_MAIN,USER_INQUIRY:MAIN,",
                "ADMIN_SYS_INFO:ADMIN_MAIN,ADMIN_INQUIRY:ADMIN_MAIN,ADMIN_USER_SEL:ADMIN_MAIN,",
                "ADMIN_USER_DETAIL:ADMIN_USER_SEL,ADMIN_EDIT_SEL:ADMIN_USER_DETAIL,ADMIN_EDIT_IN:ADMIN_EDIT_SEL"
            ].join("").split(",");

            var pMap = {};
            for (var i = 0; i < pData.length; i++) {
                var pair = pData[i].split(":");
                if (pair.length === 2) pMap[pair[0]] = pair[1];
            }

            if (pMap[session.screen]) {
                session.screen = pMap[session.screen];
                
                if (room === Config.AdminRoom) {
                    if (session.screen === "ADMIN_MAIN") return AdminController.handle("menu_refresh", session, sender, replier);
                    if (session.screen === "ADMIN_USER_SEL") return AdminController.handle("2", session, sender, replier);
                    if (session.screen === "ADMIN_USER_DETAIL") return AdminController.handle("refresh_detail", session, sender, replier);
                    return AdminController.handle("menu_refresh", session, sender, replier);
                }
                
                if (isLogged) {
                    if (session.screen === "MAIN") return UserController.handle("menu_refresh", session, sender, replier);
                    if (session.screen === "PROFILE_MAIN") return UserController.handle("1", session, sender, replier);
                    if (session.screen === "STAT_SELECT") return UserController.handle("1", session, sender, replier);
                    if (session.screen === "SHOP_MAIN") return UserController.handle("4", session, sender, replier);
                    return UserController.handle("menu_refresh", session, sender, replier);
                }
                return AuthController.handle("menu_refresh", session, sender, replier);
            }
            return replier.reply(LayoutManager.renderFrame("알림", "이전 단계가 없습니다.", false, null));
        }

        if (room === Config.AdminRoom) return AdminController.handle(realMsg, session, sender, replier);
        
        // 라우팅도 isLogged 기준으로 변경
        if (isLogged) return UserController.handle(realMsg, session, sender, replier);
        else return AuthController.handle(realMsg, session, sender, replier);

    } catch (e) {
        var errLog = [
            "⛔ 시스템 오류 발생!",
            "━━━━━━━━━━━━━━",
            "📌 종류: " + e.name,
            "💬 내용: " + e.message,
            "📍 위치: " + (e.lineNumber || "정보 없음") + "줄",
            "🔎 상세: " + (e.stack ? e.stack.substring(0, 150) : "정보 없음")
        ].join("\n");
        
        try { Api.replyRoom(Config.AdminRoom, errLog); } catch(err) {} 
        replier.reply(LayoutManager.renderFrame("시스템 오류", "봇 내부 오류가 발생했습니다.\n관리자에게 문의해 주세요.", false, "오류 발생"));
    }
}
