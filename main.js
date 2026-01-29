/**
 * main.js
 * 버전: v1.3.1
 * 통합 내용: 가입/로그인, 관리자 시스템(임명/해임), 유저 관리(조회/정보/초기화/삭제/롤백), 세션 유지
 */

const libConst = Bridge.getScopeOf("Const.js").bridge();
const DB = Bridge.getScopeOf("DataBase.js").bridge();
const Obj = Bridge.getScopeOf("Object.js").bridge();
const Login = Bridge.getScopeOf("LoginManager.js").bridge();
const Helper = Bridge.getScopeOf("Helper.js").bridge();

// 로그인 세션을 저장할 전역 객체
let sessions = {}; 

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    
    try {
        // 접두사 체크
        if (!msg.startsWith(libConst.Prefix)) return;

        const args = msg.split(" ");
        const command = args[0].slice(libConst.Prefix.length);
        const params = args.slice(1);

        // 공통 UI 박스 함수
        function replyBox(title, content) {
            var res = "━━━━━━━━━━━━━━━\n";
            res += "🧪 " + title + "\n";
            res += "━━━━━━━━━━━━━━━\n";
            res += content + "\n";
            res += "━━━━━━━━━━━━━━━";
            replier.reply(res);
        }

        /**
         * [1] 게임봇 방 (관리자 전용 제어 센터)
         */
        if (room.trim() === libConst.ErrorLogRoom.trim()) {
            switch (command) {
                case "도움말":
                    replier.reply(Helper.getAdminHelp());
                    break;

                case "관리자임명":
                    if (params.length < 1) return replier.reply("⚠️ 사용법: .관리자임명 [닉네임]");
                    var adminsA = DB.getAdmins();
                    if (adminsA.indexOf(params[0]) === -1) {
                        adminsA.push(params[0]);
                        DB.saveAdmins(adminsA);
                        replier.reply("✅ " + params[0] + " 님을 관리자로 임명했습니다.");
                        Api.replyRoom(libConst.MainRoomName, "📢 [관리자 임명]\n" + params[0] + " 님이 관리자로 지정되었습니다.");
                    } else {
                        replier.reply("⚠️ 이미 관리자입니다.");
                    }
                    break;

                case "관리자해임":
                    if (params.length < 1) return replier.reply("⚠️ 사용법: .관리자해임 [닉네임]");
                    var adminsD = DB.getAdmins();
                    var idx = adminsD.indexOf(params[0]);
                    if (idx !== -1) {
                        adminsD.splice(idx, 1);
                        DB.saveAdmins(adminsD);
                        replier.reply("🗑️ " + params[0] + " 님을 해임했습니다.");
                    } else {
                        replier.reply("⚠️ 관리자 명단에 없습니다.");
                    }
                    break;

                case "유저조회":
                    var userList = DB.getUserList();
                    if (userList.length === 0) return replier.reply("현재 가입된 유저가 없습니다.");
                    var listTxt = "총 인원: " + userList.length + "명\n\n" + userList.join("\n");
                    listTxt += "\n\n(정보/초기화/삭제/롤백 [ID])";
                    replyBox("가입 유저 명단", listTxt);
                    break;

                case "유저정보":
                    if (params.length < 1) return replier.reply("⚠️ 사용법: .유저정보 [ID]");
                    var targetData = DB.loadUser(params[0]);
                    if (!targetData) return replier.reply("❌ 존재하지 않는 ID입니다.");
                    var infoTxt = "👤 닉네임: " + targetData.info.name + "\n";
                    infoTxt += "🆔 아이디: " + targetData.info.id + "\n";
                    infoTxt += "📈 레벨: " + targetData.status.level + "\n";
                    infoTxt += "⚔️ 전적: " + targetData.status.win + "승 " + targetData.status.loss + "패";
                    replyBox("유저 상세 데이터", infoTxt);
                    break;

                case "유저초기화":
                    if (params.length < 1) return replier.reply("⚠️ 사용법: .유저초기화 [ID]");
                    var targetInit = DB.loadUser(params[0]);
                    if (!targetInit) return replier.reply("❌ 유저를 찾을 수 없습니다.");
                    // 삭제(백업포함) 후 새 객체 저장
                    DB.deleteUser(params[0]);
                    var freshUser = Obj.getNewUser(targetInit.info.id, targetInit.info.pw, targetInit.info.name);
                    DB.saveUser(params[0], freshUser);
                    replier.reply("🧹 [" + params[0] + "] 유저 데이터가 초기화되었습니다. (기존 데이터 백업됨)");
                    break;

                case "유저삭제":
                    if (params.length < 1) return replier.reply("⚠️ 사용법: .유저삭제 [ID]");
                    if (DB.deleteUser(params[0])) {
                        replier.reply("🗑️ [" + params[0] + "] 계정을 삭제했습니다. (백업 보관됨)");
                    } else {
                        replier.reply("❌ 삭제 실패: ID를 확인하세요.");
                    }
                    break;

                case "유저롤백":
                    if (params.length < 1) return replier.reply("⚠️ 사용법: .유저롤백 [ID]");
                    if (DB.rollbackUser(params[0])) {
                        replier.reply("⏪ [" + params[0] + "] 데이터를 백업 시점으로 복구했습니다.");
                    } else {
                        replier.reply("❌ 롤백 실패: 백업 파일이 없습니다.");
                    }
                    break;

                case "정보":
                    replyBox("관리 시스템 정보", 
                        "• 버전: " + libConst.Version + "\n" +
                        "• 활성 세션: " + Object.keys(sessions).length + "명\n" +
                        "• 모듈: 정상 작동 중"
                    );
                    break;
            }
            return;
        }

        /**
         * [2] LOL실험실 방 (퍼블릭 채팅방)
         */
        if (room.trim() === libConst.MainRoomName.trim()) {
            switch (command) {
                case "정보":
                    var admins = DB.getAdmins();
                    var adminStr = admins.length > 0 ? admins.join(", ") : "없음";
                    replyBox("실험실 정보", "• 버전: v" + libConst.Version + "\n• 관리자: (" + adminStr + ")");
                    break;
                case "도움말":
                    replier.reply(Helper.getMainHelp());
                    break;
            }
            return;
        }

        /**
         * [3] 개인톡 (가입, 로그인 및 세션 기반 기능)
         */
        if (!isGroupChat) {
            var userSession = sessions[sender];
            var isLoggedIn = !!userSession;

            switch (command) {
                case "가입":
                    if (params.length < 2) return replyBox("가입 실패", "⚠️ .가입 [ID] [PW]");
                    var regRes = Login.tryRegister(params[0], params[1], sender, DB, Obj);
                    replyBox("가입 결과", regRes.msg);
                    if (regRes.success) {
                        Api.replyRoom(libConst.ErrorLogRoom, "🔔 [가입 알림] " + sender + " (" + params[0] + ") 님이 가입했습니다.");
                    }
                    break;

                case "로그인":
                    if (params.length < 2) return replyBox("로그인 실패", "⚠️ .로그인 [ID] [PW]");
                    var logRes = Login.tryLogin(params[0], params[1], DB);
                    if (logRes.success) {
                        sessions[sender] = logRes.data;
                    }
                    replyBox("로그인 결과", logRes.msg);
                    break;

                case "내정보":
                    if (!isLoggedIn) return replyBox("조회 실패", "❗ 로그인이 필요합니다.");
                    var info = userSession.info;
                    var status = userSession.status;
                    replyBox("내 정보", "👤 닉네임: " + info.name + "\n📈 레벨: " + status.level + "\n⚔️ 전적: " + status.win + "승 " + status.loss + "패");
                    break;

                case "로그아웃":
                    if (!isLoggedIn) return replier.reply("❗ 로그인 상태가 아닙니다.");
                    delete sessions[sender];
                    replier.reply("🚪 로그아웃 되었습니다.");
                    break;

                case "도움말":
                    replier.reply(Helper.getPrivateHelp(isLoggedIn));
                    break;
            }
        }

    } catch (e) {
        var fileName = e.fileName ? e.fileName.split("/").pop() : "main.js";
        var errorLog = "🚨 [에러 리포트]\n━━━━━━━━━━━━━━━\n• 파일: " + fileName + "\n• 라인: " + e.lineNumber + "\n• 내용: " + e.message + "\n━━━━━━━━━━━━━━━";
        Api.replyRoom(libConst.ErrorLogRoom, errorLog);
    }
}
