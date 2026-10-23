sap.ui.define([
	"goalittech/ui/base/BaseController",
	"sap/base/Log",
	"sap/ui/model/json/JSONModel",
	"sap/tnt/NavigationListItem"
], function(Controller, Log, JSONModel, NavigationListItem) {
	"use strict";

	return Controller.extend("goalittech.ui.controller.App", {
		onInit: function() {
			Log.info(this.getView().getControllerName(), "onInit");

			var oRouter = this.getOwnerComponent().getRouter();
			oRouter.attachRouteMatched(this._onRouteMatched, this);
			oRouter.attachBypassed(this._onBypassed, this);

			var oTitlesModel = new JSONModel();
			this.getView().setModel(oTitlesModel, "titleModel");
			oRouter.attachTitleChanged(function(oEvent) {
				oTitlesModel.setData(oEvent.getParameters());
			});

			this._createNavigationItems();
		},
		 onSideNavToggle() {
            const toolPage = this.byId("toolPage");
            toolPage.setSideExpanded(!toolPage.getSideExpanded());
        },

		// one navigation item per reuse component configured in the manifest
		_createNavigationItems: function() {
			var oList = this.byId("navigationList");
			this.getOwnerComponent().getReuseComponents().forEach(function(oReuse) {
				oList.addItem(new NavigationListItem({
					key: oReuse.key,
					text: oReuse.text,
					icon: oReuse.icon
				}));
			});
		},

		_onRouteMatched: function(oEvent) {
			Log.info(this.getView().getControllerName(), "_onRouteMatched");
			var oConfig = oEvent.getParameter("config");

			// select the corresponding item in the left menu
			this.byId("navigationList").setSelectedKey(oConfig.name);
		},

		_onBypassed: function(oEvent) {
			Log.info(
				this.getView().getControllerName(),
				"_onBypassed Hash=" + oEvent.getParameter("hash")
			);
		},

		onItemSelect: function(oEvent) {
			var sKey = oEvent.getParameter("item").getKey();
			Log.info(this.getView().getControllerName(), "onItemSelect Key=" + sKey);

			this.getOwnerComponent().getRouter().navTo(sKey);
		}
	});
});
