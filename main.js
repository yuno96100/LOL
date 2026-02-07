// ━━━━━━━━ [1. 설정 및 상수] ━━━━━━━━
/**
 * [main.js] v8.9.50
 * 1. 네비게이션 바 위치 수정: NAV_LEFT 공백을 4칸으로 줄여 왼쪽으로 한 칸 이동.
 * 2. 섹션 그룹 전체 풀버전 출력 및 세부 로직 주석 적용.
 */

// 시스템 운영에 필요한 핵심 설정값과 게임 데이터를 정의하는 구역입니다.
var Config = {
    Prefix: ".",                // 명령어 앞머리 기호 (추후 확장용)
    AdminHash: "2056407147",    // 관리자 본인임을 식별하기 위한 고유 해시값
    AdminRoom: "소환사의협곡관리", // 관리용 기능이 작동하는 전용 방 이름
    GroupRoom: "소환사의협곡",     // 일반 유저들이 활동하는 단체 채팅방 이름
    BotName: "소환사의 협곡",     // 메인 UI 상단 등에 표시될 봇의 이름
    DB_PATH: "/sdcard/msgbot/Bots/main/database.json",     // 유저 계정 정보가 저장된 파일 경로
    SESSION_PATH: "/sdcard/msgbot/Bots/main/sessions.json", // 유저들의 현재 화면 위치 정보를 담은 파일 경로
    LINE_CHAR: "━",             // UI 상하단을 구분 짓는 선 문자
    FIXED_LINE: 17,             // 구분선의 길이를 결정하는 고정 숫자
    // ★ 네비게이션 바 레이아웃: 공백을 4칸으로 줄여 한 칸 더 왼쪽으로 이동시켰습니다.
    NAV_LEFT: "    ",          
    NAV_RIGHT: " ",
    // 하단 공통 버튼 리스트 (이전 화면 이동, 동작 취소, 메인 메뉴 복귀)
    NAV_ITEMS: ["⬅️ 이전", "❌ 취소", "🏠 메뉴"] 
};

// UI 레이아웃 생성을 위한 공통 계산 유틸리티 모음입니다.
var Utils = {
    // 설정된 FIXED_LINE(17) 개수만큼 구분선 문자열("━")을 반복 생성하여 반환함
    getFixedDivider: function() { 
        return Array(Config.FIXED_LINE + 1).join(Config.LINE_CHAR); 
    },
    // 네비게이션 바 구성 요소 사이에 일정한 간격(공백 6칸)을 두어 문자열로 합침
    getNav: function() { 
        return Config.NAV_LEFT + Config.NAV_ITEMS.join("      ") + Config.NAV_RIGHT; 
    }
};

// 유저의 LP 점수에 따라 자동으로 부여될 티어 정보 리스트입니다.
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

// 상점에서 판매할 역할군 카테고리와 각 카테고리에 속한 유닛들입니다.
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
// 상점 메뉴 호출 시 번호 매기기를 위해 키값(탱커, 전사 등)만 배열로 추출함
var RoleKeys = Object.keys(SystemData.roles);

// 입력받은 유저의 현재 LP를 티어 데이터와 대조하여 티어 이름과 아이콘을 반환함
function getTierInfo(lp) {
    lp = lp || 0; // 점수 데이터가 없는 경우를 대비해 0으로 기본값 설정
    for (var i = 0; i < TierData.length; i++) {
        // 현재 점수가 티어 구간의 최소 요구 점수 이상인 첫 번째 항목을 찾음
        if (lp >= TierData[i].minLp) return { name: TierData[i].name, icon: TierData[i].icon };
    }
    // 해당하는 티어가 없는 경우 아이언 반환
    return { name: "아이언", icon: "⚫" };
}

// ━━━━━━━━ [2. 모듈: UI 엔진] ━━━━━━━━
/**
 * [main.js] v8.9.56
 * 1. UI 구조 복구: 조건부 여백 로직을 제거하고 표준 레이아웃으로 회귀.
 * 2. 주석 표준화: 매번 변하지 않는 일관된 주석 설명 적용.
 */

var UI = {
    // 기본 상자 형태의 UI를 생성합니다. (제목, 내용, 도움말)
    make: function(title, content, help) {
        var div = Utils.getFixedDivider();
        var res = "『 " + title + " 』\n" + div + "\n" + content + "\n" + div + "\n";
        
        // 하단 도움말이 있을 경우에만 섹션 추가
        if (help) {
            res += "💡 " + help + "\n" + div + "\n";
        }
        
        return res + Utils.getNav();
    },

    // 유저의 전적, 자산 등을 포함한 프로필 UI를 생성합니다.
    renderProfile: function(id, data, help, content) {
        var lp = data.lp || 0;
        var tier = getTierInfo(lp);
        var win = data.win || 0, lose = data.lose || 0, total = win + lose;
        var winRate = total === 0 ? 0 : Math.floor((win / total) * 100);
        
        var s1 = "👤 계정: " + id + "\n🏅 칭호: [" + data.title + "]";
        var s2 = "🏆 티어: " + tier.icon + " " + tier.name + " (" + lp + " LP)\n💰 골드: " + (data.gold || 0).toLocaleString() + " G\n⚔️ 전적: " + win + "승 " + lose + "패 (" + winRate + "%)";
        
        var div = Utils.getFixedDivider();
        var res = "『 " + id + " 』\n" + div + "\n" + s1 + "\n" + div + "\n" + s2 + "\n" + div + "\n";
        
        if (content) res += content + "\n" + div + "\n"; 
        if (help) res += "💡 " + help + "\n" + div + "\n";
        
        return res + Utils.getNav();
    },

    // 화면 상태(Screen)를 이동시키고 이전 기록을 히스토리에 저장합니다.
    go: function(session, screen, title, content, help) {
        if (session.screen && session.screen !== screen && session.screen !== "IDLE") {
            if (!session.history) session.history = [];
            session.history.push({ screen: session.screen, title: session.lastTitle });
        }
        session.screen = screen;
        session.lastTitle = title;
        
        // 프로필 및 상세 정보 화면 판별
        if (screen.indexOf("PROFILE") !== -1 || screen.indexOf("DETAIL") !== -1) {
            var tid = session.targetUser || session.tempId;
            var td = (session.targetUser) ? Database.data[session.targetUser] : session.data;
            return UI.renderProfile(tid, td, help, content);
        }
        return this.make(title, content, help);
    },

    // 유저 권한과 현재 방 타입에 맞는 초기 메뉴를 반환합니다.
    renderMenu: function(session) {
        session.history = [];
        
        if (session.type === "ADMIN") return this.go(session, "ADMIN_MAIN", "관리자 메뉴", "1. 시스템 정보\n2. 유저 관리", "번호를 입력하세요.");
        
        if (session.type === "GROUP") {
            if (!session.data) {
                session.screen = "IDLE"; 
                return UI.make("알림", "개인톡에서 로그인을 해주세요.", "보안이 필요합니다."); 
            }
            return this.go(session, "GROUP_MAIN", "단톡방 메뉴", "1. 내 정보 확인", "번호를 입력하세요.");
        }
        
        if (!session.data) return this.go(session, "GUEST_MAIN", "환영합니다", "1. 회원가입\n2. 로그인", "번호를 선택하세요.");
        
        return this.go(session, "USER_MAIN", "메인 메뉴", "1. 프로필\n2. 컬렉션\n3. 상점\n4. 로그아웃", "작업 번호를 입력하세요.");
    }
};
// ━━━━━━━━ [3. DB 및 세션 매니저] ━━━━━━━━
var Database = {
    data: {},
    // 파일에서 DB 로드 (파일이 없으면 빈 객체 반환)
    load: function() { try { return JSON.parse(FileStream.read(Config.DB_PATH)); } catch(e) { return {}; } },
    // DB 내용을 파일로 영구 저장
    save: function(d) { this.data = d; FileStream.write(Config.DB_PATH, JSON.stringify(d, null, 4)); },
    // 신규 가입 시 부여할 초기값 템플릿
    getInitData: function(pw) { return { pw: pw, gold: 1000, level: 1, lp: 0, win: 0, lose: 0, title: "뉴비", collection: { titles: ["뉴비"], characters: [] } }; }
};

var SessionManager = {
    sessions: {},
    // 세션 상태 로드
    load: function() { try { this.sessions = JSON.parse(FileStream.read(Config.SESSION_PATH)); } catch(e) { this.sessions = {}; } },
    // 세션 상태 저장
    save: function() { FileStream.write(Config.SESSION_PATH, JSON.stringify(this.sessions)); },
    // 유저의 세션 정보를 가져오거나 없으면 새로 생성함
    get: function(r, h, g) {
        if (!this.sessions[h]) this.sessions[h] = { data: null, screen: "IDLE", history: [], lastTitle: "메뉴", tempId: null, userListCache: [], targetUser: null, editType: null };
        var s = this.sessions[h];
        // 현재 방의 타입에 따라 세션 성격 결정
        if (r === Config.AdminRoom) s.type = "ADMIN";
        else if (g && r === Config.GroupRoom) s.type = "GROUP";
        else s.type = "DIRECT";
        return s;
    },
    // 세션 상태 강제 초기화 (메뉴/취소 시 사용)
    reset: function(session) { session.screen = "IDLE"; session.history = []; session.userListCache = []; session.targetUser = null; session.editType = null; },
    // 특정 아이디의 모든 세션을 끊어버림 (로그아웃/삭제 시)
    forceLogout: function(userId) {
        if (!userId) return;
        for (var key in this.sessions) { 
            if (this.sessions[key].tempId === userId) { 
                this.sessions[key].data = null; 
                this.sessions[key].tempId = null; 
                this.sessions[key].screen = "IDLE"; 
                this.sessions[key].history = []; 
            } 
        }
        this.save();
    }
};

// ━━━━━━━━ [4. 매니저: 관리자 시스템] ━━━━━━━━
var AdminManager = {
    handle: function(msg, session, replier, startTime) {
        // [이전] 입력 시 단계별 뒤로 가기
        if (msg.indexOf("이전") !== -1) {
            if (session.screen === "ADMIN_USER_LIST") return replier.reply(UI.renderMenu(session));
            if (session.screen === "ADMIN_USER_DETAIL") { session.screen = "ADMIN_MAIN"; return this.handle("2", session, replier, startTime); }
            if (session.history && session.history.length > 0) { var p = session.history.pop(); session.screen = p.screen; return replier.reply(UI.renderMenu(session)); }
        }
        switch(session.screen) {
            case "ADMIN_MAIN":
                if (msg === "1") { // 시스템 리소스 조회 로직
                    var rt = java.lang.Runtime.getRuntime();
                    var used = Math.floor((rt.totalMemory() - rt.freeMemory()) / 1024 / 1024);
                    replier.reply(UI.make("시스템 정보", "⚡ 속도: " + (new Date().getTime() - startTime) + "ms\n📟 RAM: " + used + " MB\n👥 총원: " + Object.keys(Database.data).length + "명", "시스템 모니터링"));
                } else if (msg === "2") { // 유저 목록 캐싱 및 표시
                    session.userListCache = Object.keys(Database.data);
                    replier.reply(UI.go(session, "ADMIN_USER_LIST", "유저 관리", session.userListCache.map(function(id, i){ return (i+1)+". "+id; }).join("\n"), "조회할 번호 입력"));
                }
                break;
            case "ADMIN_USER_LIST": // 번호로 관리할 유저 선택
                var idx = parseInt(msg) - 1;
                if (session.userListCache[idx]) {
                    session.targetUser = session.userListCache[idx];
                    replier.reply(UI.go(session, "ADMIN_USER_DETAIL", session.targetUser, "1. 정보 수정\n2. 데이터 초기화\n3. 계정 삭제", "기능 번호 선택"));
                }
                break;
            case "ADMIN_USER_DETAIL": // 기능 분기
                if (msg === "1") replier.reply(UI.go(session, "ADMIN_EDIT_SELECT", "수정 항목", "1. 골드\n2. LP\n3. 레벨", "항목 선택"));
                else if (msg === "2") replier.reply(UI.go(session, "ADMIN_RESET_CONFIRM", "초기화", "[확인] 입력 시 리셋", "경고: 복구 불가"));
                else if (msg === "3") replier.reply(UI.go(session, "ADMIN_DELETE_CONFIRM", "삭제", "[삭제확인] 입력 시 삭제", "경고: 영구 삭제"));
                break;
            case "ADMIN_RESET_CONFIRM": // 초기화 최종 실행
                if (msg === "확인") {
                    var pw = Database.data[session.targetUser].pw;
                    Database.data[session.targetUser] = Database.getInitData(pw); Database.save(Database.data);
                    replier.reply(UI.make("완료", "데이터 초기화가\n성공하였습니다.", "시스템 동기화"));
                }
                break;
            case "ADMIN_DELETE_CONFIRM": // 계정 삭제 실행
                if (msg === "삭제확인") {
                    delete Database.data[session.targetUser]; Database.save(Database.data);
                    SessionManager.forceLogout(session.targetUser);
                    replier.reply(UI.make("완료", "해당 계정이\n영구 삭제되었습니다.", "DB 업데이트"));
                }
                break;
            case "ADMIN_EDIT_SELECT": // 수정할 데이터 필드 선택
                var types = ["gold", "lp", "level"], tIdx = parseInt(msg) - 1;
                if (types[tIdx]) { session.editType = types[tIdx]; replier.reply(UI.go(session, "ADMIN_EDIT_INPUT", "값 수정", "대상 유저: " + session.targetUser + "\n현재 값: " + Database.data[session.targetUser][session.editType], "새로운 숫자 입력")); }
                break;
            case "ADMIN_EDIT_INPUT": // 실제 숫자값 입력 및 반영
                var val = parseInt(msg);
                if (!isNaN(val)) { Database.data[session.targetUser][session.editType] = val; Database.save(Database.data); replier.reply(UI.make("완료", "수정 사항이\n반영되었습니다.", "데이터 적용 완료")); }
                break;
        }
    }
};

// ━━━━━━━━ [5. 매니저: 개인톡(DIRECT) 시스템] ━━━━━━━━
var UserManager = {
    handle: function(msg, session, replier) {
        var d = session.data;
        // [비인증 상태] 가입 및 로그인 로직
        if (!d) {
            switch(session.screen) {
                case "GUEST_MAIN": 
                    if (msg === "1") replier.reply(UI.go(session, "JOIN_ID", "회원가입", "아이디를\n입력해주세요.", "가입 대기 중")); 
                    else if (msg === "2") replier.reply(UI.go(session, "LOGIN_ID", "인증", "아이디를\n입력해주세요.", "보안 인증")); 
                    break;
                case "JOIN_ID": // ID 중복 체크
                    if (Database.data[msg]) return replier.reply(UI.make("오류", "이미 가입된\n아이디입니다.", "다른 아이디 입력")); 
                    session.tempId = msg; replier.reply(UI.go(session, "JOIN_PW", "회원가입", "비밀번호를\n설정해주세요.", "설정 중...")); 
                    break;
                case "JOIN_PW": // DB 저장 및 관리방 알림 전송
                    Database.data[session.tempId] = Database.getInitData(msg); 
                    Database.save(Database.data); 
                    session.data = Database.data[session.tempId];
                    var joinNotice = UI.make("신규 유저", "유저 [" + session.tempId + "]\n회원가입 완료!", "협곡에 오신걸 환영합니다");
                    Api.replyRoom(Config.AdminRoom, joinNotice);
                    replier.reply(UI.renderMenu(session)); 
                    break;
                case "LOGIN_ID": 
                    session.tempId = msg; replier.reply(UI.go(session, "LOGIN_PW", "인증", "비밀번호를\n입력해주세요.", "인증 중...")); 
                    break;
                case "LOGIN_PW": // 패스워드 검증
                    if (Database.data[session.tempId] && Database.data[session.tempId].pw === msg) { 
                        session.data = Database.data[session.tempId]; replier.reply(UI.renderMenu(session)); 
                    } else replier.reply(UI.make("오류", "정보가\n일치하지 않습니다.", "인증 실패")); 
                    break;
            }
        } 
        // [인증 완료 상태] 상점, 컬렉션, 프로필 로직
        else {
            if (msg.indexOf("이전") !== -1) {
                // 이전 버튼 누를 시 현재 화면 위치에 따라 최적화된 뒤로가기 실행
                if (session.screen === "SHOP_ROLES") return this.handle("3", {data:d, screen:"USER_MAIN", history:[]}, replier);
                if (session.screen === "SHOP_BUY_ACTION") return this.handle("1", {data:d, screen:"SHOP_MAIN", history:[]}, replier);
                if (session.screen === "COL_TITLE_ACTION" || session.screen === "COL_CHAR_VIEW") return this.handle("2", {data:d, screen:"USER_MAIN", history:[]}, replier);
                if (session.history && session.history.length > 0) { var p = session.history.pop(); session.screen = p.screen; return replier.reply(UI.renderMenu(session)); }
                return replier.reply(UI.renderMenu(session));
            }
            switch(session.screen) {
                case "USER_MAIN":
                    if (msg === "1") replier.reply(UI.go(session, "PROFILE_VIEW", session.tempId, "", "내 정보 조회"));
                    else if (msg === "2") replier.reply(UI.go(session, "COL_MAIN", "컬렉션", "1. 칭호 장착\n2. 보유 캐릭터", "나의 수집함"));
                    else if (msg === "3") replier.reply(UI.go(session, "SHOP_MAIN", "상점", "1. 캐릭터 구매", "구매 대기 중"));
                    else if (msg === "4") { SessionManager.forceLogout(session.tempId); replier.reply(UI.make("알림", "로그아웃이\n완료되었습니다.", "시스템 종료")); }
                    break;
                case "SHOP_MAIN": 
                    if (msg === "1") replier.reply(UI.go(session, "SHOP_ROLES", "상점 카테고리", RoleKeys.map(function(r, i){ return (i+1)+". "+r; }).join("\n"), "카테고리 선택")); 
                    break;
                case "SHOP_ROLES": // 카테고리에 맞는 유닛 목록 출력 및 보유 여부 확인
                    var rIdx = parseInt(msg) - 1;
                    if (RoleKeys[rIdx]) {
                        session.selectedRole = RoleKeys[rIdx];
                        var uList = SystemData.roles[session.selectedRole].units.map(function(u, i) {
                            var owned = d.collection.characters.indexOf(u) !== -1;
                            return (i+1) + ". " + u + (owned ? " [보유]" : " (500G)");
                        }).join("\n");
                        replier.reply(UI.go(session, "SHOP_BUY_ACTION", session.selectedRole, uList, "구매할 유닛 번호"));
                    }
                    break;
                case "SHOP_BUY_ACTION": // 실제 구매(골드 차감, 인벤토리 추가) 로직
                    var units = SystemData.roles[session.selectedRole].units, uIdx = parseInt(msg) - 1;
                    if (units[uIdx]) {
                        var target = units[uIdx];
                        if (d.collection.characters.indexOf(target) !== -1) replier.reply(UI.make("알림", "이미 보유 중인\n유닛입니다.", "영입 취소"));
                        else if (d.gold < 500) replier.reply(UI.make("알림", "골드가 부족하여\n구매할 수 없습니다.", "잔액 부족"));
                        else { 
                            d.gold -= 500; d.collection.characters.push(target); Database.save(Database.data); 
                            replier.reply(UI.make("성공", target + " 유닛을\n영입 완료했습니다!", "잔액: "+d.gold+"G")); 
                        }
                    }
                    break;
                case "COL_MAIN":
                    if (msg === "1") { // 보유 중인 칭호 목록 렌더링
                        var tList = d.collection.titles.map(function(t, i) { return (i+1) + ". " + (t === d.title ? "✅ " : "") + t; }).join("\n");
                        replier.reply(UI.go(session, "COL_TITLE_ACTION", "칭호 변경", tList, "장착할 번호 선택"));
                    } else if (msg === "2") { // 보유 유닛 리스트 문자열화
                        var cList = d.collection.characters.length > 0 ? d.collection.characters.join("\n") : "보유 유닛이\n없습니다.";
                        replier.reply(UI.go(session, "COL_CHAR_VIEW", "보유 리스트", cList, "전략적 팀원"));
                    }
                    break;
                case "COL_TITLE_ACTION": // 선택한 칭호를 메인 칭호로 변경
                    var tIdx = parseInt(msg) - 1;
                    if (d.collection.titles[tIdx]) { d.title = d.collection.titles[tIdx]; Database.save(Database.data); replier.reply(UI.make("성공", "칭호 변경이\n반영되었습니다.", "프로필 업데이트")); }
                    break;
            }
        }
    }
};

// ━━━━━━━━ [6. 매니저: 단체방(GROUP) 시스템] ━━━━━━━━
var GroupManager = {
    handle: function(msg, session, replier) {
        if (msg.indexOf("이전") !== -1) {
            if (session.history && session.history.length > 0) { var p = session.history.pop(); session.screen = p.screen; return replier.reply(UI.renderMenu(session)); }
            return replier.reply(UI.renderMenu(session));
        }
        switch(session.screen) {
            case "GROUP_MAIN":
                if (msg === "1") replier.reply(UI.go(session, "GROUP_PROFILE", session.tempId, "", "전적 및 상태"));
                break;
        }
    }
};

// ━━━━━━━━ [7. 메인 응답 핸들러] ━━━━━━━━
Database.data = Database.load(); SessionManager.load(); // 봇 시작 시 데이터 불러오기
function response(room, msg, sender, isGroupChat, replier, imageDB) {
    var startTime = new Date().getTime();
    try {
        if (!msg) return;
        // 유저 고유 해시값 추출 및 세션 로드
        var hash = String(imageDB.getProfileHash()), session = SessionManager.get(room, hash, isGroupChat);
        msg = msg.trim();
        
        // [공통] 취소/메뉴 입력 시 즉시 메인 화면으로 리셋
        if (msg.indexOf("취소") !== -1 || msg.indexOf("메뉴") !== -1) { SessionManager.reset(session); return replier.reply(UI.renderMenu(session)); }
        
        // [권한체크] 해시값이 일치하고 관리방인 경우 관리자 핸들러 우선 실행
        if (session.type === "ADMIN" && hash === Config.AdminHash) return AdminManager.handle(msg, session, replier, startTime);
        
        // [데이터연동] 단체방에서 말하는 유저의 개인톡 로그인 세션을 검색하여 연동함
        if (isGroupChat && room === Config.GroupRoom) {
            var found = false;
            for (var k in SessionManager.sessions) {
                if (SessionManager.sessions[k].type === "DIRECT" && SessionManager.sessions[k].tempId === sender) {
                    session.data = SessionManager.sessions[k].data;
                    session.tempId = SessionManager.sessions[k].tempId;
                    found = true; break;
                }
            }
            if (!found) { session.data = null; session.screen = "IDLE"; }
        }

        // [최종실행] 화면이 IDLE(대기)이 아니라면 입력된 메시지를 각 매니저로 전달
        if (session.screen === "IDLE") return;
        if (session.type === "GROUP") GroupManager.handle(msg, session, replier);
        else UserManager.handle(msg, session, replier);
        
        SessionManager.save(); // 변경된 세션 상태 저장
    } catch (e) { 
        // 런타임 오류 발생 시 관리자 방으로 즉시 보고
        Api.replyRoom(Config.AdminRoom, UI.make("시스템 오류", "런타임 에러:\n" + e.message, "v8.9.24")); 
    }
}
