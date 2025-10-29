exports.up = async function (knex) {
    // Check if ServiceType tag already exists
    const existingTag = await knex("tag").where("name", "ServiceType").first();

    if (!existingTag) {
        // Insert ServiceType tag entry
        await knex("tag").insert({
            name: "ServiceType",
            color: "#059669", // Green color similar to the one shown in the image
            created_date: knex.fn.now()
        });
    }
};

exports.down = async function (knex) {
    // Remove ServiceType tag if it exists
    await knex("tag").where("name", "ServiceType").del();
};
