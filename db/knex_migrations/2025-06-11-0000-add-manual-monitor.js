exports.up = function (knex) {
    return knex.schema
        .alterTable("monitor", function (table) {
            table.integer("manual_status").defaultTo(null);
        });
};

exports.down = function (knex) {
    return knex.schema.alterTable("monitor", function (table) {
        table.dropColumn("manual_status");
    });
};
