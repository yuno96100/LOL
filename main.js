const libConst = Bridge.getScopeOf("Const.js").bridge();
const DB = Bridge.getScopeOf("DataBase.js").bridge();
const Obj = Bridge.getScopeOf("Object.js").bridge();
const Login = Bridge.getScopeOf("LoginManager.js").bridge();
const Helper = Bridge.getScopeOf("Helper.js").bridge();

// 🚀 병렬 명령어 처리 엔진 (6개 스레드)
const Executor = java.util.concurrent.Executors.newFixedThreadPool(6);

if (!global.sessions) global.sessions = {}; 
if (!global.adminAction) global.adminAction = {}; 

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    // 병렬 스레드에서 실행 시작
    Executor.execute(function() {
        try {
            // [최적화] 오래된 세션 자동 삭제
            cleanOldSessions();

            if (!global.sessions[sender]) {
                global.sessions[sender] = { isMenuOpen: false, data: null, waitAction: null, lastTime: Date.now() };
            }
            let session = global.sessions[sender];

            // [보안] 명령어 쿨타임 (0.5초 도배 방지)
            if (Date.now() - session.lastTime < 500 && !session.waitAction) return;
            session.lastTime = Date.now();

            let isLoggedIn = !!session.data;
            let isMainRoom = (room.trim() === libConst.MainRoomName);
            let isAdminRoom = (room.trim() === libConst.ErrorLogRoom);

            // 1. 대기 입력 처리
            if (session.waitAction) {
                handleWaitAction(sender, msg, replier, session);
                return;
            }

            // 2. 관리자 액션 처리
            if (isAdminRoom && global.adminAction[sender]) {
                handleAdminAction(sender, msg, replier, session);
                return;
            }

            // 3. 메뉴 호출
            if (msg === libConst.Prefix + "메뉴") {
                session.isMenuOpen = true;
                replier.reply(Helper.getMenu(room, isMainRoom, isLoggedIn, null, session.data, DB));
                return;
            }

            // 4. 번호 명령어 실행
            if (!isNaN(msg) && session.isMenuOpen) {
                let cmd = Helper.getRootCmdByNum(room, isAdminRoom, isMainRoom, isLoggedIn, msg.trim());
                if (cmd) executeCommand(cmd, sender, session, isGroupChat, replier, room, isMainRoom, isAdminRoom);
            }

        } catch (e) {
            Api.replyRoom(libConst.ErrorLogRoom, "🚨 메인 엔진 에러: " + e.message);
        }
    });
}

function executeCommand(cmd, sender, session, isGroupChat, replier, room, isMainRoom, isAdminRoom) {
    let isLoggedIn = !!session.data;
    switch (cmd) {
        case "가입":
            if (isGroupChat) return replier.reply("📢 가입은 개인톡에서 가능합니다.");
            replier.reply("📝 사용할 [게임 닉네임]을 입력해주세요.");
            session.waitAction = "가입";
            break;
        case "로그인":
            if (isGroupChat) return replier.reply("📢 로그인은 개인톡에서 가능합니다.");
            replier.reply("🔑 본인의 [카카오톡 닉네임]을 입력해주세요.");
            session.waitAction = "로그인";
            break;
        case "로그아웃":
            session.data = null; session.isMenuOpen = false;
            replier.reply("🚪 로그아웃 되었습니다.");
            break;
        case "내정보":
            replier.reply(Helper.getMenu(room, isMainRoom, isLoggedIn, "내정보", session.data, DB));
            session.isMenuOpen = false;
            break;
        case "유저조회":
            if (isAdminRoom) {
                replier.reply("🔍 상세조회할 카톡 닉네임을 입력하세요.");
                session.waitAction = "상세조회";
            }
            break;
        case "삭제":
        case "초기화":
            if (isAdminRoom) {
                replier.reply("🛠️ " + cmd + "할 카톡 닉네임을 입력하세요.");
                session.waitAction = cmd;
            }
            break;
        default:
            replier.reply(Helper.getMenu(room, isMainRoom, isLoggedIn, cmd, session.data, DB));
            break;
    }
}

function handleWaitAction(sender, msg, replier, session) {
    let action = session.waitAction;
    let input = msg.trim();
    if (input === "취소") { session.waitAction = null; return replier.reply("❌ 취소됨."); }

    if (action === "가입") {
        replier.reply(Login.tryRegister(sender, input, DB, Obj).msg);
    } else if (action === "로그인") {
        let res = Login.tryLogin(input, DB);
        if (res.success) {
            session.data = res.data;
            replier.reply("✅ 로그인 성공! [" + res.data.info.name + "]님 환영합니다.");
        } else replier.reply("🚫 " + res.msg);
    } else if (action === "상세조회") {
        let ud = DB.readUser(input);
        if (!ud) replier.reply("❌ 유저 없음.");
        else replier.reply("👤 [" + ud.info.name + "]\n돈: " + ud.status.money + "G\n카톡ID: " + ud.info.id);
    } else if (action === "삭제" || action === "초기화") {
        if (!DB.isExisted(input)) return replier.reply("❌ 대상 없음.");
        global.adminAction[sender] = { type: action, target: input };
        replier.reply("⚠️ [" + input + "] " + action + " 진행할까요? (확인/취소)");
    }
    session.waitAction = null;
}

function handleAdminAction(sender, msg, replier, session) {
    let action = global.adminAction[sender];
    if (msg === "확인") {
        if (action.type === "삭제") DB.deleteUser(action.target);
        else if (action.type === "초기화") {
            let u = DB.readUser(action.target);
            if (u) DB.writeUser(action.target, Obj.getNewUser(u.info.id, "0", u.info.name));
        }
        replier.reply("✅ 처리 완료.");
    } else replier.reply("❌ 취소되었습니다.");
    delete global.adminAction[sender];
}

function cleanOldSessions() {
    let now = Date.now();
    for (let user in global.sessions) {
        if (now - global.sessions[user].lastTime > 1800000) delete global.sessions[user];
    }
}
