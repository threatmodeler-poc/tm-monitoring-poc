exports.up = function (knex) {
    return knex.schema
        .alterTable("monitor", function (table) {
            table.string("incident_id").nullable().defaultTo(null);
        });
};

exports.down = function (knex) {
    return knex.schema.alterTable("monitor", function (table) {
        table.string("incident_id").alter();
    });
};
