sap.ui.define([
	"__HOST_PATH__/base/BaseController"
], function(BaseController) {
	"use strict";

	return BaseController.extend("__NAMESPACE__.controller.List", {

		onPressListItem: function(oEvent) {
			var sId = oEvent.getSource().getBindingContext().getProperty("id");
			this.getOwnerComponent().getRouter().navTo("detail", {
				id: sId
			});
		}
	});
});
