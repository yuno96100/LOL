/**
 * main.js
 * 역할: 메인 컨트롤러 및 에러 메시지 채팅 출력 추가
 */

const libConst = Bridge.getScopeOf("Const.js").bridge();
const Login = Bridge.getScopeOf("LoginManager.js").bridge();
const Helper = Bridge.getScopeOf("Helper.js").bridge();

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    
    // [보호막] 전체 로직 감싸기
    try {
        if (!msg.startsWith(libConst.Prefix)) return;

        const args = msg.split(" ");
        const command = args[0].slice(libConst.Prefix.length);
        const params = args.slice(1);

        // 인터페이스 통일용 함수
        function replyBox(title, content) {
            var res = "━━━━━━━━━━━━━━━\n";
            res += "🧪 " + title + "\n";
            res += "━━━━━━━━━━━━━━━\n";
            res += content + "\n";
            res += "━━━━━━━━━━━━━━━";
            replier.reply(res);
        }

        /**
         * [1] 단체톡방 분기 (LOL실험실)
         */
        if (room.trim() === libConst.MainRoomName.trim()) {
            switch (command) {
                case "도움말":
                case "명령어":
                    replier.reply(Helper.getMainHelp());
                    break;

                case "등록":
                    replyBox("유저 등록 안내", 
                        sender + "님, 환영합니다!\n\n" +
                        "정식 가입을 위해 " + libConst.AdminName + "에게\n" +
                        "1:1 메시지로 '.가입 [ID] [PW]'를 보내주세요."
                    );
                    break;

                case "정보":
                    var roomInfo = "• 현재 방: " + room + "\n" +
                                   "• 타입: 단체 채팅방\n" +
                                   "• 실험실 버전: " + libConst.Version + "\n" +
                                   "• 관리자: " + libConst.AdminName + "\n" +
                                   "• 시스템 상태: 정상";
                    replyBox("실험실 및 방 정보", roomInfo);
                    break;
            }
            return;
        }

        /**
         * [2] 개인톡방 분기
         */
        if (!isGroupChat) {
            let isLoggedIn = false; 

            switch (command) {
                case "가입":
                    if (params.length < 2) {
                        replyBox("가입 실패", "⚠️ 사용법: .가입 [ID] [PW]");
                        return;
                    }
                    var regRes = Login.tryRegister(params[0], params[1], sender);
                    replyBox("가입 결과", regRes.msg);
                    break;

                case "로그인":
                    if (params.length < 2) {
                        replyBox("로그인 실패", "⚠️ 사용법: .로그인 [ID] [PW]");
                        return;
                    }
                    var logRes = Login.tryLogin(params[0], params[1]);
                    replyBox("로그인 결과", logRes.msg);
                    break;

                case "정보":
                    var privateRoomInfo = "• 대화 상대: " + sender + "\n" +
                                          "• 타입: 1:1 개인톡\n" +
                                          "• 계정 상태: " + (isLoggedIn ? "로그인됨" : "로그인 필요") + "\n" +
                                          "• 서버 버전: " + libConst.Version;
                    replyBox("방 및 계정 정보", privateRoomInfo);
                    break;

                case "도움말":
                case "명령어":
                    replier.reply(Helper.getPrivateHelp(isLoggedIn));
                    break;
                    
                default:
                    replyBox("알림", "❓ 알 수 없는 명령어입니다.\n'.도움말'을 입력해 주세요.");
                    break;
            }
        }

    } catch (e) {
        // [수정 포인트] 에러 발생 시 로그뿐만 아니라 채팅방에도 에러 내용을 표시합니다.
        var errorMsg = "⚠️ [시스템 런타임 에러]\n";
        errorMsg += "━━━━━━━━━━━━━━━\n";
        errorMsg += "• 내용: " + e.message + "\n";
        errorMsg += "• 위치: " + e.lineNumber + "번째 줄\n";
        errorMsg += "━━━━━━━━━━━━━━━\n";
        errorMsg += "※ 해당 에러가 지속되면 코드를 확인해 주세요.";
        
        replier.reply(errorMsg);
        Log.e("Error in main.js: " + e.message + "\nLine: " + e.lineNumber);
    }
}
