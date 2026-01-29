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
        let isMainRoom = (room.trim() === libConst.MainRoomName.trim());
        let isAdminRoom = (room.trim() === libConst.ErrorLogRoom.trim());

        // [1] 대기 입력 처리 (가입/로그인 중일 때)
        if (session.waitAction) {
            handleWaitAction(sender, msg, replier);
            return;
        }

        // [2] 관리자 승인 로직
        if (isAdminRoom && global.adminAction[sender]) {
            if (msg === "확인") {
                let action = global.adminAction[sender];
                if (action.type === "삭제") DB.deleteUser(action.target);
                else if (action.type === "초기화") {
                    let u = DB.readUser(action.target);
                    if (u) DB.writeUser(action.target, Obj.getNewUser(u.info.id, u.info.pw, u.info.name));
                }
                replier.reply("✅ 처리 완료되었습니다.");
                delete global.adminAction[sender];
            } else if (msg === "취소") {
                delete global.adminAction[sender];
                replier.reply("❌ 취소되었습니다.");
            }
            session.isMenuOpen = false;
            return;
        }

        // [3] 메뉴 호출 (.메뉴)
        if (msg === libConst.Prefix + "메뉴") {
            session.isMenuOpen = true;
            session.waitAction = null;
            replier.reply(Helper.getMenu(room, isMainRoom, isLoggedIn, null, session.data, DB));
            return;
        }

        // [4] 메뉴 번호 선택
        if (!isNaN(msg) && session.isMenuOpen) {
            let cmd = Helper.getRootCmdByNum(room, isAdminRoom, isMainRoom, isLoggedIn, msg.trim());
            if (!cmd) return;

            switch (cmd) {
                case "가입":
                    if (isGroupChat) return replier.reply("📢 가입은 개인톡에서만 가능합니다.");
                    replier.reply("📝 [게임 닉네임] [비밀번호]를 입력해주세요.");
                    session.waitAction = "가입";
                    break;
                case "로그인":
                    if (isGroupChat) return replier.reply("📢 로그인은 개인톡에서만 가능합니다.");
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
                    if (isAdminRoom) {
                        replier.reply(Helper.getMenu(room, isMainRoom, isLoggedIn, "유저조회", session.data, DB) + "\n\n🔍 상세조회할 카톡 닉네임 입력.");
                        session.waitAction = "상세조회";
                    }
                    break;
                case "삭제":
                case "초기화":
                case "복구":
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
    } catch (e) {
        Api.replyRoom(libConst.ErrorLogRoom, "🚨 에러: " + e.message);
    }
}

function handleWaitAction(sender, msg, replier) {
    let session = global.sessions[sender];
    let action = session.waitAction;
    let input = msg.trim();

    if (input === "취소") {
        session.waitAction = null; session.isMenuOpen = false;
        return replier.reply("❌ 취소되었습니다.");
    }

    switch (action) {
        case "가입":
            let p = input.split(" ");
            if (p.length < 2) return replier.reply("❌ [닉네임] [비번] 순으로 입력해주세요.");
            replier.reply(Login.tryRegister(sender, p[1], p[0], DB, Obj).msg);
            break;
        case "로그인_ID":
            if (!DB.isExisted(input)) return replier.reply("❌ 가입되지 않은 정보입니다.");
            session.tempData = input;
            session.waitAction = "로그인_PW";
            replier.reply("🔓 [" + input + "]님의 비밀번호를 입력해주세요.");
            return;
        case "로그인_PW":
            let res = Login.tryLogin(session.tempData, input, DB);
            if (res.success) {
                session.data = res.data;
                replier.reply("✅ 로그인 성공! 반갑습니다, " + res.data.info.name + "님.");
            } else {
                return replier.reply("🚫 " + res.msg + "\n다시 입력하거나 '취소'를 입력하세요.");
            }
            break;
        case "상세조회":
            let ud = DB.readUser(input);
            if (!ud) return replier.reply("❌ 유저를 찾을 수 없습니다.");
            replier.reply("👤 [" + ud.info.name + "] 상세\n비번: " + ud.info.pw + "\n돈: " + ud.status.money + "G");
            break;
        case "삭제":
        case "초기화":
            if (!DB.isExisted(input)) return replier.reply("❌ 대상이 없습니다.");
            global.adminAction[sender] = { type: action, target: input };
            replier.reply("⚠️ [" + input + "]님을 " + action + " 처리할까요? (확인/취소)");
            session.waitAction = null; return;
    }
    session.waitAction = null; session.isMenuOpen = false;
}
