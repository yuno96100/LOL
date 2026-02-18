/*
 * 🏰 소환사의 협곡 Bot - FINAL CORRECTED VERSION
 * - UI 복구: 메인 메뉴 프로필 제거, 네비게이션 바([이전|취소|메뉴]) 복구
 * - 버그 수정: 메뉴 무한 리젠 해결, 관리자 문구 수정
 * - DB: FileStream 적용 (데이터 증발 방지)
 */

// ━━━━━━━━ [1. 설정 및 인프라] ━━━━━━━━
var Config = {
    Version: "v1.0.8 UI_Fix",
    AdminRoom: "소환사의협곡관리", 
    BotName: "소환사의 협곡",
    DB_PATH: "sdcard/msgbot/Bots/main/database.json",
    SESSION_PATH: "sdcard/msgbot/Bots/main/sessions.json",
    LINE_CHAR: "━",
    FIXED_LINE: 14,
    TIMEOUT_MS: 300000 // 5분
};

var MAX_LEVEL = 30;

var Utils = {
    getFixedDivider: function() { 
        return Array(Config.FIXED_LINE + 1).join(Config.LINE_CHAR); 
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
        return { name: "아이언", icon: "⚫" }; // 원본에 맞춰 아이언 기본값
    }
};

// ━━━━━━━━ [2. 데이터베이스] ━━━━━━━━
var Database = {
    data: {},
    inquiries: [],
    
    load: function() {
        var content = FileStream.read(Config.DB_PATH);
        if (content) {
            try {
                var d = JSON.parse(content);
                this.data = d.users || {};
                this.inquiries = d.inquiries || [];
            } catch (e) {
                this.data = {}; this.inquiries = [];
            }
        } else {
            this.data = {}; this.inquiries = [];
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
            inventory: { titles: ["뉴비"], characters: [] },
            banned: false
        };
        this.save();
    }
};

var SessionManager = {
    sessions: {},
    get: function(sender, room) {
        if (!this.sessions[sender]) {
            this.sessions[sender] = { screen: "IDLE", temp: {}, lastTime: Date.now() };
        }
        var s = this.sessions[sender];
        var now = Date.now();
        if (s.screen !== "IDLE" && (now - s.lastTime > Config.TIMEOUT_MS)) {
            this.reset(sender);
            return { screen: "TIMEOUT", temp: {} }; 
        }
        s.lastTime = now;
        return s;
    },
    reset: function(sender) {
        this.sessions[sender] = { screen: "IDLE", temp: {}, lastTime: Date.now() };
    }
};

// ━━━━━━━━ [3. 콘텐츠 매니저] ━━━━━━━━
var ContentManager = {
    menus: {
        guest: ["1. 회원가입", "2. 로그인", "3. 운영진 문의"],
        main: [
            "1. 프로필 조회", 
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
        adminMain: ["1. 시스템 정보", "2. 전체 유저", "3. 문의 관리"],
        adminUser: ["1. 정보 수정", "2. 데이터 초기화", "3. 계정 삭제", "4. 차단/해제"],
        adminEdit: ["1. 골드 수정", "2. LP 수정", "3. 레벨 수정"]
    },
    msg: {
        welcome: "소환사의 협곡에 오신 것을 환영합니다.\n원하시는 기능을 선택해 주세요.", // 스크린샷 반영
        inputID: "사용하실 아이디를 입력해 주세요. (최대 10자)",
        inputPW: "사용하실 비밀번호를 입력해 주세요.",
        registerComplete: "가입이 완료되었습니다! 자동 로그인됩니다.",
        loginFail: "정보가 일치하지 않습니다.",
        notEnoughGold: "골드가 부족합니다.",
        onlyNumber: "숫자만 입력해 주세요.",
        banned: "🚫 관리자에 의해 이용이 제한된 계정입니다.",
        battlePrep: "⚔️ 대전 모드는 현재 준비 중입니다."
    },
    champions: ["알리스타", "말파이트", "레오나", "가렌", "다리우스", "잭스", "제드", "카타리나", "탈론", "럭스", "아리", "빅토르", "애쉬", "베인", "카이사", "소라카", "유미", "쓰레쉬"]
};

// ━━━━━━━━ [4. 레이아웃 매니저 (디자인 수정됨)] ━━━━━━━━
var LayoutManager = {
    // [수정] 네비게이션 바 자동 추가 로직 (2.txt 스타일 복구)
    renderFrame: function(title, content, showNav) {
        var div = Utils.getFixedDivider();
        var nav = "";
        
        // showNav가 true이거나 배열일 경우 네비게이션 추가
        if (showNav === true) {
            nav = "\n" + div + "\n[ ◀이전 | ✖취소 | 🏠메뉴 ]"; // 원본 네비게이션 복구
        } else if (Array.isArray(showNav)) {
            nav = "\n" + div + "\n[ " + showNav.join(" | ") + " ]";
        }

        return "『 " + title + " 』\n" + div + "\n" + content + nav;
    },

    renderProfileHead: function(data, targetName) {
        var div = Utils.getFixedDivider();
        var tier = Utils.getTierInfo(data.lp);
        var win = data.win || 0, lose = data.lose || 0, total = win + lose;
        var winRate = total === 0 ? 0 : Math.floor((win / total) * 100);
        var st = data.stats;
        var expDisplay = (data.level >= MAX_LEVEL) ? "MAX" : data.exp + "/" + (data.level * 100);
        var banStatus = data.banned ? " [🚫차단]" : "";

        var lines = [];
        lines.push("👤 대상: " + targetName + banStatus);
        lines.push("🏅 칭호: [" + data.title + "]");
        lines.push(div);
        lines.push("🏅 티어: " + tier.icon + tier.name + " (" + data.lp + ")");
        lines.push("💰 골드: " + (data.gold || 0).toLocaleString() + " G");
        lines.push("⚔️ 전적: " + win + "승 " + lose + "패 (" + winRate + "%)");
        lines.push("🆙 레벨: Lv." + data.level);
        lines.push("🔷 경험: (" + expDisplay + ")");
        lines.push(div);
        lines.push(" [ 상세 능력치 ]");
        lines.push("🎯 정확: " + st.acc);
        lines.push("⚡ 반응: " + st.ref);
        lines.push("🧘 침착: " + st.com);
        lines.push("🧠 직관: " + st.int);
        lines.push(div);
        lines.push("✨ 포인트: " + (data.point || 0) + " P");
        
        return lines.join("\n");
    },

    templates: {
        menuList: function(subtitle, items) {
            // [수정] subtitle이 비어있으면 제목 없이 목록만 출력 (관리자 메뉴 등)
            if (!subtitle) return " " + items.join("\n ");
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

// ━━━━━━━━ [5. 컨트롤러] ━━━━━━━━

// 5-1. 인증 컨트롤러
var AuthController = {
    handle: function(msg, session, sender, replier) {
        // 게스트 메인
        if (session.screen === "IDLE" || session.screen === "GUEST_MAIN") {
            session.screen = "GUEST_MAIN";
            if (msg === "1") { 
                session.screen = "JOIN_ID";
                return replier.reply(LayoutManager.renderFrame("회원가입", ContentManager.msg.inputID, ["취소"]));
            }
            if (msg === "2") { 
                session.screen = "LOGIN_ID";
                return replier.reply(LayoutManager.renderFrame("로그인", ContentManager.msg.inputID, ["취소"]));
            }
            if (msg === "3") { 
                session.screen = "GUEST_INQUIRY";
                return replier.reply(LayoutManager.renderFrame("문의 접수", "운영진에게 보낼 내용을 입력하세요.", ["취소"]));
            }
            // 게스트 메뉴 출력
            var body = LayoutManager.templates.menuList("환영합니다", ContentManager.menus.guest);
            return replier.reply(LayoutManager.renderFrame("게스트 모드", body, false)); // 루트 메뉴라 네비 없음
        }

        // 회원가입
        if (session.screen === "JOIN_ID") {
            if (msg.length > 10) return replier.reply("아이디는 10자 이내여야 합니다.");
            if (Database.data[msg]) return replier.reply("이미 존재하는 아이디입니다.");
            session.temp.id = msg;
            session.screen = "JOIN_PW";
            return replier.reply(LayoutManager.renderFrame("비밀번호 설정", ContentManager.msg.inputPW, ["취소"]));
        }
        if (session.screen === "JOIN_PW") {
            Database.createUser(session.temp.id, msg);
            Database.load(); 
            session.data = Database.data[session.temp.id]; 
            session.tempId = session.temp.id; 
            SessionManager.reset(sender); 
            session.data = Database.data[session.temp.id]; 
            return replier.reply(ContentManager.msg.registerComplete);
        }

        // 로그인
        if (session.screen === "LOGIN_ID") {
            if (!Database.data[msg]) return replier.reply("존재하지 않는 아이디입니다.");
            session.temp.id = msg;
            session.screen = "LOGIN_PW";
            return replier.reply(LayoutManager.renderFrame("로그인", ContentManager.msg.inputPW, ["취소"]));
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
        
        if (session.screen === "GUEST_INQUIRY") {
            Database.inquiries.push({ sender: "비회원", content: msg, time: new Date().toLocaleString(), read: false });
            Database.save();
            SessionManager.reset(sender);
            return replier.reply("문의가 접수되었습니다.");
        }
    }
};

// 5-2. 유저 컨트롤러
var UserController = {
    handle: function(msg, session, sender, replier) {
        var data = session.data; 
        if (!data) return AuthController.handle(msg, session, sender, replier);
        if (data.banned) return replier.reply(ContentManager.msg.banned);

        // [수정] 메인 메뉴 로직 개선 (무한 루프 방지)
        // 화면이 MAIN 상태일 때는 1~6번 명령어만 받아들여야 함
        if (session.screen === "MAIN" || msg === "메뉴") {
            // "메뉴"라고 쳤거나, 다른 곳에서 메인으로 넘어온 경우만 출력
            if (msg === "메뉴" || session.screen !== "MAIN") {
                session.screen = "MAIN";
                // [수정] 메인 메뉴에서 프로필(Head) 제거, 목록만 출력
                var body = LayoutManager.templates.menuList(null, ContentManager.menus.main);
                return replier.reply(LayoutManager.renderFrame("메인 로비", body, false));
            }
        }

        // 1. 프로필
        if (session.screen === "MAIN" && msg === "1") {
            session.screen = "STAT_SELECT";
            var head = LayoutManager.renderProfileHead(data, session.tempId);
            var body = LayoutManager.templates.menuList("강화할 능력치 선택", ContentManager.menus.stats);
            // [수정] 네비게이션 true (이전|취소|메뉴 표시)
            return replier.reply(LayoutManager.renderFrame("내 정보", head + "\n" + Utils.getFixedDivider() + "\n" + body, true));
        }
        if (session.screen === "STAT_SELECT") {
            var statMap = { "1": "acc", "2": "ref", "3": "com", "4": "int" };
            var nameMap = { "1": "정확", "2": "반응", "3": "침착", "4": "직관" };
            if (statMap[msg]) {
                session.temp.statKey = statMap[msg];
                session.temp.statName = nameMap[msg];
                session.screen = "STAT_INPUT";
                var body = LayoutManager.templates.inputRequest(session.temp.statName + " 강화", data.stats[session.temp.statKey], "보유 포인트: " + data.point + " P");
                return replier.reply(LayoutManager.renderFrame("강화 진행", body, true));
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

        // 2. 컬렉션
        if (session.screen === "MAIN" && msg === "2") {
            session.screen = "COLLECTION_MAIN";
            var stats = "👑 현재 칭호: [" + data.title + "]\n📊 챔피언 수집: " + (data.inventory.characters ? data.inventory.characters.length : 0) + "명";
            var body = LayoutManager.templates.menuList("컬렉션", ["1. 보유 칭호", "2. 보유 챔피언"]);
            return replier.reply(LayoutManager.renderFrame("컬렉션", stats + "\n\n" + body, true));
        }
        if (session.screen === "COLLECTION_MAIN") {
             if (msg === "1") {
                 session.screen = "TITLE_EQUIP";
                 var list = data.inventory.titles.map(function(t, i) { return (i+1) + ". " + t + (t === data.title ? " [장착중]" : ""); }).join("\n");
                 return replier.reply(LayoutManager.renderFrame("칭호 관리", LayoutManager.templates.list("보유 목록", [list]) + "\n\n장착할 칭호 이름을 정확히 입력하세요.", true));
             }
             if (msg === "2") {
                 var list = (data.inventory.characters && data.inventory.characters.length > 0) ? data.inventory.characters.join("\n") : "없음";
                 return replier.reply(LayoutManager.renderFrame("챔피언 관리", LayoutManager.templates.list("보유 목록", [list]), true));
             }
        }
        if (session.screen === "TITLE_EQUIP") {
            if (data.inventory.titles.indexOf(msg) === -1) return replier.reply("보유하지 않은 칭호입니다.");
            data.title = msg;
            Database.save();
            session.screen = "COLLECTION_MAIN";
            return replier.reply(LayoutManager.renderFrame("장착 완료", LayoutManager.templates.result("알림", "[" + msg + "] 칭호를 장착했습니다."), true));
        }

        // 3. 대전 모드
        if (session.screen === "MAIN" && msg === "3") {
            return replier.reply(LayoutManager.renderFrame("대전 모드", ContentManager.msg.battlePrep, true));
        }

        // 4. 상점
        if (session.screen === "MAIN" && msg === "4") {
            session.screen = "SHOP_BUY";
            var head = LayoutManager.renderProfileHead(data, session.tempId);
            var body = LayoutManager.templates.menuList("판매 목록", ContentManager.menus.shop);
            return replier.reply(LayoutManager.renderFrame("아이템 상점", head + "\n" + Utils.getFixedDivider() + "\n" + body + "\n\n구매할 번호를 입력하세요.", true));
        }
        if (session.screen === "SHOP_BUY") {
            var price = 0, itemName = "", action = "";
            if (msg === "1") { price = 1000; itemName = "티어 승급권"; action = "tier"; }
            else if (msg === "2") { price = 500; itemName = "닉네임 변경권"; action = "name"; }
            else if (msg === "3") { price = 2000; itemName = "전적 초기화권"; action = "reset_score"; }
            else if (msg === "4") { price = 1500; itemName = "스탯 초기화권"; action = "reset_stat"; }
            else if (msg === "5") { price = 300; itemName = "랜덤 박스"; action = "random"; }
            
            if (price > 0) {
                if (data.gold < price) return replier.reply(ContentManager.msg.notEnoughGold);
                data.gold -= price;
                
                var resultText = itemName + " 구매 완료!";
                if (action === "tier") { data.lp += 100; resultText += "\n(LP +100)"; }
                else if (action === "name") { data.gold += price; resultText = "관리자 문의 필요 (골드 반환)"; }
                else if (action === "reset_score") { data.win = 0; data.lose = 0; resultText += "\n(전적 초기화)"; }
                else if (action === "reset_stat") { data.stats = { acc: 10, ref: 10, com: 10, int: 10 }; resultText += "\n(스탯 초기화)"; }
                else if (action === "random") {
                    var r = Math.floor(Math.random() * 10);
                    if (r < 3) { data.gold += 1000; resultText += "\n(대박! 1000골드 획득)"; } 
                    else { data.point += 100; resultText += "\n(100포인트 획득)"; }
                }

                Database.save();
                return replier.reply(LayoutManager.renderFrame("구매 성공", LayoutManager.templates.result("상점 이용", resultText + "\n남은 골드: " + data.gold + " G"), true));
            }
        }

        // 5. 문의
        if (session.screen === "MAIN" && msg === "5") {
            session.screen = "USER_INQUIRY";
            return replier.reply(LayoutManager.renderFrame("문의 접수", "운영진에게 보낼 내용을 입력하세요.", true));
        }
        if (session.screen === "USER_INQUIRY") {
            Database.inquiries.push({ sender: session.tempId, content: msg, time: new Date().toLocaleString(), read: false });
            Database.save();
            session.screen = "MAIN";
            return replier.reply("문의가 접수되었습니다.");
        }
        
        // 6. 로그아웃
        if (session.screen === "MAIN" && msg === "6") {
            SessionManager.reset(sender);
            return replier.reply("로그아웃 되었습니다.");
        }
    }
};

// 5-3. 관리자 컨트롤러
var AdminController = {
    handle: function(msg, session, sender, replier) {
        if (session.screen === "IDLE" || msg === "메뉴") {
            session.screen = "ADMIN_MAIN";
            // [수정] 관리자 메뉴 제목 제거 (스크린샷 반영)
            var body = LayoutManager.templates.menuList(null, ContentManager.menus.adminMain);
            return replier.reply(LayoutManager.renderFrame("관리 센터", body, false));
        }

        if (session.screen === "ADMIN_MAIN" && msg === "1") {
            var rt = java.lang.Runtime.getRuntime();
            var used = Math.floor((rt.totalMemory() - rt.freeMemory()) / 1024 / 1024);
            var info = "📟 메모리: " + used + "MB 사용중\n👥 유저 수: " + Object.keys(Database.data).length + "명\n🛡️ 버전: " + Config.Version;
            return replier.reply(LayoutManager.renderFrame("시스템 정보", info, true));
        }

        if (session.screen === "ADMIN_MAIN" && msg === "2") {
            session.screen = "ADMIN_SEARCH";
            var userList = Object.keys(Database.data);
            var listText = userList.length > 0 ? userList.join(", ") : "등록된 유저가 없습니다.";
            if(listText.length > 50) listText = "유저가 많습니다. 검색을 이용하세요.";
            
            return replier.reply(LayoutManager.renderFrame("유저 목록", "등록된 유저:\n" + listText + "\n\n" + ContentManager.msg.adminSearch, true));
        }

        if (session.screen === "ADMIN_MAIN" && msg === "3") {
            var list = Database.inquiries.map(function(iq, i) { return (i+1) + ". " + iq.sender + ": " + iq.content; }).join("\n");
            return replier.reply(LayoutManager.renderFrame("문의 목록", list || "문의가 없습니다.", true));
        }

        if (session.screen === "ADMIN_SEARCH") {
            if (!Database.data[msg]) return replier.reply(ContentManager.msg.noData);
            session.temp.targetUser = msg;
            session.screen = "ADMIN_USER_DETAIL";
            var targetData = Database.data[msg];
            var head = LayoutManager.renderProfileHead(targetData, msg);
            var body = LayoutManager.templates.menuList(null, ContentManager.menus.adminUser);
            // [수정] "두유노 관리" 처럼 유저명+관리 제목
            return replier.reply(LayoutManager.renderFrame(msg + " 관리", head + "\n" + Utils.getFixedDivider() + "\n" + body, true));
        }

        if (session.screen === "ADMIN_USER_DETAIL") {
            var tData = Database.data[session.temp.targetUser];
            if (msg === "1") { 
                session.screen = "ADMIN_EDIT_SELECT";
                // [수정] 제목 "정보 수정"
                return replier.reply(LayoutManager.renderFrame("정보 수정", LayoutManager.templates.menuList(null, ContentManager.menus.adminEdit), true));
            }
            if (msg === "2") {
                tData.win = 0; tData.lose = 0; tData.lp = 0;
                Database.save();
                return replier.reply("데이터가 초기화되었습니다.");
            }
            if (msg === "3") {
                delete Database.data[session.temp.targetUser];
                Database.save();
                session.screen = "ADMIN_MAIN";
                return replier.reply("계정이 삭제되었습니다.");
            }
            if (msg === "4") {
                 tData.banned = !tData.banned;
                 Database.save();
                 return replier.reply("차단 상태가 변경되었습니다.");
            }
        }

        if (session.screen === "ADMIN_EDIT_SELECT") {
            var typeMap = { "1": "gold", "2": "lp", "3": "level" };
            if (typeMap[msg]) {
                session.temp.editType = typeMap[msg];
                session.screen = "ADMIN_EDIT_INPUT";
                return replier.reply(LayoutManager.renderFrame("값 수정", "새로운 값을 입력하세요.", true));
            }
        }
        if (session.screen === "ADMIN_EDIT_INPUT") {
             var val = parseInt(msg);
             if(!isNaN(val)) {
                 Database.data[session.temp.targetUser][session.temp.editType] = val;
                 Database.save();
                 session.screen = "ADMIN_USER_DETAIL";
                 var targetData = Database.data[session.temp.targetUser];
                 var head = LayoutManager.renderProfileHead(targetData, session.temp.targetUser);
                 var body = LayoutManager.templates.menuList(null, ContentManager.menus.adminUser);
                 return replier.reply(LayoutManager.renderFrame("수정 완료", head + "\n" + Utils.getFixedDivider() + "\n" + body, true));
             }
        }
    }
};

// ━━━━━━━━ [6. 메인 라우터] ━━━━━━━━
function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    try {
        Database.load(); // 매번 로드하여 데이터 증발 방지
        var realMsg = msg.trim();
        var session = SessionManager.get(sender, room, replier);

        if (session.screen === "TIMEOUT") {
            replier.reply("⌛ 세션이 만료되었습니다. '메뉴'를 입력해 다시 시작하세요.");
            SessionManager.reset(sender);
            return;
        }

        // 공통 네비게이션
        if (realMsg === "취소" || realMsg === "메뉴") {
            // [수정] 로그인 상태면 메인으로, 비로그인이면 IDLE로
            if (session.data) session.screen = "MAIN"; 
            else SessionManager.reset(sender); 
            
            if (room === Config.AdminRoom) return AdminController.handle("메뉴", session, sender, replier);
            if (session.data) return UserController.handle("메뉴", session, sender, replier);
            return AuthController.handle("메뉴", session, sender, replier);
        }
        
        // 이전 버튼 기능
        if (realMsg === "이전") {
             if (room === Config.AdminRoom) return AdminController.handle("메뉴", session, sender, replier);
             if (session.data) return UserController.handle("메뉴", session, sender, replier);
             return AuthController.handle("메뉴", session, sender, replier);
        }

        if (room === Config.AdminRoom) return AdminController.handle(realMsg, session, sender, replier);
        
        if (!session.data) return AuthController.handle(realMsg, session, sender, replier);
        return UserController.handle(realMsg, session, sender, replier);

    } catch (e) {
        replier.reply("⛔ 에러: " + e);
    }
}
