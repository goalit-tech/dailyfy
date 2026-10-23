import cds from '@sap/cds';

export default class SmartDailyService extends cds.ApplicationService {
    init() {
        const { DailyLogs, Products } = this.entities;

        // Takes over price and product from the product and calculates the total amount of the day
        this.before(['CREATE', 'UPDATE'], DailyLogs, async (req) => {
            const oLog = req.data;
            const oExisting = req.event === 'UPDATE'
                ? await SELECT.one.from(DailyLogs, req.data.ID).columns('product_ID', 'quantity_quantity', 'unitPrice_amount', 'unitPrice_currency')
                : {};
            const sProductId = oLog.product_ID ?? oExisting?.product_ID;
            if (!sProductId) {
                return;
            }
            const oProduct = await SELECT.one.from(Products, sProductId)
                .columns('unitPrice_amount', 'unitPrice_currency', 'defaultQuantity_uom');
            if (!oProduct) {
                return req.error(400, `Product ${sProductId} not found`);
            }
            oLog.unitPrice_amount ??= oExisting?.unitPrice_amount ?? oProduct.unitPrice_amount;
            oLog.unitPrice_currency ??= oExisting?.unitPrice_currency ?? oProduct.unitPrice_currency;
            oLog.quantity_uom ??= oProduct.defaultQuantity_uom;
            const fQuantity = Number(oLog.quantity_quantity ?? oExisting?.quantity_quantity ?? 0);
            oLog.totalAmount_amount = Math.round(fQuantity * Number(oLog.unitPrice_amount ?? 0) * 100) / 100;
            oLog.totalAmount_currency = oLog.unitPrice_currency;
        });

        return super.init();
    }
}
