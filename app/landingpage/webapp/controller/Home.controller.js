sap.ui.define([
	"sap/ui/core/mvc/Controller",
], function(Controller) {
	"use strict";

	return Controller.extend("goalittech.ui.controller.Home", {
		onTilePress: function(oEvent) {
			var sKey = oEvent.getSource().getBindingContext("reuse").getProperty("key");
			this.getOwnerComponent().getRouter().navTo(sKey);
		}
	});
});
