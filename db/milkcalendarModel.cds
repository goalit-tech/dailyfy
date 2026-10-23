namespace milk.db;

using {cuid, managed} from '@sap/cds/common';

entity Vendor : cuid, managed {
    name     : String(80);
    address  : String(255);
    email    : String(255);
    mobileNo : String(15);
    isActive : Boolean default true;
    products : Association to many Product
                   on products.vendor = $self;


}

type AmountCurrency {
    amount   : Decimal(10, 2);
    currency : String;
};

type QuantityUOM {
    quantity : Decimal(10, 2);
    uom      : String;
};

entity Product : cuid, managed {
    name            : String(40);
    description     : String(80);
    unitPrice       : AmountCurrency;
    defaultQuantity : QuantityUOM;
    isActive        : Boolean default true;
    vendor          : Association to Vendor;
}

entity Dailylogs : cuid, managed {
    logDate     : Date;
    product     : Association to Product;
    quantity    : QuantityUOM;
    unitPrice   : AmountCurrency;
    totalAmount : AmountCurrency;
    isAbsent    : Boolean default false;
    remarks     : String(255);
}
