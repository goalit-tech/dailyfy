namespace milk.srv;

using {milk.db as db} from '../db/milkcalendarModel';

service SmartDailyService {
    entity Vendors   as projection on db.Vendor;

    entity Products  as projection on db.Product;

    entity DailyLogs as projection on db.Dailylogs;

    // Consumption per month; days with a quantity of 0 are not counted
    @readonly
    entity MonthlySummary as
        select from db.Dailylogs {
            key year(logDate)               as year   : Integer,
            key month(logDate)              as month  : Integer,
                sum(totalAmount.amount)     as amount : Decimal(10, 2),
                max(totalAmount.currency)   as currency : String,
                sum(quantity.quantity)      as liters : Decimal(10, 2),
                count(*)                    as days   : Integer
        }
        where quantity.quantity > 0
        group by year(logDate), month(logDate);
}