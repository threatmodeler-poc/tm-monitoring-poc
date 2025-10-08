exports.up = async function (knex) {
    const exists = await knex.schema.hasColumn("monitor", "incident_id");
    if (!exists) {
        return knex.schema.alterTable("monitor", function (table) {
            table.string("incident_id").nullable().defaultTo(null);
        });
    }
};

exports.down = async function (knex) {
    const exists = await knex.schema.hasColumn("monitor", "incident_id");
    if (exists) {
        return knex.schema.alterTable("monitor", function (table) {
            table.string("incident_id").alter();
        });
    }
};
