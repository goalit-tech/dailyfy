sap.ui.define([
	"goalittech/ui/base/BaseController"
], function(BaseController) {
	"use strict";

	return BaseController.extend("goalittech.ui.reuse.sample.controller.Detail", {

		onInit: function() {
			BaseController.prototype.onInit.apply(this, arguments);
			this.getOwnerComponent().getRouter().getRoute("detail").attachPatternMatched(this._onMatched, this);
		},

		_onMatched: function(oEvent) {
			var sId = oEvent.getParameter("arguments").id;
			var oModel = this.getView().getModel();
			var iIndex = oModel.getProperty("/items").findIndex(function(oItem) {
				return oItem.id === sId;
			});

			if (iIndex < 0) {
				this.getOwnerComponent().getRouter().getTargets().display("notFound");
				return;
			}
			this.getView().bindElement("/items/" + iIndex);
		},

		onNavBack: function() {
			this.getOwnerComponent().getRouter().navTo("list");
		}
	});
});
