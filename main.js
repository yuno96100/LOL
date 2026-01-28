/**
 * main.js
 * 역할: 메인 컨트롤러 및 시스템 상세 정보 제공
 */

const libConst = Bridge.getScopeOf("Const.js").bridge();
const Login = Bridge.getScopeOf("LoginManager.js").bridge();
const Helper = Bridge.getScopeOf("Helper.js").bridge();

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    
    try {
        if (!msg.startsWith(libConst.Prefix)) return;

        const args = msg.split(" ");
        const command = args[0].slice(libConst.Prefix.length);
        const params = args.slice(1);

        function replyBox(title, content) {
            var res = "━━━━━━━━━━━━━━━\n";
            res += "🧪 " + title + "\n";
            res += "━━━━━━━━━━━━━━━\n";
            res += content + "\n";
            res += "━━━━━━━━━━━━━━━";
            replier.reply(res);
        }

        /**
         * [1] 단체톡방 분기
         */
        if (room.trim() === libConst.MainRoomName.trim()) {
            switch (command) {
                case "등록":
                    replyBox("유저 등록 안내", 
                        sender + "님, 환영합니다!\n\n" +
                        "정식 가입을 위해 " + libConst.AdminName + "에게\n" +
                        "1:1 메시지로 '.가입 [ID] [PW]'를 보내주세요."
                    );
                    break;

                case "정보":
                    var systemInfo = "• 서버 버전: v" + libConst.Version + "\n" +
                                     "• 관리 주체: " + libConst.AdminName + "\n\n" +
                                     "[🛡️ 보호막 시스템]\n" +
                                     "• 에러 트래킹: 가동 중 (Try-Catch)\n" +
                                     "• 비활성화 방지: 적용 완료\n\n" +
                                     "[📂 시스템 아키텍처]\n" +
                                     "• 모듈 구조: Bridge API (V2)\n" +
                                     "• 데이터 저장: JSON File System\n" +
                                     "• 동기화: GitHub API 연동\n\n" +
                                     "[📍 현재 위치]\n" +
                                     "• 접속 방: " + room + "\n" +
                                     "• 모드: 퍼블릭(단체톡)";
                    replyBox("실험실 시스템 상세 정보", systemInfo);
                    break;
                
                case "도움말":
                case "명령어":
                    replier.reply(Helper.getMainHelp());
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
                    if (params.length < 2) return replyBox("가입 실패", "⚠️ 사용법: .가입 [ID] [PW]");
                    replyBox("가입 결과", Login.tryRegister(params[0], params[1], sender).msg);
                    break;

                case "로그인":
                    if (params.length < 2) return replyBox("로그인 실패", "⚠️ 사용법: .로그인 [ID] [PW]");
                    replyBox("로그인 결과", Login.tryLogin(params[0], params[1]).msg);
                    break;

                case "정보":
                    var privateSystemInfo = "[👤 계정 상태]\n" +
                                            "• 대상: " + sender + "\n" +
                                            "• 상태: " + (isLoggedIn ? "인증됨" : "인증 필요") + "\n\n" +
                                            "[🛡️ 보안 시스템]\n" +
                                            "• 데이터 암호화: PW 매칭 (Local)\n" +
                                            "• 세션 보호: 가동 준비 중\n\n" +
                                            "[⚙️ 봇 엔진]\n" +
                                            "• 버전: v" + libConst.Version + "\n" +
                                            "• 타입: 프라이빗(1:1)";
                    replyBox("개인 세션 및 시스템 정보", privateSystemInfo);
                    break;

                case "도움말":
                    replier.reply(Helper.getPrivateHelp(isLoggedIn));
                    break;
            }
        }

    } catch (e) {
        var errorMsg = "⚠️ [시스템 런타임 에러]\n" +
                       "━━━━━━━━━━━━━━━\n" +
                       "• 내용: " + e.message + "\n" +
                       "• 위치: " + e.lineNumber + "줄\n" +
                       "━━━━━━━━━━━━━━━";
        replier.reply(errorMsg);
        Log.e("Error: " + e.message + " at " + e.lineNumber);
    }
}
