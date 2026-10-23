sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/base/util/deepClone"
], function(UIComponent, deepClone) {
	"use strict";

	return UIComponent.extend("goalittech.ui.base.BaseComponent", {
		init: function() {
			UIComponent.prototype.init.apply(this, arguments);

			var oRouter = this.getRouter();
			this._registerReuseComponents(oRouter);
			oRouter.getViews().attachCreated(this._processEventMappingOnTargetCreated, this);
			oRouter.initialize();
		},

		/**
		 * Returns the reuse component configuration from "sap.ui5/config/reuseComponents"
		 * of the manifest. Each entry has the following properties:
		 * <ul>
		 * <li>key: route name / hash pattern / navigation key</li>
		 * <li>text, description, icon: shown in the side navigation and on the home page</li>
		 * <li>usage: name of the entry in "sap.ui5/componentUsages"</li>
		 * <li>prefix: prefix of the nested router of the reuse component</li>
		 * <li>title: (optional) page title, defaults to text</li>
		 * <li>eventMappings: (optional) cross-component navigation, see _processEventMappingOnTargetCreated</li>
		 * </ul>
		 *
		 * @returns {object[]} The configured reuse components
		 */
		getReuseComponents: function() {
			return this.getManifestEntry("/sap.ui5/config/reuseComponents") || [];
		},

		/**
		 * Creates a route and a component target for each configured reuse component,
		 * so that a new reuse component only has to be added to the manifest.
		 *
		 * @private
		 * @param {sap.ui.core.routing.Router} oRouter The router of this component
		 */
		_registerReuseComponents: function(oRouter) {
			this.getReuseComponents().forEach(function(oReuse) {
				oRouter.getTargets().addTarget(oReuse.key, {
					type: "Component",
					usage: oReuse.usage,
					title: oReuse.title || oReuse.text,
					id: oReuse.usage,
					containerOptions: {
						propagateModel: true
					}
				});
				oRouter.addRoute({
					name: oReuse.key,
					pattern: oReuse.key,
					target: {
						name: oReuse.key,
						prefix: oReuse.prefix || oReuse.key
					}
				});
			});
		},

		/**
		 * Returns the event mappings by component usage. Subclasses can define the
		 * "eventMappings" property; mappings configured in the manifest entry of a
		 * reuse component are merged in.
		 *
		 * @private
		 * @returns {object} Map from component usage to the array of event mappings
		 */
		_getEventMappings: function() {
			var mMappings = Object.assign({}, this.eventMappings);
			this.getReuseComponents().forEach(function(oReuse) {
				if (Array.isArray(oReuse.eventMappings) && oReuse.eventMappings.length) {
					mMappings[oReuse.usage] = (mMappings[oReuse.usage] || []).concat(oReuse.eventMappings);
				}
			});
			return mMappings;
		},

		/**
		 * This function is attached to the 'created' event from the target cache of a router.
		 *
		 * Once a component target is created, the event mappings for its component usage are
		 * processed. To each of the events defined there, a handler is attached. The handler
		 * calls 'navTo' on the current router with the route information and the information
		 * for the component targets within this route, or forwards the event to the parent.
		 *
		 * With this mechanism, a nested component can fire specific events to inform the parent
		 * component that:
		 * <ul>
		 * <li>A navigation needs to be done with the router in the parent component.</li>
		 * <li>The event needs to be forwarded along the parent chain with the same parameter</li>
		 * </ul>
		 *
		 * @private
		 * @param {object} oEvent The event object which is provided by the 'created' event from
		 *   router's target cache
		 */
		_processEventMappingOnTargetCreated: function(oEvent) {
			var sType = oEvent.getParameter("type");
			var oObject = oEvent.getParameter("object");
			var oOptions = oEvent.getParameter("options");
			var that = this;

			if (sType !== "Component") {
				return;
			}

			var aEvents = this._getEventMappings()[oOptions.usage];
			if (!Array.isArray(aEvents)) {
				return;
			}

			function processComponentTargetInfo(oComponentTargetInfo, oEvent) {
				Object.keys(oComponentTargetInfo).forEach(function(sTargetName) {
					var oInfo = oComponentTargetInfo[sTargetName];

					if (oInfo.parameters) {
						Object.keys(oInfo.parameters).forEach(function(sName) {
							// replace the parameter name with the value from the event
							oInfo.parameters[sName] = oEvent.getParameter(oInfo.parameters[sName]);
						});
					}

					if (oInfo.componentTargetInfo) {
						processComponentTargetInfo(oInfo.componentTargetInfo, oEvent);
					}
				});
			}

			aEvents.forEach(function(oEventMapping) {
				oObject.attachEvent(oEventMapping.name, function(oEvent) {
					var oComponentTargetInfo;
					if (oEventMapping.route) {
						if (oEventMapping.componentTargetInfo) {
							oComponentTargetInfo = deepClone(oEventMapping.componentTargetInfo);
							processComponentTargetInfo(oComponentTargetInfo, oEvent);
						}

						that.getRouter().navTo(oEventMapping.route, {}, oComponentTargetInfo);
					} else if (oEventMapping.forward) {
						that.fireEvent(oEventMapping.forward, oEvent.getParameters());
					}
				});
			});
		}
	});
});
