/*
 * 🏰 소환사의 협곡 Bot - MVC Refactored Version
 * - 구조: 유저가 제공한 MVC 아키텍처 (LayoutManager + ContentManager + Controllers)
 * - 내용: 2.txt 원본 기능 100% 이식 (비밀번호 로그인, 세션타임아웃, 관리자 메모리확인, 상점 5종 등)
 * - 설정: 접두사 없음
 */

// ━━━━━━━━ [1. 설정 및 인프라] ━━━━━━━━
var Config = {
    Version: "v1.0.5 MVC-Restore",
    // 접두사 없음 (빈 문자열)
    AdminRoom: "소환사의협곡관리", 
    BotName: "소환사의 협곡",
    DB_PATH: "/sdcard/msgbot/Bots/main/database.json",
    SESSION_PATH: "/sdcard/msgbot/Bots/main/sessions.json",
    LINE_CHAR: "━",
    FIXED_LINE: 14,
    TIMEOUT_MS: 300000 // 5분 (2.txt 원본 설정)
};

var MAX_LEVEL = 30;

var Utils = {
    getFixedDivider: function() { return Array(Config.FIXED_LINE + 1).join(Config.LINE_CHAR); },
    
    // 2.txt의 줄바꿈 로직 보존 (필요 시 사용)
    wrapText: function(str) {
        if (!str) return "";
        var limit = 18;
        var lines = str.split("\n"), result = [];
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (line.length <= limit) { result.push(line); } 
            else {
                var current = "";
                for (var j = 0; j < line.length; j++) {
                    current += line[j];
                    if (current.length >= limit) { result.push(current); current = ""; }
                }
                if (current) result.push(current);
            }
        }
        return result.join("\n");
    },

    getTierInfo: function(lp) {
        if (lp >= 3000) return { name: "챌린저", icon: "✨" };
        if (lp >= 2500) return { name: "그랜드마스터", icon: "🔴" };
        if (lp >= 2000) return { name: "마스터", icon: "🟣" };
        if (lp >= 1700) return { name: "다이아몬드", icon: "💎" };
        if (lp >= 1400) return { name: "에메럴드", icon: "💚" };
        if (lp >= 1100) return { name: "플래티넘", icon: "💿" };
        if (lp >= 800) return { name: "골드", icon: "🟡" };
        if (lp >= 500) return { name: "실버", icon: "⚪" };
        if (lp >= 200) return { name: "브론즈", icon: "🟤" };
        return { name: "아이언", icon: "⚫" };
    }
};

// ━━━━━━━━ [2. 데이터베이스 및 세션] ━━━━━━━━
var Database = {
    data: {},
    inquiries: [],
    load: function() {
        var file = new java.io.File(Config.DB_PATH);
        if (file.exists()) {
            try {
                var d = JSON.parse(java.io.File(Config.DB_PATH).read());
                this.data = d.users || {};
                this.inquiries = d.inquiries || [];
            } catch (e) { this.data = {}; this.inquiries = []; }
        }
    },
    save: function() {
        var file = new java.io.File(Config.DB_PATH);
        var writer = new java.io.FileWriter(file);
        writer.write(JSON.stringify({ users: this.data, inquiries: this.inquiries }, null, 4));
        writer.close();
    },
    // 2.txt 원본: 비밀번호 포함 데이터 생성
    createUser: function(sender, pw) {
        this.data[sender] = {
            pw: pw, // 비밀번호 저장
            name: sender,
            title: "뉴비",
            lp: 0, win: 0, lose: 0,
            level: 1, exp: 0,
            gold: 1000, point: 0,
            stats: { acc: 50, ref: 50, com: 50, int: 50 }, 
            inventory: { titles: ["뉴비"], characters: [] },
            banned: false
        };
        this.save();
    }
};

var SessionManager = {
    sessions: {},
    timers: {}, // 2.txt 원본: 타임아웃 타이머
    
    get: function(sender, room, replier) {
        if (!this.sessions[sender]) {
            this.sessions[sender] = { screen: "IDLE", temp: {}, lastTime: Date.now() };
        }
        var s = this.sessions[sender];
        
        // 2.txt 원본: 세션 만료 로직
        var now = Date.now();
        if (s.screen !== "IDLE" && (now - s.lastTime > Config.TIMEOUT_MS)) {
            this.reset(sender);
            replier.reply("⌛ 세션이 만료되었습니다. 처음부터 다시 시작해주세요.");
            return this.sessions[sender];
        }
        s.lastTime = now; // 시간 갱신
        return s;
    },
    reset: function(sender) {
        this.sessions[sender] = { screen: "IDLE", temp: {}, lastTime: Date.now() };
    },
    forceLogout: function(sender) {
        this.reset(sender);
    }
};

// ━━━━━━━━ [3. 콘텐츠 매니저] ━━━━━━━━
var ContentManager = {
    // 2.txt 원본 메뉴 및 상점 구성
    menus: {
        guest: ["1. 회원가입", "2. 로그인", "3. 운영진 문의"],
        main: [
            "1. 프로필 조회", // 내 정보
            "2. 컬렉션 확인", 
            "3. 대전 모드", 
            "4. 상점 이용", 
            "5. 운영진 문의", 
            "6. 로그아웃"
        ],
        stats: ["1. 정확", "2. 반응", "3. 침착", "4. 직관"],
        shop: [
            "1. 티어 승급권 (1000G)", 
            "2. 닉네임 변경권 (500G)",
            "3. 전적 초기화권 (2000G)",
            "4. 스탯 초기화권 (1500G)",
            "5. 랜덤 박스 (300G)"
        ],
        adminMain: ["1. 시스템 정보", "2. 전체 유저", "3. 문의 관리"], // 2.txt 원본 메뉴
        adminUser: ["1. 정보 수정", "2. 데이터 초기화", "3. 계정 삭제"],
        adminEdit: ["1. 골드 수정", "2. LP 수정", "3. 레벨 수정"]
    },
    msg: {
        welcome: "소환사의 협곡에 오신 것을 환영합니다.\n원하시는 기능을 선택해 주세요.",
        inputID: "사용하실 아이디를 입력해 주세요. (최대 10자)",
        inputPW: "사용하실 비밀번호를 입력해 주세요.",
        registerComplete: "가입이 완료되었습니다! 자동 로그인됩니다.",
        loginFail: "정보가 일치하지 않습니다.",
        notEnoughGold: "골드가 부족합니다.", // 2.txt는 상점에서 골드 사용
        onlyNumber: "숫자만 입력해 주세요.",
        adminSearch: "관리할 유저의 닉네임을 입력하세요. (또는 유저 목록 번호)",
        banned: "🚫 관리자에 의해 이용이 제한된 계정입니다.",
        battlePrep: "⚔️ 대전 모드는 현재 준비 중입니다."
    },
    // 2.txt 원본: 챔피언 목록
    champions: ["알리스타", "말파이트", "레오나", "가렌", "다리우스", "잭스", "제드", "카타리나", "탈론", "럭스", "아리", "빅토르", "애쉬", "베인", "카이사", "소라카", "유미", "쓰레쉬"]
};

// ━━━━━━━━ [4. 레이아웃 매니저 (디자인)] ━━━━━━━━
var LayoutManager = {
    // [프레임]
    renderFrame: function(title, content, navItems) {
        var div = Utils.getFixedDivider();
        var nav = "";
        if (navItems) {
            nav = "\n" + div + "\n[ " + navItems.join(" | ") + " ]";
        }
        return "『 " + title + " 』\n" + div + "\n" + content + nav;
    },

    // [헤더] 2.txt 원본 디자인 유지
    renderProfileHead: function(data, targetName) {
        var div = Utils.getFixedDivider();
        var tier = Utils.getTierInfo(data.lp);
        var win = data.win || 0, lose = data.lose || 0, total = win + lose;
        var winRate = total === 0 ? 0 : Math.floor((win / total) * 100);
        var st = data.stats;
        var expDisplay = (data.level >= MAX_LEVEL) ? "MAX" : data.exp + "/" + (data.level * 100);
        var banStatus = data.banned ? " [🚫차단]" : "";

        var res = "";
        res += "👤 대상: " + targetName + banStatus + "\n";
        res += "🏅 칭호: [" + data.title + "]\n";
        res += div + "\n";
        res += "🏅 티어: " + tier.icon + tier.name + " (" + data.lp + ")\n";
        res += "💰 골드: " + (data.gold || 0).toLocaleString() + " G\n";
        res += "⚔️ 전적: " + win + "승 " + lose + "패 (" + winRate + "%)\n";
        res += "🆙 레벨: Lv." + data.level + "\n";
        res += "🔷 경험: (" + expDisplay + ")\n";
        res += div + "\n";
        res += " [ 상세 능력치 ]\n";
        res += "🎯 정확: " + st.acc + "\n";
        res += "⚡ 반응: " + st.ref + "\n";
        res += "🧘 침착: " + st.com + "\n";
        res += "🧠 직관: " + st.int + "\n";
        res += div + "\n";
        res += "✨ 포인트: " + (data.point || 0) + " P";
        
        return res;
    },

    // [템플릿] Body 영역
    templates: {
        menuList: function(subtitle, items) {
            return " [ " + subtitle + " ]\n\n " + items.join("\n ");
        },
        inputRequest: function(subtitle, currentVal, info) {
            return " [ " + subtitle + " ]\n\n 현재 상태 : " + currentVal + "\n " + info + "\n\n 값을 입력하세요.";
        },
        result: function(subtitle, text) {
            return " [ " + subtitle + " ]\n\n " + text;
        },
        list: function(subtitle, listArray) {
            var content = (listArray && listArray.length > 0) ? listArray.join(", ") : "없음";
            return " [ " + subtitle + " ]\n\n " + content;
        }
    }
};

// ━━━━━━━━ [5. 컨트롤러 (로직)] ━━━━━━━━

// 5-1. 인증 컨트롤러 (2.txt의 Guest/Login 기능 이식)
var AuthController = {
    handle: function(msg, session, sender, replier) {
        // 1. 게스트 메인
        if (session.screen === "IDLE" || session.screen === "GUEST_MAIN") {
            session.screen = "GUEST_MAIN";
            if (msg === "1") { // 회원가입
                session.screen = "JOIN_ID";
                return replier.reply(LayoutManager.renderFrame("회원가입", ContentManager.msg.inputID, ["취소"]));
            }
            if (msg === "2") { // 로그인
                session.screen = "LOGIN_ID";
                return replier.reply(LayoutManager.renderFrame("로그인", ContentManager.msg.inputID, ["취소"]));
            }
            if (msg === "3") { // 문의
                session.screen = "GUEST_INQUIRY";
                return replier.reply(LayoutManager.renderFrame("문의 접수", "운영진에게 보낼 내용을 입력하세요.", ["취소"]));
            }
            var body = LayoutManager.templates.menuList("환영합니다", ContentManager.menus.guest);
            return replier.reply(LayoutManager.renderFrame("게스트 모드", body));
        }

        // 2. 회원가입 프로세스 (ID -> PW)
        if (session.screen === "JOIN_ID") {
            if (msg.length > 10) return replier.reply("아이디는 10자 이내여야 합니다.");
            if (Database.data[msg]) return replier.reply("이미 존재하는 아이디입니다.");
            session.temp.id = msg;
            session.screen = "JOIN_PW";
            return replier.reply(LayoutManager.renderFrame("비밀번호 설정", ContentManager.msg.inputPW, ["취소"]));
        }
        if (session.screen === "JOIN_PW") {
            // 계정 생성 (2.txt 로직)
            Database.createUser(session.temp.id, msg);
            session.data = Database.data[session.temp.id]; // 자동 로그인
            session.tempId = session.temp.id; // 세션 ID 설정
            SessionManager.reset(sender); // 초기화 후 로그인 상태 진입
            session.data = Database.data[session.temp.id]; // 리셋으로 날아간 데이터 복구
            return replier.reply(ContentManager.msg.registerComplete);
        }

        // 3. 로그인 프로세스 (ID -> PW)
        if (session.screen === "LOGIN_ID") {
            if (!Database.data[msg]) return replier.reply("존재하지 않는 아이디입니다.");
            session.temp.id = msg;
            session.screen = "LOGIN_PW";
            return replier.reply(LayoutManager.renderFrame("본인 확인", ContentManager.msg.inputPW, ["취소"]));
        }
        if (session.screen === "LOGIN_PW") {
            var userData = Database.data[session.temp.id];
            if (userData && userData.pw === msg) {
                session.data = userData;
                session.tempId = session.temp.id;
                replier.reply(session.tempId + "님 환영합니다!");
                return UserController.handle("메뉴", session, sender, replier);
            } else {
                return replier.reply(ContentManager.msg.loginFail);
            }
        }
        
        // 4. 게스트 문의
        if (session.screen === "GUEST_INQUIRY") {
            Database.inquiries.push({ sender: "비회원", content: msg, time: new Date().toLocaleString(), read: false });
            Database.save();
            SessionManager.reset(sender);
            return replier.reply("문의가 접수되었습니다.");
        }
    }
};

// 5-2. 유저 컨트롤러 (2.txt의 기능 100% 이식)
var UserController = {
    handle: function(msg, session, sender, replier) {
        var data = session.data; // 세션에 저장된 데이터 사용 (로그인된 상태)
        if (!data) return AuthController.handle(msg, session, sender, replier); // 안전장치
        if (data.banned) return replier.reply(ContentManager.msg.banned);

        // 메인 메뉴
        if (session.screen === "MAIN" || msg === "메뉴" || session.screen === "IDLE") {
            session.screen = "MAIN";
            var head = LayoutManager.renderProfileHead(data, session.tempId);
            var body = LayoutManager.templates.menuList("메인 로비", ContentManager.menus.main);
            return replier.reply(LayoutManager.renderFrame("소환사의 협곡", head + "\n" + Utils.getFixedDivider() + "\n" + body));
        }

        // 1. 프로필 조회 & 강화
        if (session.screen === "MAIN" && msg === "1") {
            session.screen = "STAT_SELECT";
            var head = LayoutManager.renderProfileHead(data, session.tempId);
            var body = LayoutManager.templates.menuList("강화할 능력치 선택", ContentManager.menus.stats);
            return replier.reply(LayoutManager.renderFrame("내 정보", head + "\n" + Utils.getFixedDivider() + "\n" + body, ["메뉴"]));
        }
        if (session.screen === "STAT_SELECT") {
            var statMap = { "1": "acc", "2": "ref", "3": "com", "4": "int" };
            var nameMap = { "1": "정확", "2": "반응", "3": "침착", "4": "직관" };
            if (statMap[msg]) {
                session.temp.statKey = statMap[msg];
                session.temp.statName = nameMap[msg];
                session.screen = "STAT_INPUT";
                var body = LayoutManager.templates.inputRequest(session.temp.statName + " 강화", data.stats[session.temp.statKey], "보유 포인트: " + data.point + " P");
                return replier.reply(LayoutManager.renderFrame("강화 진행", body, ["취소", "메뉴"]));
            }
        }
        if (session.screen === "STAT_INPUT") {
            var amount = parseInt(msg);
            if (isNaN(amount) || amount <= 0) return replier.reply(ContentManager.msg.onlyNumber);
            if (data.point < amount) return replier.reply("포인트가 부족합니다.");
            
            data.point -= amount;
            data.stats[session.temp.statKey] += amount;
            Database.save();

            var resultMsg = session.temp.statName + " 수치가 " + amount + " 상승했습니다.\n 현재 수치: " + data.stats[session.temp.statKey];
            session.screen = "STAT_SELECT";
            return replier.reply(LayoutManager.renderFrame("결과 확인", LayoutManager.templates.result("강화 성공", resultMsg), ["1. 계속 강화", "메뉴"]));
        }

        // 2. 컬렉션 확인
        if (session.screen === "MAIN" && msg === "2") {
            session.screen = "COLLECTION_MAIN";
            // 2.txt 원본 통계 표시
            var stats = "👑 현재 칭호: [" + data.title + "]\n📊 챔피언 수집: " + (data.inventory.characters ? data.inventory.characters.length : 0) + "명";
            var body = LayoutManager.templates.menuList("컬렉션", ["1. 보유 칭호", "2. 보유 챔피언"]);
            return replier.reply(LayoutManager.renderFrame("컬렉션", stats + "\n\n" + body, ["메뉴"]));
        }
        if (session.screen === "COLLECTION_MAIN") {
             if (msg === "1") {
                 session.screen = "TITLE_EQUIP";
                 var list = data.inventory.titles.map(function(t, i) { return (i+1) + ". " + t + (t === data.title ? " [장착중]" : ""); }).join("\n");
                 return replier.reply(LayoutManager.renderFrame("칭호 관리", LayoutManager.templates.list("보유 목록", [list]) + "\n\n장착할 칭호 이름을 정확히 입력하세요.", ["메뉴"]));
             }
             if (msg === "2") {
                 var list = (data.inventory.characters && data.inventory.characters.length > 0) ? data.inventory.characters.join("\n") : "없음";
                 return replier.reply(LayoutManager.renderFrame("챔피언 관리", LayoutManager.templates.list("보유 목록", [list]), ["메뉴"]));
             }
        }
        if (session.screen === "TITLE_EQUIP") {
            if (data.inventory.titles.indexOf(msg) === -1) return replier.reply("보유하지 않은 칭호입니다.");
            data.title = msg;
            Database.save();
            session.screen = "COLLECTION_MAIN";
            return replier.reply(LayoutManager.renderFrame("장착 완료", LayoutManager.templates.result("알림", "[" + msg + "] 칭호를 장착했습니다."), ["메뉴"]));
        }

        // 3. 대전 모드
        if (session.screen === "MAIN" && msg === "3") {
            return replier.reply(LayoutManager.renderFrame("대전 모드", ContentManager.msg.battlePrep, ["메뉴"]));
        }

        // 4. 상점 이용 (2.txt의 5개 항목 & 로직 복구)
        if (session.screen === "MAIN" && msg === "4") {
            session.screen = "SHOP_BUY";
            var head = LayoutManager.renderProfileHead(data, session.tempId);
            var body = LayoutManager.templates.menuList("판매 목록", ContentManager.menus.shop);
            return replier.reply(LayoutManager.renderFrame("아이템 상점", head + "\n" + Utils.getFixedDivider() + "\n" + body + "\n\n구매할 번호를 입력하세요.", ["메뉴"]));
        }
        if (session.screen === "SHOP_BUY") {
            var price = 0, itemName = "", action = "";
            if (msg === "1") { price = 1000; itemName = "티어 승급권"; action = "tier"; }
            else if (msg === "2") { price = 500; itemName = "닉네임 변경권"; action = "name"; }
            else if (msg === "3") { price = 2000; itemName = "전적 초기화권"; action = "reset_score"; }
            else if (msg === "4") { price = 1500; itemName = "스탯 초기화권"; action = "reset_stat"; }
            else if (msg === "5") { price = 300; itemName = "랜덤 박스"; action = "random"; }
            
            if (price > 0) {
                if (data.gold < price) return replier.reply(ContentManager.msg.notEnoughGold); // 2.txt는 골드 사용
                data.gold -= price;
                
                var resultText = itemName + " 구매 완료!";
                // 아이템별 로직 구현
                if (action === "tier") { data.lp += 100; resultText += "\n(LP +100)"; }
                else if (action === "name") { data.gold += price; resultText = "관리자에게 문의해주세요. (골드 반환됨)"; }
                else if (action === "reset_score") { data.win = 0; data.lose = 0; resultText += "\n(전적 0승 0패 초기화)"; }
                else if (action === "reset_stat") { data.stats = { acc: 10, ref: 10, com: 10, int: 10 }; resultText += "\n(스탯 초기화)"; }
                else if (action === "random") {
                    var r = Math.floor(Math.random() * 10);
                    if (r < 3) {
                        data.gold += 1000; resultText += "\n(대박! 1000골드 획득)";
                    } else {
                        data.point += 100; resultText += "\n(100포인트 획득)";
                    }
                }

                Database.save();
                return replier.reply(LayoutManager.renderFrame("구매 성공", LayoutManager.templates.result("상점 이용", resultText + "\n남은 골드: " + data.gold + " G"), ["메뉴"]));
            }
        }

        // 5. 운영진 문의
        if (session.screen === "MAIN" && msg === "5") {
            session.screen = "USER_INQUIRY";
            return replier.reply(LayoutManager.renderFrame("문의 접수", "운영진에게 보낼 내용을 입력하세요.", ["취소"]));
        }
        if (session.screen === "USER_INQUIRY") {
            Database.inquiries.push({ sender: session.tempId, content: msg, time: new Date().toLocaleString(), read: false });
            Database.save();
            session.screen = "MAIN";
            return replier.reply("문의가 접수되었습니다.");
        }
        
        // 6. 로그아웃
        if (session.screen === "MAIN" && msg === "6") {
            SessionManager.reset(sender); // 세션 초기화
            return replier.reply("로그아웃 되었습니다.");
        }
    }
};

// 5-3. 관리자 컨트롤러 (2.txt 시스템 정보 확인 기능 등 복구)
var AdminController = {
    handle: function(msg, session, sender, replier) {
        // 메인
        if (session.screen === "IDLE" || msg === "메뉴") {
            session.screen = "ADMIN_MAIN";
            var body = LayoutManager.templates.menuList("관리자 기능", ContentManager.menus.adminMain);
            return replier.reply(LayoutManager.renderFrame("관리자 모드", body));
        }

        // 1. 시스템 정보 (2.txt 기능)
        if (session.screen === "ADMIN_MAIN" && msg === "1") {
            var rt = java.lang.Runtime.getRuntime();
            var used = Math.floor((rt.totalMemory() - rt.freeMemory()) / 1024 / 1024);
            var info = "📟 메모리: " + used + "MB 사용중\n👥 유저 수: " + Object.keys(Database.data).length + "명\n🛡️ 버전: " + Config.Version;
            return replier.reply(LayoutManager.renderFrame("시스템 정보", info, ["메뉴"]));
        }

        // 2. 전체 유저 조회
        if (session.screen === "ADMIN_MAIN" && msg === "2") {
            session.screen = "ADMIN_SEARCH";
            var userList = Object.keys(Database.data).join(", ");
            if(userList.length > 50) userList = "유저가 너무 많습니다. 검색을 이용하세요.";
            return replier.reply(LayoutManager.renderFrame("유저 조회", "등록된 유저:\n" + userList + "\n\n" + ContentManager.msg.adminSearch, ["취소"]));
        }

        // 3. 문의 관리
        if (session.screen === "ADMIN_MAIN" && msg === "3") {
            var list = Database.inquiries.map(function(iq, i) { return (i+1) + ". " + iq.sender + ": " + iq.content; }).join("\n");
            return replier.reply(LayoutManager.renderFrame("문의 목록", list || "문의가 없습니다.", ["메뉴"]));
        }

        // 유저 검색 처리
        if (session.screen === "ADMIN_SEARCH") {
            if (!Database.data[msg]) return replier.reply(ContentManager.msg.noData);
            session.temp.targetUser = msg;
            session.screen = "ADMIN_USER_DETAIL";
            var targetData = Database.data[msg];
            var head = LayoutManager.renderProfileHead(targetData, msg);
            var body = LayoutManager.templates.menuList("제어 메뉴", ContentManager.menus.adminUser);
            return replier.reply(LayoutManager.renderFrame("유저 상세 관리", head + "\n" + Utils.getFixedDivider() + "\n" + body, ["메뉴"]));
        }

        // 유저 상세 제어
        if (session.screen === "ADMIN_USER_DETAIL") {
            var tData = Database.data[session.temp.targetUser];
            if (msg === "1") { // 정보 수정
                session.screen = "ADMIN_EDIT_SELECT";
                return replier.reply(LayoutManager.renderFrame("수정 항목 선택", LayoutManager.templates.menuList("항목", ContentManager.menus.adminEdit), ["취소"]));
            }
            if (msg === "2") { // 초기화
                tData.win = 0; tData.lose = 0; tData.lp = 0;
                Database.save();
                return replier.reply("데이터가 초기화되었습니다.");
            }
            if (msg === "3") { // 삭제
                delete Database.data[session.temp.targetUser];
                Database.save();
                session.screen = "ADMIN_MAIN";
                return replier.reply("계정이 삭제되었습니다.");
            }
            if (msg === "4") { // 차단
                 tData.banned = !tData.banned;
                 Database.save();
                 return replier.reply("차단 상태가 변경되었습니다.");
            }
        }

        // 수정 값 입력
        if (session.screen === "ADMIN_EDIT_SELECT") {
            var typeMap = { "1": "gold", "2": "lp", "3": "level" };
            if (typeMap[msg]) {
                session.temp.editType = typeMap[msg];
                session.screen = "ADMIN_EDIT_INPUT";
                return replier.reply(LayoutManager.renderFrame("값 수정", "새로운 값을 입력하세요.", ["취소"]));
            }
        }
        if (session.screen === "ADMIN_EDIT_INPUT") {
             var val = parseInt(msg);
             if(!isNaN(val)) {
                 Database.data[session.temp.targetUser][session.temp.editType] = val;
                 Database.save();
                 // 수정 후 상세 페이지로 복귀
                 session.screen = "ADMIN_USER_DETAIL";
                 var targetData = Database.data[session.temp.targetUser];
                 var head = LayoutManager.renderProfileHead(targetData, session.temp.targetUser);
                 var body = LayoutManager.templates.menuList("제어 메뉴", ContentManager.menus.adminUser);
                 return replier.reply(LayoutManager.renderFrame("수정 완료", head + "\n" + Utils.getFixedDivider() + "\n" + body, ["메뉴"]));
             }
        }
    }
};

// ━━━━━━━━ [6. 메인 라우터] ━━━━━━━━
function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    try {
        Database.load();
        var realMsg = msg.trim();
        var session = SessionManager.get(sender, room, replier);

        // 네비게이션
        if (realMsg === "취소" || realMsg === "메뉴") {
            // 로그인 상태는 유지하되 화면만 리셋 (IDLE 상태가 아닌 MAIN 상태로 가거나, Guest는 IDLE)
            if (session.data) session.screen = "MAIN"; // 로그인 유저는 메인으로
            else SessionManager.reset(sender); // 비로그인은 IDLE로
            
            if (room === Config.AdminRoom) return AdminController.handle("메뉴", session, sender, replier);
            if (session.data) return UserController.handle("메뉴", session, sender, replier);
            return AuthController.handle("메뉴", session, sender, replier);
        }

        // 관리자 라우팅
        if (room === Config.AdminRoom) return AdminController.handle(realMsg, session, sender, replier);
        
        // 로그인 여부 라우팅
        if (!session.data) return AuthController.handle(realMsg, session, sender, replier);
        return UserController.handle(realMsg, session, sender, replier);

    } catch (e) {
        replier.reply("⛔ 에러: " + e);
        Log.error("Bot Error: " + e);
    }
}
