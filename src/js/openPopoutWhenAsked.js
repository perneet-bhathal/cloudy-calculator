// open popout when asked
chrome.extension.onRequestExternal.addListener(function(request, sender, sendResponse) {			
	var qkOn = JSON.parse(localStorage.opt_quickKeyOn)[0];
	if (request.helperIsInstalled === "yep") {
		background.helperIsInstalled = true;
	} else if (request.helperIsInstalled === "nope") {
		background.helperIsInstalled = false;
	} else if (request.openPopOut && qkOn) {		
		cCalc.popOutCalc();
	}
	sendResponse({});
});