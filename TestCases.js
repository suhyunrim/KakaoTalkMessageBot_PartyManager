// Rhino 환경에서 require 사용하기 번거로워서 어차피 테스트를 위한 코드들이니 eval로 처리
var rawText = readFile("PartyManager.js", "utf8");
eval(rawText);

// 윈도우에서 테스트 하기 위한 임시 코드들
if (!this["DataBase"])
{
    DataBase = { setDataBase : function () {}, getDataBase : function () {} }

    function Replier() {}
    Replier.prototype.reply = function(msg) { print(msg); };

    function Sleep() {}
}

response("room1", "/사용법", "sender1", false, new Replier(), null, null, null);
response("room1", "/파티생성 자랭1 2100", "sender1", false, new Replier(), null, null, null);
response("room1", "/파티참가 자랭1", "sender1", false, new Replier(), null, null, null);
response("room1", "/파티탈퇴 자랭1", "sender1", false, new Replier(), null, null, null);
response("room1", "/파티참가 자랭1", "sender1", false, new Replier(), null, null, null);
response("room1", "/파티참가 자랭1", "sender2", false, new Replier(), null, null, null);
response("room1", "/파티강퇴 자랭1 1", "sender2", false, new Replier(), null, null, null);
response("room1", "/파티시간변경 자랭1 2200", "sender2", false, new Replier(), null, null, null);
response("room1", "/파티리스트", "sender2", false, new Replier(), null, null, null);
response("room1", "알람 테스트", "sender2", false, new Replier(), null, null, null);

response("room2", "/파티리스트", "sender2", false, new Replier(), null, null, null);
response("room2", "/파티생성 자랭1 2100", "sender1", false, new Replier(), null, null, null);
response("room2", "/파티참가 자랭1", "sender1", false, new Replier(), null, null, null);
response("room2", "/파티리스트", "sender2", false, new Replier(), null, null, null);
response("room2", "알람 테스트", "sender2", false, new Replier(), null, null, null);
response("room2", "/파티참가", "sender2", false, new Replier(), null, null, null);
response("room2", "/파티생성 자랭2", "sender2", false, new Replier(), null, null, null);