sap.ui.define([
	"goalittech/ui/base/BaseController"
], function(BaseController) {
	"use strict";

	return BaseController.extend("goalittech.ui.reuse.milkcalendar.controller.List", {

		onPressListItem: function(oEvent) {
			var sId = oEvent.getSource().getBindingContext().getProperty("id");
			this.getOwnerComponent().getRouter().navTo("detail", {
				id: sId
			});
		}
	});
});
