sap.ui.define([
	"goalittech/ui/base/BaseComponent",
	"sap/ui/model/json/JSONModel"
], function(BaseComponent, JSONModel) {
	"use strict";

	return BaseComponent.extend("goalittech.ui.Component", {
		metadata: {
			manifest: "json",
			interfaces: ["sap.ui.core.IAsyncContentCreation"]
		},

		init: function() {
			// the list of reuse components drives the side navigation and the home page tiles
			this.setModel(new JSONModel(this.getReuseComponents()), "reuse");

			BaseComponent.prototype.init.apply(this, arguments);
		}
	});
});
