sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/format/DateFormat",
    "sap/ui/model/json/JSONModel",
    "sap/base/security/encodeXML",
    "sap/ui/core/ValueState"
], (Controller, DateFormat, JSONModel, encodeXML, ValueState) => {
    "use strict";

    const DATE_KEY_FORMAT = DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
    // sap.ui.unified.CalendarDayType values used for the day colours
    const CALENDAR_TYPE = { Error: "Type02", Warning: "Type01", Success: "Type08" };

    return Controller.extend("goalittech.ui.reuse.milkcalendar.controller.Main", {
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
        },
        formatTotalSummary(sCurrency, fAmount, fLiters, iDays) {
            const highlight = (sText, sColor) =>
                `<strong style="color:${sColor}">${encodeXML(String(sText))}</strong>`;
            return `Total Amount: ${highlight(`${sCurrency ?? ""}${fAmount ?? 0}`, "#e9730c")} for ` +
                `${highlight(`${fLiters ?? 0} liters`, "#0a6ed1")} over ` +
                `${highlight(`${iDays ?? 0} days`, "#107e3e")}`;
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
        onDateSelect(oEvent) {
            const oDate = oEvent.getSource().getSelectedDates()[0]?.getStartDate();
            const sKey = oDate && DATE_KEY_FORMAT.format(oDate);
            const iIndex = this.getView().getModel("cal").getProperty("/days").findIndex((o) => o.logDate === sKey);
            this.byId("SI").bindElement({ path: `/days/${iIndex}`, model: "cal" });
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