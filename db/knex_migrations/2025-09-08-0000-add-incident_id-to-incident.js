exports.up = async function (knex) {
    const exists = await knex.schema.hasColumn("incident", "incident_id");
    if (!exists) {
        await knex.schema.alterTable("incident", function (table) {
            table.string("incident_id").nullable().defaultTo(null);
        });
    }
};

exports.down = async function (knex) {
    const exists = await knex.schema.hasColumn("incident", "incident_id");
    if (exists) {
        await knex.schema.alterTable("incident", function (table) {
            table.dropColumn("incident_id");
        });
    }
};
