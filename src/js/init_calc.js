/*
 * Copyright (c) 2010 Brent Weston Robinett <bwrobinett@gmail.com>
 * Licensed under the MIT License: http://www.opensource.org/licenses/mit-license.php
 */
(function () {
	// In MV3, cCalc is loaded directly in each page, not from background
	if (typeof cCalc !== "undefined" && cCalc.init) {
		cCalc.init(window);
	} else {
		// cCalc not found or not initialized - fail silently
	}
}());