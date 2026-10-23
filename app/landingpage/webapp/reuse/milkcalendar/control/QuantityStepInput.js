sap.ui.define([
    "sap/m/StepInput",
    "sap/m/StepInputRenderer"
], (StepInput, StepInputRenderer) => {
    "use strict";

    // The standard StepInput only accepts typed values with exactly displayValuePrecision decimals ("1" is rejected
    // for a precision of 2). Here typing fewer decimals is fine, the value is shown with the full precision afterwards.
    return StepInput.extend("goalittech.ui.reuse.milkcalendar.control.QuantityStepInput", {
        renderer: StepInputRenderer,
        _isValueWithCorrectPrecision(sValue) {
            const sFraction = String(sValue ?? "").split(/[.,]/)[1] ?? "";
            return sFraction.length <= this.getDisplayValuePrecision();
        }
    });
});
