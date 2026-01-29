const libConst = Bridge.getScopeOf("Const.js").bridge();
const DB = Bridge.getScopeOf("DataBase.js").bridge();
const Obj = Bridge.getScopeOf("Object.js").bridge();
const Login = Bridge.getScopeOf("LoginManager.js").bridge();
const Helper = Bridge.getScopeOf("Helper.js").bridge();

if (!global.sessions) global.sessions = {}; 
if (!global.adminAction) global.adminAction = {}; 

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    try {
        if (!global.sessions[sender]) {
            global.sessions[sender] = { isMenuOpen: false, data: null, waitAction: null, tempData: null };
        }
        let session = global.sessions[sender];
        let isLoggedIn = !!session.data;
        let isPrefix = msg.startsWith(libConst.Prefix);
        let isAdminRoom = (room.trim() === libConst.ErrorLogRoom.trim());
        let isMainRoom = (room.trim() === libConst.MainRoomName.trim());

        // [1] 대기 입력 상태 우선 처리
        if (session.waitAction) {
            handleWaitAction(sender, msg, replier);
            return;
        }

        // [2] 메뉴 밖 전용 명령어: .업데이트 (Prefix 포함 필수)
        if (msg === libConst.Prefix + "업데이트") {
            replier.reply("🖥️ [ 시스템 정보 ]\n• 버전: v" + libConst.Version + "\n• 유저: " + DB.getUserList().length + "명\n• 상태: 정상 작동 중");
            session.isMenuOpen = false;
            return;
        }

        // [3] 관리자 확인 로직
        if (isAdminRoom && global.adminAction[sender]) {
            if (msg === "확인") {
                let action = global.adminAction[sender];
                if (action.type === "삭제") DB.deleteUser(action.target);
                else if (action.type === "초기화") {
                    let u = DB.readUser(action.target);
                    if (u) DB.writeUser(action.target, Obj.getNewUser(u.info.id, u.info.pw, u.info.name));
                }
                replier.reply("✅ [" + action.target + "] 처리 완료.");
                delete global.adminAction[sender];
            } else if (msg === "취소") {
                delete global.adminAction[sender];
                replier.reply("❌ 취소되었습니다.");
            }
            session.isMenuOpen = false;
            return;
        }

        // [4] 메뉴 호출 및 번호 처리
        let command = "";
        if (msg === libConst.Prefix + "메뉴") {
            command = "메뉴";
        } else if (!isNaN(msg)) {
            if (session.isMenuOpen) {
                let mapped = Helper.getRootCmdByNum(room, isAdminRoom, isMainRoom, isLoggedIn, msg.trim());
                if (mapped) command = mapped;
            } else {
                return replier.reply("⚠️ 메뉴가 닫혀있습니다. '" + libConst.Prefix + "메뉴'를 입력하세요.");
            }
        } else return;

        // [5] 실행 로직
        switch (command) {
            case "메뉴":
                session.isMenuOpen = true;
                session.waitAction = null;
                replier.reply(Helper.getMenu(room, isMainRoom, isLoggedIn, null, session.data, DB));
                break;
            case "가입":
                if (isGroupChat) { session.isMenuOpen = false; return replier.reply("📢 가입은 1:1 개인톡에서만 가능합니다."); }
                replier.reply("📝 [게임 닉네임] [비밀번호]를 입력해주세요.\n(예: 홍길동 1234)");
                session.waitAction = "가입";
                break;
            case "로그인":
                if (isGroupChat) { session.isMenuOpen = false; return replier.reply("📢 로그인은 1:1 개인톡에서만 가능합니다."); }
                replier.reply("🔑 본인의 [카카오톡 닉네임]을 입력해주세요.");
                session.waitAction = "로그인_ID";
                break;
            case "내정보":
                replier.reply(Helper.getMenu(room, isMainRoom, isLoggedIn, "내정보", session.data, DB));
                session.isMenuOpen = false;
                break;
            case "로그아웃":
                session.data = null; session.isMenuOpen = false;
                replier.reply("🚪 로그아웃 되었습니다.");
                break;
            case "유저조회":
                if (!isAdminRoom) return;
                replier.reply(Helper.getMenu(room, isMainRoom, isLoggedIn, "유저조회", session.data, DB) + "\n\n🔍 상세조회할 카톡 닉네임 입력.");
                session.waitAction = "상세조회";
                break;
            case "삭제":
            case "초기화":
            case "복구":
                if (!isAdminRoom) return;
                replier.reply("🛠️ " + command + "할 카톡 닉네임 입력.");
                session.waitAction = command;
                break;
            default:
                if (command) {
                    replier.reply(Helper.getMenu(room, isMainRoom, isLoggedIn, command, session.data, DB));
                }
                break;
        }
    } catch (e) {
        Api.replyRoom(libConst.ErrorLogRoom, "🚨 에러: " + e.message);
    }
}

function handleWaitAction(sender, msg, replier) {
    let session = global.sessions[sender];
    let action = session.waitAction;
    let input = msg.trim();

    if (input === "취소") {
        session.waitAction = null;
        session.tempData = null;
        session.isMenuOpen = false;
        return replier.reply("❌ 취소되었습니다.");
    }

    switch (action) {
        case "가입":
            let p = input.split(" ");
            if (p.length < 2) return replier.reply("❌ [게임 닉네임] [비밀번호] 순으로 입력해주세요.");
            let regRes = Login.tryRegister(sender, p[1], p[0], DB, Obj);
            replier.reply(regRes.msg);
            session.waitAction = null;
            session.isMenuOpen = false;
            break;

        case "로그인_ID":
            if (!DB.isExisted(input)) return replier.reply("❌ 가입되지 않은 닉네임입니다.");
            session.tempData = input;
            session.waitAction = "로그인_PW";
            replier.reply("🔓 [" + input + "] 계정의 비밀번호를 입력해주세요.");
            break;

        case "로그인_PW":
            let res = Login.tryLogin(session.tempData, input, DB);
            if (res.success) {
                session.data = res.data;
                replier.reply("✅ 로그인 성공! 반갑습니다, " + res.data.info.name + "님.");
                session.waitAction = null;
                session.tempData = null;
                session.isMenuOpen = false;
            } else {
                replier.reply("🚫 " + res.msg + "\n다시 입력하시거나 '취소'를 입력해주세요.");
            }
            break;

        case "상세조회":
            let ud = DB.readUser(input);
            if (!ud) return replier.reply("❌ 유저 없음.");
            replier.reply("👤 [" + ud.info.name + "] 비번: " + ud.info.pw + " / 돈: " + ud.status.money + "G");
            session.waitAction = null;
            session.isMenuOpen = false;
            break;

        case "삭제":
        case "초기화":
            if (!DB.isExisted(input)) return replier.reply("❌ 대상 없음.");
            global.adminAction[sender] = { type: action, target: input };
            replier.reply("⚠️ [" + input + "] " + action + " 하시겠습니까? (확인/취소)");
            session.waitAction = null;
            break;

        case "복구":
            if (DB.restoreUser(input)) replier.reply("✅ 복구 완료.");
            else replier.reply("❌ 복구 실패.");
            session.waitAction = null;
            session.isMenuOpen = false;
            break;
    }
}
