// Rhino 환경에서 require 사용하기 번거로워서 어차피 테스트를 위한 코드들이니 eval로 처리
var rawText = readFile("PartyManager.js", "utf8");
eval(rawText);

// 윈도우에서 테스트 하기 위한 임시 코드들
if (!this["DataBase"])
{
    DataBase = { setDataBase : function () {}, getDataBase : function () {} }

    function Replier() {}
    Replier.prototype.reply = function(msg) { print(msg); };
}

response("room", "/파티생성 자랭1 2100", "sender", false, new Replier(), null, null, null);
response("room", "/파티참가 자랭1", "sender", false, new Replier(), null, null, null);