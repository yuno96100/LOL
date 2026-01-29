const libConst = Bridge.getScopeOf("Const.js").bridge();
const DB = Bridge.getScopeOf("DataBase.js").bridge();
const Obj = Bridge.getScopeOf("Object.js").bridge();
const Login = Bridge.getScopeOf("LoginManager.js").bridge();
const Helper = Bridge.getScopeOf("Helper.js").bridge();

if (!global.sessions) global.sessions = {}; 
if (!global.adminAction) global.adminAction = {}; 

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    try {
        if (!global.sessions[sender]) global.sessions[sender] = { isMenuOpen: false, data: null };
        let userSession = global.sessions[sender].data;
        let isLoggedIn = !!userSession;
        let isPrefix = msg.startsWith(libConst.Prefix);
        let isAdminRoom = (room.trim() === libConst.ErrorLogRoom.trim());
        let isMainRoom = (room.trim() === libConst.MainRoomName.trim());

        const NickWarning = "\n\n⚠️ **주의**: 개인톡과 '소환사의협곡'의 닉네임이 같아야 합니다.";

        // [1] 관리자 2차 확인
        if (isAdminRoom && global.adminAction[sender]) {
            let action = global.adminAction[sender];
            if (msg === "확인") {
                if (action.type === "삭제") DB.deleteUser(action.target);
                else if (action.type === "초기화") {
                    let u = DB.readUser(action.target);
                    DB.writeUser(action.target, Obj.getNewUser(u.info.id, u.info.pw, u.info.name));
                }
                replier.reply("✅ [" + action.target + "] " + action.type + " 완료.");
                delete global.adminAction[sender];
            } else if (msg === "취소") {
                delete global.adminAction[sender];
                replier.reply("❌ 취소되었습니다.");
            }
            return;
        }

        // [2] 로그인 권한 체크
        if (!isLoggedIn && !isAdminRoom) {
            const isAuth = msg === libConst.Prefix + "메뉴" || msg.startsWith(libConst.Prefix + "가입") || 
                           msg.startsWith(libConst.Prefix + "로그인") || (global.sessions[sender].isMenuOpen && (msg === "1" || msg === "2"));
            if (!isAuth) {
                if (isMainRoom) {
                    if (isPrefix || !isNaN(msg)) return replier.reply("⚠️ [" + sender + "]님, 로그인이 필요합니다." + NickWarning);
                    return;
                } else if (!isGroupChat) {
                    global.sessions[sender].isMenuOpen = true;
                    return replier.reply("👋 로그인 후 이용 가능합니다!\n" + Helper.getMenu(room, isMainRoom, false, null, null, DB) + NickWarning);
                }
            }
        }

        // [3] 명령어 분석
        let command = "";
        let params = [];
        if (isPrefix) {
            let args = msg.split(" ");
            command = args[0].slice(libConst.Prefix.length);
            params = args.slice(1);
        } else if (!isNaN(msg) && global.sessions[sender].isMenuOpen) {
            command = msg.trim();
        } else { return; }

        // [4] 메뉴 활성화 체크
        if (command !== "메뉴" && !global.sessions[sender].isMenuOpen) {
            return replier.reply("⚠️ 먼저 '" + libConst.Prefix + "메뉴'를 입력해 주세요.");
        }

        // [5] 번호 -> 명령어 변환
        if (!isNaN(command)) {
            let mapped = Helper.getRootCmdByNum(room, isMainRoom, isLoggedIn, command);
            if (mapped) command = mapped;
        }

        // [6] 실행 로직
        switch (command) {
            case "메뉴":
                global.sessions[sender].isMenuOpen = true;
                replier.reply(Helper.getMenu(room, isMainRoom, isLoggedIn, null, userSession, DB));
                break;

            case "정보":
                let userCount = DB.getUserList().length;
                let activeSessions = Object.keys(global.sessions).filter(k => global.sessions[k].data).length;
                let infoMsg = "🖥️ [ 봇 시스템 정보 ]\n━━━━━━━━━━━━━━━\n";
                infoMsg += "• 봇 버전: v" + libConst.Version + "\n";
                infoMsg += "• 그룹톡: " + libConst.MainRoomName + "\n";
                infoMsg += "• 관리방: " + libConst.ErrorLogRoom + "\n";
                infoMsg += "• 가입 유저: " + userCount + "명\n";
                infoMsg += "• 활성 세션: " + activeSessions + "개\n";
                infoMsg += "• 시스템 경로: " + libConst.RootPath + "\n";
                infoMsg += "━━━━━━━━━━━━━━━";
                replier.reply(infoMsg);
                break;

            case "유저조회":
                if (!isAdminRoom) return;
                if (params.length > 0) {
                    let ud = DB.readUser(params[0]);
                    if (!ud) return replier.reply("❌ [" + params[0] + "] 유저가 없습니다.");
                    let detail = "👤 [ " + ud.info.name + " 상세 정보 ]\n━━━━━━━━━━━━━━━\n";
                    detail += "• ID: " + ud.info.id + "\n• 가입일: " + ud.info.joinDate + "\n";
                    detail += "• 자금: " + ud.status.money + "G\n• 레벨: " + ud.status.level + "\n";
                    detail += "• 가방: " + (ud.inventory.length > 0 ? ud.inventory.join(", ") : "비어있음") + "\n";
                    detail += "━━━━━━━━━━━━━━━";
                    replier.reply(detail);
                } else {
                    replier.reply(Helper.getMenu(room, isMainRoom, isLoggedIn, "유저조회", userSession, DB));
                }
                break;

            case "유저제어":
                if (!isAdminRoom) return;
                replier.reply(Helper.getMenu(room, isMainRoom, isLoggedIn, "유저제어", userSession, DB));
                break;

            case "삭제":
                if (!isAdminRoom || params.length < 1) return;
                global.adminAction[sender] = { type: "삭제", target: params[0] };
                replier.reply("⚠️ [" + params[0] + "] 삭제하시겠습니까? (복구가능)\n'확인' 또는 '취소' 입력.");
                break;

            case "복구":
                if (!isAdminRoom || params.length < 1) return;
                DB.restoreUser(params[0]);
                replier.reply("✅ [" + params[0] + "] 복구 완료.");
                break;

            case "가입":
                if (isGroupChat) return;
                if (DB.isExisted(sender)) return replier.reply("⚠️ 이미 가입된 계정입니다.");
                // LoginManager 내부에서도 DB.writeUser를 호출하도록 되어있는지 확인이 필요합니다.
                replier.reply(Login.tryRegister(sender, params[0], sender, DB, Obj).msg);
                break;

            case "로그인":
                if (isGroupChat) return;
                var res = Login.tryLogin(sender, params[0], DB);
                if (res.success) global.sessions[sender].data = res.data;
                replier.reply(res.msg);
                break;

            case "로그아웃":
                global.sessions[sender].data = null;
                global.sessions[sender].isMenuOpen = false;
                replier.reply("🚪 로그아웃 되었습니다.");
                break;

            case "내정보":
            case "도움말":
                replier.reply(Helper.getMenu(room, isMainRoom, isLoggedIn, command, userSession, DB));
                break;
        }
    } catch (e) {
        Api.replyRoom(libConst.ErrorLogRoom, "🚨 에러: " + e.message);
    }
}
