/**
 * main.js
 * 버전: v1.2.8
 * 통합 내용: 가입, 로그인, 관리자 임명/해임, 세션 유지, 도움말UI
 */

const libConst = Bridge.getScopeOf("Const.js").bridge();
const DB = Bridge.getScopeOf("DataBase.js").bridge();
const Obj = Bridge.getScopeOf("Object.js").bridge();
const Login = Bridge.getScopeOf("LoginManager.js").bridge();
const Helper = Bridge.getScopeOf("Helper.js").bridge();

// 로그인 상태를 저장할 전역 객체 (봇이 재시작되기 전까지 유지)
let sessions = {}; 

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    
    try {
        if (!msg.startsWith(libConst.Prefix)) return;

        const args = msg.split(" ");
        const command = args[0].slice(libConst.Prefix.length);
        const params = args.slice(1);

        function replyBox(title, content) {
            var res = "━━━━━━━━━━━━━━━\n🧪 " + title + "\n━━━━━━━━━━━━━━━\n" + content + "\n━━━━━━━━━━━━━━━";
            replier.reply(res);
        }

        /** [1] 게임봇 방 (관리자 전용) **/
        if (room.trim() === libConst.ErrorLogRoom.trim()) {
            switch (command) {
                case "도움말":
                    replier.reply(Helper.getAdminHelp());
                    break;
                case "관리자임명":
                    if (params.length < 1) return replier.reply("⚠️ .관리자임명 [닉네임]");
                    let adminsA = DB.getAdmins();
                    if (adminsA.indexOf(params[0]) === -1) {
                        adminsA.push(params[0]);
                        DB.saveAdmins(adminsA);
                        replier.reply("✅ " + params[0] + " 임명 완료");
                        Api.replyRoom(libConst.MainRoomName, "📢 " + params[0] + "님이 새로운 관리자가 되었습니다.");
                    }
                    break;
                case "관리자해임":
                    if (params.length < 1) return replier.reply("⚠️ .관리자해임 [닉네임]");
                    let adminsD = DB.getAdmins();
                    let idx = adminsD.indexOf(params[0]);
                    if (idx !== -1) {
                        adminsD.splice(idx, 1);
                        DB.saveAdmins(adminsD);
                        replier.reply("🗑️ " + params[0] + " 해임 완료");
                    }
                    break;
                case "정보":
                    replyBox("관리자 시스템 정보", "• 버전: " + libConst.Version + "\n• 활성 세션: " + Object.keys(sessions).length + "명");
                    break;
            }
            return;
        }

        /** [2] LOL실험실 방 (퍼블릭) **/
        if (room.trim() === libConst.MainRoomName.trim()) {
            switch (command) {
                case "정보":
                    let admins = DB.getAdmins();
                    replyBox("시스템 정보", "• 버전: v" + libConst.Version + "\n• 관리자: (" + admins.join(", ") + ")");
                    break;
                case "도움말":
                    replier.reply(Helper.getMainHelp());
                    break;
            }
            return;
        }

        /** [3] 개인톡 (가입/로그인/내정보) **/
        if (!isGroupChat) {
            // 해당 유저가 로그인 상태인지 확인
            let userSession = sessions[sender]; 
            let isLoggedIn = userSession ? true : false;

            switch (command) {
                case "가입":
                    if (params.length < 2) return replyBox("가입 실패", "⚠️ .가입 [ID] [PW]");
                    var regRes = Login.tryRegister(params[0], params[1], sender, DB, Obj);
                    replyBox("가입 결과", regRes.msg);
                    break;

                case "로그인":
                    if (params.length < 2) return replyBox("로그인 실패", "⚠️ .로그인 [ID] [PW]");
                    var logRes = Login.tryLogin(params[0], params[1], DB);
                    if (logRes.success) {
                        // 로그인 성공 시 세션에 유저 데이터 저장
                        sessions[sender] = logRes.data;
                    }
                    replyBox("로그인 결과", logRes.msg);
                    break;

                case "내정보":
                    if (!isLoggedIn) return replyBox("조회 실패", "❗ 로그인이 필요합니다.");
                    var info = userSession.info;
                    var status = userSession.status;
                    replyBox("내 정보", "👤 닉네임: " + info.name + "\n🎖️ 칭호: " + info.title + "\n📈 레벨: " + status.level + "\n⚔️ 전적: " + status.win + "승 " + status.loss + "패");
                    break;

                case "로그아웃":
                    if (!isLoggedIn) return replier.reply("❗ 이미 로그아웃 상태입니다.");
                    delete sessions[sender];
                    replier.reply("🚪 로그아웃 되었습니다.");
                    break;

                case "도움말":
                    replier.reply(Helper.getPrivateHelp(isLoggedIn));
                    break;
            }
        }

    } catch (e) {
        var fullPath = e.fileName || "알 수 없는 파일";
        var fileName = fullPath.split("/").pop(); 
        var errorLog = "🚨 [에러 리포트]\n━━━━━━━━━━━━━━━\n• 파일: " + fileName + "\n• 라인: " + e.lineNumber + "\n• 내용: " + e.message + "\n━━━━━━━━━━━━━━━";
        Api.replyRoom(libConst.ErrorLogRoom, errorLog);
    }
}
