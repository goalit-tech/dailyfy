sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/format/DateFormat",
    'sap/base/i18n/date/CalendarType',
    "sap/ui/model/json/JSONModel",
    "sap/base/security/encodeXML",
    "sap/base/strings/formatMessage",
    "sap/ui/core/ValueState",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/Messaging",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/date/UI5Date"
], (Controller, DateFormat, CalendarType, JSONModel, encodeXML, formatMessage, ValueState, MessageBox, MessageToast, Messaging, Filter, FilterOperator, UI5Date) => {
    "use strict";

    const DATE_KEY_FORMAT = DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
    const MONTH_FORMAT = DateFormat.getDateInstance({ pattern: "MMM yyyy" });
    // sap.ui.unified.CalendarDayType values used for the day colours
    const CALENDAR_TYPE = { Error: "Type02", Warning: "Type06", Success: "Type08" };

    return Controller.extend("goalittech.ui.reuse.milkcalendar.controller.Main", {
        oFormatYyyymmdd: null,
        onInit() {
            this.getView().setModel(new JSONModel({
                showQuantity: false,
                toggleIntervalSelection: false,
                isDateSelected: false,
                vendorName: "",
                vendorEmail: "",
                vendorAddress: "",
                vendorMobileNo: ""
            }), "local");
            this.oFormatYyyymmdd = DateFormat.getInstance({ pattern: "yyyy-MM-dd", calendarType: CalendarType.Gregorian });
            this.byId("idUnifiedCalendar").setMaxDate(UI5Date.getInstance());
            // busy until the first month of logs is loaded, see _initLogs
            this._setBusy(true);
            this._bindProduct();
            this.byId("idUnifiedCalendar").attachModelContextChange(() => this._initLogs());
            this._bindCurrentMonthSummary();
        },
        // Busy indicator of the page; calls can overlap, so it is only cleared when every caller is done
        _setBusy(bBusy) {
            const oPage = this.byId("idPageMilkcalendarMain");
            this._iBusy = Math.max(0, (this._iBusy ?? 0) + (bBusy ? 1 : -1));
            oPage.setBusyIndicatorDelay(0);
            oPage.setBusy(this._iBusy > 0);
        },
        // Binds the rate / base quantity section to the first product, if there is one yet
        async _bindProduct() {
            try {
                const [oContext] = await this._getProductsBinding().requestContexts(0, 1);
                this._setProductContext(oContext);
            } finally {
                this._initLogs();
            }
        },
        // Reads the current month once the calendar's logs binding exists (it needs the model and is created suspended)
        _initLogs() {
            if (!this._bLogsInitialized && this._getLogsBinding()) {
                this._bLogsInitialized = true;
                this._oLogsBinding.attachEventOnce("dataReceived", () => this._setBusy(false));
                this._loadLogsOfMonth(new Date());
            }
        },
        // The logs binding starts suspended: only the displayed month is read from the backend
        _loadLogsOfMonth(oDate) {
            const oBinding = this._getLogsBinding();
            if (!oBinding) {
                return;
            }
            oBinding.getAllCurrentContexts().filter((o) => o.isInactive()).forEach((o) => o.delete().catch(() => { }));
            const oFirst = new Date(oDate.getFullYear(), oDate.getMonth(), 1);
            const oLast = new Date(oDate.getFullYear(), oDate.getMonth() + 1, 0);
            oBinding.filter(new Filter("logDate", FilterOperator.BT, DATE_KEY_FORMAT.format(oFirst), DATE_KEY_FORMAT.format(oLast)));
            if (oBinding.isSuspended()) {
                oBinding.resume();
            }
        },
        onCalendarStartDateChange(oEvent) {
            const oLocal = this.getView().getModel("local");
            oLocal.setProperty("/isDateSelected", false);
            oLocal.setProperty("/showQuantity", false);
            this.byId("idStepInputQuantity").setBindingContext(null);
            this._loadLogsOfMonth(oEvent.getSource().getStartDate());
        },
        _setProductContext(oContext) {
            this._oProductContext = oContext ?? null;
            this.byId("idHBoxSummary").setBindingContext(this._oProductContext);
            this.byId("idHBoxVendor").setBindingContext(this._oProductContext);
            this.byId("idTitleMilkmanName").setBindingContext(this._oProductContext);
        },
        // Binds the total summary text to the backend summary of the current month
        async _bindCurrentMonthSummary() {
            const oToday = new Date();
            this._oSummaryBinding ??= this.getOwnerComponent().getModel().bindList("/MonthlySummary", null, null, [
                new Filter("year", FilterOperator.EQ, oToday.getFullYear()),
                new Filter("month", FilterOperator.EQ, oToday.getMonth() + 1)
            ]);
            const [oContext] = await this._oSummaryBinding.requestContexts(0, 1);
            this.byId("idFormattedTextTotalAmount").setBindingContext(oContext ?? null);
        },
        // Reloads the summaries after the logged quantities changed in the backend
        _refreshSummaries() {
            this.byId("idListMonthlySummary").getBinding("items")?.refresh();
            this._oSummaryBinding?.refresh();
            this._bindCurrentMonthSummary();
        },
        _getLogsBinding() {
            const oBinding = this.byId("idUnifiedCalendar").getBinding("specialDates");
            if (oBinding && this._oLogsBinding !== oBinding) {
                this._oLogsBinding = oBinding;
                oBinding.attachPatchCompleted(() => this._refreshSummaries());
                oBinding.attachCreateCompleted(() => this._refreshSummaries());
            }
            return oBinding;
        },
        onCalendarTogglePress(oEvent) {
            if (oEvent.getParameter("pressed") === false) {
                this.getView().getModel("local").setProperty("/toggleIntervalSelection", false);
                if (this.getView().getModel("local").getProperty("/isDateSelected")) {
                    const aSelected = this.byId("idUnifiedCalendar").getSelectedDates();
                    const oDate = aSelected.length === 1 ? aSelected[0].getStartDate() : null;
                    const oContext = oDate ? this._getLogContext(DATE_KEY_FORMAT.format(oDate)) : null;
                    this.byId("idStepInputQuantity").setBindingContext(oContext);
                    this.getView().getModel("local").setProperty("/showQuantity", !!oContext);
                }
                return;
            }
            this.getView().getModel("local").setProperty("/showQuantity", false);
            this.getView().getModel("local").setProperty("/toggleIntervalSelection", true);
        },
        onEditPress() {
            this.getView().getModel("local").setProperty("/toggleIntervalSelection", false);
            this.getView().getModel("local").setProperty("/showQuantity", false);
            this._openDialogForEdit();

        },
        async _openDialogForEdit() {
            this._setBusy(true);
            try {
                this.oEditDialog ??= await this.loadFragment({
                    name: "goalittech.ui.reuse.milkcalendar.fragment.EditDialog"
                });
                const oContext = await this._getProductContext();
                this.oEditDialog.setBindingContext(oContext);
                const oLocal = this.getView().getModel("local");
                oLocal.setProperty("/vendorName", oContext.getProperty("vendor/name") ?? "");
                oLocal.setProperty("/vendorEmail", oContext.getProperty("vendor/email") ?? "");
                oLocal.setProperty("/vendorAddress", oContext.getProperty("vendor/address") ?? "");
                oLocal.setProperty("/vendorMobileNo", oContext.getProperty("vendor/mobileNo") ?? "");
                this.oEditDialog.open();
            } finally {
                this._setBusy(false);
            }
        },
        // Binds /Products: edits the first product, or creates a new one (saved on Update) when none exists
        async _getProductContext() {
            const [oContext] = await this._getProductsBinding().requestContexts(0, 1);
            return oContext ?? this._oProductsBinding.create({}, true);
        },
        _getProductsBinding() {
            this._oProductsBinding ??= this.getOwnerComponent().getModel().bindList("/Products", null, null, null, {
                $select: ["ID", "name", "description", "vendor_ID", "unitPrice_amount", "unitPrice_currency",
                    "defaultQuantity_quantity", "defaultQuantity_uom"],
                $expand: { vendor: { $select: ["ID", "name", "email", "address", "mobileNo"] } }
            });
            return this._oProductsBinding;
        },
        // Returns the vendor context for the entered vendor; creates the vendor in the backend when it doesn't exist yet.
        // Email, address and mobile number changes of an existing vendor are queued in the "productEdit" group.
        async _getOrCreateVendor(sName, sEmail, sAddress, sMobileNo, oProductContext, aPatches) {
            const oModel = this.getView().getModel();
            const sCurrentId = oProductContext.getProperty("vendor_ID");
            // keep editing the current vendor when its name is unchanged, even if the name is not unique
            const oFilter = sCurrentId && sName === oProductContext.getProperty("vendor/name")
                ? new Filter("ID", FilterOperator.EQ, sCurrentId)
                : new Filter("name", FilterOperator.EQ, sName);
            const oVendorsBinding = oModel.bindList("/Vendors", null, null, oFilter,
                { $select: ["ID", "name", "email", "address", "mobileNo"] });
            const [oExisting] = await oVendorsBinding.requestContexts(0, 1);
            if (oExisting) {
                [["email", sEmail], ["address", sAddress], ["mobileNo", sMobileNo]].forEach(([sProperty, sValue]) => {
                    if ((oExisting.getProperty(sProperty) ?? "") !== sValue) {
                        aPatches.push(oExisting.setProperty(sProperty, sValue));
                    }
                });
                return oExisting;
            }
            // $auto sends the POST immediately, as the generated ID is needed for the product
            const oCreated = oModel.bindList("/Vendors", null, null, null, { $$updateGroupId: "$auto" })
                .create({ name: sName, email: sEmail, address: sAddress, mobileNo: sMobileNo });
            await oCreated.created();
            return oCreated;
        },
        async onUpdateEditDialogPress() {
            const oModel = this.getView().getModel();
            const oLocal = this.getView().getModel("local");
            const oContext = this.oEditDialog.getBindingContext();
            const sVendorName = (oLocal.getProperty("/vendorName") ?? "").trim();
            const oBundle = this.getView().getModel("i18n").getResourceBundle();
            this.oEditDialog.setBusyIndicatorDelay(0);
            this.oEditDialog.setBusy(true);
            try {
                // not awaited before submitBatch: the PATCH requests are only sent with it
                const aPatches = [];
                if (sVendorName) {
                    const oVendor = await this._getOrCreateVendor(sVendorName,
                        (oLocal.getProperty("/vendorEmail") ?? "").trim(),
                        (oLocal.getProperty("/vendorAddress") ?? "").trim(),
                        (oLocal.getProperty("/vendorMobileNo") ?? "").trim(),
                        oContext, aPatches);
                    if (oVendor.getProperty("ID") !== oContext.getProperty("vendor_ID")) {
                        aPatches.push(oContext.setProperty("vendor_ID", oVendor.getProperty("ID")));
                    }
                }
                await oModel.submitBatch("productEdit");
                const oRejected = (await Promise.allSettled(aPatches)).find((oResult) => oResult.status === "rejected");
                // a failed PATCH/POST of a bound field doesn't reject submitBatch but stays pending
                if (oRejected || oModel.hasPendingChanges("productEdit")) {
                    throw new Error(oRejected?.reason?.message ?? this._getBackendErrorText(oBundle.getText("saveFailed")));
                }
                // reload so that the expanded vendor data reflects the changes
                // the refresh replaces a context created in this session, so the product has to be requested again
                this._oProductsBinding.refresh();
                const [oProductContext] = await this._oProductsBinding.requestContexts(0, 1);
                this._setProductContext(oProductContext);
                this._oLogsBinding?.refresh();
                this.oEditDialog.close();
                MessageToast.show(oBundle.getText("saveSuccess"));
            } catch (oError) {
                MessageBox.error(oBundle.getText("saveFailed"), { details: oError.message });
            } finally {
                this.oEditDialog.setBusy(false);
            }
        },
        // Joins the error messages the backend reported for the failed request, falls back to the given text
        _getBackendErrorText(sFallback) {
            const aTexts = Messaging.getMessageModel().getData()
                .filter((oMessage) => oMessage.getType() === "Error")
                .map((oMessage) => oMessage.getMessage());
            return aTexts.length ? aTexts.join("\n") : sFallback;
        },

        onCancelEditDialogPress() {
            this.getView().getModel().resetChanges("productEdit");
            this.oEditDialog.close();
        },

        formatTotalSummary(sCurrency, fAmount, fLiters, iDays, sSummaryText, sLitersText, sDaysText) {
            const highlight = (sText, sColor) =>
                `<strong style="color:${sColor}">${encodeXML(String(sText))}</strong>`;
            // the i18n texts come from the app's own resource bundle; the substituted values are encoded in highlight()
            return formatMessage(sSummaryText ?? "", [
                highlight(`${sCurrency ?? ""}${fAmount ?? 0}`, "#e9730c"),
                highlight(formatMessage(sLitersText ?? "", [fLiters ?? 0]), "#0a6ed1"),
                highlight(formatMessage(sDaysText ?? "", [iDays ?? 0]), "#107e3e")
            ]);
        },
        formatMonthlySummary(sText, sCurrency, fAmount, fLiters, iDays) {
            return formatMessage(sText ?? "", [sCurrency ?? "", Number(fAmount ?? 0), Number(fLiters ?? 0), iDays ?? 0]);
        },
        formatMonth(iYear, iMonth) {
            return MONTH_FORMAT.format(new Date(iYear, iMonth - 1, 1));
        },
        // quantity is null when the day has no record; 0 or no record => Error, == base => Success, else Warning
        formatQuantityState(fQuantity, fBaseQty) {
            if (fQuantity == null || Number(fQuantity) === 0) {
                return ValueState.Error;
            }
            return fBaseQty == null || Number(fQuantity) === Number(fBaseQty) ? ValueState.Success : ValueState.Warning;
        },
        formatCalendarType(fQuantity, fBaseQty) {
            return CALENDAR_TYPE[this.formatQuantityState(fQuantity, fBaseQty)];
        },
        handleCalendarSelect(oEvent) {
            var oCalendar = oEvent.getSource();
            if (oCalendar.getSelectedDates().length === 1) {
                this._onSingleDateSelect(oEvent);
            } else {
                this._updateText(oCalendar.getSelectedDates()[0]);
            }
        },

        _updateText(oSelectedDates) {
            var oDate, fromDate, toDate;

            if (oSelectedDates) {
                oDate = oSelectedDates.getStartDate();
                if (oDate) {
                    fromDate = this.oFormatYyyymmdd.format(oDate);
                }
                oDate = oSelectedDates.getEndDate();
                if (oDate) {
                    toDate = this.oFormatYyyymmdd.format(oDate);
                }
            } else {
                fromDate = null;
                toDate = null;
            }
        },


        async _onSingleDateSelect(oEvent) {
            const oLocal = this.getView().getModel("local");
            oLocal.setProperty("/isDateSelected", true);
            const oDate = oEvent.getSource().getSelectedDates()[0]?.getStartDate();
            const bInterval = oLocal.getProperty("/toggleIntervalSelection");
            this._setBusy(true);
            try {
                const oContext = oDate && !bInterval ? this._getLogContext(DATE_KEY_FORMAT.format(oDate)) : null;
                this.byId("idStepInputQuantity").setBindingContext(oContext);
                if (!bInterval) {
                    oLocal.setProperty("/showQuantity", !!oContext);
                }
                // a transient context is a log that is just being created in the backend
                if (oContext?.isTransient()) {
                    await oContext.created();
                    MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("logSaved"));
                }
            } catch (oError) {
                // the rejected log is removed and its error reported by _getLogContext / the message model
            } finally {
                this._setBusy(false);
            }
        },
        // Returns the log of the day. A day without a log gets one created right away with the product's
        // default quantity; changing the quantity afterwards updates it. Needs the product of the logs.
        _getLogContext(sDate) {
            const oBinding = this._getLogsBinding();
            // a destroyed product context has no binding anymore
            const sProductId = this._oProductContext?.getBinding() ? this._oProductContext.getProperty("ID") : null;
            if (!oBinding || !sProductId || sDate > DATE_KEY_FORMAT.format(new Date())) {
                return null;
            }
            const aContexts = oBinding.getAllCurrentContexts();
            aContexts.filter((o) => o.isInactive() && o.getProperty("logDate") !== sDate)
                .forEach((o) => o.delete().catch(() => { }));
            const oExisting = aContexts.find((o) => o.getProperty("logDate") === sDate);
            if (oExisting) {
                return oExisting;
            }
            const oLog = { logDate: sDate, product_ID: sProductId };
            const fDefaultQty = this._oProductContext.getProperty("defaultQuantity_quantity");
            if (fDefaultQty != null) {
                oLog.quantity_quantity = fDefaultQty;
                oLog.quantity_uom = this._oProductContext.getProperty("defaultQuantity_uom");
            }
            const oContext = oBinding.create(oLog, true);
            oContext.created().catch(() => {
                // the backend rejected the log: drop it so that the day can be selected again
                if (this.byId("idStepInputQuantity").getBindingContext() === oContext) {
                    this.byId("idStepInputQuantity").setBindingContext(null);
                    this.getView().getModel("local").setProperty("/showQuantity", false);
                }
                oContext.delete().catch(() => { });
            });
            return oContext;
        }

    });
});