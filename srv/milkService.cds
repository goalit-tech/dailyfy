namespace milk.srv;

using {milk.db as db} from '../db/milkcalendarModel';

service SmartDailyService {
    entity Vendors   as projection on db.Vendor;

    entity Products  as projection on db.Product;

    entity DailyLogs as projection on db.Dailylogs;
}