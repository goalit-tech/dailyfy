sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/format/DateFormat",
    'sap/base/i18n/date/CalendarType',
    "sap/ui/model/json/JSONModel",
    "sap/base/security/encodeXML",
    "sap/base/strings/formatMessage",
    "sap/ui/core/ValueState"
], (Controller, DateFormat, CalendarType, JSONModel, encodeXML, formatMessage, ValueState) => {
    "use strict";

    const DATE_KEY_FORMAT = DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
    // sap.ui.unified.CalendarDayType values used for the day colours
    const CALENDAR_TYPE = { Error: "Type02", Warning: "Type06", Success: "Type08" };

    return Controller.extend("goalittech.ui.reuse.milkcalendar.controller.Main", {
        oFormatYyyymmdd: null,
        onInit() {
            this.getView().setModel(new JSONModel({
                totalAmount: 240,
                currency: "₹",
                liters: 12.5,
                days: 12
            }), "summary");
            this.getView().setModel(new JSONModel({
                baseQty: 1,
                days: this._getMockDays()
            }), "cal");
            this.getView().setModel(new JSONModel({
                months: [
                    { month: "Oct 2026", amount: 240, liters: 12.5, days: 12, paid: true },
                    { month: "Sep 2026", amount: 300, liters: 15, days: 15, paid: false },
                    { month: "Aug 2026", amount: 280, liters: 14, days: 14, paid: true },
                    { month: "Jul 2026", amount: 260, liters: 13, days: 13, paid: true },
                    { month: "Jun 2026", amount: 320, liters: 16, days: 16, paid: false }
                ]
            }), "monthly");
            this.getView().setModel(new JSONModel({
                showQuantity: false,
                toggleIntervalSelection: false,
                isDateSelected: false
            }), "local");
            this.oFormatYyyymmdd = DateFormat.getInstance({ pattern: "yyyy-MM-dd", calendarType: CalendarType.Gregorian });
        },
        onCalendarTogglePress(oEvent) {
            if (oEvent.getParameter("pressed") === false) {
                this.getView().getModel("local").setProperty("/toggleIntervalSelection", false);
                if (this.getView().getModel("local").getProperty("/isDateSelected")) {
                    this.getView().getModel("local").setProperty("/showQuantity", true);
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
            this.oEditDialog ??= await this.loadFragment({
                name: "goalittech.ui.reuse.milkcalendar.fragment.EditDialog"
            });
            this.oEditDialog.open();
        },
        onUpdateEditDialogPress() {
            this.oEditDialog.close();
        },

        onCancelEditDialogPress() {
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
            return formatMessage(sText ?? "", [sCurrency ?? "", fAmount ?? 0, fLiters ?? 0, iDays ?? 0]);
        },
        formatCalendarDate(value) {
            return value ? DATE_KEY_FORMAT.parse(value) : null;
        },
        // quantity is null when the day has no record; 0 or no record => Error, == base => Success, else Warning
        formatQuantityState(fQuantity, fBaseQty) {
            if (fQuantity == null || Number(fQuantity) === 0) {
                return ValueState.Error;
            }
            return Number(fQuantity) === Number(fBaseQty) ? ValueState.Success : ValueState.Warning;
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


        _onSingleDateSelect(oEvent) {
            this.getView().getModel("local").setProperty("/isDateSelected", true);
            const oDate = oEvent.getSource().getSelectedDates()[0]?.getStartDate();
            const sKey = oDate && DATE_KEY_FORMAT.format(oDate);
            const iIndex = this.getView().getModel("cal").getProperty("/days").findIndex((o) => o.logDate === sKey);
            this.byId("idStepInputQuantity").bindElement({ path: `/days/${iIndex}`, model: "cal" });
            if (!this.getView().getModel("local").getProperty("/toggleIntervalSelection")) {
                this.getView().getModel("local").setProperty("/showQuantity", true);
            }
        },
        // Mock of the backend response: one entry per day, quantity null = no record for that day
        _getMockDays() {
            const aQuantities = [1, 1, 2, null, 1, 0, 1, 1, 0.5, null];
            const oToday = new Date();
            return Array.from({ length: oToday.getDate() }, (_, i) => {
                const oDay = new Date(oToday.getFullYear(), oToday.getMonth(), i + 1);
                return {
                    logDate: DATE_KEY_FORMAT.format(oDay),
                    quantity: aQuantities[i % aQuantities.length],
                    remarks: ""
                };
            });
        }
    });
});