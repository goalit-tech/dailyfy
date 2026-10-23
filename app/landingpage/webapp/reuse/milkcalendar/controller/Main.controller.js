sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/format/DateFormat",
], (Controller, DateFormat) => {
    "use strict";

    return Controller.extend("goalittech.ui.reuse.milkcalendar.controller.Main", {
        onInit() {
        },
        formatCalendarDate(value) {
            return value ? DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).parse(value) : null;
        },
         formatCalendarType(isAbsent) {
            return isAbsent ? "Type03" : "Type08";
        },
        onDateSelect(oEvent) {
            // this._filterTableDate();
            debugger
        },
       
    });
});