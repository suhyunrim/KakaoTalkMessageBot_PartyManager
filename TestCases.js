// Rhino 환경에서 require 사용하기 번거로워서 어차피 테스트를 위한 코드들이니 eval로 처리
var rawText = readFile('PartyManager.js', 'utf8');
eval(rawText);

// 윈도우에서 테스트 하기 위한 임시 코드들
if (!this['DataBase'])
{
    DataBase = { setDataBase : function () {}, getDataBase : function () {} }

    function Replier() {}
    Replier.prototype.reply = function(msg) { print(msg); };

    function Sleep (delay) {
        var start = new Date().getTime();
        while (new Date().getTime() < start + delay);
     }

    var Api = {}
    Api.replyRoom = function(roomName, msg) { print('roomName: ' + roomName + '  msg: ' + msg) };

    var Log = {}
    Log.i = function(msg) { print(msg) };
}

function ConvertDateToCustomTime(date)
{
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const hoursStr = ('00' + hours).slice(-2);
    const minutesStr = ('00' + minutes).slice(-2);
    return hoursStr + minutesStr;
}

const now = new Date();
const oneMinutesLate = new Date(now.getTime() + 60 * 1000);
const customTime = ConvertDateToCustomTime(oneMinutesLate);
print(ConvertDateToCustomTime(oneMinutesLate));

response('room1', '/사용법', 'sender1', false, new Replier(), null, null, null);
response('room1', '/파티생성 자랭1 ' + customTime, 'sender1', false, new Replier(), null, null, null);
response('room1', '/파티참가 자랭1', 'sender1', false, new Replier(), null, null, null);
response('room1', '/파티탈퇴 자랭1', 'sender1', false, new Replier(), null, null, null);
response('room1', '/파티참여 자랭1', 'sender1', false, new Replier(), null, null, null);
response('room1', '/파티참 자랭1', 'sender2', false, new Replier(), null, null, null);
response('room1', '/파티강퇴 자랭1 1', 'sender2', false, new Replier(), null, null, null);
response('room1', '/파티시간변경 자랭1 2200', 'sender2', false, new Replier(), null, null, null);
response('room1', '/파티리스트', 'sender2', false, new Replier(), null, null, null);
response('room1', '알람 테스트', 'sender2', false, new Replier(), null, null, null);
response('room1', '/파티생성 내전1 ' + customTime, 'sender1', false, new Replier(), null, null, null);
response('room1', '/파티참가 내전1', 'sender1', false, new Replier(), null, null, null);
response('room1', '/파티탈퇴 내전1', 'sender1', false, new Replier(), null, null, null);
response('room1', '/카밀출력 내전1', 'sender2', false, new Replier(), null, null, null);
response('room1', '/정기파티생성 정기내전 ' + customTime, 'sender2', false, new Replier(), null, null, null);
response('room1', '/정기파티삭제 정기내전', 'sender2', false, new Replier(), null, null, null);
response('room1', '/정기파티생성 정기내전 ' + customTime, 'sender2', false, new Replier(), null, null, null);
response('room1', '/파티대타 내전1 1', 'sender2', false, new Replier(), null, null, null);
response('room1', '/파티매니저끄기', 'sender2', false, new Replier(), null, null, null);
response('room1', '/파티생성 내전2 ' + customTime, 'sender1', false, new Replier(), null, null, null);
response('room1', '/파티매니저켜기', 'sender2', false, new Replier(), null, null, null);
response('room1', '/파티생성 내전2 ' + customTime, 'sender1', false, new Replier(), null, null, null);
response('room1', '/파티홍보 자랭1', 'sender1', false, new Replier(), null, null, null);
response('room1', '/파티이름변경 자랭1 내전1', 'sender1', false, new Replier(), null, null, null);
response('room1', '/파티이름변경 자랭1 이름바뀐자랭1', 'sender1', false, new Replier(), null, null, null);
response('room1', '/파티참 이름바뀐자랭1', 'sender3', false, new Replier(), null, null, null);
response('room1', '/파티참 이름바뀐자랭1', 'sender4', false, new Replier(), null, null, null);
response('room1', '/파티이름변경 이름바뀐자랭1 듀오로바꾸기실패', 'sender1', false, new Replier(), null, null, null);
response('room1', '/포지션파티생성 포지션자랭 2200', 'sender1', false, new Replier(), null, null, null);
response('room1', '/파티참가 포지션자랭 정글', '정글러1', false, new Replier(), null, null, null);
response('room1', '/파티참가 포지션자랭 정글', '정글러2', false, new Replier(), null, null, null);
response('room1', '/파티참가 포지션자랭 미드', '미드1', false, new Replier(), null, null, null);
response('room1', '/파티참가 포지션자랭', '미드1', false, new Replier(), null, null, null);
response('room1', '/파티참가 포지션자랭', '아무거나1', false, new Replier(), null, null, null);
response('room1', '/파티참가 포지션자랭', '아무거나2', false, new Replier(), null, null, null);
response('room1', '/파티참가 포지션자랭', '아무거나3', false, new Replier(), null, null, null);
response('room1', '/파티참가 포지션자랭', '아무거나4', false, new Replier(), null, null, null);
response('room1', '/파티탈퇴 포지션자랭', '정글러1', false, new Replier(), null, null, null);
response('room1', '/파티리스트', 'sender2', false, new Replier(), null, null, null);
response('room1', '/파티생성 아몰랑 2200' + customTime, 'sender1', false, new Replier(), null, null, null);

response('room2', '/파티리스트', 'sender2', false, new Replier(), null, null, null);
response('room2', '/파티생성 자랭1 ' + customTime, 'sender1', false, new Replier(), null, null, null);
response('room2', '/파티참석 자랭1', 'sender1', false, new Replier(), null, null, null);
response('room2', '/파티리스트', 'sender2', false, new Replier(), null, null, null);
response('room2', '알람 테스트', 'sender2', false, new Replier(), null, null, null);
response('room2', '/파티참가', 'sender2', false, new Replier(), null, null, null);
response('room2', '/파티생성 자랭2', 'sender2', false, new Replier(), null, null, null);

Sleep(3000);
response('room1', '/파티리스트', 'sender2', false, new Replier(), null, null, null);